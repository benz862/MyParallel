
export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  NON_BINARY = 'Non-binary',
  ANDROGYNOUS = 'Androgynous',
}

export enum Personality {
  SWEET = 'Sweet',
  BOLD = 'Bold',
  DOMINANT = 'Dominant',
  MYSTERIOUS = 'Mysterious',
  INTELLECTUAL = 'Intellectual',
  NURTURING = 'Nurturing',
  REBELLIOUS = 'Rebellious',
  PLAYFUL = 'Playful',
  SARCASTIC = 'Sarcastic',
  SPIRITUAL = 'Spiritual',
}

export enum CommStyle {
  FLIRTY = 'Flirty',
  SUPPORTIVE = 'Supportive',
  WITTY = 'Witty',
  STOIC = 'Stoic',
  SENSUAL = 'Sensual',
  GENTLE = 'Gentle',
  CHAOTIC = 'Chaotic',
  PHILOSOPHICAL = 'Philosophical',
  LOGICAL = 'Logical',
  BOLD = 'Bold',
}

export enum ContentLevel {
  SAFE = 'Safe (PG-13)',
  FLIRTY = 'Flirty (R)',
  UNFILTERED = 'Unfiltered (X)',
}

export enum Schedule {
  EARLY_BIRD = 'Early Bird (5AM - 9PM)',
  NINE_TO_FIVE = 'Standard (8AM - 11PM)',
  NIGHT_OWL = 'Night Owl (2PM - 4AM)',
  ALWAYS_ON = 'Insomniac (24/7)',
}

export enum Punctuality {
  PRECISE = 'Robotically Precise',
  RESPONSIBLE = 'Responsible (0-5 min delay)',
  ORGANIC = 'Organic/Busy (5-20 min delay)',
  CHAOTIC = 'Chaotic (Unknown delay)',
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
  gender: Gender;
  age: number;
  appearance: string;
  clothingStyle: string;
  
  // Personality DNA
  personalityTraits: string[];
  expressiveness: number; // 0-100
  spontaneity: number; // 0-100
  
  // Communication
  voiceId: string;
  accent: string;
  commStyle: CommStyle;
  textLength: 'Short' | 'Paragraphs' | 'Balanced';
  emojiUsage: 'Never' | 'Occasionally' | 'Often' | 'Constantly';
  initiationFreq: 'Rarely' | 'Balanced' | 'Aggressive';
  
  // Relationship
  role: string;
  tone: string;
  affectionLevel: number; // 0-100
  jealousyLevel: number; // 0-100
  contentLevel: ContentLevel;
  topicsToAvoid: string; // Negative constraints
  
  // Life Sim
  occupation: string;
  schedule: Schedule;
  punctuality: Punctuality;
  backstory: string;
  enableCalendar: boolean; // Calendar Access
  enableHealthReminders: boolean; // Meds/Hydration
  
  // Elderly & Safety
  enableElderlyMode: boolean;
  enableConfusionMonitoring: boolean;
  enableFamilyDashboard: boolean;
  enableNightCompanion: boolean;

  // Meta
  coreMemories: string;
  userNickname: string;
  enablePhotos: boolean;
  enableVoiceCalls: boolean;
}

export interface VisualizerState {
  isSpeaking: boolean;
  volume: number;
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
