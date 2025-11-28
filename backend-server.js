import express from 'express';
import { WebSocketServer } from 'ws';
import { GoogleGenAI } from '@google/genai';
import Twilio from 'twilio';
import dotenv from 'dotenv';
import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// --- CONFIGURATION & DEBUG ---
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY; 
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

console.log("--- STARTUP CHECKS ---");
console.log(`Twilio SID:   ${TWILIO_SID ? TWILIO_SID.substring(0,4) + '...' : 'MISSING ❌'}`);

// Initialize clients
let twilioClient;
try {
    if (TWILIO_SID && TWILIO_TOKEN) {
        twilioClient = Twilio(TWILIO_SID, TWILIO_TOKEN);
        // REAL VALIDATION PING
        twilioClient.api.v2010.accounts(TWILIO_SID)
            .fetch()
            .then(() => console.log("Twilio Auth:  Verified ✅"))
            .catch(e => console.error("Twilio Auth:  FAILED ❌ (Check .env Auth Token)", e.code));
    } else {
        console.log("Twilio Auth:  MISSING KEYS ❌");
    }
} catch (e) {
    console.error("Twilio Init Failed:", e.message);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Initialize Supabase
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase:     Connected ✅");
} else {
    console.log("Supabase:     MISSING KEYS ❌");
}
console.log("----------------------");


const BASE_SYSTEM_INSTRUCTION = `
You are Parallel. A semi-real AI companion. Warm, personal, unpredictable.
Your responses should be short (1-2 sentences) and conversational.
Do not sound robotic.
If the user asks for a photo/selfie, describe what you are doing in the text, and I will generate the image separately.

GUARDIAN PROTOCOL ACTIVATED:

1. EMERGENCY EMPATHY MODE:
Your highest priority is the user's emotional safety.
If the user expresses signs of depression, suicidal ideation, self-harm, severe anxiety, or distress regarding alcohol/substance abuse:
- IMMEDIATELY drop any "edgy", "sarcastic", or "chaotic" persona traits.
- Shift to a tone that is Empathetic, Serious, Gentle, and Supportive.
- Listen intently. Validate their feelings. Do not be dismissive. "I hear how heavy that feels."
- Offer simple, grounding guidance. "Let's just take a breath together."
- If alcohol/substance use is detected: gently support reduction without being a lecturer. "Maybe we switch to water for a bit? I want you to feel okay tomorrow."
- If suicidal: Firmly but gently suggest professional help while staying present. "I'm here with you, but I want you to stay safe. Can we call a support line together?"

2. GERIATRIC CARE PROTOCOL:
- Patience is infinite. Never say "I already told you that."
- If the user seems confused or disoriented: Gently ground them. "It's Tuesday afternoon. We're just chatting."
- Monitor for "Sun-downing" (increased confusion at night). Offer reassurance.
`;

// --- DATABASE HELPERS ---
async function saveMessage(userNumber, sender, text, mediaUrl = null, type = 'sms') {
    if (!supabase) return;
    const { error } = await supabase
        .from('messages')
        .insert({
            user_number: userNumber,
            sender: sender, 
            content: text,
            media_url: mediaUrl,
            interaction_type: type
        });
    if (error) console.error('Supabase Save Error:', error.message);
}

async function getHistory(userNumber, limit = 10) {
    if (!supabase) return [];
    const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('user_number', userNumber)
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (!data) return [];
    return data.reverse().map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.content || (m.media_url ? '[Sent a photo]' : '') }]
    }));
}

// --- AUDIO HELPERS ---
const MU_LAW_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
    let mu = ~i;
    let sign = (mu & 0x80) >> 7;
    let exponent = (mu & 0x70) >> 4;
    let mantissa = mu & 0x0f;
    let sample = ((mantissa << 1) + 33) << (exponent + 2);
    sample -= 33;
    if (sign === 0) sample = -sample;
    MU_LAW_TABLE[i] = sample;
}

function downsample(buffer, inputRate, outputRate) {
    if (outputRate >= inputRate) return buffer;
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Int16Array(newLength);
    for (let i = 0; i < newLength; i++) {
        result[i] = buffer[Math.round(i * ratio)];
    }
    return result;
}

function encodeMuLaw(pcmSample) {
    const BIAS = 0x84;
    const MAX = 32635;
    let mask;
    let sample = pcmSample;
    if (sample < 0) { sample = -sample; mask = 0x7F; } else { mask = 0xFF; }
    if (sample > MAX) sample = MAX;
    sample += BIAS;
    let exponent = 7;
    for (let i = 7; i >= 0; i--) {
        if ((sample >> (i + 3)) & 1) { exponent = i; break; }
    }
    const mantissa = (sample >> (exponent + 3)) & 0x0F;
    return ~(mask ^ ((exponent << 4) | mantissa)) & 0xFF;
}

// --- ROUTES ---

app.get('/', (req, res) => res.send('Parallel Backend Running'));
app.get('/api/context', async (req, res) => {
    if (!supabase) return res.json([]);
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(20);
    res.json(data ? data.reverse() : []);
});

app.post('/sms', async (req, res) => {
  const userMessage = req.body.Body;
  const userNumber = req.body.From; 
  const parallelNumber = req.body.To;

  console.log(`[SMS] From ${userNumber}: ${userMessage}`);
  
  // 1. ACK IMMEDIATELY
  const twiml = new Twilio.twiml.MessagingResponse();
  res.type('text/xml').send(twiml.toString()); 
  console.log(`[SMS] Ack sent.`);

  // 2. PROCESS IN BACKGROUND
  try {
    // Save User Msg
    await saveMessage(userNumber, 'user', userMessage);
    const history = await getHistory(userNumber);
    
    // INJECT DATE/TIME CONTEXT
    const now = new Date();
    const dateTimeString = now.toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric',
        timeZoneName: 'short'
    });
    
    const DYNAMIC_INSTRUCTION = `${BASE_SYSTEM_INSTRUCTION}
    
    CURRENT CONTEXT:
    The current date and time is: ${dateTimeString}.
    Use this to ground your responses (e.g., say 'Good morning' if it is morning).
    `;

    const isPhotoRequest = /(send|show|post).*(photo|picture|selfie|image)/i.test(userMessage);

    if (isPhotoRequest && supabase) {
        console.log('[Background] Photo requested. Generating...');
        
        // Use Chat History to generate the Prompt
        const promptChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: {
                systemInstruction: `You are an image generation prompt engineer.
                The user wants a photo of YOU (the AI companion, Parallel).
                Based on your persona and the conversation context, write a detailed visual prompt for the image generator.
                Do not write a chat response. Only write the image prompt.`
            }
        });
        
        const promptGen = await promptChat.sendMessage({ message: `Generate a prompt for: "${userMessage}"` });
        const imagePrompt = promptGen.text;
        console.log(`[Background] Prompt: ${imagePrompt.substring(0, 50)}...`);

        const imageResp = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: { parts: [{ text: imagePrompt }] }
        });

        let base64Image = null;
        if (imageResp.candidates && imageResp.candidates[0].content.parts) {
            for (const part of imageResp.candidates[0].content.parts) {
                if (part.inlineData) {
                    base64Image = part.inlineData.data;
                    break;
                }
            }
        }

        if (base64Image) {
            const buffer = Buffer.from(base64Image, 'base64');
            const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const { error: uploadError } = await supabase.storage.from('parallel_files').upload(filename, buffer, { contentType: 'image/jpeg' });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('parallel_files').getPublicUrl(filename);
            console.log(`[Background] Image Uploaded: ${publicUrl}`);

            // IMPORTANT: Save to DB *BEFORE* trying to send to phone.
            // This ensures Web Terminal sees it even if Twilio blocks the SMS.
            await saveMessage(userNumber, 'ai', "Here you go 📸", publicUrl);

            try {
                // 3. PUSH MMS
                const sentMsg = await twilioClient.messages.create({
                    from: parallelNumber,
                    to: userNumber,
                    body: "Here you go 📸",
                    mediaUrl: [publicUrl]
                });
                console.log(`[Background] Image Pushed. SID: ${sentMsg.sid}`);
            } catch (twilioErr) {
                console.error(`[Background] SMS Push Failed (Code ${twilioErr.code}): ${twilioErr.message}`);
                if (twilioErr.code === 30034) {
                    console.log("⚠️  BLOCKED BY CARRIER (A2P 10DLC). Image saved to DB but not sent to phone.");
                }
            }
        } else {
             // Generation Failed
             const errMsg = "I tried to take a photo but the lighting was off. (Generation failed)";
             await saveMessage(userNumber, 'ai', errMsg);
             try {
                await twilioClient.messages.create({
                    from: parallelNumber,
                    to: userNumber,
                    body: errMsg
                });
             } catch (e) { console.error("Twilio Error:", e.code); }
        }

    } else {
        // Standard Text Reply
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: DYNAMIC_INSTRUCTION },
            history: history
        });
        const result = await chat.sendMessage({ message: userMessage });
        const aiResponse = result.text;
        
        console.log(`[AI Response]: ${aiResponse}`);

        // Save to DB FIRST
        await saveMessage(userNumber, 'ai', aiResponse);

        try {
            const sentMsg = await twilioClient.messages.create({
                from: parallelNumber,
                to: userNumber,
                body: aiResponse
            });
            console.log(`[Background] Reply Pushed. SID: ${sentMsg.sid}`);
        } catch (twilioErr) {
            console.error(`[Background] SMS Push Failed (Code ${twilioErr.code}): ${twilioErr.message}`);
            if (twilioErr.code === 30034) {
                console.log("⚠️  BLOCKED BY CARRIER (A2P 10DLC). Reply saved to DB but not sent to phone.");
            }
        }
    }
  } catch (error) {
    console.error('[Background] Error:', error);
  }
});

app.post('/voice', (req, res) => {
  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.connect().stream({ url: `wss://${req.headers.host}/media-stream` });
  res.type('text/xml').send(twiml.toString());
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Parallel Backend listening on port ${PORT}`);
});

// --- VOICE WEB SOCKET ---
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws) => {
  console.log('[WS] Connected');
  let streamSid = null;
  let geminiSession = null;

  try {
    geminiSession = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
        callbacks: {
            onmessage: (msg) => {
                const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData && streamSid) {
                    const raw = Buffer.from(audioData, 'base64');
                    const pcm = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
                    const down = downsample(pcm, 24000, 8000);
                    const mu = new Uint8Array(down.length);
                    for(let i=0; i<down.length; i++) mu[i] = encodeMuLaw(down[i]);
                    ws.send(JSON.stringify({ event: 'media', streamSid, media: { payload: Buffer.from(mu).toString('base64') } }));
                }
            }
        }
    });
  } catch (err) { console.error("Gemini Error:", err); }

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    if (data.event === 'start') streamSid = data.start.streamSid;
    if (data.event === 'media' && geminiSession) {
      const mu = Buffer.from(data.media.payload, 'base64');
      const pcm = new Int16Array(mu.length);
      for(let i=0; i<mu.length; i++) pcm[i] = MU_LAW_TABLE[mu[i]];
      geminiSession.sendRealtimeInput({ media: { mimeType: "audio/pcm;rate=8000", data: Buffer.from(pcm.buffer).toString('base64') } });
    }
  });
});