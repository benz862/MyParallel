# Setup Checklist - All 3 Terminals Running

## ✅ Current Setup

You have 3 terminals running:
1. **ngrok** - Tunneling to expose backend
2. **Frontend** - Vite dev server (port 5173)
3. **Backend** - Node.js server (port 8081)

## 🔍 Verification Steps

### 1. Check ngrok Terminal
Look at your ngrok terminal. You should see something like:
```
Forwarding  https://xxxxx.ngrok-free.app -> http://localhost:8081
```

**Important:** Make sure ngrok is pointing to port **8081** (not 8080):
```bash
ngrok http 8081
```

### 2. Check ngrok URL
Copy the HTTPS URL from ngrok (e.g., `https://xxxxx.ngrok-free.app`)

### 3. Update Backend .env (if needed)
If your ngrok URL changed, update `NGROK_URL` in your backend `.env`:
```env
NGROK_URL=https://your-new-ngrok-url.ngrok-free.app
```

### 4. Update Frontend API URL (if needed)
The frontend is currently hardcoded to use:
```
https://else-monocarpellary-georgie.ngrok-free.dev
```

If your ngrok URL is different, either:
- **Option A:** Update `utils/api.ts` line 16 with your new ngrok URL
- **Option B:** Create a `.env` file in the frontend root with:
  ```env
  VITE_API_URL=https://your-ngrok-url.ngrok-free.app
  ```

## 🧪 Testing Steps

### 1. Test Backend Health
Open in browser:
```
http://localhost:8081/
```
Should see: `Parallel Wellness Backend Running`

### 2. Test Frontend
Open in browser:
```
http://localhost:5173/
```
Should see the myParallel homepage

### 3. Test API Connection
Open browser console (F12) and check for:
- ✅ No 404 errors for `/api/*` endpoints
- ✅ Network tab shows requests going to your ngrok URL

### 4. Test Authentication
1. Click "Log in" or try to sign up
2. Should connect to Supabase (make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set)

### 5. Test Chat (after login + onboarding)
1. Complete onboarding (profile + voice/personality)
2. Go to chat section
3. Send a message
4. Should get a reply from Gemini

## 🐛 Common Issues

### Frontend can't connect to backend
- Check ngrok URL matches in both `utils/api.ts` and backend `.env`
- Check ngrok is forwarding to port 8081
- Check backend is actually running on 8081

### CORS errors
- Backend has `app.use(cors())` - should work
- If issues persist, check ngrok URL is correct

### 404 on API calls
- Verify ngrok URL in frontend `utils/api.ts`
- Check backend is running and responding on port 8081

## 📝 Quick Reference

**Backend URL (local):** `http://localhost:8081`  
**Frontend URL (local):** `http://localhost:5173`  
**Backend URL (public/ngrok):** `https://your-ngrok-url.ngrok-free.app`

**Environment Variables Needed:**
- Backend `.env`: `API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NGROK_URL`
- Frontend `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (optional)


