# Stripe Products Import Guide

## Quick Import Steps

1. **Go to Stripe Dashboard** → Products
2. **Click "Import products"** (or use the CSV import)
3. **Upload the CSV file** or manually create products

## Required Lookup Keys

Your products **MUST** have these exact lookup keys:

### Base Plan
- **Lookup Key:** `base_monthly`
- **Price:** $19/month
- **Type:** Recurring subscription

### Add-Ons
- `deep_memory` - $6/month
- `text_outreach` - $5/month
- `email_outreach` - $3/month
- `phone_call_outreach` - $12/month
- `voice_ai` - $10/month
- `voice_clone` - $9/month
- `multi_companion` - $7/month
- `extended_memory` - $4/month

## Manual Import (Recommended)

### 1. Create Base Plan

1. Go to Stripe Dashboard → Products → Add Product
2. **Name:** "MyParallel Base Plan"
3. **Description:** "Base AI companion subscription"
4. **Pricing:**
   - **Price:** $19.00
   - **Billing period:** Monthly
   - **Recurring:** Yes
5. **Advanced options:**
   - **Lookup key:** `base_monthly` ⚠️ **CRITICAL - Must match exactly**
6. Click "Save product"

### 2. Create Add-Ons

Repeat for each add-on:

1. **Product Name:** "Deep Emotional Memory" (or name of add-on)
2. **Description:** (description from CSV)
3. **Price:** $6.00 (or price from CSV)
4. **Billing period:** Monthly
5. **Recurring:** Yes
6. **Lookup key:** `deep_memory` ⚠️ **Must match exactly**

**Repeat for all 8 add-ons with their respective lookup keys.**

## CSV Import (Alternative)

1. Go to Stripe Dashboard → Products
2. Click "Import products"
3. Upload `stripe-import.csv`
4. **Verify lookup keys** are set correctly after import

## Verify Import

After importing, verify in Stripe Dashboard:

1. Go to Products → Click on each product
2. Check "Lookup key" field matches exactly:
   - `base_monthly` (not `base_plan` or `base`)
   - `deep_memory` (not `deep-emotional-memory`)
   - etc.

## Testing

After importing, test the checkout:

1. Go to your app
2. Select features
3. Click "Join" or checkout button
4. Should redirect to Stripe Checkout (not show error)

## Common Issues

**Error: "Base plan not found"**
- ✅ Check lookup key is exactly `base_monthly` (case-sensitive)
- ✅ Check product is set to "Recurring" subscription
- ✅ Check you're in the right Stripe mode (test vs live)

**Error: "Add-on not found"**
- ✅ Verify lookup keys match exactly (no spaces, correct case)
- ✅ Check all products are recurring subscriptions

## Stripe CLI Import (Advanced)

If you have Stripe CLI installed:

```bash
stripe products create --name="MyParallel Base Plan" --description="Base AI companion subscription"
stripe prices create --product=<product_id> --unit-amount=1900 --currency=usd --recurring[interval]=month --lookup-key=base_monthly
```

Repeat for each product/price combination.


