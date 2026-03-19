# Server Setup Guide

## Three Separate Servers

You have **three separate servers** that can run independently:

### 1. **Main Backend Server** (Port 8081)
```bash
npm start
# Or: PORT=8081 node backend-server.js
```
**Purpose:**
- Handles all API endpoints (`/api/generate-reply`, `/api/generate-voice-reply`, etc.)
- Manages Supabase, Stripe, Twilio SMS
- Main application backend

### 2. **Voice Relay Server** (Port 8082)
```bash
npm run start:voice
# Or: node voice-relay.js
```
**Purpose:**
- **Backend server** for Twilio phone call integration
- Bridges Twilio Media Streams → Gemini Live API
- Only needed if you're using phone call features
- **Not needed for web voice chat demo**

### 3. **Frontend Dev Server** (Port 5173)
```bash
npm run dev
```
**Purpose:**
- React/Vite development server
- Serves the web app UI
- Connects to backend servers via API calls

## Development Setup

**Terminal 1 - Main Backend:**
```bash
PORT=8081 npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - Voice Relay (Optional, only for phone calls):**
```bash
npm run start:voice
```

## Production Setup

In production, you'd typically:
- Deploy main backend to one server (Render, Railway, etc.)
- Deploy voice relay to same or separate server
- Deploy frontend to Vercel, Netlify, or static hosting

## Which Server Do You Need?

**For web voice chat demo:** ✅ Main Backend (8081) + Frontend (5173)
**For phone call features:** ✅ All three servers

The voice relay is **only for Twilio phone calls**, not the web demo!


