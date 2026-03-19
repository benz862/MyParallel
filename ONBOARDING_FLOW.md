# myParallel Onboarding & Purchase Flow - Implementation Summary

## ✅ Completed Implementation

### State Flow
1. **STATE 1: Homepage** ✅ - Public landing page with demos
2. **STATE 2: Product Selection** ✅ - Plan selection screen
3. **STATE 3: Add-On Selection** ✅ - Optional features selection
4. **STATE 4: Stripe Checkout** ✅ - Backend creates checkout session
5. **STATE 5: Stripe Checkout Page** ✅ - External Stripe hosted page
6. **STATE 6: Webhook Handler** ✅ - Creates user, sets stripe_verified
7. **STATE 7: Email** ⚠️ - Logged to console (needs email service integration)
8. **STATE 8: Login** ✅ - Checks stripe_verified
9. **STATE 9: Onboarding Wizard** ✅ - 7-step wizard (A-G)
10. **STATE 10: Companion Ready** ✅ - Success screen
11. **STATE 11: Main App** ✅ - Full access to companion

## Components Created

### Frontend Components
- `ProductSelection.tsx` - Plan selection (State 2)
- `AddOnSelection.tsx` - Add-on selection (State 3)
- `OnboardingWizard.tsx` - 7-step onboarding (State 9)
- `CompanionReady.tsx` - Success screen (State 10)
- `router.tsx` - React Router setup with all routes

### Backend Updates
- `/api/create-checkout-session` - Updated to accept `planId` and `addOns`
- `/api/stripe-webhook` - Creates Supabase users, sets `stripe_verified`

## Route Structure

```
/ → Homepage (public)
/login → Login page
/checkout/plan → Product selection
/checkout/add-ons → Add-on selection
/onboarding → Onboarding wizard (protected)
/onboarding/complete → Companion ready screen (protected)
/app → Main application (protected, requires onboarding)
```

## Onboarding Wizard Steps

1. **Step A: Voice & Personality** - Select voice and personality
2. **Step B: Personal Info** - Full name, age, cognitive status
3. **Step C: Caregiver Info** - Caregiver name, phone, email
4. **Step D: Medical Conditions** - List of conditions
5. **Step E: Medications** - Medication list with scheduling
6. **Step F: Calendar Sync** - Google/Apple calendar setup
7. **Step G: Emergency Contact** - Emergency contact info

## Authentication Flow

1. User purchases → Stripe webhook creates Supabase auth user
2. User receives email (currently logged to console)
3. User logs in → System checks `stripe_verified === true`
4. If verified → Redirect to onboarding
5. If not verified → Show error message

## TODO / Remaining Work

1. **Email Service Integration** - Replace console.log with actual email service (SendGrid, Resend, etc.)
2. **UserIntakeForm Section Filtering** - Update to show only relevant sections per step
3. **Magic Link Support** - Add passwordless login option
4. **Password Reset** - Add forgot password flow
5. **Stripe Customer Linking** - Link existing customers to new purchases

## Testing Checklist

- [ ] Purchase flow end-to-end
- [ ] Webhook user creation
- [ ] Login with stripe_verified check
- [ ] Onboarding wizard all steps
- [ ] Route guards (protected routes)
- [ ] Redirect logic (onboarding → app)

## Notes

- Webhook currently uses `supabase.auth.admin` which requires service role key
- Email sending is stubbed - needs integration with email service
- UserIntakeForm needs updates to support section filtering for wizard steps


