import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import VoiceDemo from './VoiceDemo';
import CaregiverCalendar from './CaregiverCalendar';
import BulkPatientUploader from './BulkPatientUploader';
import UserIntakeForm from './UserIntakeForm';

interface ChatMessage {
  sender: 'user' | 'ai' | 'system';
  text: string;
  time: string;
  mediaUrl?: string;
}

const WebTerminal: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Syncing...');
  
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [personality, setPersonality] = useState<string | null>(null);
  const [showBrowserVoice, setShowBrowserVoice] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const UPLINK_URL = import.meta.env.DEV ? 'http://localhost:8081' : '';

  // Fetch all patients assigned to this caregiver (or the user themselves)
  useEffect(() => {
    if (!user) return;
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .or(`id.eq.${user.id},caregiver_id.eq.${user.id}`);
      
      if (!error && data && data.length > 0) {
        setPatients(data);
        if (!selectedPatientId) setSelectedPatientId(data[0].id);
      }
    };
    fetchProfiles();
  }, [user]);

  // Synchronize active patient context
  useEffect(() => {
      if (patients.length > 0 && selectedPatientId) {
          const p = patients.find(x => x.id === selectedPatientId);
          if (p) {
              setPhoneNumber(p.phone_number);
              setPersonality(p.selected_personality);
          }
      }
  }, [patients, selectedPatientId]);

  // Once we have the phone number, poll the context API
  useEffect(() => {
    let isMounted = true;
    if (!phoneNumber) return;

    const fetchContext = async (isBackgroundPoll = false) => {
        if (!isBackgroundPoll) setSyncStatus('Connecting...');
        try {
            const cleanUrl = UPLINK_URL.replace(/\/$/, '');
            const res = await fetch(`${cleanUrl}/api/context?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
                method: 'GET',
                headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                const data = await res.json();
                if (isMounted) {
                    setSyncStatus('Live');
                    const dbMessages: ChatMessage[] = data.map((m: any) => ({
                        sender: m.sender === 'user' ? 'user' : (m.sender === 'system' ? 'system' : 'ai'),
                        text: m.content || (m.media_url ? '[Photo Sent]' : ''),
                        time: new Date(m.created_at + (m.created_at.endsWith("Z") ? "" : "Z")).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        mediaUrl: m.media_url
                    }));
                    setMessages(dbMessages);
                }
            }
        } catch (e) {
            if (isMounted) setSyncStatus('Offline');
        }
    };
    
    fetchContext(false);
    const interval = setInterval(() => fetchContext(true), 3000);
    
    return () => { isMounted = false; clearInterval(interval); };
  }, [phoneNumber, UPLINK_URL]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !phoneNumber) return;

    const userMsg: ChatMessage = { sender: 'user', text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        const cleanUrl = UPLINK_URL.replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/api/dashboard-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phoneNumber,
                personality,
                message: input
            })
        });

        const data = await res.json();
        
        if (data.reply) {
            const aiMsg: ChatMessage = { sender: 'ai', text: data.reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
            // Optional: The background poll will pick it up anyway, but we can optimistically append.
            setMessages(prev => [...prev, aiMsg]);
        }
    } catch (err) { 
        console.error('Failed to send message:', err); 
    } finally { 
        setIsTyping(false); 
    }
  };

  const triggerCall = async () => {
    if (!phoneNumber) return;
    setIsCalling(true);
    try {
        const cleanUrl = UPLINK_URL.replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/api/trigger-call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
        });
        const data = await res.json();
        if (data.success) {
            // Optimistic message append
            const aiMsg: ChatMessage = { sender: 'ai', text: "[System] Calling your phone now! Please pick up.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
            setMessages(prev => [...prev, aiMsg]);
        } else {
            alert('Failed to trigger call: ' + data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Network error triggering call.');
    } finally {
        setIsCalling(false);
    }
  };

  const handleSavePatient = async (profileData: any) => {
    try {
        if (editingPatientId) {
            const { error } = await supabase.from('user_profiles').update(profileData).eq('id', editingPatientId);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('user_profiles').insert({ ...profileData, caregiver_id: user?.id });
            if (error) throw error;
        }
        setShowIntake(false);
        setEditingPatientId(null);
        window.location.reload(); 
    } catch (err) {
        console.error("Failed to save patient", err);
        alert("Failed to save patient. Please try again.");
    }
  };

  const handleDeletePatient = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!window.confirm("Are you absolutely sure you want to completely delete this patient and all associated intelligence logs? This cannot be undone.")) return;

      try {
          const { error } = await supabase.from('user_profiles').delete().eq('id', id);
          if (error) throw error;
          
          if (selectedPatientId === id) setSelectedPatientId(null);
          setPatients(prev => prev.filter(p => p.id !== id));
      } catch (err) {
          console.error("Failed to delete patient", err);
          alert("Failed to physically purge the profile. Check console.");
      }
  };

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const downloadLog = () => {
      const activePatient = patients.find(p => p.id === selectedPatientId);
      const name = activePatient?.full_name?.split(' ')[0] || 'Patient';
      const logContent = messages.map(m => `[${m.time}] ${m.sender.toUpperCase()}:\n${m.text}`).join('\n\n-----------------\n\n');
      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_Wellness_Transcriptions_Log.txt`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
  };

  if (!phoneNumber) {
      return (
          <section id="terminal" className="py-24 bg-white relative border-t border-slate-200">
            <div className="container mx-auto px-6 max-w-4xl text-center">
                <h2 className="text-3xl font-bold text-slate-800 mb-4">Please set up your phone number!</h2>
                <p className="text-slate-600">Your Web Dashboard relies on your phone number to fetch your exact conversation history. Please go to your personal info settings and add your phone number to unlock this feature.</p>
            </div>
          </section>
      );
  }

  return (
    <section id="terminal" className="py-24 bg-white relative border-t border-slate-200">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          
          <div className="flex-1 space-y-6 w-full max-w-md">
             <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
               <div>
                 <h2 className="text-2xl font-bold text-slate-800">Your Patients</h2>
                 <p className="text-sm text-slate-500">Manage your linked companions</p>
               </div>
               <button 
                  onClick={() => { setEditingPatientId(null); setShowIntake(true); }} 
                  className="px-4 py-2 bg-wellness-blue text-white rounded-xl text-sm font-bold shadow hover:bg-sky-600 transition-colors"
               >
                  + Add New Patient
               </button>
             </div>
             
             <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
                {patients.map(p => (
                   <div key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${selectedPatientId === p.id ? 'bg-sky-50 border-l-4 border-wellness-blue' : ''}`}>
                       <div>
                           <div className="font-bold text-slate-800 text-lg">{p.full_name || 'Unnamed'}</div>
                           <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                               <span>📞 {p.phone_number || 'No Phone'}</span>
                           </div>
                       </div>
                       <div className="flex items-center gap-4">
                           <button 
                               onClick={(e) => { e.stopPropagation(); setEditingPatientId(p.id); setShowIntake(true); }} 
                               className="text-xs text-slate-400 font-bold hover:text-wellness-blue flex items-center gap-1"
                           >
                               ✏️ Edit
                           </button>
                           <button 
                               onClick={(e) => handleDeletePatient(e, p.id)} 
                               className="text-xs text-red-300 font-bold hover:text-red-600 flex items-center gap-1 transition-colors"
                           >
                               🗑️ Delete
                           </button>
                           {selectedPatientId === p.id && (
                               <span className="text-xs text-sky-600 font-bold bg-sky-100 px-3 py-1 rounded-full">Viewing Journal →</span>
                           )}
                       </div>
                   </div>
                ))}
                {patients.length === 0 && (
                   <div className="p-8 text-center text-slate-400 text-sm">No patients found. Create one above!</div>
                )}
             </div>

             <div className="mt-8 pt-4 border-t border-slate-200">
                <BulkPatientUploader />
             </div>

             <div className="mt-8 pt-4 border-t border-slate-200">
                <CaregiverCalendar patientId={selectedPatientId} />
             </div>
          </div>

          <div className="flex-1 w-full max-w-xl">
            {/* Journal UI */}
            <div className="bg-white border-2 border-slate-100 rounded-3xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                  {/* Header */}
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-wellness-blue flex items-center justify-center text-white font-bold">P</div>
                      <div>
                          <div className="font-bold text-slate-800 text-sm">Parallel Support</div>
                          <div className="text-xs text-green-600 flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
                          </div>
                      </div>
                    </div>
                    <div>
                      <button 
                        onClick={downloadLog}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors mr-3"
                      >
                          📄 Export .TXT Log
                      </button>
                      <button 
                        onClick={() => setShowBrowserVoice(!showBrowserVoice)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors mr-3"
                      >
                          {showBrowserVoice ? 'Close Live Audio' : '🎙️ Live Browser Chat'}
                      </button>
                      <button 
                        onClick={triggerCall}
                        disabled={isCalling}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-bold shadow-sm transition-colors mb-2 sm:mb-0"
                      >
                          {isCalling ? 'Dialing...' : '📞 Call Me Now'}
                      </button>
                    </div>
                  </div>

                  {/* Gemini Live WebRTC Module */}
                  {showBrowserVoice && selectedPatientId && (
                      <div className="border-b border-slate-100 bg-slate-50 relative pb-4 animate-fadeIn">
                          <VoiceDemo 
                              patientPhone={phoneNumber || undefined}
                              patientId={selectedPatientId}
                              patientContextString={`
USER PROFILE CONTEXT:
- Name: ${patients.find(p => p.id === selectedPatientId)?.full_name || 'Unknown'}
- Age: ${patients.find(p => p.id === selectedPatientId)?.age || 'Unknown'}
- Conditions: ${patients.find(p => p.id === selectedPatientId)?.conditions?.join(', ') || 'None reported'}
- Medications: ${patients.find(p => p.id === selectedPatientId)?.medications?.join(', ') || 'None reported'}
- Emergency Contact: ${patients.find(p => p.id === selectedPatientId)?.emergency_contact_name || 'None'}
- Caregiver: ${patients.find(p => p.id === selectedPatientId)?.caregiver_name || 'Assigned Caregiver'}
- Notes: ${patients.find(p => p.id === selectedPatientId)?.notes || 'None'}
                              `}
                          />
                      </div>
                  )}

                  {/* Messages */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-white min-h-[300px]">
                        {messages.length === 0 && !isTyping && (
                            <div className="text-center text-slate-400 text-sm mt-10">No messages yet. Send a message to start tracking your journey.</div>
                        )}
                        {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
                                <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    msg.sender === 'user'
                                    ? 'bg-wellness-blue text-white rounded-br-none'
                                    : 'bg-slate-100 text-slate-700 rounded-bl-none'
                                }`}>
                                    {msg.text}
                                    {msg.mediaUrl && (
                                        <img 
                                            src={msg.mediaUrl} 
                                            alt="Support Visual" 
                                            className="mt-3 rounded-xl cursor-pointer hover:opacity-90 max-h-32 object-cover"
                                            onClick={() => setSelectedImage(msg.mediaUrl!)}
                                        />
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-300 mt-1 px-1">{msg.time}</span>
                        </div>
                        ))}
                    {isTyping && (
                      <div className="text-xs text-slate-400 pl-4 italic">Parallel is writing...</div>
                    )}
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Write a journal entry or message..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-6 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-wellness-blue/50"
                      disabled={isTyping}
                    />
                    <button type="submit" disabled={isTyping || !input.trim()} className="bg-wellness-blue text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50">
                        ➤
                    </button>
                  </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Full Size" className="max-w-full max-h-[90vh] rounded-lg" />
        </div>
      )}

      {/* Patient Intake Modal */}
      {showIntake && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto pt-24 pb-12">
           <div className="bg-white rounded-3xl max-w-3xl w-full p-8 relative shadow-2xl">
               <button onClick={() => setShowIntake(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 z-10 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full transition-colors">✕</button>
               <h2 className="text-3xl font-bold mb-8 text-slate-800 border-b border-slate-100 pb-4">{editingPatientId ? 'Edit Patient Profile' : 'Add New Patient'}</h2>
               <div className="max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                   <UserIntakeForm 
                       onSave={handleSavePatient} 
                       initialData={editingPatientId ? patients.find(p => p.id === editingPatientId) : {}}
                   />
               </div>
           </div>
        </div>
      )}
    </section>
  );
};

export default WebTerminal;