# Stripe Webhook Setup

## Webhook Configuration

**Endpoint URL:** `https://myparallel.chat/api/stripe-webhook`
**Destination ID:** `we_1SZaVWE6oTidvpnUfhm9ulX7`

## Required Environment Variables

Make sure your `.env` file includes:

```env
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard)
```

## Getting the Webhook Secret

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Click "Reveal" next to "Signing secret"
4. Copy the `whsec_...` value
5. Add it to your `.env` as `STRIPE_WEBHOOK_SECRET`

## Events to Listen For

The webhook handler processes these events:
- `checkout.session.completed` - When payment succeeds
- `customer.subscription.updated` - When subscription changes
- `customer.subscription.deleted` - When subscription is cancelled

## Testing

### Test Mode
- Use test mode webhook secret: `whsec_test_...`
- Test with Stripe CLI: `stripe listen --forward-to localhost:8081/api/stripe-webhook`

### Production
- Use live mode webhook secret: `whsec_live_...`
- Ensure endpoint is accessible at `https://myparallel.chat/api/stripe-webhook`
- Stripe will send events to this URL

## Verification

The webhook handler:
1. Verifies the signature using `STRIPE_WEBHOOK_SECRET`
2. Creates Supabase auth user if needed
3. Sets `stripe_verified = true` in user profile
4. Updates subscription and features

## Troubleshooting

If webhooks aren't working:
1. Check `STRIPE_WEBHOOK_SECRET` is set correctly
2. Verify endpoint is accessible (not behind firewall)
3. Check backend logs for webhook errors
4. Use Stripe Dashboard → Webhooks → View logs to see delivery attempts


