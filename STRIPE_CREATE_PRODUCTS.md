# Creating Stripe Products from Scratch

## Important: Set Lookup Key During Creation

**The lookup_key MUST be set when creating the price, not after!**

## Step-by-Step Guide

### 1. Base Plan

1. Go to Stripe Dashboard → Products → Add Product
2. **Name:** "MyParallel Base Plan"
3. **Description:** "Base AI companion subscription"
4. **Pricing:**
   - Click "Add pricing"
   - **Price:** $19.00
   - **Billing period:** Monthly (recurring)
   - **Lookup key:** `base_monthly` ⚠️ **SET THIS NOW - Can't change later!**
5. Click "Save product"

### 2. Add-On Products

Repeat for each add-on:

#### Deep Emotional Memory
- **Name:** "Deep Emotional Memory"
- **Description:** "Enhanced long term emotional memory"
- **Price:** $6.00/month (recurring)
- **Lookup key:** `deep_memory` ⚠️

#### Proactive Random Text Outreach
- **Name:** "Proactive Random Text Outreach"
- **Description:** "Random caring messages and check ins"
- **Price:** $5.00/month (recurring)
- **Lookup key:** `text_outreach` ⚠️

#### Email Outreach
- **Name:** "Email Outreach"
- **Description:** "Personalized email notes"
- **Price:** $3.00/month (recurring)
- **Lookup key:** `email_outreach` ⚠️

#### Phone Call Outreach
- **Name:** "Phone Call Outreach"
- **Description:** "AI phone calls and voicemail style messages"
- **Price:** $12.00/month (recurring)
- **Lookup key:** `phone_call_outreach` ⚠️

#### Full Voice AI
- **Name:** "Full Voice AI"
- **Description:** "Real time voice conversations"
- **Price:** $10.00/month (recurring)
- **Lookup key:** `voice_ai` ⚠️

#### Custom Voice Clone
- **Name:** "Custom Voice Clone"
- **Description:** "Custom voice generated from audio"
- **Price:** $9.00/month (recurring)
- **Lookup key:** `voice_clone` ⚠️

#### Multi Companion Slot
- **Name:** "Multi Companion Slot"
- **Description:** "Add an additional companion"
- **Price:** $7.00/month (recurring)
- **Lookup key:** `multi_companion` ⚠️

#### Extended Memory Retention
- **Name:** "Extended Memory Retention"
- **Description:** "Stores longer term history"
- **Price:** $4.00/month (recurring)
- **Lookup key:** `extended_memory` ⚠️

## Verification Checklist

After creating each product:

- [ ] Product name matches exactly
- [ ] Price is set correctly ($X.00/month, recurring)
- [ ] **Lookup key is set** (check the Price, not Product metadata)
- [ ] Price is Active

## Test Mode vs Live Mode

**Remember:** Products are separate in Test and Live modes!

- If your `STRIPE_SECRET_KEY` is `sk_test_...` → Create in **Test mode**
- If your `STRIPE_SECRET_KEY` is `sk_live_...` → Create in **Live mode**

Toggle the "Test mode" switch in Stripe Dashboard to switch between modes.

## After Creating All Products

1. Try checkout in your app
2. Check backend logs - should see "Base prices found: 1"
3. Should redirect to Stripe Checkout successfully! ✅

## Quick Reference: All Lookup Keys

- `base_monthly` - Base Plan
- `deep_memory` - Deep Emotional Memory
- `text_outreach` - Proactive Text Outreach
- `email_outreach` - Email Outreach
- `phone_call_outreach` - Phone Call Outreach
- `voice_ai` - Full Voice AI
- `voice_clone` - Custom Voice Clone
- `multi_companion` - Multi Companion Slot
- `extended_memory` - Extended Memory Retention


