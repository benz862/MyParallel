# Stripe Lookup Key Issue - Fix Guide

## Problem
Backend can't find products even though they're imported. This is usually because **lookup_key must be set on the Price, not the Product**.

## Solution

### Check Your Stripe Setup

1. **Go to Stripe Dashboard** → Products
2. **Click on "MyParallel Base Plan - Monthly"**
3. **Click on the Price** (not the product)
4. **Check if "Lookup key" field exists and is set to `base_monthly`**

### If Lookup Key is Missing on Price

**Option 1: Set via Dashboard**
1. Go to the Price (not Product)
2. Click "Edit" or "Update price"
3. Find "Lookup key" field
4. Enter: `base_monthly`
5. Save

**Option 2: Set via Stripe API**

```bash
# Get your price ID first (from Stripe Dashboard)
# Then update it:
stripe prices update price_XXXXX --lookup-key=base_monthly
```

### Verify Lookup Keys

For each product, verify the **Price** (not Product) has the lookup key:

- Base Plan Price → `base_monthly`
- Deep Memory Price → `deep_memory`
- Text Outreach Price → `text_outreach`
- Email Outreach Price → `email_outreach`
- Phone Call Price → `phone_call_outreach`
- Voice AI Price → `voice_ai`
- Voice Clone Price → `voice_clone`
- Multi Companion Price → `multi_companion`
- Extended Memory Price → `extended_memory`

### Test Mode vs Live Mode

**Important:** Make sure your `STRIPE_SECRET_KEY` matches the mode:
- Test mode key (`sk_test_...`) → Products must be in Test mode
- Live mode key (`sk_live_...`) → Products must be in Live mode

Check which mode your products are in:
- Stripe Dashboard → Toggle "Test mode" / "Live mode" switch
- Products are separate in each mode!

## Quick Test

After setting lookup keys, check backend logs when you try checkout. You should see:
```
Base prices found: 1
Added base plan: price_XXXXX
```

If you see `Base prices found: 0`, the lookup key isn't set correctly on the Price.


