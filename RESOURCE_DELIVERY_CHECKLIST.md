# Resource Delivery Feature - Integration Checklist

## Pre-Launch Checklist

Use this checklist to ensure the feature is properly integrated and ready for launch.

### Database Setup
- [ ] Run schema migration in Supabase SQL Editor (see RESOURCE_DELIVERY_QUICKSTART.md)
- [ ] Verify `resource_deliveries` table exists
  ```sql
  SELECT * FROM information_schema.tables WHERE table_name='resource_deliveries';
  ```
- [ ] Verify indexes are created
  ```sql
  SELECT * FROM pg_indexes WHERE tablename='resource_deliveries';
  ```
- [ ] Test insert permissions
  ```sql
  INSERT INTO resource_deliveries (user_id, topics, delivery_method, recipient_contact, resources_sent)
  VALUES (gen_random_uuid(), ARRAY['test'], 'sms', '+1234567890', 1);
  ```

### Backend Configuration
- [ ] Verify `.env` has all required variables:
  - `PORT=8081`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
  - `API_KEY` (Gemini)
  - `SUPABASE_URL` and `SUPABASE_KEY`

- [ ] Test backend starts without errors
  ```bash
  node backend-server.js
  # Should log: "Parallel Wellness Backend on 8081"
  ```

- [ ] Test endpoint exists
  ```bash
  curl -X POST http://localhost:8081/api/send-resources \
    -H "Content-Type: application/json" \
    -d '{"userId":"test","topics":["depression"],"deliveryMethod":"sms","recipientContact":"+15551234567"}'
  ```
  - Should return error about user not found (correct behavior - endpoint is live)

### Frontend Setup
- [ ] Frontend server starts: `npm run dev`
- [ ] VoiceDemo component loads without errors
- [ ] Browser console has no TypeScript errors
- [ ] Resource panel appears when voice call is active
- [ ] SMS/Email radio buttons work
- [ ] Contact input field accepts phone and email

### Subscription Verification
- [ ] Create test user in Supabase with subscription
  ```sql
  UPDATE user_profiles 
  SET stripe_subscription_id = 'sub_test_123' 
  WHERE id = 'user-uuid-here';
  ```

- [ ] Test without subscription
  - Should show: "This feature requires an active subscription"
  
- [ ] Test with subscription
  - Should allow resource request

### SMS Delivery
- [ ] Test Twilio SMS sending
  ```bash
  curl -X POST http://localhost:8081/api/send-resources \
    -H "Content-Type: application/json" \
    -d '{
      "userId":"user-uuid",
      "topics":["depression"],
      "deliveryMethod":"sms",
      "recipientContact":"+15551234567"
    }'
  ```

- [ ] Verify SMS received at phone number
- [ ] Check Twilio console for message logs
- [ ] Verify message format (title + URL per resource)

### Email Delivery
- [ ] Backend logs email to console (currently)
- [ ] Verify email format in console output
- [ ] (Optional) Integrate SendGrid if not using SMS-only

### Analytics
- [ ] Query `resource_deliveries` table
  ```sql
  SELECT * FROM resource_deliveries ORDER BY created_at DESC LIMIT 10;
  ```
- [ ] Verify columns populated: user_id, topics, delivery_method, resources_sent

### Voice AI Integration
- [ ] Start voice conversation
- [ ] Mention wellness topic: "I've been feeling depressed"
- [ ] Verify AI responds with empathy AND offers resources
- [ ] Verify AI message includes: "Would you like me to send you..."

### UI/UX Testing
- [ ] Resource panel hidden when call inactive ✓
- [ ] Resource panel visible when call active ✓
- [ ] SMS placeholder shows phone format ✓
- [ ] Email placeholder shows email format ✓
- [ ] Send button disabled if contact empty ✓
- [ ] Loading state shows during submission ✓
- [ ] Success message appears after sending ✓
- [ ] Error message shows for subscription error ✓
- [ ] Error message shows for missing fields ✓

### Documentation Review
- [ ] RESOURCE_DELIVERY_QUICKSTART.md reviewed
- [ ] RESOURCE_DELIVERY_FEATURE.md reviewed  
- [ ] RESOURCE_DELIVERY_IMPLEMENTATION.md reviewed
- [ ] All setup steps understood by team

## Deployment Steps

### 1. Database Migration
```bash
# In Supabase dashboard → SQL Editor
# Run all SQL from RESOURCE_DELIVERY_QUICKSTART.md
# Verify tables created successfully
```

### 2. Environment Variables
```bash
# Verify .env has:
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Backend Restart
```bash
# Stop current server
npm run dev
# Or if running separately:
node backend-server.js
```

### 4. Frontend Refresh
```bash
# Hard refresh browser
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows/Linux)
```

### 5. Create Test User
```sql
-- In Supabase, create user with subscription
UPDATE user_profiles 
SET stripe_subscription_id = 'sub_test_12345'
WHERE email = 'test@example.com';
```

### 6. Smoke Tests
- [ ] Start voice conversation
- [ ] Mention wellness topic
- [ ] Verify AI offers resources
- [ ] Request SMS resources
- [ ] Verify SMS delivered
- [ ] Check database populated

## Production Readiness

### Security
- [ ] Subscription check is enforced ✓
- [ ] No sensitive data in logs ✓
- [ ] User isolation by user_id ✓
- [ ] CORS properly configured ✓
- [ ] Input validation on all endpoints ✓

### Performance
- [ ] Resource library loads instantly ✓
- [ ] SMS sending is non-blocking ✓
- [ ] Database indexes are created ✓
- [ ] No N+1 queries ✓

### Error Handling
- [ ] All error cases return proper HTTP status ✓
- [ ] Error messages are user-friendly ✓
- [ ] Backend logs errors for debugging ✓
- [ ] No crashes on edge cases ✓

### Monitoring
- [ ] Check `resource_deliveries` table regularly
- [ ] Monitor Twilio logs for SMS failures
- [ ] Track API response times
- [ ] Monitor for subscription check failures

## Rollback Plan

If issues occur post-launch:

### Quick Disable
1. Remove resource panel UI from VoiceDemo.tsx
2. Comment out `POST /api/send-resources` endpoint
3. Restart backend and frontend

### Rollback Database
```sql
-- Keep resource_deliveries table (data is valuable)
-- Just disable endpoint in backend
```

### Partial Rollback
- Disable SMS-only (keep email framework)
- Disable email-only (keep SMS)
- Show error message to users instead

## Feature Flags (Optional)

If you want to gradually enable:

```typescript
// In VoiceDemo.tsx
const RESOURCE_DELIVERY_ENABLED = process.env.REACT_APP_RESOURCE_DELIVERY_ENABLED === 'true';

if (RESOURCE_DELIVERY_ENABLED) {
  // Show resource panel
}
```

```javascript
// In .env
REACT_APP_RESOURCE_DELIVERY_ENABLED=true
```

## Support Resources

### If Users Report Issues

#### "I didn't receive SMS"
1. Verify phone number format
2. Check Twilio console for failed messages
3. Verify Twilio account has active credits
4. Check if number is SMS-capable

#### "I got subscription error but I have subscription"
1. Verify user has `stripe_subscription_id` in database
2. Check if subscription was just created (might need cache refresh)
3. Verify user is logged into correct account

#### "Resources are irrelevant"
1. Check if correct topics are being detected
2. Review `WELLNESS_RESOURCES` in resourceLibrary.ts
3. Add more relevant resources for that topic
4. Consider custom resources feature

#### "Email not received"
1. Email service not integrated yet (see RESOURCE_DELIVERY_FEATURE.md)
2. Implement SendGrid integration first
3. Check spam folder
4. Verify email address format

### Team Communication

Share these files with team:
- [ ] RESOURCE_DELIVERY_QUICKSTART.md - Quick reference
- [ ] RESOURCE_DELIVERY_FEATURE.md - Technical details
- [ ] RESOURCE_DELIVERY_IMPLEMENTATION.md - What was built

## Success Criteria

Feature is ready when:
- [ ] Database tables exist and accessible
- [ ] Backend endpoint returns proper responses
- [ ] Frontend UI displays and functions correctly
- [ ] SMS delivery works end-to-end
- [ ] Subscription verification prevents non-subscribers
- [ ] AI offers resources in conversation
- [ ] Analytics data is captured in database
- [ ] All documentation is complete
- [ ] Team understands how to support feature

## Post-Launch Monitoring

### Week 1
- [ ] Monitor for API errors
- [ ] Check SMS delivery rate
- [ ] Verify subscription checks working
- [ ] Gather user feedback

### Week 2-4
- [ ] Analyze which topics are most requested
- [ ] Analyze SMS vs Email preference
- [ ] Check for common errors
- [ ] Plan next enhancements

### Month 1+
- [ ] Monitor conversion impact (demo → subscription)
- [ ] Analyze resource quality feedback
- [ ] Plan Phase 2 enhancements
- [ ] Consider custom resource library
- [ ] Plan email service integration

## Questions & Support

If stuck during implementation:
1. Check RESOURCE_DELIVERY_FEATURE.md troubleshooting section
2. Review the actual code comments in files
3. Test individual components in isolation
4. Check backend logs and browser console
5. Verify environment variables are set
6. Ensure database migrations ran successfully

Good luck! 🚀
