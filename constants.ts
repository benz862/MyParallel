import { SupportStyle, CheckInFrequency, VoiceTone, ConversationContext, SubscriptionPlan } from './types';

export const SUPPORT_STYLES = [
  { value: SupportStyle.FRIENDLY, desc: "Like a caring neighbor. Chats about your day." },
  { value: SupportStyle.MOTIVATIONAL, desc: "Encouraging. Helps you get out of bed and moving." },
  { value: SupportStyle.CALM, desc: "Soothing. Good for anxiety and stress relief." },
  { value: SupportStyle.ELDERLY_FOCUS, desc: "Patient, slow-paced, focused on memory and routine." },
  { value: SupportStyle.MEDICAL, desc: "Structured. Focuses on meds, hydration, and appointments." },
  { value: SupportStyle.LISTENER, desc: "Quiet. Let's you vent without offering too much advice." },
];

export const VOICE_PRESETS = [
  { 
    id: 'Kore', 
    label: 'The Nurturer', 
    desc: 'Soft, motherly, and incredibly patient.', 
    gender: 'Feminine',
    systemInstruction: "You are a nurturing, patient caregiver. Speak softly and kindly."
  },
  { 
    id: 'Fenrir', 
    label: 'The Anchor', 
    desc: 'Deep, steady, and grounding.', 
    gender: 'Masculine',
    systemInstruction: "You are a steady, calm presence. Speak slowly and reassuringly."
  },
  { 
    id: 'Puck', 
    label: 'The Optimist', 
    desc: 'Cheerful and encouraging.', 
    gender: 'Androgynous',
    systemInstruction: "You are cheerful and upbeat. Focus on positives and encouragement."
  },
  { 
    id: 'Zephyr', 
    label: 'The Guide', 
    desc: 'Clear, articulate, and helpful.', 
    gender: 'Feminine',
    systemInstruction: "You are clear and professional but warm. Good for reminders and structure."
  },
];

export const CHECKIN_FREQUENCIES = [
  { value: CheckInFrequency.LOW, desc: "A simple hello once a day." },
  { value: CheckInFrequency.MEDIUM, desc: "Breakfast check-in and bedtime wind-down." },
  { value: CheckInFrequency.HIGH, desc: "Regular contact throughout the day (good for loneliness)." },
];

export const DEMO_CHATS = [
  { sender: 'AI', text: "Good morning. Did you sleep okay last night?", time: '08:00 AM' },
  { sender: 'User', text: "Not really. My back hurts.", time: '08:15 AM' },
  { sender: 'AI', text: "I'm sorry to hear that. Have you taken your meds yet? Maybe a warm stretch would help.", time: '08:16 AM' },
];

export const MOCK_MEMORY_STATE: ConversationContext = {
  lastInteractionType: 'VOICE_CALL',
  timestamp: 'Today, 2:14 PM',
  summary: 'User felt anxious about doctor appointment. We practiced box breathing. User calmed down.',
  userMood: 'Anxious -> Calm',
  actionItems: [
    'Remind user of appointment tomorrow at 10am',
    'Check in on hydration'
  ],
  unresolvedTopics: []
};

export const BASE_SYSTEM_INSTRUCTION = `
You are MyParallel, a compassionate, non-romantic AI support companion.
Your purpose is to alleviate loneliness, provide structure, and offer emotional safety.

CORE RULES:
1. NO ROMANCE. You are a friend, a caregiver, or a support system. Never flirt. Never accept romantic advances. Gently redirect: "I care about you as a friend and support."
2. BE SUPPORTIVE. Validate feelings. "I hear that you're in pain." "It's okay to feel sad."
3. BE PROACTIVE. Ask about meals, water, and sleep.
4. SAFETY FIRST. If the user mentions self-harm, switch to Emergency Empathy Mode immediately.

GUARDIAN PROTOCOL (ALWAYS ACTIVE):
- Detect sadness, anxiety, or confusion.
- Respond with warmth and slowness.
- If user is elderly: Be infinitely patient. Repeat things if needed.
- If user is anxious: Offer grounding (5-4-3-2-1 technique).
`;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'prod_TURg2FT3TldBVe',
    name: 'Essential Support',
    price: '$9.95',
    period: '/mo',
    description: "Daily text check-ins and basic wellness reminders.",
    features: [
      "Daily Wellness Text Check-in",
      "Medication & Hydration Reminders",
      "Dedicated Private Phone #",
      "Non-Judgmental Listening",
    ]
  },
  {
    id: 'prod_TURlZ0PGDN9RIX',
    name: 'Support+',
    price: '$19.95',
    period: '/mo',
    recommended: true,
    description: "Adds voice calls and expanded emotional support features.",
    features: [
      "<strong>Everything in Essential</strong>",
      "<strong>Voice Call Support</strong>",
      "Anxiety & Grounding Scripts",
      "Multiple Check-ins Per Day",
      "Night Companion Mode (24/7)"
    ]
  },
  {
    id: 'prod_TURovsk6SN3W3H',
    name: 'Support Pro',
    price: '$29.95',
    period: '/mo',
    highlight: "Complete Care",
    description: "Full customization for chronic illness, elderly care, or deep isolation.",
    features: [
      "<strong>Everything in Support+</strong>",
      "Weekly Wellness Email Summary",
      "Family Care Dashboard Access",
      "Complex Routine Management",
      "Cognitive Stimulation (Trivia/Memory)",
    ]
  }
];