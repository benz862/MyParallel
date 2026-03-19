# API Configuration Setup

## Quick Fix for 404 Errors

If you're getting 404 errors for API calls, you need to configure the API base URL.

### Option 1: Using Ngrok (Current Setup)

Add to your `.env` file:
```env
VITE_USE_NGROK=true
VITE_API_URL=https://else-monocarpellary-georgie.ngrok-free.dev
```

### Option 2: Using Local Backend

If your backend is running on `localhost:8080`, you can use the Vite proxy (default):
- No environment variables needed
- Make sure backend is running: `npm start`

### Option 3: Custom API URL

Add to your `.env` file:
```env
VITE_API_URL=https://your-custom-api-url.com
```

## How It Works

The `utils/api.ts` file automatically determines the API base URL:

1. **If `VITE_API_URL` is set**: Uses that URL
2. **If `VITE_USE_NGROK=true`**: Uses the ngrok URL
3. **If production build**: Uses ngrok URL
4. **Otherwise (local dev)**: Uses relative URLs (Vite proxy handles)

## Testing

After setting environment variables, restart your dev server:
```bash
npm run dev
```

The API calls should now work correctly.


