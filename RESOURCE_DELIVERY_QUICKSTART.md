# Resource Delivery Feature - Quick Start Guide

## What's New

Users with active MyParallel subscriptions can now request wellness resources during voice conversations. If they mention topics like depression, anxiety, loneliness, or sleep issues, the AI will offer to send helpful resources via SMS or email.

## For Demo/Testing

### Without Subscription (Demo Mode)
1. Start a voice conversation
2. Talk about a wellness topic: "I've been feeling really depressed lately"
3. The AI will offer resources
4. Try to request resources → You'll get: **"This feature requires an active subscription. Please upgrade..."**

### With Active Stripe Subscription
1. Same conversation flow
2. Accept the resource offer
3. Choose SMS or Email
4. Enter phone number or email
5. **Resources sent successfully!** ✅

## Files Modified/Created

### New Files
- `utils/resourceLibrary.ts` - Resource library with wellness topics
- `RESOURCE_DELIVERY_FEATURE.md` - Complete documentation
- Database table: `resource_deliveries` (track all sends)

### Modified Files
- `components/VoiceDemo.tsx` - Added resource request UI & system instructions
- `backend-server.js` - Added `/api/send-resources` endpoint
- `supabase-schema.sql` - Added `resource_deliveries` table

## Quick Configuration

### 1. Update Supabase Schema
Run this in your Supabase dashboard (SQL Editor):

```sql
CREATE TABLE IF NOT EXISTS resource_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  topics TEXT[] NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('sms', 'email')),
  recipient_contact TEXT NOT NULL,
  resources_sent INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE resource_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON resource_deliveries
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_resource_deliveries_user_id ON resource_deliveries(user_id);
CREATE INDEX idx_resource_deliveries_created_at ON resource_deliveries(created_at);
```

### 2. Verify Twilio Config
Check your `.env` has:
```
TWILIO_ACCOUNT_SID=ACxxxx...
TWILIO_AUTH_TOKEN=yyyyy...
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio number
```

### 3. Restart Backend
```bash
npm run dev
# Or if running separately:
node backend-server.js
```

## How to Test

### Test 1: Demo User (No Subscription)
```
1. Open voice demo
2. Start conversation
3. Say: "I'm feeling depressed"
4. AI offers resources
5. Try to send → Should get subscription error ✓
```

### Test 2: Subscribed User
```
1. User has stripe_subscription_id in database
2. Open voice demo
3. Say: "I've been very anxious lately"
4. AI offers resources
5. Choose SMS, enter phone number
6. Should get "Resources sent!" message ✓
7. Check your Twilio console for message ✓
8. Check resource_deliveries table is populated ✓
```

### Test 3: Email Delivery (Currently Console Only)
```
1. Select Email delivery method
2. Enter email address
3. Should see console log in backend with email content
4. (Email actually sending requires SendGrid/Nodemailer integration)
```

## Resource Topics Available

The system recognizes and sends resources for:
- **depression** - Understanding depression, daily tips
- **anxiety** - Managing anxiety, grounding techniques
- **loneliness** - Combating loneliness, finding community
- **sleep** - Sleep hygiene, bedtime routines
- **grief** - Understanding grief, coping resources
- **nutrition** - Healthy eating guides
- **exercise** - Fitness and movement benefits
- **elderly** - Aging and senior care
- **crisis** - Emergency hotlines and resources

## Customizing Resources

To add or modify resources, edit `utils/resourceLibrary.ts`:

```typescript
export const WELLNESS_RESOURCES: Record<string, WellnessResource[]> = {
  depression: [
    {
      title: "Your Resource Title",
      description: "Brief description",
      url: "https://link-to-resource.com",
      type: "guide", // or "article", "pdf", "video"
      topics: ["depression", "mental-health"]
    },
    // Add more...
  ],
  // Add more topics...
};
```

## Expected Behavior

### User Conversation Flow

```
User: "I've been having trouble sleeping"
          ↓
AI: "I'm sorry to hear that. Sleep issues can be really challenging. 
    Would you like me to send you some helpful resources about sleep?
    I can send them via text or email."
          ↓
User: "Sure, text would be great"
          ↓
[Shows Resource Request Panel]
User enters: +1 (555) 123-4567
          ↓
AI: "Perfect! I'll send those resources right now."
          ↓
Backend checks subscription → SMS sent via Twilio
          ↓
User receives: 
"Hi! Here are helpful resources about sleep:
📚 Sleep Hygiene Guide
🔗 https://sleepfoundation.org/sleep-hygiene
..."
```

## Troubleshooting

### Resources not showing in UI
- Restart frontend: `npm run dev`
- Hard refresh browser: Cmd+Shift+R

### SMS not being sent
- Check Twilio credentials in `.env`
- Verify phone number format: `+1 (555) 123-4567`
- Check Twilio console for failed messages

### Subscription check not working
- Verify user has `stripe_subscription_id` in user_profiles
- Check Supabase connection is active
- Look at backend console logs for errors

### Email not working
- Currently logs to console (integration needed)
- See `RESOURCE_DELIVERY_FEATURE.md` for email service setup

## Next Steps

1. **Test with your Stripe subscribed users**
2. **Set up email delivery** (SendGrid recommended)
3. **Monitor `resource_deliveries` table** for analytics
4. **Gather user feedback** on resource quality
5. **Expand resource library** based on user needs

## Email Service Setup (Optional)

To enable real email delivery, integrate SendGrid:

1. Install: `npm install @sendgrid/mail`
2. Add to `.env`: `SENDGRID_API_KEY=SG.xxxxx`
3. Update `backend-server.js` `/api/send-resources` endpoint to use SendGrid

See `RESOURCE_DELIVERY_FEATURE.md` for code example.

## Questions?

Refer to `RESOURCE_DELIVERY_FEATURE.md` for:
- Detailed API documentation
- Database schema details
- Analytics queries
- Future enhancement ideas
- Complete troubleshooting guide
