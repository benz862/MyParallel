# Ngrok Setup for myParallel

## Backend URL
**Ngrok URL:** `https://else-monocarpellary-georgie.ngrok-free.dev`

## Environment Variables

Add these to your `.env` file:

```env
NGROK_URL=https://else-monocarpellary-georgie.ngrok-free.dev
FRONTEND_URL=http://localhost:5173
```

Or if your frontend is also deployed:
```env
NGROK_URL=https://else-monocarpellary-georgie.ngrok-free.dev
FRONTEND_URL=https://your-frontend-domain.com
```

## Stripe Webhook Configuration

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter endpoint URL: `https://else-monocarpellary-georgie.ngrok-free.dev/api/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the "Signing secret" and add it to your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Testing

The backend is now accessible at:
- **API Base:** `https://else-monocarpellary-georgie.ngrok-free.dev`
- **Health Check:** `https://else-monocarpellary-georgie.ngrok-free.dev/`
- **Stripe Webhook:** `https://else-monocarpellary-georgie.ngrok-free.dev/api/stripe-webhook`

## Important Notes

- Ngrok URLs change when you restart ngrok (unless you have a paid plan with a static domain)
- Update the `NGROK_URL` in your `.env` if the URL changes
- Update the Stripe webhook URL if the ngrok URL changes
- The frontend should proxy API calls to the ngrok URL in production, or use the ngrok URL directly


