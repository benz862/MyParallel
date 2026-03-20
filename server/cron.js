import cron from 'node-cron';
import { formatInTimeZone } from 'date-fns-tz';
import { GoogleGenAI } from '@google/genai';
import Twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.API_KEY; 
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER; // Need this to send outbound
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY });
const twilioClient = TWILIO_SID && TWILIO_TOKEN ? Twilio(TWILIO_SID, TWILIO_TOKEN) : null;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

async function saveMessage(userNumber, sender, text, type = 'sms') {
  if (!supabase || !userNumber) return;
  await supabase.from('messages').insert({ 
    user_number: userNumber, 
    sender, 
    content: text, 
    interaction_type: type 
  });
}

async function getHistory(userNumber, limit = 10) {
  if (!supabase || !userNumber) return [];
  const { data } = await supabase.from('messages')
    .select('*')
    .eq('user_number', userNumber)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ? data.reverse().map(m => ({ 
    role: m.sender === 'user' ? 'user' : 'model', 
    parts: [{ text: m.content }] 
  })) : [];
}

export function startScheduler() {
  if (!supabase || !twilioClient) {
    console.warn('⚠️ Cron scheduler disabled: Missing Supabase or Twilio credentials.');
    return;
  }

  console.log('🕒 Automated Outbound Voice Reminder Service Initialized.');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    // Start and end of the current minute
    const startOfMinute = new Date(now).setSeconds(0, 0);
    const endOfMinute = new Date(now).setSeconds(59, 999);

    try {
      // 1. Fetch Calendar Events that should trigger this minute
      const { data: events, error: calendarError } = await supabase
        .from('calendar_events')
        .select('*, user_profiles(phone_number, timezone)');

      if (calendarError) throw calendarError;

      if (events && events.length > 0) {
        for (const event of events) {
           const userNumber = event.user_profiles?.phone_number;
           const timezone = event.user_profiles?.timezone || 'America/New_York';
           if (!userNumber) continue;
           
           // Determine if the current minute matches the event's start_time in the user's timezone
           const eventTimeStr = new Date(event.start_time).toLocaleTimeString('en-US', { timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit' });
           const currentTimeStr = now.toLocaleTimeString('en-US', { timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit' });
           
           // Calculate the dynamic reminder time based on the event's reminder_minutes setting
           const reminderMinutes = event.reminder_minutes || 0;
           let reminderTimeStr = null;
           if (reminderMinutes > 0) {
               const reminderTime = new Date(new Date(event.start_time).getTime() - reminderMinutes * 60 * 1000);
               reminderTimeStr = reminderTime.toLocaleTimeString('en-US', { timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit' });
           }

           if (eventTimeStr !== currentTimeStr && reminderTimeStr !== currentTimeStr) continue;

           // If times match, check recurrent constraints based on date logic
           const userCurrentDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
           const userCurrentZeroed = new Date(userCurrentDate).setHours(0,0,0,0);
           const eventOriginalDate = new Date(new Date(event.start_time).toLocaleString("en-US", { timeZone: timezone }));
           const eventOriginalZeroed = new Date(eventOriginalDate).setHours(0,0,0,0);
           
           let shouldTrigger = false;
           
           if (event.repeat_end_date && userCurrentZeroed > new Date(event.repeat_end_date).getTime()) {
               shouldTrigger = false;
           } else if (event.repeat_type === 'none' && userCurrentZeroed === eventOriginalZeroed) {
               shouldTrigger = true;
           } else if (event.repeat_type === 'daily') {
               const diffDays = Math.round((userCurrentZeroed - eventOriginalZeroed) / (1000*60*60*24));
               if (diffDays >= 0 && (diffDays % (event.repeat_interval || 1)) === 0) shouldTrigger = true;
           } else if (event.repeat_type === 'weekly') {
               const diffDays = Math.round((userCurrentZeroed - eventOriginalZeroed) / (1000*60*60*24));
               const diffWeeks = Math.floor(diffDays / 7);
               const weekMatches = diffDays >= 0 && (diffWeeks % (event.repeat_interval || 1)) === 0;
               
               let daysArr = [];
               try { daysArr = typeof event.repeat_days === 'string' ? JSON.parse(event.repeat_days) : event.repeat_days; } catch(e){}
               if (!Array.isArray(daysArr)) daysArr = [];
               
               const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
               const currentDayName = dayNames[userCurrentDate.getDay()];
               const originalDayName = dayNames[eventOriginalDate.getDay()];
               
               const dayMatches = daysArr.length > 0 ? daysArr.includes(currentDayName) : currentDayName === originalDayName;
               
               if (diffDays >= 0 && weekMatches && dayMatches) shouldTrigger = true;
           }
           
           if (shouldTrigger) {
               if (eventTimeStr === currentTimeStr) {
                   console.log(`[Cron] Triggering Voice Call for Event: ${event.title} to ${userNumber}`);
                   await triggerOutboundVoiceCall(userNumber, `Calendar Event: ${event.title}`);
               } else if (reminderTimeStr === currentTimeStr) {
                   console.log(`[Cron] Triggering ${reminderMinutes}-min Reminder CALL for: ${event.title} to ${userNumber}`);
                   await triggerOutboundVoiceCall(userNumber, `Friendly Reminder: Your appointment "${event.title}" is in ${reminderMinutes} minutes.`);
               }
           }
        }
      }

      // 2. Fallback: Fetch legacy 12-hour checkin_times
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('*')
        .not('phone_number', 'is', null)
        .not('checkin_times', 'is', null);

      if (error) throw error;
      if (!users || users.length === 0) return;

      for (const user of users) {
        if (!user.checkin_times || user.checkin_times.length === 0) continue;

        const timezone = user.timezone || 'America/New_York';
        const currentTimeInUserTz = formatInTimeZone(now, timezone, 'HH:mm'); // e.g., 24-hour internal clock for comparison

        const schedules = user.checkin_times.map(t => {
           try { return t.startsWith('{') ? JSON.parse(t) : { time: t, reason: '' }; }
           catch(e) { return { time: t, reason: '' }; }
        });

        // Convert 12-hour AM/PM stored in DB "time" string to 24-hour "HH:mm" for comparison if necessary
        // Wait, the DB stores "08:00" or "20:00" natively from the <input type="time">.
        const currentMatch = schedules.find(s => s.time === currentTimeInUserTz);

        if (currentMatch) {
          // Prevent double-calling if a calendar event already triggered a call this minute
          const alreadyCalled = events?.some(e => e.user_profiles?.phone_number === user.phone_number);
          if (alreadyCalled) continue;

          console.log(`[Cron] Triggering Voice Call for Check-in: ${user.id} at ${currentTimeInUserTz}`);
          await triggerOutboundVoiceCall(user.phone_number, `Scheduled Checkin: ${currentMatch.reason || 'General Check-in'}`);
        }
      }
    } catch (err) {
      console.error('[Cron] Error running scheduled check-ins:', err);
    }
  });
}

async function triggerOutboundVoiceCall(userNumber, logReason) {
  let webhookUrl = process.env.NGROK_URL ? `${process.env.NGROK_URL}/api/twilio/voice` : null;
  if (!webhookUrl) {
      console.error("[Cron] CRITICAL ERROR: process.env.NGROK_URL is undefined. You MUST define NGROK_URL in your .env file to trigger outbound Twilio Voice Calls.");
      return;
  }

  try {
    const call = await twilioClient.calls.create({
        method: 'POST',
        url: webhookUrl,
        to: userNumber,
        from: process.env.TWILIO_PHONE_NUMBER
    });
    
    await saveMessage(userNumber, 'system', `[System] Outbound Voice Call triggered by background worker. Reason: ${logReason}. Call SID: ${call.sid}`, 'web');
    console.log(`[Cron] Outbound call initiated to ${userNumber}. SID: ${call.sid}`);
  } catch (err) {
    console.error(`[Cron] Failed to initiate voice call to ${userNumber}:`, err);
  }
}
