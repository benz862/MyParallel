export enum SupportStyle {
  FRIENDLY = 'Friendly & Warm',
  MOTIVATIONAL = 'Motivational Coach',
  CALM = 'Calm & Gentle',
  ELDERLY_FOCUS = 'Elderly Support',
  MEDICAL = 'Medical/Routine Focused',
  LISTENER = 'Quiet Listener',
}

export enum CheckInFrequency {
  LOW = 'Once a day',
  MEDIUM = 'Morning & Evening',
  HIGH = 'Multiple times per day',
}

export enum VoiceTone {
  WARM = 'Warm',
  CALM = 'Calm',
  CHEERFUL = 'Cheerful',
  FIRM = 'Firm (for reminders)',
}

export interface ConversationContext {
  lastInteractionType: 'VOICE_CALL' | 'SMS' | 'EMAIL';
  timestamp: string;
  summary: string;
  userMood: string;
  actionItems: string[];
  unresolvedTopics: string[];
}

export interface CompanionConfig {
  // Identity
  name: string;
  
  // Care Profile
  supportStyle: SupportStyle;
  checkInFrequency: CheckInFrequency;
  
  // Communication
  voiceId: string;
  voiceTone: VoiceTone;
  
  // Wellness Features
  enableMedicationReminders: boolean;
  enableHydrationReminders: boolean;
  enableMealCheckins: boolean;
  enableSleepSupport: boolean; // Night companion
  
  // Safety
  enableSafetyNet: boolean; // "I haven't heard from you"
  enableFamilyDashboard: boolean; // Optional family view

  // Context
  userNeeds: string; // "I have anxiety", "I am recovering from surgery"
  userNickname: string;
  enablePhotos: boolean; // Calming images (nature, pets)
  enableVoiceCalls: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  recommended?: boolean;
  highlight?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  schedule: string;
}

// UserProfile matches Supabase user_profiles table schema exactly
export interface UserProfile {
  id?: string;
  created_at?: string;
  full_name: string;
  preferred_name?: string | null;
  age?: number | null;
  caregiver_name?: string | null;
  caregiver_phone?: string | null;
  caregiver_email?: string | null;
  conditions: string[];
  medications: Medication[] | null;
  loneliness_level?: number | null;
  mobility_issues?: boolean | null;
  cognitive_status?: "normal" | "mild" | "moderate" | "severe" | null;
  notes?: string | null;
  selected_voice?: string | null;
  selected_personality?: string | null;
  google_calendar_enabled?: boolean | null;
  apple_calendar_enabled?: boolean | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  phone_number?: string | null;
  timezone?: string | null;
  checkin_times?: string[] | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_features?: string[] | null;
  updated_at?: string;
}