import * as dotenv from 'dotenv';
import { WebSocket } from 'ws';

dotenv.config({ path: '.env' });

const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.GEMINI_API_KEY}`;
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

ws.on('message', (data) => console.log("Received:", data.toString()));
ws.on('close', (code, reason) => {
  console.log(`Closed: ${code}, Reason: ${reason}`);
  process.exit(0);
});
ws.on('error', (err) => console.error("Error:", err));
