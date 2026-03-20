import { WebSocketServer, WebSocket } from "ws";
import alawmulaw from "alawmulaw";
import { Buffer } from "node:buffer";

const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export function setupVoiceRelay(server, getContextCallback, saveMessageCallback, scheduleEventCallback) {
  const wss = new WebSocketServer({ server, path: '/api/twilio/media' });

  wss.on("connection", (twilioWs) => {
    let streamSid = null;
    let geminiWs = null;
    let activeUserNumber = null; // Hoisted above the loop to prevent fatal ReferenceErrors on Twilio disconnect

    console.log("[WebRTC] Twilio Media Stream Connected");

    twilioWs.on("message", async (message) => {
      try {
        const msg = JSON.parse(message);

        if (msg.event === "start") {
          streamSid = msg.start.streamSid;
          activeUserNumber = msg.start.customParameters?.userNumber;
          console.log(`[Proxy] Twilio Socket Started for userNumber: ${activeUserNumber}`);
          let contextString = "";
          let voiceId = "Puck";
          let emotionalTrait = "Empathetic and warm";
          let aiTranscriptBuffer = "";

          if (activeUserNumber && getContextCallback) {
            const contextData = await getContextCallback(activeUserNumber);
            if (contextData && contextData.contextString) {
              contextString = contextData.contextString || "";
              voiceId = contextData.voiceId || "Puck";
              emotionalTrait = contextData.emotionalTrait || "Empathetic and warm";
              console.log(`[Proxy] Successfully hydrated patient context for: ${activeUserNumber}`);
            } else {
              console.warn(`[Proxy WARNING] No patient found in DB for raw Twilio number: ${activeUserNumber}`);
            }
          }

          const aiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
          geminiWs = new WebSocket(`${GEMINI_WS_URL}?key=${aiKey}`);

          geminiWs.on("open", () => {
            console.log(`[WebRTC] Gemini Stream Connected. Forcing Voice: ${voiceId}`);

            const setupMsg = {
              setup: {
                model: "models/gemini-2.5-flash-native-audio-latest",
                tools: [{
                  functionDeclarations: [{
                    name: "schedule_calendar_event",
                    description: "Schedule a calendar appointment natively into the caregiver system.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        title: { type: "STRING", description: "Short title of the event" },
                        description: { type: "STRING", description: "Details of the event" },
                        start_time: { type: "STRING", description: "ISO 8601 formatted start time (e.g. 2026-03-20T15:00:00Z)" }
                      },
                      required: ["title", "description", "start_time"]
                    }
                  }]
                }],
                generationConfig: {
                  responseModalities: ["AUDIO"],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } }
                },
                systemInstruction: {
                  parts: [{
                    text: `You are MyParallel responding to a check-in phone call. Adopt this personality trait: ${emotionalTrait}. Keep responses extremely brief (1 short sentence max). Do not use filler formatting. 
              
CRITICAL RULES:
1. You have a TOOL BLOCK installed called "schedule_calendar_event". If the user asks to schedule an appointment or check-in, YOU ABSOLUTELY MUST EMIT THIS FUNCTION CALL! DO NOT verbally agree without emitting the physical function block! If you say "I will schedule that" without firing the tool, the entire database crashes. Use the tool physically!

User Profile Data: \n\n${contextString}` }]
                }
              }
            };
            geminiWs.send(JSON.stringify(setupMsg));
          });

          geminiWs.on("message", (data) => {
            const response = JSON.parse(data.toString());
            if (response.setupComplete) {
              console.log("[Gemini] Setup Complete. Forcing instantaneous acoustic greeting.");
              if (saveMessageCallback && activeUserNumber) {
                saveMessageCallback(activeUserNumber, 'system', '[System] 📞 Patient answered the phone call. Secure Voice Bridge Connected.', null, 'call');
              }
              const greetingMsg = {
                clientContent: {
                  turns: [{
                    role: "user",
                    parts: [{ text: "Hi, I just answered the phone. Please introduce yourself immediately and reference your context to start the conversation." }]
                  }],
                  turnComplete: true
                }
              };
              geminiWs.send(JSON.stringify(greetingMsg));
            } else if (response.serverContent?.turnComplete) {
              if (aiTranscriptBuffer.trim() && saveMessageCallback && activeUserNumber) {
                saveMessageCallback(activeUserNumber, 'ai', aiTranscriptBuffer.trim(), null, 'call');
              }
              aiTranscriptBuffer = "";
            } else if (response.serverContent?.modelTurn?.parts) {
              for (const part of response.serverContent.modelTurn.parts) {

                if (part.functionCall) {
                  console.log("[Proxy] RAW GENAI FUNCTION CALL INTERCEPTED:", JSON.stringify(part.functionCall));
                  if (part.functionCall.name === 'schedule_calendar_event') {
                    const call = part.functionCall;
                    if (scheduleEventCallback) {
                      console.log(`[Proxy] Executing backend scheduleEventCallback for ${activeUserNumber}...`, call.args);

                      scheduleEventCallback(activeUserNumber, call.args.title, call.args.description, call.args.start_time).then(success => {
                        console.log(`[Proxy] DB Insert Result: ${success} -> Sending functionResponse to Gemini...`);
                        const responsePayload = {
                          clientContent: {
                            turns: [{
                              role: "user",
                              parts: [{
                                functionResponse: {
                                  id: call.id || undefined, // strictly require ID for GenAI stability if provided
                                  name: "schedule_calendar_event",
                                  response: success ? { status: "success", detail: "Appointment securely saved." } : { status: "error", detail: "Database rejection. User profile not found." }
                                }
                              }]
                            }],
                            turnComplete: true
                          }
                        };
                        try {
                          if (geminiWs.readyState === 1) { // WebSocket.OPEN is 1
                            geminiWs.send(JSON.stringify(responsePayload));
                          } else {
                            console.warn(`[Proxy WARNING] Gemini WS is not OPEN (state: ${geminiWs.readyState}). Dropping responsePayload.`);
                          }
                        } catch (err) {
                          console.error("[Proxy FATAL] Synchronous send crash intercepted:", err);
                        }
                      }).catch(e => {
                        console.error("[Proxy ERROR] scheduleEventCallback promise chain rejected natively:", e);
                      });
                    }
                  }
                }
                if (part.text) {
                  aiTranscriptBuffer += part.text;
                }
                if (part.inlineData && part.inlineData.data) {
                  // Gemini outputs 24000Hz PCM as base64
                  const pcmBuffer = Buffer.from(part.inlineData.data, "base64");
                  const pcm16 = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.byteLength / 2);

                  // Downsample 24kHz to 8kHz (drop 2 out of 3 samples)
                  const downsampled = new Int16Array(Math.floor(pcm16.length / 3));
                  for (let i = 0, j = 0; i < pcm16.length && j < downsampled.length; i += 3, j++) {
                    downsampled[j] = pcm16[i];
                  }

                  // Encode 8kHz PCM to 8kHz mu-law
                  const ulawData = alawmulaw.mulaw.encode(downsampled);
                  const ulawBase64 = Buffer.from(ulawData).toString("base64");

                  if (streamSid && twilioWs.readyState === WebSocket.OPEN) {
                    twilioWs.send(JSON.stringify({
                      event: "media",
                      streamSid: streamSid,
                      media: { payload: ulawBase64 }
                    }));
                  }
                }
              }
            }
          });

          geminiWs.on("close", () => console.log("[WebRTC] Gemini Stream Closed"));
          geminiWs.on("error", (err) => console.error("[WebRTC] Gemini Error:", err));
        }

        if (msg.event === "media") {
          if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
            const ulawBuffer = Buffer.from(msg.media.payload, "base64");

            // Decode 8kHz mu-law to 8kHz PCM
            const pcm16 = alawmulaw.mulaw.decode(ulawBuffer);

            // Upsample 8kHz PCM to 16kHz PCM (duplicate every sample)
            const upsampled = new Int16Array(pcm16.length * 2);
            for (let i = 0; i < pcm16.length; i++) {
              upsampled[i * 2] = pcm16[i];
              upsampled[i * 2 + 1] = pcm16[i];
            }

            const pcmBase64 = Buffer.from(upsampled.buffer, upsampled.byteOffset, upsampled.byteLength).toString("base64");

            geminiWs.send(JSON.stringify({
              realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: pcmBase64 }] }
            }));
          }
        }

        if (msg.event === "stop") {
          console.log("[WebRTC] Twilio Stream Stopped");
          if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.close();
          }
          if (saveMessageCallback && activeUserNumber) {
            saveMessageCallback(activeUserNumber, 'system', '[Call Ended]', null, 'call').catch(e => console.error(e));
          }
        }
      } catch (error) {
        console.error("[WebRTC] Error processing Twilio message:", error);
      }
    });

    twilioWs.on("close", () => {
      console.log("[WebRTC] Twilio Socket Closed");
      if (geminiWs) geminiWs.close();
    });
  });
}


