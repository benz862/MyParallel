import { useState, useEffect } from 'react';

interface Incident {
  id: string;
  incident_type: string;
  severity: string;
  title: string;
  description: string;
  occurred_at: string;
  location: string;
  injuries_sustained: string;
  actions_taken: string;
  follow_up_required: boolean;
  follow_up_notes: string;
  resolution_status: string;
}

const INCIDENT_TYPES = [
  { value: 'fall', label: '🦶 Fall', color: '#ef4444' },
  { value: 'missed_medication', label: '💊 Missed Medication', color: '#f97316' },
  { value: 'wandering', label: '🚶 Wandering', color: '#8b5cf6' },
  { value: 'behavioral', label: '😤 Behavioral', color: '#eab308' },
  { value: 'injury', label: '🩹 Injury', color: '#ef4444' },
  { value: 'fever', label: '🌡️ Fever / Symptoms', color: '#f97316' },
  { value: 'hospitalization', label: '🏥 Hospitalization', color: '#dc2626' },
  { value: 'emergency', label: '🚨 Emergency', color: '#dc2626' },
  { value: 'other', label: '📝 Other', color: '#64748b' },
];

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: '#22c55e', bg: '#f0fdf4' },
  moderate: { label: 'Moderate', color: '#f59e0b', bg: '#fffbeb' },
  high:     { label: 'High',     color: '#ef4444', bg: '#fef2f2' },
  critical: { label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  open:        { label: 'Open',        color: '#ef4444' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  resolved:    { label: 'Resolved',    color: '#22c55e' },
  escalated:   { label: 'Escalated',   color: '#dc2626' },
};

export default function IncidentLogger({ patientId }: { patientId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    incident_type: 'fall', severity: 'moderate', title: '', description: '',
    location: '', injuries_sustained: '', actions_taken: '',
    follow_up_required: false, follow_up_notes: '',
  });

  const apiBase = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (!patientId) return;
    fetchIncidents();
  }, [patientId]);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${apiBase}/api/incidents/${patientId}`);
      if (res.ok) setIncidents(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const submitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/incidents`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, patient_id: patientId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents(prev => [data, ...prev]);
        setForm({ incident_type: 'fall', severity: 'moderate', title: '', description: '', location: '', injuries_sustained: '', actions_taken: '', follow_up_required: false, follow_up_notes: '' });
        setShowForm(false);
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${apiBase}/api/incidents/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_status: status, ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) }),
      });
      if (res.ok) {
        setIncidents(prev => prev.map(i => i.id === id ? { ...i, resolution_status: status } : i));
      }
    } catch (err) { console.error(err); }
  };

  const openCount = incidents.filter(i => i.resolution_status !== 'resolved').length;

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>🚨 Incident Log</h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
            {incidents.length} recorded{openCount > 0 ? ` · ${openCount} open` : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '8px 16px', borderRadius: '10px', border: 'none',
          background: showForm ? '#f1f5f9' : 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: showForm ? '#64748b' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
        }}>
          {showForm ? '✕ Cancel' : '+ Report Incident'}
        </button>
      </div>

      {/* Report Form */}
      {showForm && (
        <form onSubmit={submitIncident} style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#fef2f2' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.incident_type} onChange={e => setForm(p => ({ ...p, incident_type: e.target.value }))} style={inputStyle}>
                {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Severity</label>
              <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} style={inputStyle}>
                {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Title *</label>
              <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} placeholder="Brief description of incident" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} style={inputStyle} placeholder="e.g. Bedroom, Bathroom, Kitchen" />
            </div>
            <div>
              <label style={labelStyle}>Injuries Sustained</label>
              <input value={form.injuries_sustained} onChange={e => setForm(p => ({ ...p, injuries_sustained: e.target.value }))} style={inputStyle} placeholder="e.g. Bruised elbow, none" />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} placeholder="What happened?" />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Actions Taken</label>
            <textarea value={form.actions_taken} onChange={e => setForm(p => ({ ...p, actions_taken: e.target.value }))} style={{ ...inputStyle, minHeight: '50px', resize: 'vertical', fontFamily: 'inherit' }} placeholder="What was done in response?" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.follow_up_required} onChange={e => setForm(p => ({ ...p, follow_up_required: e.target.checked }))} />
              Follow-up required
            </label>
            {form.follow_up_required && (
              <input value={form.follow_up_notes} onChange={e => setForm(p => ({ ...p, follow_up_notes: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="Follow-up notes" />
            )}
          </div>

          <button type="submit" disabled={saving || !form.title.trim()} style={{
            padding: '10px 24px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
            cursor: 'pointer', fontWeight: 600, fontSize: '14px', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Submitting...' : '🚨 Submit Incident Report'}
          </button>
        </form>
      )}

      {/* Incident list */}
      <div style={{ padding: '16px 24px', maxHeight: '500px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>Loading incidents...</div>
        ) : incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
            <p style={{ fontSize: '32px', marginBottom: '8px' }}>✅</p>
            <p>No incidents recorded. That's great!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {incidents.map(inc => {
              const type = INCIDENT_TYPES.find(t => t.value === inc.incident_type) || INCIDENT_TYPES[8];
              const sev = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.moderate;
              const status = STATUS_BADGE[inc.resolution_status] || STATUS_BADGE.open;

              return (
                <div key={inc.id} style={{
                  padding: '14px', borderRadius: '12px', background: '#f8fafc',
                  border: `1px solid ${inc.resolution_status === 'resolved' ? '#e2e8f0' : sev.color + '40'}`,
                  opacity: inc.resolution_status === 'resolved' ? 0.7 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{inc.title}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: `${type.color}15`, color: type.color }}>
                        {type.label}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: sev.bg, color: sev.color }}>
                        {sev.label}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: `${status.color}15`, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                    {new Date(inc.occurred_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {inc.location ? ` · ${inc.location}` : ''}
                  </div>
                  {inc.description && <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 6px' }}>{inc.description}</p>}
                  {inc.actions_taken && <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px' }}>⚡ Actions: {inc.actions_taken}</p>}
                  {inc.follow_up_required && <p style={{ fontSize: '12px', color: '#f59e0b', margin: '0 0 6px' }}>⏰ Follow-up: {inc.follow_up_notes || 'Required'}</p>}

                  {inc.resolution_status !== 'resolved' && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button onClick={() => updateStatus(inc.id, 'in_progress')} style={{ ...actionBtn, background: '#fffbeb', color: '#f59e0b', border: '1px solid #fcd34d' }}>In Progress</button>
                      <button onClick={() => updateStatus(inc.id, 'resolved')} style={{ ...actionBtn, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' }}>✓ Resolve</button>
                      <button onClick={() => updateStatus(inc.id, 'escalated')} style={{ ...actionBtn, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>⬆ Escalate</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
  fontSize: '14px', background: '#fff', outline: 'none', boxSizing: 'border-box' as const,
};
const actionBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
};
