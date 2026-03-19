import { WebSocketServer, WebSocket } from "ws";
import alawmulaw from "alawmulaw";
import { Buffer } from "node:buffer";

const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

export function setupVoiceRelay(server, getContextCallback, saveMessageCallback) {
  const wss = new WebSocketServer({ server, path: '/api/twilio/media' });

  wss.on("connection", (twilioWs) => {
    let streamSid = null;
    let geminiWs = null;

    console.log("[WebRTC] Twilio Media Stream Connected");

    twilioWs.on("message", async (message) => {
      const msg = JSON.parse(message);

      if (msg.event === "start") {
        streamSid = msg.start.streamSid;
        const userNumber = msg.start.customParameters?.userNumber;
        let contextString = "";
        let voiceId = "Puck";
        let emotionalTrait = "Empathetic and warm";
        let aiTranscriptBuffer = "";
        
        if (userNumber && getContextCallback) {
            const contextData = await getContextCallback(userNumber);
            if (contextData) {
               contextString = contextData.contextString || "";
               voiceId = contextData.voiceId || "Puck";
               emotionalTrait = contextData.emotionalTrait || "Empathetic and warm";
            }
        }

        geminiWs = new WebSocket(`${GEMINI_WS_URL}?key=${process.env.GEMINI_API_KEY}`);

        geminiWs.on("open", () => {
          console.log(`[WebRTC] Gemini Stream Connected. Forcing Voice: ${voiceId}`);
          
          const setupMsg = {
            setup: {
              model: "models/gemini-2.5-flash-native-audio-latest",
              generationConfig: { 
                 responseModalities: ["AUDIO"],
                 speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } }
              },
              systemInstruction: { parts: [{ text: `You are Parallel automatically responding to a check-in phone call. You MUST adopt this exact personality trait: ${emotionalTrait}. Answer the phone warmly with 1 short natural sentence like 'Hello I am here'. Keep all your responses extremely brief (1 short sentence max) to simulate a real phone call. Do not use filler formatting. User Profile Data: \n\n${contextString}` }] }
            }
          };
          geminiWs.send(JSON.stringify(setupMsg));
        });

        geminiWs.on("message", (data) => {
          const response = JSON.parse(data.toString());
          if (response.setupComplete) {
              console.log("[Gemini] Setup Complete. Forcing instantaneous acoustic greeting.");
              if (saveMessageCallback && userNumber) {
                  saveMessageCallback(userNumber, 'system', '[System] 📞 Patient answered the phone call. Secure Voice Bridge Connected.', null, 'call');
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
              if (aiTranscriptBuffer.trim() && saveMessageCallback && userNumber) {
                  saveMessageCallback(userNumber, 'ai', aiTranscriptBuffer.trim(), null, 'call');
              }
              aiTranscriptBuffer = "";
          } else if (response.serverContent?.modelTurn?.parts) {
            for (const part of response.serverContent.modelTurn.parts) {
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
        if (saveMessageCallback && userNumber) {
            saveMessageCallback(userNumber, 'system', '[System] 📞 Phone Call Ended.', null, 'call');
        }
        if (geminiWs) geminiWs.close();
      }
    });

    twilioWs.on("close", () => {
      console.log("[WebRTC] Twilio Socket Closed");
      if (geminiWs) geminiWs.close();
    });
  });
}


