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
        .select('*');

      if (calendarError) throw calendarError;

      // Build a lookup of user_id -> phone_number/timezone from user_profiles
      const userIds = [...new Set((events || []).map(e => e.user_id))];
      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, phone_number, timezone')
          .in('id', userIds);
        if (profiles) {
          for (const p of profiles) profileMap[p.id] = p;
        }
      }

      if (events && events.length > 0) {
        for (const event of events) {
           const profile = profileMap[event.user_id];
           const userNumber = profile?.phone_number;
           const timezone = profile?.timezone || 'America/New_York';
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
       }

      // 2. Medication Dose Reminders — check upcoming doses from medication_schedule_events
      try {
        const windowStart = new Date(now);
        windowStart.setSeconds(0, 0);
        const windowEnd = new Date(now);
        windowEnd.setSeconds(59, 999);

        const { data: medDoses, error: medErr } = await supabase
          .from('medication_schedule_events')
          .select('*')
          .eq('status', 'due')
          .is('invalidated_at', null)
          .gte('scheduled_for', windowStart.toISOString())
          .lte('scheduled_for', windowEnd.toISOString());

        if (medErr) console.error('[Cron] Med schedule query error:', medErr);

        if (medDoses && medDoses.length > 0) {
          // Collect unique patient IDs and look up their phone numbers
          const patientIds = [...new Set(medDoses.map(d => d.patient_id))];
          const { data: patientProfiles } = await supabase
            .from('user_profiles')
            .select('id, phone_number, timezone, caregiver_name, caregiver_phone, preferred_name, full_name')
            .in('id', patientIds);

          const patientMap = {};
          if (patientProfiles) {
            for (const p of patientProfiles) patientMap[p.id] = p;
          }

          for (const dose of medDoses) {
            const patient = patientMap[dose.patient_id];
            if (!patient) continue;

            const patientName = patient.preferred_name || patient.full_name || 'your patient';
            const medName = dose.medication_name || 'medication';
            const doseText = dose.dose_text || '';
            const route = dose.route || '';
            const instructions = dose.instruction_summary || '';
            const reminderMsg = `Medication Reminder: It's time for ${patientName} to take ${medName}${doseText ? ' (' + doseText + ')' : ''}${route ? ' via ' + route : ''}.${instructions ? ' Instructions: ' + instructions : ''}`;

            // Call the patient if they have a phone number
            if (patient.phone_number) {
              console.log(`[Cron] Triggering Medication Reminder CALL for: ${medName} to patient ${patient.phone_number}`);
              await triggerOutboundVoiceCall(patient.phone_number, reminderMsg);
            }

            // Also SMS the caregiver if they have a phone number
            if (patient.caregiver_phone) {
              console.log(`[Cron] Sending Medication Reminder SMS to caregiver ${patient.caregiver_phone}`);
              try {
                await twilioClient.messages.create({
                  from: TWILIO_PHONE_NUMBER,
                  to: patient.caregiver_phone,
                  body: `💊 ${reminderMsg}`
                });
              } catch (smsErr) {
                console.error(`[Cron] Failed to SMS caregiver:`, smsErr.message);
              }
            }
          }
        }
      } catch (medCronErr) {
        console.error('[Cron] Medication reminder error:', medCronErr);
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
          const alreadyCalled = events?.some(e => profileMap[e.user_id]?.phone_number === user.phone_number);
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
  // Render provides RENDER_EXTERNAL_URL automatically (e.g. https://myparallel.onrender.com)
  // NGROK_URL is only for local development
  const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.NGROK_URL;
  console.log(`[Cron Debug] RENDER_EXTERNAL_URL=${process.env.RENDER_EXTERNAL_URL || '(not set)'}, NGROK_URL=${process.env.NGROK_URL || '(not set)'}, resolved baseUrl=${baseUrl}`);
  if (!baseUrl) {
      console.error("[Cron] CRITICAL: Neither RENDER_EXTERNAL_URL nor NGROK_URL is set. Cannot trigger outbound calls.");
      return;
  }
  const webhookUrl = `${baseUrl}/api/twilio/voice?callReason=${encodeURIComponent(logReason)}`;
  console.log(`[Cron] Using webhook URL: ${webhookUrl}`);

  try {
    const call = await twilioClient.calls.create({
        method: 'POST',
        url: webhookUrl,
        statusCallback: webhookUrl.replace('/voice', '/status'),
        statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer'],
        to: userNumber,
        from: process.env.TWILIO_PHONE_NUMBER
    });
    
    await saveMessage(userNumber, 'system', `[System] Outbound Voice Call triggered by background worker. Reason: ${logReason}. Call SID: ${call.sid}. Webhook: ${webhookUrl}`, 'web');
    console.log(`[Cron] Outbound call initiated to ${userNumber}. SID: ${call.sid}`);
  } catch (err) {
    console.error(`[Cron] Failed to initiate voice call to ${userNumber}:`, err);
  }
}
