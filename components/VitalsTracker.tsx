import { useState, useEffect } from 'react';

interface VitalEntry {
  id?: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  oxygen_saturation?: number;
  temperature?: number;
  weight?: number;
  blood_glucose?: number;
  blood_glucose_timing?: string;
  pain_level?: number;
  mood_level?: number;
  mood_description?: string;
  sleep_hours?: number;
  sleep_quality?: string;
  hydration_oz?: number;
  meals_eaten?: number;
  appetite?: string;
  bowel_activity?: boolean;
  notes?: string;
  recorded_at?: string;
}

const VITAL_FIELDS = [
  { group: 'Cardiovascular', icon: '❤️', fields: [
    { key: 'blood_pressure_systolic', label: 'BP Systolic', type: 'number', unit: 'mmHg', placeholder: '120' },
    { key: 'blood_pressure_diastolic', label: 'BP Diastolic', type: 'number', unit: 'mmHg', placeholder: '80' },
    { key: 'heart_rate', label: 'Heart Rate', type: 'number', unit: 'bpm', placeholder: '72' },
    { key: 'oxygen_saturation', label: 'O₂ Sat', type: 'number', unit: '%', placeholder: '98' },
  ]},
  { group: 'Body', icon: '🌡️', fields: [
    { key: 'temperature', label: 'Temp', type: 'number', unit: '°F', placeholder: '98.6' },
    { key: 'weight', label: 'Weight', type: 'number', unit: 'lbs', placeholder: '165' },
    { key: 'blood_glucose', label: 'Glucose', type: 'number', unit: 'mg/dL', placeholder: '100' },
  ]},
  { group: 'Wellbeing', icon: '💛', fields: [
    { key: 'pain_level', label: 'Pain', type: 'range', min: 0, max: 10 },
    { key: 'mood_level', label: 'Mood', type: 'range', min: 1, max: 10 },
    { key: 'sleep_hours', label: 'Sleep', type: 'number', unit: 'hrs', placeholder: '7' },
  ]},
  { group: 'Nutrition', icon: '🍽️', fields: [
    { key: 'hydration_oz', label: 'Water', type: 'number', unit: 'oz', placeholder: '64' },
    { key: 'meals_eaten', label: 'Meals', type: 'number', unit: '', placeholder: '3' },
  ]},
];

export default function VitalsTracker({ patientId }: { patientId: string }) {
  const [form, setForm] = useState<VitalEntry>({});
  const [latest, setLatest] = useState<VitalEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const apiBase = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (!patientId) return;
    fetch(`${apiBase}/api/vitals/${patientId}/latest`)
      .then(r => r.json())
      .then(d => { if (d) setLatest(d); })
      .catch(console.error);
  }, [patientId]);

  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value === '' ? undefined : value }));
    setSaved(false);
  };

  const handleSubmit = async () => {
    // Only submit non-empty fields
    const cleanForm: any = { patient_id: patientId };
    for (const [k, v] of Object.entries(form)) {
      if (v !== undefined && v !== '' && v !== null) {
        cleanForm[k] = typeof v === 'string' && !isNaN(Number(v)) ? Number(v) : v;
      }
    }
    if (Object.keys(cleanForm).length <= 1) return; // only patient_id

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/vitals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanForm),
      });
      if (res.ok) {
        const data = await res.json();
        setLatest(data);
        setForm({});
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const formatLatestTime = (ts: string) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>🩺 Health Vitals</h3>
          {latest?.recorded_at && (
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>Last recorded: {formatLatestTime(latest.recorded_at)}</p>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{
          padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0',
          background: expanded ? '#6366f1' : '#f8fafc', color: expanded ? '#fff' : '#475569',
          cursor: 'pointer', fontSize: '13px', fontWeight: 600,
        }}>
          {expanded ? '▲ Collapse' : '+ Log Vitals'}
        </button>
      </div>

      {/* Latest vitals summary cards */}
      {latest && !expanded && (
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
          {latest.blood_pressure_systolic && (
            <VitalCard icon="❤️" label="BP" value={`${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}`}
              alert={latest.blood_pressure_systolic > 140 || latest.blood_pressure_diastolic! > 90} />
          )}
          {latest.heart_rate && <VitalCard icon="💓" label="HR" value={`${latest.heart_rate}`} unit="bpm" />}
          {latest.oxygen_saturation && (
            <VitalCard icon="🫁" label="O₂" value={`${latest.oxygen_saturation}`} unit="%"
              alert={latest.oxygen_saturation < 95} />
          )}
          {latest.temperature && (
            <VitalCard icon="🌡️" label="Temp" value={`${latest.temperature}`} unit="°F"
              alert={latest.temperature > 100.4} />
          )}
          {latest.weight && <VitalCard icon="⚖️" label="Weight" value={`${latest.weight}`} unit="lbs" />}
          {latest.blood_glucose && (
            <VitalCard icon="🩸" label="Glucose" value={`${latest.blood_glucose}`} unit="mg/dL"
              alert={latest.blood_glucose < 70 || latest.blood_glucose > 180} />
          )}
          {latest.pain_level !== undefined && latest.pain_level !== null && (
            <VitalCard icon="😣" label="Pain" value={`${latest.pain_level}`} unit="/10"
              alert={latest.pain_level > 6} />
          )}
          {latest.mood_level !== undefined && latest.mood_level !== null && (
            <VitalCard icon="🧠" label="Mood" value={`${latest.mood_level}`} unit="/10" />
          )}
        </div>
      )}

      {/* Entry form */}
      {expanded && (
        <div style={{ padding: '16px 24px' }}>
          {VITAL_FIELDS.map(group => (
            <div key={group.group} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                {group.icon} {group.group}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                {group.fields.map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                      {field.label} {field.unit ? `(${field.unit})` : ''}
                    </label>
                    {field.type === 'range' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="range" min={field.min} max={field.max}
                          value={(form as any)[field.key] || field.min}
                          onChange={e => handleChange(field.key, e.target.value)}
                          style={{ flex: 1 }} />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569', minWidth: '20px' }}>
                          {(form as any)[field.key] || '—'}
                        </span>
                      </div>
                    ) : (
                      <input type="number" step="any"
                        placeholder={field.placeholder}
                        value={(form as any)[field.key] ?? ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: '8px',
                          border: '1px solid #e2e8f0', fontSize: '14px', background: '#f8fafc',
                          outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleChange('notes', e.target.value)}
              placeholder="Any additional observations..."
              style={{
                width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0',
                fontSize: '14px', background: '#f8fafc', minHeight: '60px', resize: 'vertical',
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setExpanded(false); setForm({}); }} style={{
              padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: 600,
            }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: saved ? '#22c55e' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
            }}>
              {saving ? 'Saving...' : saved ? '✓ Saved!' : '💾 Save Vitals'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VitalCard({ icon, label, value, unit, alert }: { icon: string; label: string; value: string; unit?: string; alert?: boolean }) {
  return (
    <div style={{
      padding: '10px', borderRadius: '10px', textAlign: 'center',
      background: alert ? '#fef2f2' : '#f8fafc',
      border: `1px solid ${alert ? '#fca5a5' : '#e2e8f0'}`,
    }}>
      <div style={{ fontSize: '16px' }}>{icon}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: alert ? '#ef4444' : '#1e293b' }}>
        {value}<span style={{ fontSize: '11px', fontWeight: 400, color: '#94a3b8' }}>{unit}</span>
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{label}</div>
    </div>
  );
}
