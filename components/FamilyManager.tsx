import { useState, useEffect } from 'react';

interface FamilyMember {
  id: string;
  full_name: string;
  relationship: string;
  email: string;
  phone: string;
  role: string;
  invite_code: string;
  invite_status: string;
  is_active: boolean;
  family_access_permissions: Array<{
    can_view_medications: boolean;
    can_view_adherence: boolean;
    can_view_appointments: boolean;
    can_view_vitals: boolean;
    can_view_care_tasks: boolean;
    can_view_incidents: boolean;
    can_view_care_notes: boolean;
    can_message_caregiver: boolean;
    can_receive_alerts: boolean;
    can_receive_daily_summary: boolean;
    can_receive_urgent_alerts: boolean;
  }>;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  primary_family:     { label: 'Primary Family',       color: '#6366f1', icon: '👑' },
  secondary_caregiver:{ label: 'Secondary Caregiver',   color: '#8b5cf6', icon: '🤝' },
  supportive:         { label: 'Supportive Member',     color: '#22c55e', icon: '💚' },
  viewer:             { label: 'Viewer',                 color: '#64748b', icon: '👁️' },
  emergency_only:     { label: 'Emergency Only',         color: '#ef4444', icon: '🆘' },
};

const RELATIONSHIP_OPTIONS = ['Spouse', 'Child', 'Sibling', 'Parent', 'Grandchild', 'Friend', 'Guardian', 'Other'];
const ROLE_OPTIONS = Object.entries(ROLE_CONFIG).map(([key, val]) => ({ value: key, label: `${val.icon} ${val.label}` }));

export default function FamilyManager({ patientId }: { patientId: string }) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ code: string; link: string } | null>(null);
  const [form, setForm] = useState({ full_name: '', relationship: 'Child', email: '', phone: '', role: 'viewer' });

  const apiBase = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (!patientId) return;
    fetchMembers();
  }, [patientId]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${apiBase}/api/family/${patientId}/members`);
      if (res.ok) setMembers(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/api/family/${patientId}/invite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        const baseUrl = window.location.origin;
        setInviteResult({
          code: data.inviteCode,
          link: `${baseUrl}/family?invite=${data.inviteCode}`,
        });
        await fetchMembers();
        setForm({ full_name: '', relationship: 'Child', email: '', phone: '', role: 'viewer' });
      }
    } catch (err) { console.error(err); }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this family member? Their access will be revoked.')) return;
    try {
      await fetch(`${apiBase}/api/family/${memberId}`, { method: 'DELETE' });
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) { console.error(err); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>👨‍👩‍👧‍👦 Family Circle</h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>{members.length} member{members.length !== 1 ? 's' : ''} connected</p>
        </div>
        <button onClick={() => { setShowInviteForm(!showInviteForm); setInviteResult(null); }} style={{
          padding: '8px 16px', borderRadius: '10px', border: 'none',
          background: showInviteForm ? '#f1f5f9' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: showInviteForm ? '#64748b' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
        }}>
          {showInviteForm ? '✕ Close' : '+ Invite Family'}
        </button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafbfd' }}>
          {inviteResult ? (
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
              <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Invite Created!</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => copyToClipboard(inviteResult.link)} style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid #6366f1',
                  background: '#f5f3ff', color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                }}>📋 Copy Invite Link</button>
                <button onClick={() => copyToClipboard(inviteResult.code)} style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '13px',
                }}>Code: {inviteResult.code.substring(0, 8)}...</button>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px' }}>Share this link with the family member. They'll use it to access the family dashboard.</p>
            </div>
          ) : (
            <form onSubmit={sendInvite} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  style={{ ...inputStyle }} placeholder="Jane Smith" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Relationship</label>
                <select value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))} style={{ ...inputStyle }}>
                  {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  style={{ ...inputStyle }} placeholder="jane@email.com" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Phone</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  style={{ ...inputStyle }} placeholder="+1 (555) 123-4567" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Access Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ ...inputStyle }}>
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" style={{
                  width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                  cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                }}>Send Invite</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Members list */}
      <div style={{ padding: '16px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>Loading family members...</div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
            No family members invited yet. Tap "Invite Family" to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {members.map(m => {
              const roleConfig = ROLE_CONFIG[m.role] || ROLE_CONFIG.viewer;
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px', borderRadius: '12px', background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: `${roleConfig.color}15`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
                  }}>{roleConfig.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{m.full_name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{m.relationship}</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                        background: `${roleConfig.color}15`, color: roleConfig.color,
                      }}>{roleConfig.label}</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                        background: m.invite_status === 'accepted' ? '#f0fdf4' : '#fffbeb',
                        color: m.invite_status === 'accepted' ? '#16a34a' : '#f59e0b',
                      }}>{m.invite_status}</span>
                    </div>
                  </div>
                  <button onClick={() => removeMember(m.id)} style={{
                    padding: '6px 12px', borderRadius: '8px', border: '1px solid #fca5a5',
                    background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '12px',
                  }}>Remove</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
  fontSize: '14px', background: '#fff', outline: 'none', boxSizing: 'border-box',
};
