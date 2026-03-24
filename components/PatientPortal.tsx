import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { VoiceDemo } from './VoiceDemo';
import { playSentSound, playReceivedSound } from '../utils/sounds';

type Tab = 'home' | 'meds' | 'tasks' | 'messages';

interface PatientData {
  meds: any[];
  tasks: any[];
  appointments: any[];
  vitals: any;
  messages: any[];
  unreadCount: number;
}

export const PatientPortal: React.FC = () => {
    const [searchParams] = useSearchParams();
    const tokenUuid = searchParams.get('id');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [patient, setPatient] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCallingPhone, setIsCallingPhone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [data, setData] = useState<PatientData>({ meds: [], tasks: [], appointments: [], vitals: null, messages: [], unreadCount: 0 });
    const [msgText, setMsgText] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const [patientContext, setPatientContext] = useState('');
    const msgEndRef = useRef<HTMLDivElement>(null);
    const prevMsgCountRef = useRef<number>(0);
    const initialMsgLoadRef = useRef<boolean>(true);
    const justSentRef = useRef<boolean>(false);
    const UPLINK = import.meta.env.DEV ? 'http://localhost:8081' : '';

    useEffect(() => {
        if (tokenUuid) {
            setIsLoading(true);
            supabase.from('user_profiles').select('*').eq('id', tokenUuid).single()
                .then(({ data }) => {
                    if (data) setPatient(data);
                    else setError("Invalid Secure Invitation Token.");
                    setIsLoading(false);
                });
        }
    }, [tokenUuid]);

    useEffect(() => {
        if (patient?.id) {
            // Reset message tracking refs on patient change
            initialMsgLoadRef.current = true;
            prevMsgCountRef.current = 0;
            justSentRef.current = false;

            loadData();
            // Fetch voice context from server (same as phone call context)
            fetch(`${UPLINK}/api/patient-context/${patient.id}`)
                .then(r => r.json())
                .then(ctx => { if (ctx.contextString) setPatientContext(ctx.contextString); })
                .catch(err => console.error('Failed to load patient context:', err));
            // Full data refresh every 30s
            const interval = setInterval(loadData, 30000);
            // Fast message-only poll every 5s for near-realtime chat
            const msgPoll = setInterval(async () => {
                try {
                    const res = await fetch(`${UPLINK}/api/messages/${patient.id}`);
                    if (res.ok) {
                        const msgs = await res.json();
                        if (Array.isArray(msgs)) {
                            // Play received sound for new incoming messages
                            if (!initialMsgLoadRef.current && !justSentRef.current && msgs.length > prevMsgCountRef.current) {
                                const incoming = msgs.slice(prevMsgCountRef.current);
                                if (incoming.some((m: any) => m.sender_type !== 'patient')) playReceivedSound();
                            }
                            justSentRef.current = false;
                            initialMsgLoadRef.current = false;
                            prevMsgCountRef.current = msgs.length;
                            setData(prev => ({ ...prev, messages: msgs, unreadCount: msgs.filter((m: any) => !m.is_read && m.sender_type !== 'patient').length }));
                        }
                    }
                } catch {} 
            }, 5000);
            // Realtime message subscription for instant delivery
            const sub = supabase.channel(`patient-msg-${patient.id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'care_messages', filter: `patient_id=eq.${patient.id}` },
                    () => loadData())
                .subscribe();
            return () => { clearInterval(interval); clearInterval(msgPoll); supabase.removeChannel(sub); };
        }
    }, [patient?.id]);

    useEffect(() => {
        if (activeTab === 'messages') msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [data.messages, activeTab]);

    const loadData = async () => {
        if (!patient?.id) return;
        const today = new Date().toLocaleDateString('en-CA', { timeZone: patient.timezone || 'America/New_York' });
        const dayStart = `${today}T00:00:00.000Z`;
        const dayEnd = `${today}T23:59:59.999Z`;

        const [medRes, taskRes, aptRes, vitRes, msgRes] = await Promise.allSettled([
            // Today's med schedule
            supabase.from('medication_schedule_events').select('*').eq('patient_id', patient.id)
                .is('invalidated_at', null).gte('scheduled_for', dayStart).lte('scheduled_for', dayEnd)
                .order('scheduled_for', { ascending: true }),
            // Today's care tasks
            supabase.from('care_task_instances').select('*').eq('patient_id', patient.id)
                .eq('scheduled_date', today).order('scheduled_time', { ascending: true, nullsFirst: false }),
            // Upcoming appointments
            supabase.from('calendar_events').select('*').eq('user_id', patient.id)
                .gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
            // Latest vitals
            supabase.from('health_vitals_logs').select('*').eq('patient_id', patient.id)
                .order('recorded_at', { ascending: false }).limit(1).single(),
            // Messages — via API to avoid RLS/auth issues
            fetch(`${UPLINK}/api/messages/${patient.id}`).then(r => r.json()),
        ]);

        setData({
            meds: medRes.status === 'fulfilled' ? (medRes.value.data || []) : [],
            tasks: taskRes.status === 'fulfilled' ? (taskRes.value.data || []) : [],
            appointments: aptRes.status === 'fulfilled' ? (aptRes.value.data || []) : [],
            vitals: vitRes.status === 'fulfilled' ? vitRes.value.data : null,
            messages: msgRes.status === 'fulfilled' ? (Array.isArray(msgRes.value) ? msgRes.value : []) : [],
            unreadCount: msgRes.status === 'fulfilled' ? (Array.isArray(msgRes.value) ? msgRes.value : []).filter((m: any) => !m.is_read && m.sender_type !== 'patient').length : 0,
        });
    };

    const sendMessage = async () => {
        if (!msgText.trim() || !patient?.id) return;
        setSendingMsg(true);
        try {
            const res = await fetch(`${UPLINK}/api/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patient.id,
                    sender_type: 'patient',
                    sender_name: patient.preferred_name || patient.full_name?.split(' ')[0] || 'Patient',
                    message_text: msgText.trim(),
                    message_type: 'text',
                }),
            });
            if (res.ok) {
                playSentSound();
                justSentRef.current = true;
                prevMsgCountRef.current += 1;
            }
            setMsgText('');
            loadData();
        } catch (err) { console.error(err); }
        finally { setSendingMsg(false); }
    };

    const markMessagesRead = async () => {
        if (!patient?.id) return;
        await fetch(`${UPLINK}/api/messages/${patient.id}/read`, { method: 'PUT' });
        loadData();
    };

    const triggerCall = async () => {
        if (isCallingPhone) return;
        setIsCallingPhone(true);
        try {
            await fetch(`${UPLINK}/api/trigger-call`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: patient.phone_number, voiceId: patient.voice_id || 'Puck', prompt: "Hello! You requested a phone call. How are you doing today?" }),
            });
            setTimeout(() => setIsCallingPhone(false), 5000);
        } catch { setIsCallingPhone(false); }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!phoneNumber.trim()) { setError("Please enter your Phone Number."); return; }
        setIsLoading(true);
        let q = phoneNumber.trim();
        const d = q.replace(/\D/g, '');
        if (d.length === 10) q = '+1' + d; else if (!q.startsWith('+') && d.length >= 10) q = '+' + d;
        try {
            const { data, error: dbErr } = await supabase.from('user_profiles').select('*')
                .or(`phone_number.eq.${q},phone_number.eq.${phoneNumber.trim()}`).single();
            if (dbErr || !data) { setError("We couldn't find a care profile linked to this phone number."); return; }
            setPatient(data);
        } catch { setError("Network Error."); }
        finally { setIsLoading(false); }
    };

    // ========== LOGGED-IN EXPERIENCE ==========
    if (patient) {
        const tz = patient.timezone || 'America/New_York';
        const name = patient.preferred_name || patient.full_name?.split(' ')[0] || 'Friend';
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const medsTaken = data.meds.filter(m => m.status === 'taken').length;
        const tasksDone = data.tasks.filter(t => t.status === 'completed').length;

        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f0f4ff 0%, #f8fafc 50%)', fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: '80px' }}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '24px 20px 20px', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', opacity: 0.8 }}>💙 MyParallel</span>
                        <button onClick={() => setPatient(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Sign out</button>
                    </div>
                    <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>{greeting}, {name}</h1>
                    <p style={{ fontSize: '13px', opacity: 0.8, margin: '4px 0 0' }}>
                        {new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Content */}
                <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
                    {activeTab === 'home' && (
                        <>
                            {/* Quick Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <StatCard icon="💊" label="Meds Today" value={`${medsTaken}/${data.meds.length}`} color="#6366f1" progress={data.meds.length > 0 ? medsTaken / data.meds.length : 0} />
                                <StatCard icon="📋" label="Tasks Done" value={`${tasksDone}/${data.tasks.length}`} color="#22c55e" progress={data.tasks.length > 0 ? tasksDone / data.tasks.length : 0} />
                            </div>

                            {/* Voice Assistant */}
                            <div style={{ ...card, background: 'linear-gradient(135deg, #f0f4ff, #ede9fe)', border: '1px solid #c7d2fe', marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#4338ca', margin: '0 0 8px' }}>🎙️ Talk to Your Companion</h3>
                                <p style={{ fontSize: '12px', color: '#6366f1', margin: '0 0 12px' }}>Ask about your meds, schedule, or just chat</p>
                                <VoiceDemo lockedVoiceId={patient.voice_id || 'Puck'} lockedPhoneNumber={patient.phone_number} patientId={patient.id} patientContextString={patientContext} />
                            </div>

                            {/* Call My Phone */}
                            <button onClick={triggerCall} disabled={isCallingPhone} style={{
                                width: '100%', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                background: isCallingPhone ? '#d1fae5' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                color: isCallingPhone ? '#16a34a' : '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            }}>
                                📞 {isCallingPhone ? 'Calling your phone...' : 'Call My Phone'}
                            </button>

                            {/* Next Appointment */}
                            {data.appointments.length > 0 && (
                                <div style={{ ...card, marginBottom: '12px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>📅 Next Appointment</h3>
                                    <div style={{ padding: '10px', borderRadius: '10px', background: '#f0f4ff', border: '1px solid #e0e7ff' }}>
                                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b' }}>{data.appointments[0].title}</div>
                                        <div style={{ fontSize: '13px', color: '#6366f1', marginTop: '2px' }}>
                                            {new Date(data.appointments[0].start_time).toLocaleString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </div>
                                        {data.appointments[0].description && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{data.appointments[0].description}</div>}
                                    </div>
                                </div>
                            )}

                            {/* Vitals */}
                            {data.vitals && (
                                <div style={{ ...card }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>🩺 Latest Vitals</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {data.vitals.blood_pressure_systolic && <VitalPill label="BP" value={`${data.vitals.blood_pressure_systolic}/${data.vitals.blood_pressure_diastolic}`} />}
                                        {data.vitals.heart_rate && <VitalPill label="HR" value={`${data.vitals.heart_rate}`} />}
                                        {data.vitals.oxygen_saturation && <VitalPill label="O₂" value={`${data.vitals.oxygen_saturation}%`} />}
                                        {data.vitals.temperature && <VitalPill label="Temp" value={`${data.vitals.temperature}°`} />}
                                        {data.vitals.pain_level != null && <VitalPill label="Pain" value={`${data.vitals.pain_level}/10`} />}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'meds' && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>💊 Today's Medications</h2>
                            {data.meds.length === 0 ? (
                                <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>No medications scheduled today</div>
                            ) : data.meds.map(med => {
                                const time = new Date(med.scheduled_for).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
                                const statusColors: Record<string, string> = { taken: '#22c55e', due: '#94a3b8', missed: '#ef4444', refused: '#f97316' };
                                const color = statusColors[med.status] || '#94a3b8';
                                return (
                                    <div key={med.id} style={{ ...card, marginBottom: '10px', borderLeft: `4px solid ${color}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>{med.medication_name}</div>
                                            {med.dose_text && <div style={{ fontSize: '13px', color: '#64748b' }}>{med.dose_text}</div>}
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>⏰ {time}</div>
                                            {med.instruction_summary && <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '4px' }}>💡 {med.instruction_summary}</div>}
                                        </div>
                                        <div style={{ padding: '6px 12px', borderRadius: '8px', background: `${color}15`, color, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const }}>
                                            {med.status}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>📋 Today's Care Tasks</h2>
                            {data.tasks.length === 0 ? (
                                <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>No care tasks scheduled today</div>
                            ) : data.tasks.map(task => (
                                <div key={task.id} style={{ ...card, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', opacity: task.status === 'completed' ? 0.6 : 1 }}>
                                    <span style={{ fontSize: '22px' }}>{task.icon || '📋'}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</div>
                                        {task.scheduled_time && <div style={{ fontSize: '12px', color: '#94a3b8' }}>⏰ {task.scheduled_time.substring(0, 5)}</div>}
                                    </div>
                                    <span style={{ fontSize: '18px' }}>{task.status === 'completed' ? '✅' : '⭕'}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'messages' && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: '0 0 12px' }}>💬 Messages</h2>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}
                                 onScroll={() => { if (data.unreadCount > 0) markMessagesRead(); }}>
                                {data.messages.length === 0 ? (
                                    <div style={{ ...card, textAlign: 'center', color: '#94a3b8', margin: 'auto 0' }}>
                                        <p style={{ fontSize: '28px', marginBottom: '8px' }}>💬</p>
                                        <p>Send a message to your caregiver</p>
                                    </div>
                                ) : data.messages.map(msg => {
                                    const isMe = msg.sender_type === 'patient';
                                    return (
                                        <div key={msg.id} style={{
                                            maxWidth: '80%', alignSelf: isMe ? 'flex-end' : 'flex-start',
                                            padding: '10px 14px', borderRadius: '16px',
                                            background: isMe ? '#6366f1' : '#fff',
                                            color: isMe ? '#fff' : '#1e293b',
                                            border: isMe ? 'none' : '1px solid #e2e8f0',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                        }}>
                                            {!isMe && <div style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', marginBottom: '2px' }}>{msg.sender_name}</div>}
                                            <div style={{ fontSize: '14px', lineHeight: 1.4 }}>{msg.message_text}</div>
                                            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' as const }}>
                                                {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={msgEndRef} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                                <input value={msgText} onChange={e => setMsgText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type a message..." style={{
                                    flex: 1, padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0',
                                    fontSize: '15px', outline: 'none', background: '#fff',
                                }} />
                                <button onClick={sendMessage} disabled={sendingMsg || !msgText.trim()} style={{
                                    padding: '12px 18px', borderRadius: '14px', border: 'none',
                                    background: '#6366f1', color: '#fff', fontWeight: 700, cursor: 'pointer',
                                    opacity: sendingMsg || !msgText.trim() ? 0.5 : 1,
                                }}>
                                    {sendingMsg ? '...' : '➤'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Tab Bar */}
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
                    borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around',
                    padding: '8px 0 env(safe-area-inset-bottom, 8px)', zIndex: 100,
                }}>
                    <TabBtn icon="🏠" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                    <TabBtn icon="💊" label="Meds" active={activeTab === 'meds'} onClick={() => setActiveTab('meds')} badge={data.meds.filter(m => m.status === 'due').length || undefined} />
                    <TabBtn icon="📋" label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} badge={data.tasks.filter(t => t.status === 'pending').length || undefined} />
                    <TabBtn icon="💬" label="Messages" active={activeTab === 'messages'} onClick={() => { setActiveTab('messages'); markMessagesRead(); }} badge={data.unreadCount || undefined} />
                </div>
            </div>
        );
    }

    // ========== LOGIN SCREEN ==========
    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f0f4ff, #f8fafc)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <div style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '24px', padding: '40px 32px', boxShadow: '0 8px 32px rgba(99,102,241,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <img src="/images/Logo_MyParallel.png" alt="MyParallel" style={{ height: '56px', margin: '0 auto 16px' }} />
                    <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b' }}>Welcome Back</h2>
                    <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>Enter your phone number to access your care portal</p>
                </div>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Phone Number</label>
                        <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+1 (555) 123-4567"
                            autoFocus style={{ width: '100%', fontSize: '18px', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const }} />
                    </div>
                    {error && <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', fontSize: '13px', fontWeight: 500 }}>{error}</div>}
                    <button type="submit" disabled={isLoading} style={{
                        width: '100%', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: '16px',
                        opacity: isLoading ? 0.6 : 1, boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                    }}>
                        {isLoading ? 'Verifying...' : 'Access My Care Portal'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ========== SUB-COMPONENTS ==========

function StatCard({ icon, label, value, color, progress }: { icon: string; label: string; value: string; color: string; progress: number }) {
    return (
        <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>{label}</div>
            <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: color, borderRadius: '2px', transition: 'width 0.5s' }} />
            </div>
        </div>
    );
}

function VitalPill({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ padding: '6px 12px', borderRadius: '8px', background: '#f1f5f9', fontSize: '12px' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>{label} </span>
            <span style={{ color: '#1e293b', fontWeight: 700 }}>{value}</span>
        </div>
    );
}

function TabBtn({ icon, label, active, onClick, badge }: { icon: string; label: string; active: boolean; onClick: () => void; badge?: number }) {
    return (
        <button onClick={onClick} style={{
            background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            color: active ? '#6366f1' : '#94a3b8', fontSize: '20px', position: 'relative' as const, padding: '4px 16px',
        }}>
            <span>{icon}</span>
            <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500 }}>{label}</span>
            {badge && badge > 0 && (
                <span style={{
                    position: 'absolute', top: '-2px', right: '6px', background: '#ef4444', color: '#fff',
                    fontSize: '9px', fontWeight: 800, borderRadius: '50%', width: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{badge}</span>
            )}
        </button>
    );
}

const card: React.CSSProperties = {
    background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
    padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

export default PatientPortal;
