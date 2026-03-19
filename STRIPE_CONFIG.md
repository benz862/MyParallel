# Stripe Configuration

## Webhook Endpoint

**Production URL:** `https://myparallel.chat/api/stripe-webhook`
**Destination ID:** `we_1SZaVWE6oTidvpnUfhm9ulX7`

## Environment Variables Required

Add these to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard)
FRONTEND_URL=https://myparallel.chat
```

## Getting the Webhook Secret

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Click on your webhook endpoint (`https://myparallel.chat/api/stripe-webhook`)
3. Click "Reveal" next to "Signing secret"
4. Copy the value (starts with `whsec_`)
5. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

## Webhook Events Handled

The backend processes these Stripe events:

- ✅ `checkout.session.completed` - Creates user account when payment succeeds
- ✅ `customer.subscription.updated` - Updates subscription features
- ✅ `customer.subscription.deleted` - Removes subscription when cancelled

## What Happens on Payment Success

1. Stripe sends `checkout.session.completed` event to webhook
2. Backend verifies webhook signature
3. Extracts customer email from session
4. Creates Supabase auth user (if doesn't exist)
5. Sets `stripe_verified = true` in user profile
6. Stores subscription ID and features
7. Logs welcome email info (TODO: send actual email)

## Testing Webhooks Locally

For local development, use Stripe CLI:

**Run this command in a terminal on the same machine as your backend:**

```bash
stripe listen --forward-to localhost:8081/api/stripe-webhook
```

**Important:**
- This runs in your **local terminal** (not on a server)
- Your backend must be running on `localhost:8081`
- The command will output a webhook secret (starts with `whsec_`)
- Copy that secret and add it to your `.env` as `STRIPE_WEBHOOK_SECRET`
- Keep this terminal running while testing

**Example output:**
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef
```

Then use that `whsec_...` value in your `.env` file for local testing.

## Verification

To verify webhook is working:

1. Check Stripe Dashboard → Webhooks → View logs
2. Look for successful deliveries (200 status)
3. Check backend logs for webhook processing messages
4. Verify user is created in Supabase after payment

## Troubleshooting

**Webhook not receiving events:**
- Verify endpoint URL is accessible (not behind firewall)
- Check `STRIPE_WEBHOOK_SECRET` matches the one in Stripe Dashboard
- Ensure backend is running and accessible

**User not created:**
- Check backend logs for errors
- Verify Supabase credentials are correct
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set (required for admin operations)

**Signature verification failed:**
- Ensure webhook secret is correct
- Make sure you're using the right secret (test vs live)
- Verify the endpoint uses `express.raw({ type: 'application/json' })` middleware

