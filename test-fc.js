import * as dotenv from 'dotenv';
import { WebSocket } from 'ws';

dotenv.config();

const aiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${aiKey}`;
console.log("Test: Gemini Native Audio + Function Calling");

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log("Connected!");
  const setupMsg = {
    setup: {
      model: "models/gemini-2.5-flash-native-audio-latest",
      tools: [{
        functionDeclarations: [{
          name: "schedule_calendar_event",
          description: "Schedule a calendar appointment into the system.",
          parameters: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Short title of the event" },
              description: { type: "STRING", description: "Details of the event" },
              start_time: { type: "STRING", description: "ISO 8601 formatted start time" }
            },
            required: ["title", "description", "start_time"]
          }
        }]
      }],
      generationConfig: { 
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
      },
      systemInstruction: { parts: [{ text: "You are an AI. You MUST use the schedule_calendar_event tool when asked to schedule. Never verbally agree without triggering the tool." }] }
    }
  };
  ws.send(JSON.stringify(setupMsg));
  console.log("Setup sent with AUDIO + tools.");
});

ws.on('message', (data) => {
  const res = JSON.parse(data.toString());
  
  if (res.setupComplete) {
    console.log("Setup complete! Sending text scheduling request...");
    ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [{ text: "Schedule a doctor appointment for tomorrow at 3pm please." }] }],
        turnComplete: true
      }
    }));
  }

  // Check ALL possible locations for function calls
  if (res.toolCall) {
    console.log("=== res.toolCall ===", JSON.stringify(res.toolCall, null, 2));
  }
  if (res.toolCallCancellation) {
    console.log("=== TOOL CALL CANCELLED ===", JSON.stringify(res.toolCallCancellation));
  }
  
  if (res.serverContent?.modelTurn?.parts) {
    for (const part of res.serverContent.modelTurn.parts) {
      if (part.functionCall) {
        console.log("=== FUNCTION CALL IN modelTurn ===");
        console.log(JSON.stringify(part.functionCall, null, 2));
      }
      if (part.text) {
        console.log("Text:", part.text);
      }
      if (part.inlineData) {
        // Just note audio chunks, don't print data
        process.stdout.write("🔊");
      }
    }
  }
  
  if (res.serverContent?.turnComplete) {
    console.log("\n--- Turn Complete ---");
    setTimeout(() => { ws.close(); process.exit(0); }, 2000);
  }
});

ws.on('close', (code, reason) => {
  console.log(`\nClosed: ${code}, Reason: ${reason}`);
  process.exit(0);
});
ws.on('error', (err) => console.error("Error:", err));

setTimeout(() => { console.log("\nTimeout"); ws.close(); process.exit(1); }, 20000);
