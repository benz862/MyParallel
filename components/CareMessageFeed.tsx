import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { playSentSound, playReceivedSound } from '../utils/sounds';

interface Message {
  id: string;
  sender_type: string;
  sender_name: string;
  message_text: string;
  message_type: string;
  is_urgent: boolean;
  is_read: boolean;
  created_at: string;
}

export default function CareMessageFeed({ patientId }: { patientId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const initialLoadRef = useRef<boolean>(true);
  const justSentRef = useRef<boolean>(false);
  const apiBase = import.meta.env.VITE_API_URL || '';

  // Stable reference to loadMessages that always uses the latest patientId
  const patientIdRef = useRef(patientId);
  patientIdRef.current = patientId;

  const loadMessages = useCallback(async () => {
    const pid = patientIdRef.current;
    if (!pid) return;
    try {
      const [msgRes, unreadRes] = await Promise.all([
        fetch(`${apiBase}/api/messages/${pid}`),
        fetch(`${apiBase}/api/messages/${pid}/unread`),
      ]);
      if (msgRes.ok) {
        const newMessages: Message[] = await msgRes.json();
        // Play received sound when new non-caregiver messages arrive (skip initial load and own sends)
        if (!initialLoadRef.current && !justSentRef.current && newMessages.length > prevMsgCountRef.current) {
          const incoming = newMessages.slice(prevMsgCountRef.current);
          const hasPatientMsg = incoming.some(m => m.sender_type !== 'caregiver' && m.sender_type !== 'system');
          if (hasPatientMsg) playReceivedSound();
        }
        justSentRef.current = false;
        initialLoadRef.current = false;
        prevMsgCountRef.current = newMessages.length;
        setMessages(newMessages);
      }
      if (unreadRes.ok) { const d = await unreadRes.json(); setUnread(d.unread || 0); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [apiBase]);

  // Reset refs when patient changes
  useEffect(() => {
    initialLoadRef.current = true;
    prevMsgCountRef.current = 0;
    justSentRef.current = false;
    setMessages([]);
    setLoading(true);
  }, [patientId]);

  // Poll every 5 seconds
  useEffect(() => {
    if (!patientId) return;
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [patientId, loadMessages]);

  // Supabase Realtime: instant refresh when a new message is inserted for this patient
  useEffect(() => {
    if (!patientId) return;
    const channel = supabase.channel(`care-msg-feed-${patientId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'care_messages', filter: `patient_id=eq.${patientId}` },
        () => { loadMessages(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [patientId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${apiBase}/api/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, sender_name: 'Caregiver', message_text: msgText.trim() }),
      });
      if (res.ok) {
        playSentSound();
        justSentRef.current = true;
        prevMsgCountRef.current += 1; // Prevent double-play from poll
        setMsgText('');
        loadMessages();
      }
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const markRead = async () => {
    if (unread === 0) return;
    await fetch(`${apiBase}/api/messages/${patientId}/read`, { method: 'PUT' });
    loadMessages();
  };

  const quickMessages = [
    '💊 Time to take your medication',
    '🍽️ Remember to eat lunch',
    '💧 Please drink some water',
    '🛌 Time for a rest',
    '✅ Great job today!',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '600px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>💬 Messages</h3>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{messages.length} messages{unread > 0 ? ` · ${unread} unread` : ''}</p>
        </div>
        {unread > 0 && (
          <button onClick={markRead} style={{
            padding: '4px 12px', borderRadius: '8px', border: '1px solid #c7d2fe',
            background: '#ede9fe', color: '#6366f1', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}>Mark all read</button>
        )}
      </div>

      {/* Quick Messages */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '6px', overflowX: 'auto' }}>
        {quickMessages.map((qm, i) => (
          <button key={i} onClick={() => { setMsgText(qm); }} style={{
            padding: '4px 10px', borderRadius: '12px', border: '1px solid #e2e8f0',
            background: '#f8fafc', color: '#475569', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{qm}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}
           onClick={() => { if (unread > 0) markRead(); }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto', padding: '40px' }}>
            <p style={{ fontSize: '28px', marginBottom: '8px' }}>💬</p>
            <p style={{ fontSize: '13px' }}>No messages yet. Send one to get started.</p>
          </div>
        ) : messages.map(msg => {
          const isCaregiver = msg.sender_type === 'caregiver' || msg.sender_type === 'system';
          return (
            <div key={msg.id} style={{
              maxWidth: '75%', alignSelf: isCaregiver ? 'flex-end' : 'flex-start',
              padding: '10px 14px', borderRadius: '14px',
              background: isCaregiver ? '#6366f1' : msg.is_urgent ? '#fef2f2' : '#f1f5f9',
              color: isCaregiver ? '#fff' : '#1e293b',
              border: msg.is_urgent && !isCaregiver ? '1px solid #fca5a5' : 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}>
              {!isCaregiver && (
                <div style={{ fontSize: '10px', fontWeight: 700, color: msg.is_urgent ? '#ef4444' : '#6366f1', marginBottom: '2px' }}>
                  {msg.is_urgent ? '🚨 ' : ''}{msg.sender_name}
                </div>
              )}
              <div style={{ fontSize: '13px', lineHeight: 1.4 }}>{msg.message_text}</div>
              <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '4px', textAlign: 'right' as const }}>
                {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                {!isCaregiver && !msg.is_read && <span style={{ marginLeft: '6px', color: '#6366f1' }}>● new</span>}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
        <input value={msgText} onChange={e => setMsgText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message to your patient..." style={{
          flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0',
          fontSize: '13px', outline: 'none', background: '#f8fafc',
        }} />
        <button onClick={sendMessage} disabled={sending || !msgText.trim()} style={{
          padding: '10px 16px', borderRadius: '12px', border: 'none',
          background: '#6366f1', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px',
          opacity: sending || !msgText.trim() ? 0.5 : 1,
        }}>
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
