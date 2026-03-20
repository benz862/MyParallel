import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import VoiceDemo from './VoiceDemo';
import CaregiverCalendar from './CaregiverCalendar';
import MedicationManager from './MedicationManager';
import BulkPatientUploader from './BulkPatientUploader';
import UserIntakeForm from './UserIntakeForm';

interface ChatMessage {
  sender: 'user' | 'ai' | 'system';
  text: string;
  time: string;
  mediaUrl?: string;
}

const PATIENT_COLORS = [
  { border: 'border-blue-500', lightBg: 'bg-blue-50', activeBg: 'bg-blue-100', text: 'text-blue-700' },
  { border: 'border-emerald-500', lightBg: 'bg-emerald-50', activeBg: 'bg-emerald-100', text: 'text-emerald-700' },
  { border: 'border-amber-500', lightBg: 'bg-amber-50', activeBg: 'bg-amber-100', text: 'text-amber-700' },
  { border: 'border-purple-500', lightBg: 'bg-purple-50', activeBg: 'bg-purple-100', text: 'text-purple-700' },
  { border: 'border-rose-500', lightBg: 'bg-rose-50', activeBg: 'bg-rose-100', text: 'text-rose-700' },
];

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
  const [showJournalDrawer, setShowJournalDrawer] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [activeRightTab, setActiveRightTab] = useState<'schedule' | 'medications'>('schedule');

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

  // Synchronize active patient context and calendar injection
  useEffect(() => {
      if (patients.length > 0 && selectedPatientId) {
          const p = patients.find(x => x.id === selectedPatientId);
          if (p) {
              setPhoneNumber(p.phone_number);
              setPersonality(p.selected_personality);
          }

          // Fetch explicit calendar events to inject into Voice AI memory
          const fetchAgentCalendar = async () => {
             const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString();
             const tomorrow = new Date(Date.now() + 2*24*60*60*1000).toISOString();
             const { data } = await supabase.from('calendar_events')
                 .select('*')
                 .eq('user_id', selectedPatientId)
                 .gte('start_time', yesterday)
                 .lte('start_time', tomorrow);
             setUpcomingEvents(data || []);
          };
          fetchAgentCalendar();
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

  const downloadLog = async () => {
      const activePatient = patients.find(p => p.id === selectedPatientId);
      const name = activePatient?.full_name?.split(' ')[0] || 'Patient';
      
      // Bypass the 20-message UI limit by natively polling the entire DB history
      const { data } = await supabase.from('messages').select('*').eq('user_number', phoneNumber).order('created_at', { ascending: true });
      if (!data || data.length === 0) {
          alert("No transcript history available to download.");
          return;
      }

      const logContent = data.map(m => `[${new Date(m.created_at + (m.created_at.endsWith("Z") ? "" : "Z")).toLocaleString()}] ${m.sender.toUpperCase()}:\n${m.content}`).join('\n\n-----------------\n\n');
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
    <section id="terminal" className="py-12 lg:py-24 bg-slate-50 relative border-t border-slate-200 min-h-screen">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px]">
        <div className="flex flex-col lg:flex-row gap-8 items-start relative">
          
          {/* LEFT COLUMN: Roster (1/3 Width) */}
          <div className="w-full lg:w-[35%] space-y-6">
             <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
               <div>
                 <h2 className="text-2xl font-bold text-slate-800">Your Patients</h2>
                 <p className="text-sm text-slate-500">Manage your linked companions</p>
               </div>
               <div className="flex flex-col gap-2">
                   <button 
                      onClick={() => { setEditingPatientId(null); setShowIntake(true); }} 
                      className="px-4 py-2 bg-wellness-blue text-white rounded-xl text-sm font-bold shadow hover:bg-sky-600 transition-colors"
                   >
                      + Add New
                   </button>
                   <button 
                      onClick={() => setShowBulkUpload(!showBulkUpload)} 
                      className="px-4 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                   >
                      {showBulkUpload ? 'Close Import' : '📦 Bulk Import'}
                   </button>
               </div>
             </div>

             {/* Dynamic Bulk Upload Accordion */}
             {showBulkUpload && (
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-100 animate-fadeIn">
                     <BulkPatientUploader />
                 </div>
             )}
             
             {/* Roster List */}
             <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {patients.map((p, idx) => {
                   const colorTheme = PATIENT_COLORS[idx % PATIENT_COLORS.length];
                   const isActive = selectedPatientId === p.id;
                   return (
                   <div key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer transition-all gap-4 border-l-8 ${isActive ? colorTheme.activeBg + ' ' + colorTheme.border : 'bg-white border-transparent hover:bg-slate-50 border-l-4 hover:' + colorTheme.border}`}>
                       <div className="flex-1">
                           <div className={`font-bold text-lg ${isActive ? colorTheme.text : 'text-slate-800'}`}>{p.full_name || 'Unnamed'}</div>
                           <div className={`text-xs flex items-center gap-2 mt-1 ${isActive ? colorTheme.text : 'text-slate-500'}`}>
                               <span>📞 {p.phone_number || 'No Phone'}</span>
                           </div>
                       </div>
                       <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                           <button 
                               onClick={(e) => { e.stopPropagation(); setEditingPatientId(p.id); setShowIntake(true); }} 
                               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${isActive ? 'bg-white/50 hover:bg-white text-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                           >
                               ✏️ Edit
                           </button>
                           <button 
                               onClick={(e) => { 
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(`${window.location.origin}/patient?id=${p.id}`);
                                  alert('Secure PWA App Link Copied! Text this directly to your Patient.');
                               }} 
                               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${isActive ? 'bg-white/50 hover:bg-white text-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                           >
                               🔗 Copy PWA Link
                           </button>
                           <button 
                               onClick={(e) => handleDeletePatient(e, p.id)} 
                               className="px-3 py-1.5 bg-red-50 rounded-lg text-xs text-red-500 font-bold hover:bg-red-100 transition-colors whitespace-nowrap"
                           >
                               🗑️ Delete
                           </button>
                       </div>
                       {isActive && (
                           <button 
                               onClick={(e) => { e.stopPropagation(); setShowJournalDrawer(true); }}
                               className={`mt-3 sm:mt-0 w-full sm:w-auto text-center px-4 py-2 text-white rounded-xl text-sm font-bold shadow-md transition-all transform hover:scale-105 bg-slate-900 border border-slate-700`}
                           >
                               💬 Open Journal
                           </button>
                       )}
                   </div>
                   );
                })}
                {patients.length === 0 && (
                   <div className="p-8 text-center text-slate-400 text-sm">No patients found. Create one above!</div>
                )}
             </div>
          </div>

          {/* RIGHT COLUMN: Calendar (2/3 Width) */}
          <div className="w-full lg:w-[65%]">
             <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-2 sm:p-6 lg:p-8 h-full custom-scrollbar relative overflow-hidden">
                 {/* Color Banner */}
                 {selectedPatientId && (
                     <div className={`absolute top-0 left-0 w-full h-2 ${PATIENT_COLORS[patients.findIndex(p => p.id === selectedPatientId) % PATIENT_COLORS.length].lightBg} border-b ${PATIENT_COLORS[patients.findIndex(p => p.id === selectedPatientId) % PATIENT_COLORS.length].border}`}></div>
                 )}
                 <div className="mb-6 mt-2">
                     <div className="flex items-center gap-1 mb-4">
                       <button onClick={() => setActiveRightTab('schedule')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeRightTab === 'schedule' ? 'bg-wellness-blue text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>📅 Schedule</button>
                       <button onClick={() => setActiveRightTab('medications')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeRightTab === 'medications' ? 'bg-wellness-blue text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>💊 Medications</button>
                     </div>
                     {selectedPatientId ? (
                         <p className={`text-sm font-bold mt-1 ${PATIENT_COLORS[patients.findIndex(p => p.id === selectedPatientId) % PATIENT_COLORS.length].text}`}>✓ Syncing {activeRightTab === 'schedule' ? 'schedule' : 'medications'} for {patients.find(p => p.id === selectedPatientId)?.full_name}</p>
                     ) : (
                         <p className="text-sm text-slate-500 mt-1">Select a patient on the left to filter events.</p>
                     )}
                 </div>
                 <div className="overflow-x-auto pb-4">
                     {activeRightTab === 'schedule' ? (
                       <CaregiverCalendar 
                          patientId={selectedPatientId} 
                          themeColor={selectedPatientId ? PATIENT_COLORS[patients.findIndex(p => p.id === selectedPatientId) % PATIENT_COLORS.length] : undefined}
                       />
                     ) : selectedPatientId ? (
                       <MedicationManager patientId={selectedPatientId} />
                     ) : (
                       <div className="text-center py-12 text-slate-400">Select a patient to manage medications</div>
                     )}
                 </div>
             </div>
          </div>

        </div>
      </div>

      {/* Slide-Over Journal Drawer (Chat Window) */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-[600px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${showJournalDrawer ? 'translate-x-0' : 'translate-x-full'}`}
      >
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowJournalDrawer(false)}
                className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 font-bold transition-colors"
              >
                ✕
              </button>
              <div>
                  <div className="font-bold text-slate-800 text-lg">Patient Journal & AI</div>
                  <div className="text-xs text-green-600 flex items-center gap-1 font-bold mt-0.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Terminal Connected
                  </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadLog} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors" title="Export .TXT Log">
                  📄
              </button>
              <button onClick={() => setShowBrowserVoice(!showBrowserVoice)} className={`p-2 border rounded-xl shadow-sm transition-colors font-bold text-sm ${showBrowserVoice ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`} title="Live Browser Chat">
                  🎙️ {showBrowserVoice && 'Close'}
              </button>
              <button onClick={triggerCall} disabled={isCalling} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50">
                  {isCalling ? 'Dialing...' : '📞 Call'}
              </button>
            </div>
          </div>

          {/* Voice AI Container */}
          {showBrowserVoice && selectedPatientId && (
              <div className="border-b border-slate-200 bg-slate-100 p-4 shadow-inner relative">
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

UPCOMING CAREGIVER CALENDAR APPOINTMENTS:
${upcomingEvents.length > 0 ? upcomingEvents.map(e => `- ${new Date(e.start_time).toLocaleString()}: ${e.title} (${e.description})`).join('\n') : 'No upcoming appointments scheduled.'}
                      `}
                  />
              </div>
          )}

          {/* Messages Feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-slate-50 custom-scrollbar">
                {messages.length === 0 && !isTyping && (
                    <div className="text-center text-slate-400 text-sm mt-10">No messages yet. Send a message to document a journal entry.</div>
                )}
                {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
                        <div className={`max-w-[90%] px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                            msg.sender === 'user'
                            ? 'bg-wellness-blue text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                        }`}>
                            {msg.text}
                            {msg.mediaUrl && (
                                <img 
                                    src={msg.mediaUrl} 
                                    alt="Support Visual" 
                                    className="mt-3 rounded-xl cursor-pointer hover:opacity-90 max-h-48 w-full object-cover border border-slate-100"
                                    onClick={() => setSelectedImage(msg.mediaUrl!)}
                                />
                            )}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1.5 px-2 font-medium tracking-wide">{msg.time}</span>
                </div>
                ))}
            {isTyping && (
              <div className="text-xs text-wellness-blue pl-4 italic font-medium animate-pulse">Parallel is logging...</div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white">
            <div className="flex gap-3 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Record patient notes or message..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-wellness-blue/50 focus:bg-white transition-all shadow-inner"
                  disabled={isTyping}
                />
                <button type="submit" disabled={isTyping || !input.trim()} className="bg-wellness-blue text-white px-5 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-md disabled:opacity-50 disabled:shadow-none focus:ring-2 focus:ring-offset-2 focus:ring-wellness-blue focus:outline-none">
                    Send
                </button>
            </div>
          </form>
      </div>

      {/* Floating Backdrop for Drawer */}
      {showJournalDrawer && (
          <div 
             className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-300"
             onClick={() => setShowJournalDrawer(false)}
          ></div>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Full Size" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
        </div>
      )}

      {/* Patient Intake Modal */}
      {showIntake && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto pt-24 pb-12 animate-fadeIn">
           <div className="bg-white rounded-3xl max-w-3xl w-full p-8 relative shadow-2xl transform transition-transform scale-100">
               <button onClick={() => setShowIntake(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 z-10 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full transition-colors hover:bg-slate-200 font-bold">✕</button>
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