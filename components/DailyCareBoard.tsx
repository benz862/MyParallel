import { useState, useEffect, useCallback } from 'react';

interface CareTask {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  scheduled_time: string;
  status: string;
  priority: string;
  notes: string;
  completed_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'To Do',     color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  completed: { label: 'Done',      color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  skipped:   { label: 'Skipped',   color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' },
  refused:   { label: 'Refused',   color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
  delayed:   { label: 'Delayed',   color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
};

const CATEGORY_COLORS: Record<string, string> = {
  hygiene: '#06b6d4', medication: '#8b5cf6', meals: '#f97316', exercise: '#22c55e',
  vitals: '#ef4444', emotional: '#eab308', safety: '#3b82f6', custom: '#64748b', general: '#94a3b8',
};

export default function DailyCareBoard({ patientId }: { patientId: string }) {
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [quickTitle, setQuickTitle] = useState('');
  const [seeding, setSeeding] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || '';

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/care-tasks/${patientId}/${selectedDate}`);
      if (res.ok) setTasks(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [patientId, selectedDate]);

  useEffect(() => { setLoading(true); fetchTasks(); }, [fetchTasks]);

  const updateStatus = async (taskId: string, status: string) => {
    try {
      await fetch(`${apiBase}/api/care-tasks/${taskId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, completed_at: status === 'completed' ? new Date().toISOString() : t.completed_at } : t));
    } catch (err) { console.error(err); }
  };

  const addQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    try {
      const res = await fetch(`${apiBase}/api/care-tasks/${patientId}/quick`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, title: quickTitle.trim(), category: 'custom' }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks(prev => [...prev, task]);
        setQuickTitle('');
      }
    } catch (err) { console.error(err); }
  };

  const seedTemplates = async () => {
    setSeeding(true);
    try {
      await fetch(`${apiBase}/api/care-templates/${patientId}/seed`, { method: 'POST' });
      await fetchTasks();
    } catch (err) { console.error(err); }
    finally { setSeeding(false); }
  };

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>📋 Daily Care Board</h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            {isToday ? "Today's" : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + "'s"} care tasks
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => changeDate(-1)} style={{ ...navBtnStyle }}>◀</button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569', minWidth: '80px', textAlign: 'center' }}>
            {isToday ? 'Today' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <button onClick={() => changeDate(1)} style={{ ...navBtnStyle }}>▶</button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>{completed} of {total} completed</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>{pct}%</span>
          </div>
          <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '3px', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* Task list */}
      <div style={{ padding: '16px 24px', maxHeight: '500px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p style={{ color: '#94a3b8', marginBottom: '12px' }}>No tasks yet for this day.</p>
            <button onClick={seedTemplates} disabled={seeding} style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, fontSize: '14px',
            }}>
              {seeding ? 'Setting up...' : '✨ Generate Default Care Routine'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map(task => {
              const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
              const catColor = CATEGORY_COLORS[task.category] || '#94a3b8';

              return (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '12px',
                  background: statusConfig.bg, border: `1px solid ${statusConfig.border}`,
                  opacity: task.status === 'completed' ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}>
                  {/* Icon */}
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{task.icon}</span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontWeight: 600, fontSize: '14px',
                        color: task.status === 'completed' ? '#94a3b8' : '#1e293b',
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      }}>{task.title}</span>
                      {task.priority === 'high' || task.priority === 'critical' ? (
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                          background: task.priority === 'critical' ? '#fef2f2' : '#fffbeb',
                          color: task.priority === 'critical' ? '#ef4444' : '#f59e0b',
                        }}>
                          {task.priority === 'critical' ? '‼️' : '❗'}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      {task.scheduled_time && (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatTime(task.scheduled_time)}</span>
                      )}
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                        background: `${catColor}15`, color: catColor,
                      }}>{task.category}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {task.status !== 'completed' && (
                      <button onClick={() => updateStatus(task.id, 'completed')} title="Mark done"
                        style={{ ...actionBtnStyle, background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' }}>✓</button>
                    )}
                    {task.status !== 'skipped' && task.status !== 'completed' && (
                      <button onClick={() => updateStatus(task.id, 'skipped')} title="Skip"
                        style={{ ...actionBtnStyle, background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #c4b5fd' }}>⊘</button>
                    )}
                    {task.status !== 'refused' && task.status !== 'completed' && (
                      <button onClick={() => updateStatus(task.id, 'refused')} title="Refused"
                        style={{ ...actionBtnStyle, background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }}>✗</button>
                    )}
                    {task.status === 'completed' && (
                      <button onClick={() => updateStatus(task.id, 'pending')} title="Undo"
                        style={{ ...actionBtnStyle, background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>↩</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick add */}
      <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #f1f5f9' }}>
        <form onSubmit={addQuickTask} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text" value={quickTitle} onChange={e => setQuickTitle(e.target.value)}
            placeholder="+ Add a quick task..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0',
              fontSize: '14px', background: '#f8fafc', outline: 'none',
            }}
          />
          <button type="submit" disabled={!quickTitle.trim()} style={{
            padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: quickTitle.trim() ? '#6366f1' : '#e2e8f0',
            color: quickTitle.trim() ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: '14px',
          }}>Add</button>
        </form>
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0',
  background: '#f8fafc', cursor: 'pointer', fontSize: '12px', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: '#64748b',
};

const actionBtnStyle: React.CSSProperties = {
  width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer',
  fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center',
  justifyContent: 'center', transition: 'transform 0.1s',
};
