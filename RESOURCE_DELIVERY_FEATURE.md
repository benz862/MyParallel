# Resource Delivery Feature Documentation

## Overview

The Resource Delivery feature allows authenticated MyParallel users with active subscriptions to request wellness resources during voice conversations. When users discuss topics like depression, anxiety, loneliness, sleep issues, or grief, the AI agent can offer to send them tailored educational resources via SMS or email.

## How It Works

### 1. **Conversation Flow**

1. User starts a voice conversation with MyParallel
2. During the conversation, if wellness topics are mentioned (depression, anxiety, etc.), the AI proactively offers to send resources
3. User indicates they want resources and provides contact info (phone number or email)
4. System verifies user has an active subscription
5. Backend retrieves relevant resources and sends them via chosen delivery method

### 2. **Subscription Check**

- The backend endpoint `/api/send-resources` checks if user has `stripe_subscription_id` in their profile
- Only users with active subscriptions can request resources
- Demo users without subscriptions receive an error message prompting them to upgrade

### 3. **Resource Mapping**

Resources are organized by wellness topic in `utils/resourceLibrary.ts`:

| Topic | Available Resources |
|-------|-------------------|
| **depression** | Understanding Depression, Daily Tips for Managing Depression |
| **anxiety** | Managing Anxiety, 5-4-3-2-1 Grounding Technique |
| **loneliness** | Combating Loneliness, Finding Support Groups |
| **sleep** | Sleep Hygiene Guide, Bedtime Routines |
| **grief** | Understanding Grief, Coping Resources |
| **nutrition** | Healthy Eating Guide |
| **exercise** | Exercise Benefits Guide |
| **elderly** | Healthy Aging Guide |
| **crisis** | Crisis Hotlines & Resources |

Each resource includes:
- Title
- Description
- URL (to guide, article, or PDF)
- Type (pdf, article, video, guide)
- Related topics

### 4. **Delivery Methods**

#### SMS Delivery
- Uses Twilio API to send text messages
- Requires: User's phone number
- Format: Concise list of top 2 resources with titles and links
- Requires `TWILIO_PHONE_NUMBER` in environment

#### Email Delivery
- Ready for SendGrid, Nodemailer, or similar email service integration
- Requires: User's email address
- Format: Detailed list with descriptions for each resource
- Currently logs to console (TODO: integrate email service)

## Implementation Details

### Frontend Changes

#### VoiceDemo Component (`components/VoiceDemo.tsx`)

**New State Variables:**
```typescript
const [detectedTopics, setDetectedTopics] = useState<string[]>([]);
const [showResourceOptions, setShowResourceOptions] = useState(false);
const [deliveryMethod, setDeliveryMethod] = useState<'sms' | 'email'>('sms');
const [resourceContact, setResourceContact] = useState('');
const [sendingResources, setSendingResources] = useState(false);
```

**System Instruction Enhancement:**
- AI is prompted to detect wellness topics in conversation
- AI is instructed to proactively offer resources when topics are mentioned
- Example: "Would you like me to send you some helpful resources about this? I can send them via text or email."

**Resource Request UI:**
- Green panel appears during active call
- Radio buttons to select SMS or Email delivery
- Input field for phone number or email
- Send Resources button triggers backend API
- Closes automatically after successful send

**Resource Sending Function:**
```typescript
const sendResources = async (topics: string[]) => {
  // Makes POST request to /api/send-resources
  // Handles subscription checks
  // Displays success/error messages
}
```

### Backend Changes

#### New Endpoint: `POST /api/send-resources`

**Request Body:**
```json
{
  "userId": "user-uuid",
  "topics": ["depression", "anxiety"],
  "deliveryMethod": "sms",
  "recipientContact": "+1 (555) 123-4567"
}
```

**Workflow:**
1. Validates required fields
2. Checks user profile exists in Supabase
3. Verifies user has active Stripe subscription
4. Retrieves relevant resources for topics
5. Formats resources for delivery method
6. Sends via SMS (Twilio) or logs for email
7. Logs delivery to `resource_deliveries` table
8. Returns success with resource count

**Response:**
```json
{
  "success": true,
  "message": "3 resources sent via sms",
  "resources": [...],
  "deliveredTo": "+1 (555) 123-4567"
}
```

**Error Cases:**
- `400`: Missing required fields
- `403`: User doesn't have active subscription
- `404`: User profile not found
- `500`: Server error or service misconfiguration

### Database Changes

#### New Table: `resource_deliveries`

```sql
CREATE TABLE resource_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  topics TEXT[] NOT NULL,
  delivery_method TEXT NOT NULL,
  recipient_contact TEXT NOT NULL,
  resources_sent INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:**
- Track all resource delivery requests
- Enable analytics on which topics users are requesting
- Support user history of sent resources

**Indexes:**
- `idx_resource_deliveries_user_id` - Fast lookups by user
- `idx_resource_deliveries_created_at` - Time-based queries

## Usage Instructions for Users

### Demo Mode
1. Start a voice conversation by clicking "Start Conversation"
2. Select a voice personality
3. Ask about wellness topics (e.g., "I've been feeling depressed")
4. AI will detect the topic and offer to send resources
5. Without subscription, you'll see: "This feature requires an active subscription. Please upgrade..."

### Subscribed Users
1. All steps same as demo
2. When offered resources, accept by mentioning your preference
3. Enter your phone number (SMS) or email address
4. Resources are sent via your chosen method
5. You can request multiple resource batches in same conversation

## Configuration & Setup

### Environment Variables Required

```bash
# Twilio (for SMS delivery)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe (for subscription verification)
# Already configured in .env

# Supabase (for user verification)
# Already configured in .env
```

### Supabase Setup

1. Run the schema migration to create `resource_deliveries` table:
   ```sql
   -- From supabase-schema.sql
   CREATE TABLE resource_deliveries (...)
   ```

2. Verify `user_profiles` has `stripe_subscription_id` column

### Email Service Integration (TODO)

Currently, email delivery logs to console. To implement real email sending:

1. Choose email provider (SendGrid, Nodemailer, AWS SES, etc.)
2. Add credentials to `.env`
3. Update backend endpoint to use email client
4. Add templates for resource emails

Example with SendGrid:
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: recipientContact,
  from: 'resources@myparallel.chat',
  subject: 'Your Wellness Resources from MyParallel',
  html: formattedResourceHTML,
};
await sgMail.send(msg);
```

## Topic Detection & Enhancement

### Current Implementation
- System instruction tells AI to detect topics
- AI proactively offers resources when topics mentioned
- Frontend passes generic topic list to backend

### Future Enhancement Ideas
1. **AI-Extracted Topics**: Have Gemini extract detected topics and return them
   - Gemini could analyze conversation and return: `["depression", "anxiety"]`
   - More accurate than hardcoded topic list

2. **Conversation Context**: Include last N messages for better context
   ```typescript
   const response = await fetch('/api/send-resources', {
     body: JSON.stringify({
       userId,
       topics: extractedTopics,
       conversationSummary: lastMessages,
       deliveryMethod,
       recipientContact
     })
   });
   ```

3. **Custom Resources**: Allow users to upload/curate personal resources
   - Store in `user_custom_resources` table
   - Include with standard resources in delivery

## Analytics & Tracking

### Useful Queries

**Most Requested Topics:**
```sql
SELECT 
  topics,
  COUNT(*) as request_count
FROM resource_deliveries
GROUP BY topics
ORDER BY request_count DESC;
```

**Delivery Method Preference:**
```sql
SELECT 
  delivery_method,
  COUNT(*) as count
FROM resource_deliveries
GROUP BY delivery_method;
```

**User Resource History:**
```sql
SELECT * 
FROM resource_deliveries
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

## Testing

### Manual Testing Checklist

- [ ] Start voice call and discuss depression
- [ ] Verify AI offers to send resources
- [ ] Accept resource offer
- [ ] With demo user account (no subscription)
  - [ ] Try to request resources
  - [ ] See "requires subscription" error
- [ ] With subscribed test account
  - [ ] Request resources via SMS
  - [ ] Receive SMS with resource links
  - [ ] Request resources via Email
  - [ ] See console log of email content
- [ ] Verify `resource_deliveries` table is populated
- [ ] Test different topic keywords

### Unit Test Suggestions

```typescript
// Test resource matching
const resources = getRelevantResources(['depression', 'anxiety']);
expect(resources.length).toBeGreaterThan(0);

// Test formatting for SMS vs Email
const smsFormat = formatResourcesForDelivery(resources, 'sms');
const emailFormat = formatResourcesForDelivery(resources, 'email');
expect(smsFormat.length).toBeLessThan(emailFormat.length);
```

## Troubleshooting

### Resources Not Appearing
- Check `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set
- Verify `TWILIO_PHONE_NUMBER` is a valid Twilio number
- Check backend logs for API errors

### SMS Not Received
- Verify recipient phone number format: `+1 (555) 123-4567`
- Check Twilio account has credits/active status
- Check spam folder
- Verify in Twilio console that message was queued

### Subscription Check Not Working
- Verify Supabase connection string is correct
- Check that test user has `stripe_subscription_id` populated
- Verify policy allows reading from `user_profiles` table

### Email Not Implemented
- Email delivery currently logs to console
- Integrate email service (SendGrid recommended)
- Test with `curl` to backend endpoint

## Future Roadmap

1. **Smart Topic Detection**
   - Use Gemini to extract topics from conversation
   - Return suggested resources before user asks

2. **Personalized Resources**
   - Track user reading history
   - Recommend resources based on past interests
   - User resource library/favorites

3. **Multi-Language Support**
   - Translate resources to user's language
   - Support international resources by region

4. **Crisis Detection Integration**
   - When crisis keywords detected, offer crisis hotline
   - Escalate to emergency protocols
   - Alert caregivers if configured

5. **Resource Feedback Loop**
   - Users rate resources as helpful/not helpful
   - System learns and improves recommendations
   - Analytics dashboard for admins

6. **Email Service Integration**
   - Complete email delivery implementation
   - HTML email templates with resource summaries
   - Auto-delivery based on time of day/user timezone

## Support & Contact

For issues or feature requests related to resource delivery:
- Check this documentation first
- Review error logs in backend console
- Test with different topics and contact formats
- Verify Supabase and Twilio credentials are active
