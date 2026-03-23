import React, { useState, useEffect, useCallback } from 'react';

interface CareTask {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  scheduled_time: string;
  category: string;
  active_days: string[];
  is_active: boolean;
  completed?: boolean;
}

interface CareTaskManagerProps {
  patientId: string | null;
}

const CATEGORIES = [
  { value: 'health', label: '🏥 Health', color: '#ef4444' },
  { value: 'meals', label: '🍽️ Meals', color: '#f59e0b' },
  { value: 'hygiene', label: '🧼 Hygiene', color: '#06b6d4' },
  { value: 'exercise', label: '🏃 Exercise', color: '#22c55e' },
  { value: 'social', label: '👋 Social', color: '#8b5cf6' },
  { value: 'general', label: '📋 General', color: '#64748b' },
];

const DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'Th' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'Su' },
];

const ALL_DAYS = ['mon','tue','wed','thu','fri','sat','sun'];

const CareTaskManager: React.FC<CareTaskManagerProps> = ({ patientId }) => {
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [category, setCategory] = useState('general');
  const [activeDays, setActiveDays] = useState<string[]>([...ALL_DAYS]);

  const fetchTasks = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await fetch(`/api/care-tasks/${patientId}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const resetForm = () => {
    setTitle(''); setDescription(''); setScheduledTime('09:00');
    setCategory('general'); setActiveDays([...ALL_DAYS]);
    setEditingId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !patientId) return;
    const payload = {
      patient_id: patientId, title: title.trim(),
      description: description.trim() || null,
      scheduled_time: scheduledTime, category, active_days: activeDays
    };

    try {
      if (editingId) {
        await fetch(`/api/care-tasks/${editingId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/care-tasks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      resetForm();
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const startEdit = (t: CareTask) => {
    setTitle(t.title); setDescription(t.description || '');
    setScheduledTime(t.scheduled_time?.substring(0,5) || '09:00');
    setCategory(t.category); setActiveDays(t.active_days || [...ALL_DAYS]);
    setEditingId(t.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this care task?')) return;
    await fetch(`/api/care-tasks/${id}`, { method: 'DELETE' });
    fetchTasks();
  };

  const handleDuplicate = async (id: string) => {
    await fetch(`/api/care-tasks/${id}/duplicate`, { method: 'POST' });
    fetchTasks();
  };

  const toggleComplete = async (taskId: string) => {
    await fetch(`/api/care-tasks/${taskId}/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, completed_by: 'caregiver' })
    });
    fetchTasks();
  };

  const toggleDay = (day: string) => {
    setActiveDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const getCategoryColor = (cat: string) =>
    CATEGORIES.find(c => c.value === cat)?.color || '#64748b';
  const getCategoryLabel = (cat: string) =>
    CATEGORIES.find(c => c.value === cat)?.label || '📋 General';

  const daysLabel = (days: string[]) => {
    if (!days || days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('sat') && !days.includes('sun')) return 'Weekdays';
    if (days.length === 2 && days.includes('sat') && days.includes('sun')) return 'Weekends';
    return days.map(d => DAYS.find(dd => dd.key === d)?.label || d).join(', ');
  };

  if (!patientId) return null;

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">📋 Care Tasks</h3>
          {tasks.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              {completedCount}/{tasks.length} done today
            </p>
          )}
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
        >
          + Add Task
        </button>
      </div>

      {/* Progress Bar */}
      {tasks.length > 0 && (
        <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <p className="text-sm text-slate-400 py-4 text-center">Loading tasks...</p>
      ) : tasks.length === 0 && !showForm ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm">No care tasks yet. Add daily routines like meals, medication, or hygiene.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                task.completed
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleComplete(task.id)}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  task.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 hover:border-emerald-400'
                }`}
              >
                {task.completed && <span className="text-xs">✓</span>}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: getCategoryColor(task.category) }}
                  >
                    {getCategoryLabel(task.category).split(' ')[0]}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {task.scheduled_time?.substring(0,5)}
                  </span>
                  <span className={`font-semibold text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {task.title}
                  </span>
                </div>
                {task.description && (
                  <p className="text-xs text-slate-500 mt-1 italic">📝 {task.description}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5">{daysLabel(task.active_days)}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => startEdit(task)} className="text-slate-400 hover:text-blue-500 p-1" title="Edit">✏️</button>
                <button onClick={() => handleDuplicate(task.id)} className="text-slate-400 hover:text-amber-500 p-1" title="Duplicate">📋</button>
                <button onClick={() => handleDelete(task.id)} className="text-slate-400 hover:text-red-500 p-1" title="Delete">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/30">
          <h4 className="font-semibold text-sm text-slate-700 mb-3">
            {editingId ? '✏️ Edit Task' : '➕ New Care Task'}
          </h4>

          <div className="space-y-3">
            {/* Title */}
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Breakfast, Take medication, Shower"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
            />

            {/* Caregiver Note */}
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="📝 Caregiver note (relayed to patient via VA)&#10;e.g. 'Cereal is in the upper left cupboard, please wash up after'"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 resize-none"
            />

            {/* Time + Category */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600 mb-1 block">⏰ Time</label>
                <input
                  type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600 mb-1 block">📂 Category</label>
                <select
                  value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Day-of-Week Picker */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-2 block">📅 Active Days</label>
              <div className="flex gap-1.5">
                {DAYS.map(d => (
                  <button
                    key={d.key} type="button"
                    onClick={() => toggleDay(d.key)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                      activeDays.includes(d.key)
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveDays(activeDays.length === 7 ? [] : [...ALL_DAYS])}
                  className="ml-2 text-xs text-emerald-600 font-medium hover:underline"
                >
                  {activeDays.length === 7 ? 'Clear' : 'All'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {editingId ? 'Update Task' : 'Save Task'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareTaskManager;
