# Resource Delivery Feature - Visual Architecture Guide

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          VoiceDemo Component (React)                     │   │
│  │                                                          │   │
│  │  [Voice Selector Buttons]                              │   │
│  │  Kore | Fenrir | Puck | Zephyr                         │   │
│  │                                                          │   │
│  │  [Circular Microphone Visualizer]                       │   │
│  │  "Listening..." / "Speaking"                            │   │
│  │                                                          │   │
│  │  [Start/End Call Buttons]                               │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────┐          │   │
│  │  │  Resource Request Panel (Green Box)      │          │   │
│  │  │  ☑ SMS  ☐ Email                         │          │   │
│  │  │  [Phone Number Input]                    │          │   │
│  │  │  [Send Resources Button]                 │          │   │
│  │  └──────────────────────────────────────────┘          │   │
│  │  Visible only during active call                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Audio I/O:                                                       │
│  - User microphone input (16kHz PCM)                             │
│  - Speaker output (24kHz audio from Gemini)                      │
└──────────────────────────────────────────────────────────────────┘
           │
           │ HTTP/WebSocket
           ↓
┌──────────────────────────────────────────────────────────────────┐
│                  GEMINI LIVE API (WebSocket)                      │
│                                                                   │
│  - Real-time audio streaming (bidirectional)                     │
│  - AI conversation with memory                                   │
│  - Voice selection (Kore, Fenrir, Puck, Zephyr)                 │
│  - Natural topic detection and response                          │
│                                                                   │
│  System Instruction:                                              │
│  "If user mentions depression, anxiety, loneliness, etc...       │
│   offer to send helpful resources via SMS or email"              │
└──────────────────────────────────────────────────────────────────┘
           │
           │ sendRealtimeInput({ media: pcmBlob })
           │ onmessage({ serverContent.modelTurn.parts[0].inlineData })
           ↓
┌──────────────────────────────────────────────────────────────────┐
│                      EXPRESS BACKEND SERVER                       │
│                      (Node.js on Port 8081)                       │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  POST /api/send-resources                               │    │
│  │                                                          │    │
│  │  Request:                                                │    │
│  │  {                                                       │    │
│  │    userId: "user-uuid",                                 │    │
│  │    topics: ["depression", "anxiety"],                   │    │
│  │    deliveryMethod: "sms",                               │    │
│  │    recipientContact: "+1 (555) 123-4567"                │    │
│  │  }                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│           │                                                       │
│           ├─ 1. Validate input fields ──→ Error if missing        │
│           │                                                       │
│           ├─ 2. Query Supabase ────────→ Get user_profiles      │
│           │                                                       │
│           ├─ 3. Check Subscription ────→ stripe_subscription_id  │
│           │         │                                             │
│           │         ├─ No subscription? ──→ Return 403 Error      │
│           │         └─ Has subscription? ──→ Continue             │
│           │                                                       │
│           ├─ 4. Get Resources ──────────→ From resourceLibrary   │
│           │     (depression → 2-3 resources)                      │
│           │                                                       │
│           ├─ 5. Format Resources ──────→ SMS or Email format     │
│           │     SMS: Concise (title + link)                       │
│           │     Email: Detailed (description + link)              │
│           │                                                       │
│           ├─ 6. Send SMS via Twilio ───→ Async (non-blocking)    │
│           │                                                       │
│           ├─ 7. Log Delivery ──────────→ resource_deliveries tbl │
│           │     user_id, topics, method, recipient, count         │
│           │                                                       │
│           └─ 8. Return Success ────────→ Response to client      │
│                  {                                                │
│                    success: true,                                 │
│                    message: "3 resources sent via sms",            │
│                    resources: [...],                              │
│                    deliveredTo: "+1 (555) 123-4567"               │
│                  }                                                │
└──────────────────────────────────────────────────────────────────┘
       │                  │                      │
       │                  │                      │
       ↓                  ↓                      ↓
┌────────────┐     ┌──────────────┐      ┌──────────────────┐
│  Supabase  │     │   Twilio     │      │  Resource        │
│  Database  │     │   SMS API    │      │  Library         │
│            │     │              │      │                  │
│ Tables:   │     │ - Sends SMS  │      │ depression: [    │
│ - users   │     │ - Returns    │      │   {title, url},  │
│ - user_   │     │   delivery   │      │   {title, url}   │
│   profiles│     │   status     │      │ ]                │
│ - resource├────→│              │      │                  │
│   deliver- │     │ Console:     │      │ anxiety: [...]   │
│   ies      │     │ Returns      │      │                  │
│            │     │ Message SID  │      │ loneliness: [...] │
│ Queries:  │     │              │      │                  │
│ - Check   │     │ Requires:    │      │ sleep: [...]     │
│   stripe_ │     │ - Account    │      │                  │
│   subscr- │     │   SID        │      │ More topics...   │
│   iption_ │     │ - Auth token │      │                  │
│   id      │     │ - From phone │      │ (Hardcoded,      │
│            │     │   number    │      │  no DB lookup)   │
│ Inserts:  │     │              │      └──────────────────┘
│ - resource│     │ Cost:        │
│   deliver- │     │ ~$0.01/SMS   │
│   ies     │     └──────────────┘
│   records │
└────────────┘

         Sends SMS Message:
         ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
         
📱 USER'S PHONE
"Hi Sarah! 👋

Here are helpful resources about depression:

📚 Understanding Depression
🔗 https://www.nimh.nih.gov/health/publications/depression

📚 Daily Tips for Managing Depression
🔗 https://www.mind.org.uk/.../depression/self-care/

We're here for you. Take care! 💚
- MyParallel"
```

## Data Flow Sequence Diagram

```
Timeline:
┌─────────────────────────────────────────────────────────────────────┐
│                    VOICE CONVERSATION PHASE                          │
│  0s                                                          Time    │
│  ├─ User clicks "Start Conversation"                                │
│  │                                                                   │
│  ├─ System connects to Gemini Live API                              │
│  │  └─ User microphone access requested                             │
│  │                                                                   │
│  ├─ Audio streaming begins (bidirectional)                          │
│  │  ├─ User input: 16kHz PCM audio                                  │
│  │  └─ AI output: 24kHz audio response                              │
│  │                                                                   │
│  ├─ [During conversation]                                           │
│  │  ├─ User: "I've been feeling really depressed"                   │
│  │  │                                                                │
│  │  ├─ Gemini detects: "depression" topic                           │
│  │  │                                                                │
│  │  └─ AI responds with empathy + offer                            │
│  │     "Would you like resources? SMS or email?"                     │
│  │                                                                   │
│  └─ Resource Request Panel appears (green box)                      │
│     - SMS/Email radio buttons activated                             │
│     - Contact input field appears                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    RESOURCE REQUEST PHASE                            │
│  User enters contact info and clicks "Send Resources"                │
│                                                                      │
│  Frontend:                                                           │
│  ├─ Validate contact field (not empty)                              │
│  ├─ Disable button (show "Sending...")                              │
│  └─ POST /api/send-resources                                        │
│                                                                      │
│  Backend:                                                            │
│  ├─ Validate required fields                                        │
│  ├─ Query user_profiles from Supabase                               │
│  ├─ Check stripe_subscription_id exists                             │
│  │  ├─ If missing: Return 403 "Requires subscription"               │
│  │  └─ If exists: Continue                                          │
│  ├─ Find resources for topics ["depression"]                        │
│  ├─ Format for SMS (concise, top 2 resources)                       │
│  ├─ Send via Twilio (async, non-blocking)                           │
│  ├─ Insert record to resource_deliveries table                      │
│  │  └─ Includes: user_id, topics, method, recipient, count          │
│  └─ Return success response                                         │
│                                                                      │
│  Frontend:                                                           │
│  ├─ Receive success response                                        │
│  ├─ Show alert: "✅ 2 resources sent via SMS!"                       │
│  ├─ Clear contact field                                             │
│  ├─ Hide resource panel                                             │
│  └─ Resume listening (conversation continues)                       │
│                                                                      │
│  User's Phone:                                                       │
│  ├─ [Phone buzzes]                                                  │
│  └─ Receives SMS with resource links                                │
│                                                                      │
│  Database:                                                           │
│  └─ New row in resource_deliveries:                                 │
│     {                                                                │
│       user_id: "abc-123",                                            │
│       topics: ["depression"],                                        │
│       delivery_method: "sms",                                        │
│       recipient_contact: "+1 (555) 123-4567",                        │
│       resources_sent: 2,                                             │
│       created_at: "2025-12-08 15:34:22"                              │
│     }                                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Subscription Check Logic Flow

```
User requests resources
        ↓
Backend receives /api/send-resources request
        ↓
Query: SELECT stripe_subscription_id FROM user_profiles WHERE id = ?
        ↓
        ├─ Result: stripe_subscription_id IS NULL
        │         ↓
        │   Return HTTP 403
        │   {
        │     error: "This feature requires an active subscription. 
        │             Please upgrade to access wellness resources."
        │   }
        │         ↓
        │   Frontend shows error to user
        │   "Requires subscription to send resources"
        │
        └─ Result: stripe_subscription_id = "sub_123456"
                  ↓
           Continue to resource delivery
                  ↓
           Send resources via SMS/email
                  ↓
           Show success message
                  ↓
           User receives resources ✅
```

## Database Schema Diagram

```
┌────────────────────────────────────────┐
│        user_profiles (existing)         │
├────────────────────────────────────────┤
│ id (UUID) PK                            │
│ full_name TEXT                          │
│ email TEXT                              │
│ stripe_customer_id TEXT                 │
│ stripe_subscription_id TEXT ◄────┐     │
│ stripe_features JSONB              │     │
│ ... (other fields)                 │     │
└────────────────────────────────────────┘
                                          │
                                    REFERENCE
                                          │
                    ┌─────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│    resource_deliveries (NEW TABLE)     │
├────────────────────────────────────────┤
│ id (UUID) PK                            │
│ user_id (UUID) FK ────────────────────→ user_profiles(id)
│ topics (TEXT[]) - ["depression"]        │
│ delivery_method TEXT - 'sms'/'email'    │
│ recipient_contact TEXT - Phone/Email    │
│ resources_sent INTEGER - 2, 3, etc      │
│ created_at TIMESTAMP                    │
├────────────────────────────────────────┤
│ Indexes:                                │
│ - idx_resource_deliveries_user_id      │
│ - idx_resource_deliveries_created_at   │
├────────────────────────────────────────┤
│ Policies:                               │
│ - RLS enabled                           │
│ - Allow all (can be restricted)         │
└────────────────────────────────────────┘
```

## Resource Library Structure

```
┌─ WELLNESS_RESOURCES (TypeScript Object)
│
├─ depression: [
│  ├─ {
│  │  title: "Understanding Depression"
│  │  description: "Comprehensive guide..."
│  │  url: "https://www.nimh.nih.gov/..."
│  │  type: "guide"
│  │  topics: ["depression", "mental-health"]
│  │ }
│  └─ {
│     title: "Daily Tips for Managing Depression"
│     url: "https://www.mind.org.uk/..."
│     ...
│  }
│
├─ anxiety: [...]
├─ loneliness: [...]
├─ sleep: [...]
├─ grief: [...]
├─ nutrition: [...]
├─ exercise: [...]
├─ elderly: [...]
└─ crisis: [...]

Total: 9 topics × 2-3 resources each = 20+ resources available
```

## Error Handling Flow

```
User action: Try to send resources
        ↓
Backend validation
        ├─ Missing fields?
        │  └─ Return 400: "Missing required fields"
        │
        ├─ User not found?
        │  └─ Return 404: "User not found"
        │
        ├─ No subscription?
        │  └─ Return 403: "Requires subscription"
        │
        ├─ No resources found?
        │  └─ Return 400: "No resources for topics"
        │
        ├─ Twilio error?
        │  └─ Return 500: "Failed to send SMS"
        │
        └─ Success?
           └─ Return 200: { success: true, ... }

Frontend handles each error:
- 400 errors → Show to user: "Please check your input"
- 403 error → Show to user: "You need a subscription"
- 404 error → Show to user: "Account not found"
- 500 error → Show to user: "Server error, try again"
- 200 success → Show: "✅ Resources sent!"
```

## Environment Variables Required

```
BACKEND (.env)
├─ PORT=8081
├─ API_KEY=AIzaSy... (Gemini API)
├─ TWILIO_ACCOUNT_SID=AC...
├─ TWILIO_AUTH_TOKEN=auth...
├─ TWILIO_PHONE_NUMBER=+1234567890
├─ SUPABASE_URL=https://...
├─ SUPABASE_KEY=eyJhbG...
└─ (Email service keys - optional)
   ├─ SENDGRID_API_KEY=SG...
   └─ SENDGRID_FROM_EMAIL=resources@...

FRONTEND (.env)
├─ VITE_API_URL=http://localhost:8081
├─ VITE_SUPABASE_URL=https://...
└─ VITE_SUPABASE_KEY=eyJhbG...
```

---

This visual guide shows how all components connect and interact!
