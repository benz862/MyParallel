import { useState, useEffect } from 'react';

interface DashboardData {
  patient: { id: string; full_name: string; preferred_name: string; age: number; conditions: string[]; photo_url: string };
  permissions: Record<string, boolean>;
  alerts: Array<{ id: string; alert_type: string; severity: string; title: string; body: string; is_read: boolean; created_at: string }>;
  unreadCount: number;
  medications: { total: number; taken: number; missed: number; due: number; items: Array<{ name: string; time: string; status: string; dose: string }> } | null;
  appointments: Array<{ id: string; title: string; description: string; start_time: string }> | null;
  careTasks: { total: number; completed: number; pending: number; items: Array<{ title: string; icon: string; status: string; time: string }> } | null;
}

const ALERT_ICONS: Record<string, string> = {
  medication_taken: '💊', medication_missed: '❌', appointment_upcoming: '📅',
  incident: '🚨', vitals_alert: '⚠️', care_task_completed: '✅', daily_summary: '📋', custom: '📝',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: '#6366f1', warning: '#f59e0b', urgent: '#ef4444', critical: '#dc2626',
};

const MED_STATUS_COLORS: Record<string, string> = {
  taken: '#22c55e', missed: '#ef4444', due: '#94a3b8', refused: '#f97316', held: '#eab308',
};

export default function FamilyDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memberName, setMemberName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [memberId, setMemberId] = useState('');

  const apiBase = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (!code) {
      setError('No invite code provided. Please use the link your caregiver shared.');
      setLoading(false);
      return;
    }
    setInviteCode(code);
    lookupAndLoad(code);
  }, []);

  const lookupAndLoad = async (code: string) => {
    try {
      // Look up the family member by invite code
      const lookupRes = await fetch(`${apiBase}/api/family/invite/${code}`);
      if (!lookupRes.ok) throw new Error('Invalid or expired invite link');
      const member = await lookupRes.json();

      if (member.invite_status === 'pending') {
        // Auto-accept the invite on first visit
        await fetch(`${apiBase}/api/family/accept-invite`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode: code }),
        });
      }

      setMemberName(member.full_name);
      setMemberId(member.id);

      // Load dashboard data
      const dashRes = await fetch(`${apiBase}/api/family/${member.id}/dashboard`);
      if (!dashRes.ok) throw new Error('Could not load dashboard');
      setDashboard(await dashRes.json());
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (alertId: string) => {
    await fetch(`${apiBase}/api/family/alerts/${alertId}/read`, { method: 'PUT' });
    setDashboard(prev => prev ? {
      ...prev,
      alerts: prev.alerts.map(a => a.id === alertId ? { ...a, is_read: true } : a),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    } : null);
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💙</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>MyParallel</h1>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>Loading your family dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Access Issue</h1>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>{error}</p>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '16px' }}>Contact your caregiver for a new invite link.</p>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;
  const { patient, medications, appointments, careTasks, alerts, unreadCount } = dashboard;
  const patientName = patient?.preferred_name || patient?.full_name || 'Your loved one';

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '20px',
          padding: '28px', color: '#fff', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', opacity: 0.8 }}>💙 MyParallel Family</span>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>Welcome, {memberName}</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px' }}>{patientName}</h1>
          <p style={{ fontSize: '14px', opacity: 0.85, margin: 0 }}>
            {patient?.age ? `Age ${patient.age}` : ''}{patient?.conditions?.length ? ` · ${patient.conditions.join(', ')}` : ''}
          </p>
        </div>

        {/* Alerts Banner */}
        {unreadCount > 0 && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '14px',
            padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>{unreadCount} new alert{unreadCount > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>

          {/* Medications Card */}
          {medications && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>💊 Today's Medications</h3>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <StatBubble label="Taken" value={medications.taken} color="#22c55e" />
                <StatBubble label="Due" value={medications.due} color="#94a3b8" />
                <StatBubble label="Missed" value={medications.missed} color="#ef4444" />
              </div>
              {medications.total > 0 && (
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ height: '100%', width: `${Math.round((medications.taken / medications.total) * 100)}%`, background: '#22c55e', borderRadius: '3px', transition: 'width 0.5s' }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {medications.items.map((med, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', background: '#f8fafc' }}>
                    <span style={{ fontSize: '13px', color: '#475569' }}>{med.name}{med.dose ? ` (${med.dose})` : ''}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                      background: `${MED_STATUS_COLORS[med.status] || '#94a3b8'}15`, color: MED_STATUS_COLORS[med.status] || '#94a3b8',
                    }}>{med.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Care Tasks Card */}
          {careTasks && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>📋 Today's Care Tasks</h3>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <StatBubble label="Done" value={careTasks.completed} color="#22c55e" />
                <StatBubble label="Pending" value={careTasks.pending} color="#f59e0b" />
                <StatBubble label="Total" value={careTasks.total} color="#64748b" />
              </div>
              {careTasks.total > 0 && (
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ height: '100%', width: `${Math.round((careTasks.completed / careTasks.total) * 100)}%`, background: '#22c55e', borderRadius: '3px', transition: 'width 0.5s' }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {careTasks.items.slice(0, 8).map((task, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '6px', background: '#f8fafc', fontSize: '13px' }}>
                    <span>{task.icon}</span>
                    <span style={{ flex: 1, color: task.status === 'completed' ? '#94a3b8' : '#475569', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</span>
                    <span style={{ fontSize: '10px', color: task.status === 'completed' ? '#22c55e' : '#f59e0b' }}>{task.status === 'completed' ? '✓' : '○'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointments Card */}
          {appointments && appointments.length > 0 && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>📅 Upcoming Appointments</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {appointments.map(apt => (
                  <div key={apt.id} style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{apt.title}</div>
                    <div style={{ fontSize: '12px', color: '#6366f1', marginTop: '2px' }}>
                      {new Date(apt.start_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                    {apt.description && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{apt.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts Feed */}
          <div style={{ ...cardStyle, gridColumn: 'span 1' }}>
            <h3 style={cardTitleStyle}>🔔 Recent Updates</h3>
            {alerts.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '16px' }}>No updates yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                {alerts.slice(0, 15).map(alert => (
                  <div key={alert.id} onClick={() => !alert.is_read && markRead(alert.id)} style={{
                    padding: '10px', borderRadius: '10px', cursor: alert.is_read ? 'default' : 'pointer',
                    background: alert.is_read ? '#f8fafc' : '#f5f3ff',
                    border: `1px solid ${alert.is_read ? '#e2e8f0' : SEVERITY_COLORS[alert.severity] + '40'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{ALERT_ICONS[alert.alert_type] || '📝'}</span>
                      <span style={{ fontWeight: alert.is_read ? 400 : 600, fontSize: '13px', color: '#1e293b', flex: 1 }}>{alert.title}</span>
                      {!alert.is_read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />}
                    </div>
                    {alert.body && <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 22px' }}>{alert.body}</p>}
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', marginLeft: '22px' }}>
                      {new Date(alert.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0 8px', color: '#94a3b8', fontSize: '12px' }}>
          Powered by MyParallel · Updated {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function StatBubble({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '22px', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{label}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc, #f1f5f9)',
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const cardStyle: React.CSSProperties = {
  background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
  padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 14px',
};
