import { useState, useEffect } from 'react';

interface AdherenceSummary {
  date: string;
  total: number;
  taken: number;
  missed: number;
  refused: number;
  held: number;
  due: number;
  medications: Record<string, {
    total: number;
    taken: number;
    missed: number;
    refused: number;
    held: number;
    due: number;
    doses: Array<{
      id: string;
      time: string;
      status: string;
      dose_text: string;
      route: string;
      instructions: string;
    }>;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  taken: '#22c55e',
  missed: '#ef4444',
  refused: '#f97316',
  held: '#eab308',
  due: '#94a3b8',
};

const STATUS_EMOJI: Record<string, string> = {
  taken: '✓',
  missed: '✗',
  refused: '⊘',
  held: '⏸',
  due: '○',
};

export default function MedicationAdherenceWidget({ patientId }: { patientId: string }) {
  const [summary, setSummary] = useState<AdherenceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    fetchAdherence();
    const interval = setInterval(fetchAdherence, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [patientId]);

  const fetchAdherence = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/medications/${patientId}/adherence?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Adherence fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ color: '#94a3b8', textAlign: 'center' }}>Loading medication summary...</div>
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>💊 Today's Medications</h3>
        <p style={{ color: '#94a3b8', margin: 0 }}>No medications scheduled for today.</p>
      </div>
    );
  }

  const completionRate = summary.total > 0 ? Math.round((summary.taken / summary.total) * 100) : 0;
  const progressColor = completionRate >= 80 ? '#22c55e' : completionRate >= 50 ? '#eab308' : '#ef4444';

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>💊 Today's Medications</h3>
        <span style={{ 
          fontSize: '14px', fontWeight: 700, color: progressColor,
          background: `${progressColor}15`, padding: '4px 12px', borderRadius: '12px'
        }}>
          {completionRate}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#f1f5f9', borderRadius: '8px', height: '8px', marginBottom: '16px', overflow: 'hidden' }}>
        <div style={{ 
          background: `linear-gradient(90deg, ${progressColor}, ${progressColor}cc)`,
          height: '100%', borderRadius: '8px',
          width: `${completionRate}%`,
          transition: 'width 0.5s ease'
        }} />
      </div>

      {/* Status counts */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['taken', 'due', 'missed', 'refused', 'held'] as const).map(status => (
          summary[status] > 0 && (
            <div key={status} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '8px',
              background: `${STATUS_COLORS[status]}12`,
              fontSize: '13px', fontWeight: 600, color: STATUS_COLORS[status]
            }}>
              {STATUS_EMOJI[status]} {summary[status]} {status}
            </div>
          )
        ))}
      </div>

      {/* Per-medication breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.entries(summary.medications).map(([medName, medData]) => (
          <div key={medName} style={{
            padding: '12px', borderRadius: '12px', background: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{medName}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {medData.taken}/{medData.total} taken
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {medData.doses.map((dose, i) => (
                <div key={i} style={{
                  width: '28px', height: '28px', borderRadius: '6px',
                  background: `${STATUS_COLORS[dose.status]}20`,
                  color: STATUS_COLORS[dose.status],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700,
                  border: `1px solid ${STATUS_COLORS[dose.status]}40`,
                  cursor: 'default'
                }} title={`${new Date(dose.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — ${dose.status}`}>
                  {STATUS_EMOJI[dose.status]}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
