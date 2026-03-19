# How to Set Stripe Price Lookup Key

## The Problem

Stripe **does not allow** updating `lookup_key` on existing prices via the Dashboard. You must either:
1. Set it via API when creating the price
2. Update it via API after creation
3. Create a new price with the lookup_key

## Solution: Update via Stripe API

### Option 1: Stripe CLI (Easiest)

1. **Get your Price ID** from Stripe Dashboard:
   - Go to the product
   - Click on the price row
   - Copy the Price ID (starts with `price_...`)

2. **Update via CLI:**
   ```bash
   stripe prices update price_XXXXX --lookup-key=base_monthly
   ```

   Replace `price_XXXXX` with your actual price ID.

3. **Verify it worked:**
   ```bash
   stripe prices retrieve price_XXXXX
   ```
   
   You should see `"lookup_key": "base_monthly"` in the response.

### Option 2: Stripe Dashboard API Mode

1. Go to Stripe Dashboard → Developers → API
2. Use the API explorer or make a direct API call
3. Endpoint: `PATCH /v1/prices/{id}`
4. Body: `{ "lookup_key": "base_monthly" }`

### Option 3: Create New Price (If API doesn't work)

If updating doesn't work, create a new price:

1. In Stripe Dashboard → Product → Add new price
2. Set amount: $19.00/month
3. **Set lookup_key: `base_monthly`** (this time it will save)
4. Archive/delete the old price
5. Use the new price ID

## For All Add-Ons

Repeat for each price:

```bash
# Get price IDs from Stripe Dashboard, then:
stripe prices update price_XXXXX --lookup-key=deep_memory
stripe prices update price_XXXXX --lookup-key=text_outreach
stripe prices update price_XXXXX --lookup-key=email_outreach
stripe prices update price_XXXXX --lookup-key=phone_call_outreach
stripe prices update price_XXXXX --lookup-key=voice_ai
stripe prices update price_XXXXX --lookup-key=voice_clone
stripe prices update price_XXXXX --lookup-key=multi_companion
stripe prices update price_XXXXX --lookup-key=extended_memory
```

## Verify

After updating, verify in Stripe Dashboard:
- Go to the Price (not Product)
- Look for "Lookup key" field (should show `base_monthly`)
- If it's still blank, the API update didn't work - try creating a new price

## Test Mode vs Live Mode

Make sure you're updating prices in the **same mode** as your `STRIPE_SECRET_KEY`:
- Test key (`sk_test_...`) → Update test mode prices
- Live key (`sk_live_...`) → Update live mode prices


