# Local Development Setup

## Running the Application Locally

You need **3 separate terminals** running:

### Terminal 1: Backend Server
```bash
cd /Volumes/SkillBinder/SKILLBINDER\ ƒ/MyParallel/myparallel.chat
PORT=8081 npm start
```
**Purpose:** Runs the Express backend on port 8081

### Terminal 2: Frontend Dev Server
```bash
cd /Volumes/SkillBinder/SKILLBINDER\ ƒ/MyParallel/myparallel.chat
npm run dev
```
**Purpose:** Runs Vite dev server on port 5173

### Terminal 3: Stripe Webhook Forwarding (Optional, for testing payments)
```bash
stripe listen --forward-to localhost:8081/api/stripe-webhook
```
**Purpose:** Forwards Stripe webhook events to your local backend

**Note:** This is only needed when testing Stripe payments locally. For production, Stripe sends webhooks directly to `https://myparallel.chat/api/stripe-webhook`.

## Environment Variables

Make sure your `.env` file has:

```env
# Backend
PORT=8081
API_KEY=your_gemini_api_key
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe CLI or Dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:5173

# Frontend (in .env or .env.local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Testing Stripe Locally

1. **Start backend** (Terminal 1)
2. **Start frontend** (Terminal 2)
3. **Start Stripe CLI** (Terminal 3) - only when testing payments
4. **Copy webhook secret** from Stripe CLI output
5. **Add to .env** as `STRIPE_WEBHOOK_SECRET`
6. **Restart backend** to load new secret

## Production vs Development

**Development:**
- Backend: `localhost:8081`
- Frontend: `localhost:5173`
- Webhook: Stripe CLI forwards to `localhost:8081/api/stripe-webhook`

**Production:**
- Backend: `https://myparallel.chat` (or your production URL)
- Frontend: `https://myparallel.chat` (or your frontend URL)
- Webhook: Stripe sends directly to `https://myparallel.chat/api/stripe-webhook`


