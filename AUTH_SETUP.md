# Authentication & Onboarding Setup

## Overview
The app now uses Supabase Authentication. Users must sign up/login before accessing the app. After first login, they complete onboarding (profile setup + voice/personality selection) before using the chat.

## Environment Variables Required

Add these to your `.env` file:

```env
# Supabase (for frontend auth)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase (for backend - already configured)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Database Schema Update

The `user_profiles` table now links to `auth.users` via the `id` field. Update your Supabase schema:

```sql
-- If you already have user_profiles, you may need to:
-- 1. Drop the existing table (if it has no important data)
-- 2. Recreate it with the foreign key constraint

-- Or update existing records to match auth.users:
-- UPDATE user_profiles SET id = (SELECT id FROM auth.users WHERE email = ...);
```

## Flow

1. **Unauthenticated**: User sees Login page
2. **Authenticated (no onboarding)**: User sees Onboarding page with:
   - Step 1: User Profile Form (UserIntakeForm)
   - Step 2: Voice & Personality Selection
3. **Authenticated (onboarding complete)**: User sees main app with chat

## Components Created

- `contexts/AuthContext.tsx` - Auth state management
- `components/Login.tsx` - Login/signup form
- `components/Onboarding.tsx` - Post-login onboarding flow
- `utils/supabase.ts` - Supabase client for frontend

## Chat API Fix

The chat endpoint now:
- Uses `gemini-1.5-flash` model (stable)
- Has better error handling
- Links user profiles to auth user IDs

## Testing

1. Start backend: `npm start` (or `node backend-server.js`)
2. Start frontend: `npm run dev`
3. Sign up with a new email
4. Complete onboarding
5. Test chat functionality


