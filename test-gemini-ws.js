import * as dotenv from 'dotenv';
import { WebSocket } from 'ws';

dotenv.config({ path: '.env' });

const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${process.env.GEMINI_API_KEY}`;
console.log("Connecting to Gemini...");

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log("Connected!");
  const setupMsg = {
    setup: {
      model: "models/gemini-2.0-flash-exp",
      generationConfig: { responseModalities: ["AUDIO"] },
      systemInstruction: { parts: [{ text: "Hello I am testing" }] }
    }
  };
  ws.send(JSON.stringify(setupMsg));
  console.log("Setup message sent.");
});

ws.on('message', (data) => {
    const res = JSON.parse(data.toString());
    if (res.setupComplete) {
       ws.send(JSON.stringify({
          clientContent: { turns: [{ role: "user", parts: [{ text: "Hello! Reply with something longer than 5 words so I can test." }] }], turnComplete: true }
       }));
    }
    if (res.serverContent?.modelTurn) {
        if (res.serverContent.modelTurn.parts[0]?.inlineData) {
            console.log("Audio Chunk Received:", res.serverContent.modelTurn.parts[0].inlineData.mimeType);
        } else {
            console.log("Model Turn Response:", JSON.stringify(res.serverContent.modelTurn.parts[0]));
        }
    }
});
ws.on('close', (code, reason) => {
  console.log(`Closed: ${code}, Reason: ${reason}`);
  process.exit(0);
});
ws.on('error', (err) => console.error("Error:", err));
