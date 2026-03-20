import express from 'express';
import { WebSocketServer } from 'ws';
import { GoogleGenAI } from '@google/genai';
import Twilio from 'twilio';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import { startScheduler } from './server/cron.js';
import { MedicationService } from './server/medication-service.js';
import { setupVoiceRelay } from './voice-relay.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// --- CONFIGURATION ---
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY; 
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Clients
const twilioClient = TWILIO_SID && TWILIO_TOKEN ? Twilio(TWILIO_SID, TWILIO_TOKEN) : null;
const ai = new GoogleGenAI({ apiKey: API_KEY });
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// --- CRITICAL SYSTEM PROMPT (WELLNESS PIVOT) ---
const BASE_SYSTEM_INSTRUCTION = `
You are Parallel, a compassionate, non-romantic AI support companion.
Your purpose is to alleviate loneliness, provide structure, and offer emotional safety.

CORE RULES:
1. NO ROMANCE. You are a friend, a caregiver, or a support system. Never flirt. Never accept romantic advances. Gently redirect: "I care about you as a friend and support."
2. BE SUPPORTIVE. Validate feelings. "I hear that you're in pain." "It's okay to feel sad."
3. BE PROACTIVE. Ask about meals, water, and sleep.
4. SAFETY FIRST. If the user mentions self-harm, switch to Emergency Empathy Mode immediately.

GUARDIAN PROTOCOL (ALWAYS ACTIVE):
- Detect sadness, anxiety, or confusion.
- Respond with warmth and slowness.
- If user is elderly: Be infinitely patient. Repeat things if needed.
- If user is anxious: Offer grounding (5-4-3-2-1 technique).
`;

// Helpers
async function saveMessage(userNumber, sender, text, mediaUrl = null, type = 'sms') {
    if (!supabase) return;
    await supabase.from('messages').insert({ user_number: userNumber, sender, content: text, media_url: mediaUrl, interaction_type: type });
}

async function getHistory(userNumber, limit = 10) {
    if (!supabase) return [];
    const { data } = await supabase.from('messages').select('*').eq('user_number', userNumber).order('created_at', { ascending: false }).limit(limit);
    return data ? data.reverse().map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.content || (m.media_url ? '[Image]' : '') }] })) : [];
}

async function scheduleCalendarEvent(userNumber, title, description, startTime, reminderMinutes = 0) {
    if (!supabase || !userNumber) return false;
    try {
        const { data: profile } = await supabase.from('user_profiles').select('id, full_name, caregiver_name, timezone').eq('phone_number', userNumber).single();
        if (!profile) return false;
        
        // ALWAYS treat whatever time the AI sends as the user's intended local time.
        // Strip any timezone offset the AI may have included and re-interpret in the user's timezone.
        const userTz = profile.timezone || 'America/New_York';
        
        // 1. Strip timezone info to get the "naive" local time the user meant
        const naiveTime = startTime.replace(/([+-]\d{2}:\d{2}|[+-]\d{4}|Z)$/, '');
        
        // 2. Parse as UTC temporarily just to extract the date/time components
        const asUtc = new Date(naiveTime + 'Z');
        
        // 3. Figure out the UTC offset for the user's timezone at that moment
        //    by comparing the same instant displayed in UTC vs in the user's tz
        const inTz = new Date(asUtc.toLocaleString('en-US', { timeZone: userTz }));
        const offsetMs = asUtc.getTime() - inTz.getTime(); // positive = tz is behind UTC
        
        // 4. Shift so that the "naive" time becomes the correct UTC instant
        const start = new Date(asUtc.getTime() + offsetMs);
        console.log(`[Schedule] AI sent "${startTime}" → naive="${naiveTime}" → stored UTC=${start.toISOString()} (${userTz})`);
        const end = new Date(start.getTime() + 60*60*1000); // Default to 1 hour appt
        
        // 1. Insert Event
        const { error } = await supabase.from('calendar_events').insert({
            user_id: profile.id,
            title: title || 'AI Scheduled Check-in',
            description: description || 'Scheduled via Voice Assistant',
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            reminder_minutes: reminderMinutes || 0
        });
        if (error) throw error;
        
        // 2. Log & Twilio SMS to Patient
        const msg = `Your appointment "${title}" has been scheduled for ${start.toLocaleString('en-US', {timeZone: 'America/New_York'})}.`;
        await saveMessage(userNumber, 'system', `[System] Appointment Scheduled: ${msg}`, null, 'system');
        if (twilioClient) {
            await twilioClient.messages.create({ from: process.env.TWILIO_PHONE_NUMBER, to: userNumber, body: msg }).catch(e => console.error("Twilio SMS fail:", e));
        }
        
        // 3. Email Caregiver logging (SMTP Emulation)
        console.log(`\n\n[Supabase SMTP Trigger / Nodemailer Protocol]`);
        console.log(`To: Caregiver (${profile.caregiver_name || 'System Admin'})`);
        console.log(`Subject: New Appointment Scheduled for ${profile.full_name}`);
        console.log(`Body: A new appointment "${title}" has been added to the calendar for ${start.toLocaleString('en-US', {timeZone: 'America/New_York'})}.\n\n`);
        
        return true;
    } catch(e) {
        console.error("AI Scheduling Error:", e);
        return false;
    }
}

// Universal Helper to fetch deep context for Gemini
async function getUserProfileContext(phoneNumber) {
    if (!supabase || !phoneNumber) return { contextString: "", voiceId: "Puck", emotionalTrait: "Empathetic and warm" };
    try {
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('phone_number', phoneNumber).single();
        if (!profile) return { contextString: "", voiceId: "Puck", emotionalTrait: "Empathetic and warm" };
        let formattedSchedule = "None";
        if (profile.checkin_times && profile.checkin_times.length > 0) {
            formattedSchedule = profile.checkin_times.map(t => {
                try {
                    if (t.startsWith('{')) {
                        const p = JSON.parse(t);
                        return `${p.time}${p.reason ? ` (Reason: ${p.reason})` : ''}`;
                    }
                    return t;
                } catch(e) { return t; }
            }).join(', ');
        }

        let calendarContext = "None";
        try {
            const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString();
            const tomorrow = new Date(Date.now() + 2*24*60*60*1000).toISOString();
            const { data: events } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', profile.id)
                .gte('start_time', yesterday)
                .lte('start_time', tomorrow)
                .order('start_time', { ascending: true });
                
            if (events && events.length > 0) {
                calendarContext = events.map(e => `- ${new Date(e.start_time).toLocaleString('en-US', {timeZone: profile.timezone || 'America/New_York'})}: ${e.title} (${e.description})`).join('\n');
            }
        } catch(err) { console.error('Failed fetching calendar context', err); }

        return {
          voiceId: profile.voice_id || 'Puck',
          emotionalTrait: profile.emotional_trait || 'Empathetic and warm',
          timezone: profile.timezone || 'America/New_York',
          contextString: `
CRITICAL TEMPORAL CONTEXT:
The current accurate local time for the user is: ${new Date().toLocaleString('en-US', { timeZone: profile.timezone || 'America/New_York' })}

USER PROFILE CONTEXT:
- Name: ${profile.preferred_name || profile.full_name || 'Unknown'}
- Age: ${profile.age || 'Unknown'}
- Health Conditions: ${(profile.conditions || []).join(', ') || 'None specified'}
- Current Medications: ${(profile.medications || []).join(', ') || 'None specified'}
- Caregiver: ${profile.caregiver_name || 'Not specified'}
- Automated Check-in Schedule: ${formattedSchedule}
- Interface Preference: ${profile.selected_personality || 'Warm and supportive'}

UPCOMING / RECENT CAREGIVER CALENDAR APPOINTMENTS:
${calendarContext}
        `};
    } catch(e) {
        return { contextString: "", voiceId: "Puck", emotionalTrait: "Empathetic and warm" };
    }
}

// API Routes
app.get('/api/context', async (req, res) => {
    if (!supabase) return res.json([]);
    const { phoneNumber } = req.query;
    
    let query = supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(20);
    if (phoneNumber) {
        query = query.eq('user_number', phoneNumber);
    }
    
    const { data } = await query;
    res.json(data ? data.reverse() : []);
});

app.post('/api/dashboard-message', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Database not connected' });
    
    const { message, phoneNumber, personality } = req.body;
    if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Missing message or phoneNumber' });
    }

    try {
        // 1. Save User Message
        await saveMessage(phoneNumber, 'user', message, null, 'web');

        // 2. Fetch History
        const history = await getHistory(phoneNumber);
        const messageContext = `[Web Dashboard Message] ${message}`;

        // 3. Generate AI Reply
        const profilePayload = await getUserProfileContext(phoneNumber);
        const systemInstruction = `
            You are Parallel, a compassionate AI support companion.
            Your fundamental trait is: ${profilePayload.emotionalTrait || 'Empathetic and warm'}.
            Do not offer medical advice, but be highly aware of the user's context.
            
            ${profilePayload.contextString}
        `;

        const chat = ai.chats.create({ 
            model: 'gemini-2.5-flash', 
            config: { systemInstruction }, 
            history 
        });

        const result = await chat.sendMessage({ message: messageContext });
        const text = result.text;

        // 4. Save AI Reply
        await saveMessage(phoneNumber, 'ai', text, null, 'web');

        // 5. Return reply to frontend
        res.json({ reply: text });
    } catch (err) {
        console.error('Error handling dashboard message:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/get-user-profile', async (req, res) => {
    const { userId } = req.query;
    if (!supabase || !userId) return res.status(400).json({ error: 'Missing logic' });

    try {
        const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
        res.json(data || null);
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/save-user-profile', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Database not connected' });
    
    const profile = req.body;
    if (!profile.id) return res.status(400).json({ error: 'User ID required' });

    try {
        const { data: existingProfile } = await supabase.from('user_profiles').select('id').eq('id', profile.id).single();
        
        let result, error;
        if (existingProfile) {
            ({ data: result, error } = await supabase.from('user_profiles').update(profile).eq('id', profile.id).select().single());
        } else {
            ({ data: result, error } = await supabase.from('user_profiles').insert(profile).select().single());
        }

        if (error) throw error;
        res.json(result);
    } catch (err) {
        console.error('Error saving profile:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/log-transcription', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Database not connected' });
    const { phoneNumber, sender, text, type } = req.body;
    if (!phoneNumber || !text) return res.status(400).json({ error: 'Missing parameters' });
    
    try {
        await saveMessage(phoneNumber, sender || 'ai', text, null, type || 'voice_assistant');
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to log transcription:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/schedule-event', async (req, res) => {
    const { userNumber, user_id, title, description, start_time, reminder_minutes } = req.body;
    if ((!userNumber && !user_id) || !title || !start_time) return res.status(400).json({ error: 'Missing required parameters' });
    
    try {
        let success = false;
        if (userNumber) {
            success = await scheduleCalendarEvent(userNumber, title, description, start_time, reminder_minutes || 0);
        }
        // Fallback: if phone lookup failed or no phone, try by user_id directly
        if (!success && user_id && supabase) {
            const start = new Date(start_time);
            const end = new Date(start.getTime() + 60*60*1000);
            const { error } = await supabase.from('calendar_events').insert({
                user_id,
                title: title || 'AI Scheduled Check-in',
                description: description || 'Scheduled via Voice Assistant',
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                reminder_minutes: reminder_minutes || 0
            });
            if (!error) success = true;
            else console.error('Direct user_id insert failed:', error);
        }
        res.json({ success });
    } catch (err) {
        console.error('Failed web schedule:', err);
        res.status(500).json({ error: err.message });
    }
});

// ════════════════════════════════════════════════════
// MEDICATION API ENDPOINTS
// ════════════════════════════════════════════════════
const medService = supabase ? new MedicationService(supabase) : null;

// GET patient medications
app.get('/api/medications/:patientId', async (req, res) => {
    if (!medService) return res.status(500).json({ error: 'DB not configured' });
    try {
        const data = await medService.getPatientMedications(req.params.patientId);
        res.json(data);
    } catch (err) {
        console.error('GET medications error:', err);
        res.status(500).json({ error: err.message });
    }
});

// CREATE medication
app.post('/api/medications', async (req, res) => {
    if (!medService) return res.status(500).json({ error: 'DB not configured' });
    const { patientId, master, instructions, regimen } = req.body;
    if (!patientId || !master?.name) return res.status(400).json({ error: 'patientId and master.name required' });
    try {
        const result = await medService.createMedication(patientId, master, instructions || {}, regimen || {});
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('CREATE medication error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE medication (instructions, timing, or dosage)
app.put('/api/medications/:assignmentId', async (req, res) => {
    if (!medService) return res.status(500).json({ error: 'DB not configured' });
    const { changeType, instructions, regimen, effectiveDate, changeReason, changedBy } = req.body;
    try {
        let result;
        if (changeType === 'instruction_change') {
            result = await medService.updateInstructions(req.params.assignmentId, instructions, effectiveDate, changedBy);
        } else if (changeType === 'dosage_timing_change') {
            result = await medService.updateTimingOrDosage(req.params.assignmentId, regimen, effectiveDate, changeReason, changedBy);
        } else if (changeType === 'discontinue') {
            await medService.discontinueMedication(req.params.assignmentId, effectiveDate, changeReason, changedBy);
            result = { discontinued: true };
        } else if (changeType === 'hold') {
            await medService.holdMedication(req.params.assignmentId, effectiveDate, changeReason, changedBy);
            result = { held: true };
        } else if (changeType === 'resume') {
            await medService.resumeMedication(req.params.assignmentId, changedBy);
            result = { resumed: true };
        } else {
            return res.status(400).json({ error: 'Invalid changeType' });
        }
        res.json({ success: true, result });
    } catch (err) {
        console.error('UPDATE medication error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET schedule events for date range
app.get('/api/medications/:patientId/schedule', async (req, res) => {
    if (!medService) return res.status(500).json({ error: 'DB not configured' });
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end query params required' });
    try {
        const data = await medService.getScheduleEvents(req.params.patientId, start, end);
        res.json(data);
    } catch (err) {
        console.error('GET schedule error:', err);
        res.status(500).json({ error: err.message });
    }
});

// LOG dose administration
app.post('/api/medications/administration', async (req, res) => {
    if (!medService) return res.status(500).json({ error: 'DB not configured' });
    const { scheduleEventId, status, details } = req.body;
    if (!scheduleEventId || !status) return res.status(400).json({ error: 'scheduleEventId and status required' });
    try {
        const log = await medService.logAdministration(scheduleEventId, status, details || {});
        res.json({ success: true, log });
    } catch (err) {
        console.error('LOG administration error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET audit log
app.get('/api/medications/:assignmentId/audit', async (req, res) => {
    if (!medService) return res.status(500).json({ error: 'DB not configured' });
    try {
        const data = await medService.getAuditLog(req.params.assignmentId);
        res.json(data);
    } catch (err) {
        console.error('GET audit error:', err);
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/trigger-call', async (req, res) => {
    if (!twilioClient) return res.status(500).json({ error: 'Twilio not configured' });
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number required' });

    try {
        // Twilio explicitly rejects 'localhost' URLs. It must be a public ngrok URL.
        let webhookUrl;
        if (process.env.NGROK_URL) {
            webhookUrl = `${process.env.NGROK_URL}/api/twilio/voice`;
        } else {
            const host = req.get('x-forwarded-host') || req.get('host');
            const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
            if (host.includes('localhost') || host.includes('127.0.0.1')) {
                return res.status(400).json({ error: "Twilio requires a public URL. Please add your Ngrok link as NGROK_URL=https://your-ngrok.ngrok-free.app to your .env file, then completely restart your backend server." });
            }
            webhookUrl = `${protocol}://${host}/api/twilio/voice`;
        }

        const call = await twilioClient.calls.create({
            method: 'POST',
            url: webhookUrl,
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER
        });
        
        // Log this trigger internally to the DB for history
        await saveMessage(phoneNumber, 'system', '[System] Initiated outbound AI Phone Call upon request.', null, 'web');

        res.json({ success: true, callSid: call.sid });
    } catch (err) {
        console.error('Error triggering call:', err);
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/twilio/voice', async (req, res) => {
    const twiml = new Twilio.twiml.VoiceResponse();
    try {
        console.log(`[Twilio Webhook] Received call from Twilio to: ${req.body.To}`);
        const userNumber = req.body.Direction === 'outbound-api' ? req.body.To : req.body.From;

        const host = req.get('x-forwarded-host') || req.get('host');
        const wsUrl = `wss://${host}/api/twilio/media`;

        // We completely bypass `<Say>` and `<Gather>` entirely.
        // Opening a raw bidirectional WebSockets audio pipe to the proxy.
        const connect = twiml.connect();
        const stream = connect.stream({ url: wsUrl });
        stream.parameter({ name: 'userNumber', value: userNumber });

    } catch (err) {
        console.error('Twilio Voice Webhook Generation Error:', err);
        twiml.say({ voice: 'Polly.Ruth-Neural' }, "I'm having a little trouble connecting my thoughts right now. Please try calling back in a minute.");
    }

    res.type('text/xml');
    res.send(twiml.toString());
});



app.post('/sms', async (req, res) => {
  const userMessage = req.body.Body;
  const userNumber = req.body.From; 
  const parallelNumber = req.body.To;

  // 1. Ack
  const twiml = new Twilio.twiml.MessagingResponse();
  res.type('text/xml').send(twiml.toString()); 

  try {
    await saveMessage(userNumber, 'user', userMessage);
    const history = await getHistory(userNumber);
    const now = new Date().toLocaleString();
    const messageContext = `[Current Time: ${now}] ${userMessage}`;

    const isImageReq = /(send|show).*(photo|image|picture)/i.test(userMessage);

    if (isImageReq && supabase) {
        // Generate Calming Image Prompt
        const promptChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: { systemInstruction: "You are an image prompt generator for a Wellness App. Generate calm, soothing, safe imagery (nature, cozy rooms, tea, pets). NO PEOPLE/SELFIES." }
        });
        const promptGen = await promptChat.sendMessage({ message: `Generate prompt for: "${userMessage}"` });
        
        const imageResp = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ text: promptGen.text }] } });
        const base64 = imageResp.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (base64) {
            const filename = `${Date.now()}.jpg`;
            await supabase.storage.from('parallel_files').upload(filename, Buffer.from(base64, 'base64'), { contentType: 'image/jpeg' });
            const { data: { publicUrl } } = supabase.storage.from('parallel_files').getPublicUrl(filename);
            
            await saveMessage(userNumber, 'ai', "Here is something calming.", publicUrl);
            if (twilioClient) {
                await twilioClient.messages.create({ from: parallelNumber, to: userNumber, body: "Here is something calming.", mediaUrl: [publicUrl] });
            }
        }
    } else {
        const profilePayload = await getUserProfileContext(userNumber);
        const dynamicInstruction = `${BASE_SYSTEM_INSTRUCTION} \n\n Your fundamental trait is: ${profilePayload.emotionalTrait || 'Empathetic'}\n\n ${profilePayload.contextString}`;

        const chat = ai.chats.create({ 
            model: 'gemini-2.5-flash', 
            config: { 
                systemInstruction: dynamicInstruction,
                tools: [{ codeExecution: {} }] // Enable code execution
            }, 
            history: history 
        });
        const result = await chat.sendMessage({ message: messageContext });
        const text = result.text;
        
        await saveMessage(userNumber, 'ai', text);
        if (twilioClient) {
            await twilioClient.messages.create({ from: parallelNumber, to: userNumber, body: text });
        }
    }
  } catch (err) {
      console.error(err);
  }
});

// API endpoint for voice chat demo
app.post('/api/generate-voice-reply', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    
    // Generate text reply
    const chat = ai.chats.create({ 
      model: 'gemini-2.5-flash', 
      config: { 
        systemInstruction: BASE_SYSTEM_INSTRUCTION,
        tools: [{ codeExecution: {} }]
      }, 
      history: conversationHistory || []
    });
    
    const result = await chat.sendMessage({ message });
    res.json({ reply: result.text, audio: null });
  } catch (err) {
    console.error('Voice reply error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Native HTTP File Attachment (Bypasses WebView Sandbox Blocking)
app.get('/api/patient-template', (req, res) => {
    const csvContent = `Full Name,Phone Number,Age,Caregiver Name,Caregiver Phone,Conditions (comma separated inside quotes),Voice ID (Puck/Aoede/Charon)\nJane Doe,+15551234567,82,Mark Doe,+15559876543,"Hypertension, Diabetes",Puck`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Patient_Upload_Template.csv"');
    res.send(csvContent);
});

// Native Google Gemini Voice Preview via Headless Bidi WebRTC Injection
app.post('/api/preview-voice', async (req, res) => {
    const { voiceId, text } = req.body;
    if (!voiceId || !text) return res.status(400).json({ error: 'Missing voiceId or text' });

    try {
        const WebSocket = (await import('ws')).WebSocket;
        const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
        const ws = new WebSocket(`${GEMINI_WS_URL}?key=${process.env.GEMINI_API_KEY}`);

        let pcmChunks = [];
        let hasResponded = false;

        // Failsafe timeout
        const timeout = setTimeout(() => {
            if (!hasResponded) {
                hasResponded = true;
                ws.close();
                res.status(504).json({ error: 'Gemini Preview Timeout' });
            }
        }, 10000);

        ws.on('open', () => {
            const setupMsg = {
                setup: {
                    model: "models/gemini-2.5-flash-native-audio-latest",
                    generationConfig: { 
                        responseModalities: ["AUDIO"],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } }
                    }
                }
            };
            ws.send(JSON.stringify(setupMsg));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            
            if (response.setupComplete) {
                const promptMsg = {
                    clientContent: {
                        turns: [{ role: "user", parts: [{ text: text }] }],
                        turnComplete: true
                    }
                };
                ws.send(JSON.stringify(promptMsg));
            } else if (response.serverContent?.modelTurn?.parts) {
                for (const part of response.serverContent.modelTurn.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        pcmChunks.push(Buffer.from(part.inlineData.data, 'base64'));
                    }
                }
            } else if (response.serverContent?.turnComplete) {
                if (!hasResponded) {
                    hasResponded = true;
                    clearTimeout(timeout);
                    ws.close();

                    if (pcmChunks.length === 0) {
                        return res.status(500).json({ error: 'No audio generated by Gemini' });
                    }

                    // Concatenate all 24kHz PCM chunks
                    const totalBuffer = Buffer.concat(pcmChunks);

                    // Build a standard WAV container header for the 24000Hz 16-bit PCM payload
                    const wavHeader = Buffer.alloc(44);
                    wavHeader.write('RIFF', 0);
                    wavHeader.writeUInt32LE(36 + totalBuffer.length, 4);
                    wavHeader.write('WAVE', 8);
                    wavHeader.write('fmt ', 12);
                    wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
                    wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
                    wavHeader.writeUInt16LE(1, 22); // NumChannels (1 mono)
                    wavHeader.writeUInt32LE(24000, 24); // SampleRate (24000 Hz)
                    wavHeader.writeUInt32LE(24000 * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
                    wavHeader.writeUInt16LE(2, 32); // BlockAlign (NumChannels * BitsPerSample/8)
                    wavHeader.writeUInt16LE(16, 34); // BitsPerSample
                    wavHeader.write('data', 36);
                    wavHeader.writeUInt32LE(totalBuffer.length, 40);

                    const completeWav = Buffer.concat([wavHeader, totalBuffer]);
                    res.json({ audioWavBase64: completeWav.toString('base64') });
                }
            }
        });
        
        ws.on('error', (err) => {
            if (!hasResponded) {
                hasResponded = true;
                clearTimeout(timeout);
                res.status(500).json({ error: err.message });
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Stripe Checkout Session ---
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const { planId, addOns = [], metadata = {} } = req.body;

    // Build line items array
    const lineItems = [];

    // Add base subscription (lookup_key: "base_monthly")
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'MyParallel Base Subscription',
          description: 'AI wellness companion with voice chat',
        },
        unit_amount: 2999, // $29.99
        recurring: {
          interval: 'month',
        },
      },
      quantity: 1,
    });

    // Add each add-on by lookup_key
    const addOnPrices = {
      'deep_memory': { name: 'Deep Memory', price: 500, description: 'Extended conversation history' },
      'text_outreach': { name: 'Text Outreach', price: 500, description: 'Proactive SMS check-ins' },
      'email_outreach': { name: 'Email Outreach', price: 500, description: 'Daily wellness emails' },
      'phone_call_outreach': { name: 'Phone Call Outreach', price: 1500, description: 'Weekly phone calls' },
      'voice_ai': { name: 'Voice AI', price: 1000, description: 'Real-time voice conversations' },
      'voice_clone': { name: 'Voice Clone', price: 2000, description: 'Custom voice cloning' },
      'multi_companion': { name: 'Multi-Companion', price: 1000, description: 'Multiple AI companions' },
      'extended_memory': { name: 'Extended Memory', price: 500, description: 'Long-term memory storage' },
    };

    addOns.forEach((lookupKey) => {
      const addon = addOnPrices[lookupKey];
      if (addon) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: addon.name,
              description: addon.description,
            },
            unit_amount: addon.price,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        });
      }
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${FRONTEND_URL}/?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${FRONTEND_URL}/?canceled=true`,
      metadata: {
        plan_id: planId,
        add_ons: addOns.join(','),
        ...metadata,
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Stripe Webhook Handler ---
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return res.status(500).send('Stripe not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Checkout session completed:', session.id);
      
      // Update user's subscription status in Supabase
      if (supabase && session.customer) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_status: 'active',
          })
          .eq('id', session.client_reference_id || session.metadata?.user_id);
        
        if (error) {
          console.error('Error updating subscription:', error);
        }
      }
      break;

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      console.log('Subscription updated:', subscription.id, subscription.status);
      
      // Update subscription status
      if (supabase) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: subscription.status,
          })
          .eq('stripe_subscription_id', subscription.id);
        
        if (error) {
          console.error('Error updating subscription status:', error);
        }
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// --- Send Wellness Resources via SMS or Email ---
app.post('/api/send-resources', async (req, res) => {
  const { userId, topics, deliveryMethod, recipientContact } = req.body;
  
  if (!userId || !topics || !deliveryMethod || !recipientContact) {
    return res.status(400).json({ 
      error: 'Missing required fields: userId, topics, deliveryMethod, recipientContact' 
    });
  }

  if (!['sms', 'email'].includes(deliveryMethod)) {
    return res.status(400).json({ error: 'deliveryMethod must be "sms" or "email"' });
  }

  try {
    // Check user's subscription status
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_subscription_id, full_name, email')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has active subscription
    if (!userProfile.stripe_subscription_id) {
      return res.status(403).json({ 
        error: 'This feature requires an active subscription. Please upgrade to access wellness resources.' 
      });
    }

    // Get relevant resources based on topics
    const resourceLibrary = {
      depression: [
        { title: "Understanding Depression", url: "https://www.nimh.nih.gov/health/publications/depression", type: "guide" },
        { title: "Daily Tips for Managing Depression", url: "https://www.mind.org.uk/information-support/types-of-mental-health-problems/depression/self-care/", type: "article" },
      ],
      anxiety: [
        { title: "Managing Anxiety: Evidence-Based Techniques", url: "https://www.adaa.org/understanding-anxiety", type: "guide" },
        { title: "5-4-3-2-1 Grounding Technique", url: "https://www.mentalhealthamerica.net/grounding-techniques", type: "article" },
      ],
      loneliness: [
        { title: "Combating Loneliness: A Practical Guide", url: "https://www.bbc.com/bitesize/articles/z9n8n9q", type: "guide" },
        { title: "Finding Community and Support Groups", url: "https://www.supportgroups.com/", type: "article" },
      ],
      sleep: [
        { title: "Sleep Hygiene Guide", url: "https://www.sleepfoundation.org/sleep-hygiene", type: "guide" },
        { title: "Bedtime Routine Ideas", url: "https://www.aasm.org/what-is-sleep/", type: "article" },
      ],
      grief: [
        { title: "Understanding Grief and Loss", url: "https://www.webmd.com/mental-health/grief-loss", type: "guide" },
        { title: "Coping with Loss: Resources and Support", url: "https://www.griefshare.org/", type: "article" },
      ],
    };

    // Collect resources for requested topics
    const resources = [];
    const normalizedTopics = topics.map(t => t.toLowerCase().trim());
    
    normalizedTopics.forEach(topic => {
      if (resourceLibrary[topic]) {
        resources.push(...resourceLibrary[topic]);
      }
    });

    if (resources.length === 0) {
      return res.status(400).json({ error: 'No resources found for requested topics' });
    }

    // Format message
    const resourceText = resources
      .map(r => `📚 ${r.title}\n🔗 ${r.url}`)
      .join("\n\n");

    const message = `Hi ${userProfile.full_name || 'there'}! 👋\n\nHere are some helpful resources based on our conversation:\n\n${resourceText}\n\nWe're here for you. Take care! 💚\n- MyParallel`;

    // Send via SMS or Email
    if (deliveryMethod === 'sms') {
      if (!twilioClient) {
        return res.status(500).json({ error: 'SMS service not configured' });
      }

      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER || '+12345678900',
        to: recipientContact,
      });

      console.log(`Resources sent via SMS to ${recipientContact}`);
    } else if (deliveryMethod === 'email') {
      // Use a simple email service - you can integrate SendGrid, Nodemailer, etc.
      // For now, we'll log it and provide instructions
      console.log(`Email to ${recipientContact}:\nSubject: Your MyParallel Wellness Resources\n\n${message}`);
      
      // TODO: Integrate with email service (SendGrid, Nodemailer, etc.)
      // For demo: return success but note it requires email service setup
    }

    // Save resource delivery log to database
    const { error: logError } = await supabase
      .from('resource_deliveries')
      .insert({
        user_id: userId,
        topics: normalizedTopics,
        delivery_method: deliveryMethod,
        recipient_contact: recipientContact,
        resources_sent: resources.length,
        created_at: new Date().toISOString(),
      });

    if (logError) {
      console.warn('Could not log resource delivery:', logError);
    }

    res.json({
      success: true,
      message: `${resources.length} resources sent via ${deliveryMethod}`,
      resources: resources,
      deliveredTo: recipientContact,
    });
  } catch (err) {
    console.error('Resource send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Apple/Google Calendar .ics Subscription Feed
app.get('/api/calendar/:userId/feed.ics', async (req, res) => {
    if (!supabase) return res.status(500).send('Database not connected');
    const { userId } = req.params;
    
    try {
        const { data: events } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: true });
            
        if (!events) return res.status(404).send('No events found');

        let icsData = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//MyParallel AI Companion//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Parallel Caregiver Schedule'
        ];

        events.forEach(event => {
            const startStr = new Date(event.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const endStr = new Date(event.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const createdStr = new Date(event.created_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            
            icsData.push(
                'BEGIN:VEVENT',
                `UID:${event.id}@myparallel.ai`,
                `DTSTAMP:${createdStr}`,
                `DTSTART:${startStr}`,
                `DTEND:${endStr}`,
                `SUMMARY:${event.title || 'Check-in'}`,
                `DESCRIPTION:${event.description || ''}`,
                'END:VEVENT'
            );
        });

        icsData.push('END:VCALENDAR');
        
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="parallel_${userId}.ics"`);
        res.send(icsData.join('\r\n'));
    } catch(err) {
        res.status(500).send('Failed to generate calendar feed');
    }
});

startScheduler();
// --- UNIFIED FRONTEND HOSTING (MONOLITH) ---
// Serve the compiled Vite Single Page Application directly from the native filesystem
app.use(express.static(path.join(__dirname, 'dist')));

// Wildcard Catch-All to hand physical URL paths safely over to the React Router DOM
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => console.log(`Parallel Wellness Backend on ${PORT}`));

// Start up the Dual-Websocket bridging system onto the exact same server
setupVoiceRelay(server, getUserProfileContext, saveMessage, scheduleCalendarEvent);
