# Voice Relay Setup (For Twilio Phone Calls)

The `voice-relay.js` file is for **Twilio phone call integration**, not the web voice chat demo.

## What It Does

- Bridges Twilio Media Streams (phone calls) to Gemini Live API
- Enables real-time voice conversations over phone
- Ultra-fast streaming (20ms frames)

## Setup

1. **Install dependencies** (already installed):
   ```bash
   npm install ws express body-parser
   ```

2. **Start the voice relay server**:
   ```bash
   npm run start:voice
   # Or: node voice-relay.js
   ```

3. **Configure Twilio**:
   - Set webhook URL to: `https://your-domain.com/voice`
   - Twilio will send `StreamUrl` in POST body
   - Voice relay connects to that WebSocket

## For Web Voice Chat

The web voice chat demo (`VoiceChatDemo.tsx`) uses:
- Browser Speech Recognition API (for input)
- Gemini TTS API (for output)
- **Not** the voice-relay.js (that's for phone calls)

The web demo is already optimized and working with the TalkingCircle animation.

## Production Performance

**Web Voice Chat**: 3-5 seconds (sequential API calls - acceptable)
**Phone Voice Calls**: Real-time streaming (via voice-relay.js)

Both are appropriate for their use cases!


