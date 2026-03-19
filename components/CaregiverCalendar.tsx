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
}

const CaregiverCalendar: React.FC<CaregiverCalendarProps> = ({ patientId }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        
        setEvents((prev) => [...prev, data].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
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
      } catch (err) { console.error("Failed to delete", err); }
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

  const selectedDateEvents = events.filter(e => isSameDay(new Date(e.start_time), selectedDate));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full w-full">
      
      {/* Calendar Header Nav */}
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold text-slate-900">Caregiver Calendar</h2>
           <p className="text-sm text-slate-500">Select a day to schedule an AI check-in.</p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100">&larr;</button>
           <div className="text-lg font-bold text-slate-800 w-32 text-center">
              {format(currentMonth, 'MMMM yyyy')}
           </div>
           <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100">&rarr;</button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
           <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 tracking-wider uppercase">
             {day}
           </div>
        ))}
      </div>

      {/* Physical Matrix Grid */}
      <div className="grid grid-cols-7 bg-slate-100 gap-px">
         {calendarDays.map((day, idx) => {
            const dayEvents = events.filter(e => {
                const eventStart = new Date(e.start_time);
                const dayEnd = new Date(day);
                dayEnd.setHours(23, 59, 59);

                // Early exit if the day is before the event even starts
                if (dayEnd < eventStart) return false;
                
                // Early exit if there's an enforced end_date and we surpassed it
                if (e.repeat_end_date && day > new Date(e.repeat_end_date)) return false;

                if (e.repeat_type === 'none') {
                    return isSameDay(eventStart, day);
                } else if (e.repeat_type === 'daily') {
                    const diff =  differenceInDays(new Date(day.setHours(0,0,0,0)), new Date(new Date(eventStart).setHours(0,0,0,0)));
                    return diff >= 0 && (diff % (e.repeat_interval || 1)) === 0;
                } else if (e.repeat_type === 'weekly') {
                    const daysArr = Array.isArray(e.repeat_days) ? e.repeat_days : (typeof e.repeat_days === 'string' ? JSON.parse(e.repeat_days) : []);
                    const diffWeeks = differenceInWeeks(new Date(day.setHours(0,0,0,0)), new Date(new Date(eventStart).setHours(0,0,0,0)));
                    const weekMatches = diffWeeks >= 0 && (diffWeeks % (e.repeat_interval || 1)) === 0;
                    const dayName = format(day, 'EEE'); // 'Sun', 'Mon' etc
                    // Either it matches the explicitly selected days, OR if no checkboxes were selected, it falls back to the exact physical day of the week it started on
                    const dayMatches = daysArr.length > 0 ? daysArr.includes(dayName) : eventStart.getDay() === day.getDay();
                    return weekMatches && dayMatches;
                }
                return false;
            });
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            
            return (
              <div 
                key={idx} 
                onClick={() => setSelectedDate(day)}
                className={`min-h-[80px] p-2 bg-white cursor-pointer transition-colors ${
                    !isCurrentMonth ? 'text-slate-300 bg-slate-50' : 'text-slate-700'
                } ${isSelected ? 'ring-2 ring-inset ring-wellness-blue bg-blue-50/30' : 'hover:bg-slate-50'}`}
              >
                  <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isSelected ? 'bg-wellness-blue text-white' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="mt-1 space-y-1">
                     {dayEvents.map((e, evIdx) => (
                         <div key={`${e.id}-${evIdx}`} className="text-[10px] bg-sky-100 text-sky-800 px-1 py-0.5 rounded truncate font-medium border border-sky-200">
                            {e.repeat_type !== 'none' && '↻ '}{format(new Date(e.start_time), 'h:mma')} {e.title}
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
                {selectedDateEvents.map(event => (
                   <div key={event.id} className="bg-white p-4 border border-slate-200 rounded-xl flex items-start gap-4">
                      <div className="bg-sky-50 text-wellness-blue font-bold px-3 py-2 rounded border border-sky-100 text-sm">
                          {format(new Date(event.start_time), 'h:mm a')}
                      </div>
                      <div className="flex-1">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2">
                             {event.title}
                             {event.repeat_type !== 'none' && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">{event.repeat_type}</span>}
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                      </div>
                      <button onClick={(e) => handleDelete(event.id, e)} className="text-red-400 hover:text-red-600 p-2">✕</button>
                   </div>
                ))}
             </div>
         )}
      </div>
    </div>
  );
};

export default CaregiverCalendar;
