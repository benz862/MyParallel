# Stripe Price Lookup Key - Important!

## The Problem

The `lookup_key` must be set **on the Price object itself**, not in product metadata.

## How to Set Lookup Key on Price

### Method 1: Via Stripe Dashboard

1. Go to **Products** → Click on "MyParallel Base Plan - Monthly"
2. In the **Pricing table**, click on the **Price row** (the $19.00/month row)
3. Click **"Edit price"** or the price ID
4. Look for **"Lookup key"** field (NOT in metadata section)
5. Enter: `base_monthly`
6. Save

**Important:** The lookup_key field should be at the Price level, not in the Metadata section.

### Method 2: Via Stripe API

If you have the price ID (from the Pricing table):

```bash
stripe prices update price_XXXXX --lookup-key=base_monthly
```

### Method 3: Check Current Price

To see if lookup_key is set correctly:

```bash
stripe prices retrieve price_XXXXX
```

Look for `"lookup_key": "base_monthly"` in the response (not in metadata).

## Test Mode vs Live Mode

**Critical:** Make sure you're checking the right mode!

- If your `STRIPE_SECRET_KEY` starts with `sk_test_` → Check **Test mode** products
- If your `STRIPE_SECRET_KEY` starts with `sk_live_` → Check **Live mode** products

Products are **separate** in each mode. Toggle the "Test mode" switch in Stripe Dashboard to see both.

## Verify It's Set Correctly

After setting lookup_key on the Price:

1. Go to the Price (not Product)
2. The lookup_key should appear as a field on the Price, not in Metadata
3. Try checkout again
4. Check backend logs - should see "Base prices found: 1"

## Common Issue

If lookup_key is only in Metadata, Stripe's `prices.list({ lookup_keys: [...] })` won't find it. It must be a direct property of the Price object.


