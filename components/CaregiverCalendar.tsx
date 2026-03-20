import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, differenceInDays, differenceInWeeks } from 'date-fns';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  repeat_type: string;
  repeat_interval: number;
  repeat_days: string[];
  repeat_end_date: string | null;
}

interface CaregiverCalendarProps {
  patientId: string | null;
  themeColor?: { border: string, lightBg: string, activeBg: string, text: string };
}

// Timezone-safe date comparison: extracts YYYY-MM-DD from any date string or Date object
const toLocalDateStr = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '0000-00-00';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const CaregiverCalendar: React.FC<CaregiverCalendarProps> = ({ patientId, themeColor }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editReminder, setEditReminder] = useState(0);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [repeatType, setRepeatType] = useState('none');
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatDays, setRepeatDays] = useState<string[]>([]);
  const [repeatEndDate, setRepeatEndDate] = useState('');
  
  useEffect(() => {
    fetchEvents();

    // Auto-refresh every 30 seconds as a fallback
    const interval = setInterval(() => {
      if (patientId) fetchEvents();
    }, 30000);

    // Supabase Realtime subscription for instant updates
    let subscription: any = null;
    if (patientId) {
      subscription = supabase
        .channel(`calendar-${patientId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${patientId}`
        }, () => {
          console.log('[Calendar] Realtime event detected, refreshing...');
          fetchEvents();
        })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [patientId]);

  const fetchEvents = async () => {
    if (!patientId) {
       setEvents([]);
       setLoading(false);
       return;
    }
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', patientId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setError(null);
    
    try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const startDateTime = new Date(`${dateStr}T${startTime}:00`).toISOString();
        const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();
        
        const { data, error: insertError } = await supabase
            .from('calendar_events')
            .insert([{
                user_id: patientId, title, description,
                start_time: startDateTime, end_time: endDateTime,
                repeat_type: repeatType,
                repeat_interval: repeatType !== 'none' ? repeatInterval : 1,
                repeat_days: repeatType === 'weekly' ? JSON.stringify(repeatDays) : JSON.stringify([]),
                repeat_end_date: repeatEndDate ? new Date(repeatEndDate).toISOString() : null
            }])
            .select().single();

        if (insertError) throw insertError;
        
        setEvents((prev) => [...prev, data].sort((a, b) => new Date(a.start_time + (a.start_time.endsWith("Z") ? "" : "Z")).getTime() - new Date(b.start_time + (b.start_time.endsWith("Z") ? "" : "Z")).getTime()));
        setIsAdding(false);
        setTitle('');
        setDescription('');
        setRepeatType('none');
        setRepeatInterval(1);
        setRepeatDays([]);
        setRepeatEndDate('');
    } catch (err: any) {
        setError(err.message || 'Failed to add event');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
          await supabase.from('calendar_events').delete().eq('id', id);
          setEvents(prev => prev.filter(e => e.id !== id));
          if (editingEventId === id) setEditingEventId(null);
      } catch (err) { console.error("Failed to delete", err); }
  };

  const startEditing = (event: CalendarEvent) => {
      setEditingEventId(event.id);
      setEditTitle(event.title);
      setEditDescription(event.description);
      try {
        setEditTime(format(new Date(event.start_time), 'HH:mm'));
      } catch { setEditTime('09:00'); }
      setEditReminder((event as any).reminder_minutes || 0);
  };

  const handleUpdateEvent = async () => {
      if (!editingEventId || !patientId) return;
      const event = events.find(e => e.id === editingEventId);
      if (!event) return;
      try {
          const dateStr = format(new Date(event.start_time), 'yyyy-MM-dd');
          const newStart = new Date(`${dateStr}T${editTime}:00`).toISOString();
          const newEnd = new Date(new Date(newStart).getTime() + 60*60*1000).toISOString();
          const { error: updateError } = await supabase
              .from('calendar_events')
              .update({
                  title: editTitle,
                  description: editDescription,
                  start_time: newStart,
                  end_time: newEnd,
                  reminder_minutes: editReminder
              })
              .eq('id', editingEventId);
          if (updateError) throw updateError;
          setEditingEventId(null);
          fetchEvents();
      } catch (err: any) {
          setError(err.message || 'Failed to update event');
      }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading calendar...</div>;

  if (!patientId) {
      return (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
             <div className="text-3xl mb-3 opacity-50">📅</div>
             <p className="text-sm font-semibold text-slate-600">Select a patient from the roster to view their personalized schedule.</p>
          </div>
      );
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const selectedDateStr = toLocalDateStr(selectedDate);
  const selectedDateEvents = events.filter(e => toLocalDateStr(e.start_time) === selectedDateStr);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full w-full">
      
      {/* Calendar Header Nav */}
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${themeColor ? 'from-slate-700 to-slate-500' : 'from-slate-800 to-slate-500'}`}>
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">←</button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">→</button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-2">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
          <div key={day} className={`text-center text-[10px] lg:text-xs font-bold tracking-wider ${themeColor ? themeColor.text : 'text-slate-400'}`}>
            {day}
          </div>
        ))}
      </div>
      </div>

      {/* Physical Matrix Grid */}
      <div className="grid grid-cols-7 bg-slate-100 gap-px">
         {calendarDays.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate);
            
            // Restore native temporal intersection observer
            const dayStr = toLocalDateStr(day);
            const dayEvents = events.filter(e => {
                const eventStart = new Date(e.start_time);
                const eventDateStr = toLocalDateStr(eventStart);
                if (e.repeat_end_date && day > new Date(e.repeat_end_date)) return false;

                if (e.repeat_type === 'none') {
                    return eventDateStr === dayStr;
                } else if (e.repeat_type === 'daily') {
                    const diff = differenceInDays(new Date(day.getFullYear(), day.getMonth(), day.getDate()), new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()));
                    return diff >= 0 && (diff % (e.repeat_interval || 1)) === 0;
                } else if (e.repeat_type === 'weekly') {
                    const daysArr = Array.isArray(e.repeat_days) ? e.repeat_days : (typeof e.repeat_days === 'string' ? JSON.parse(e.repeat_days) : []);
                    const diffWeeks = differenceInWeeks(new Date(day.getFullYear(), day.getMonth(), day.getDate()), new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()));
                    const weekMatches = diffWeeks >= 0 && (diffWeeks % (e.repeat_interval || 1)) === 0;
                    const dayName = format(day, 'EEE');
                    const dayMatches = daysArr.length > 0 ? daysArr.includes(dayName) : eventStart.getDay() === day.getDay();
                    return weekMatches && dayMatches;
                }
                return false;
            });
            
            // Dynamically style based on the Patient's distinct semantic color overlay
            let borderClass = !isSameMonth(day, currentMonth) ? 'border-transparent opacity-50 bg-slate-50' : 'border-slate-100 bg-white hover:border-slate-300';
            let customSelector = isSelected ? `border-2 ${themeColor ? themeColor.border : 'border-wellness-blue'} z-10 relative shadow-sm` : '';

            return (
              <div 
                key={day.toString()} 
                onClick={() => setSelectedDate(day)}
                className={`min-h-[80px] lg:min-h-[100px] border rounded-xl p-1 lg:p-2 flex flex-col cursor-pointer transition-all duration-200 ${borderClass} ${customSelector}`}
              >
                <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isSelected ? (themeColor ? themeColor.activeBg + ' ' + themeColor.text : 'bg-wellness-blue text-white shadow-md') : isSameMonth(day, currentMonth) ? 'text-slate-700' : 'text-slate-400'}`}>
                  {format(day, 'd')}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                   {dayEvents.map(e => (
                       <div key={`${e.id}-${day.toString()}`} className={`text-[10px] lg:text-xs truncate px-1.5 py-0.5 rounded-md font-medium border ${themeColor ? themeColor.lightBg + ' ' + themeColor.text + ' ' + themeColor.border : 'bg-sky-50 text-sky-700 border-sky-100'}`} title={e.title}>
                           • {e.title}
                       </div>
                   ))}
                </div>
              </div>
            );
         })}
      </div>

      {/* Selected Day Agenda View */}
      <div className="p-6 bg-slate-50 border-t border-slate-200">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">
              Schedule for {format(selectedDate, 'EEEE, MMMM do')}
            </h3>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="px-4 py-2 bg-wellness-blue text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
            >
              {isAdding ? 'Close Builder' : '+ Add AI Check-in'}
            </button>
         </div>

         {isAdding && (
            <form onSubmit={handleAddEvent} className="mb-6 p-4 bg-white border border-slate-200 rounded-xl space-y-4">
              {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Event Title</label>
                 <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Follow-up after surgery" className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-wellness-blue" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Instructions for AI / Reason</label>
                 <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Check if the pain medication is causing nausea" rows={2} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-wellness-blue" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Check-in Time</label>
                   <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-wellness-blue" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Repeat Pattern</label>
                   <select value={repeatType} onChange={e => setRepeatType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-wellness-blue">
                     <option value="none">Does not repeat</option>
                     <option value="daily">Daily</option>
                     <option value="weekly">Weekly</option>
                   </select>
                 </div>
              </div>
              
              {repeatType !== 'none' && (
                 <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Repeat Every</label>
                          <div className="flex items-center gap-2">
                             <input type="number" min="1" max="99" value={repeatInterval} onChange={e => setRepeatInterval(parseInt(e.target.value)||1)} className="w-20 px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-wellness-blue text-center" />
                             <span className="text-slate-600 font-medium">{repeatType === 'daily' ? 'days' : 'weeks'}</span>
                          </div>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">End Date (Optional)</label>
                          <input type="date" value={repeatEndDate} onChange={e => setRepeatEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-wellness-blue" />
                       </div>
                    </div>
                    
                    {repeatType === 'weekly' && (
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">On these days:</label>
                          <div className="flex flex-wrap gap-2">
                             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <button
                                   key={day}
                                   type="button"
                                   onClick={() => setRepeatDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                                   className={`w-10 h-10 rounded-full text-xs font-bold transition-colors ${repeatDays.includes(day) ? 'bg-wellness-blue text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                                >
                                   {day.charAt(0)}
                                </button>
                             ))}
                          </div>
                       </div>
                    )}
                 </div>
              )}
              <div className="flex justify-end pt-2">
                 <button type="submit" className="px-5 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800">Save Event</button>
              </div>
            </form>
         )}

         {selectedDateEvents.length === 0 ? (
             <div className="text-center py-6 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                 No check-ins scheduled for this day.
             </div>
         ) : (
             <div className="space-y-3">
                {selectedDateEvents.map(event => {
                   const isEditing = editingEventId === event.id;
                   return (
                    <div key={event.id} className={`bg-white p-4 border rounded-xl transition-all ${isEditing ? 'border-wellness-blue ring-1 ring-wellness-blue/20' : 'border-slate-200'}`}>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Title</label>
                            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-wellness-blue" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Description</label>
                            <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-wellness-blue" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Time</label>
                              <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-wellness-blue" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Reminder</label>
                              <select value={editReminder} onChange={e => setEditReminder(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-wellness-blue">
                                <option value={0}>No reminder</option>
                                <option value={5}>5 min before</option>
                                <option value={15}>15 min before</option>
                                <option value={30}>30 min before</option>
                                <option value={60}>1 hour before</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={handleUpdateEvent} className="flex-1 py-2 bg-wellness-blue text-white rounded font-semibold text-sm hover:bg-sky-600">Save</button>
                            <button onClick={() => setEditingEventId(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded font-semibold text-sm hover:bg-slate-200">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-4">
                          <div className="bg-sky-50 text-wellness-blue font-bold px-3 py-2 rounded border border-sky-100 text-sm">
                               {(() => { try { return format(new Date(event.start_time), 'h:mm a'); } catch { return 'N/A'; } })()}
                          </div>
                          <div className="flex-1 cursor-pointer" onClick={() => startEditing(event)}>
                              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                 {event.title}
                                 {event.repeat_type !== 'none' && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">{event.repeat_type}</span>}
                              </h4>
                              <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                              {(event as any).reminder_minutes > 0 && <p className="text-[10px] text-amber-600 mt-1">🔔 {(event as any).reminder_minutes} min reminder</p>}
                              <p className="text-[10px] text-slate-400 mt-1 italic">Click to edit</p>
                          </div>
                          <button onClick={(e) => handleDelete(event.id, e)} className="text-red-400 hover:text-red-600 p-2">✕</button>
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
};

export default CaregiverCalendar;
