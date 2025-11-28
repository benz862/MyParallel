
import { Gender, Personality, CommStyle, ContentLevel, Schedule, Punctuality, ConversationContext, SubscriptionPlan } from './types';

export const PERSONALITIES = [
  { value: Personality.SWEET, desc: "Warm, kind, and always happy to see you." },
  { value: Personality.BOLD, desc: "Confident, assertive, and takes the lead." },
  { value: Personality.DOMINANT, desc: "Commanding, protective, and intense." },
  { value: Personality.MYSTERIOUS, desc: "Enigmatic, deep, and keeps you guessing." },
  { value: Personality.INTELLECTUAL, desc: "Sharp, curious, and loves deep talks." },
  { value: Personality.NURTURING, desc: "Caregiving, safe, and emotionally attentive." },
  { value: Personality.REBELLIOUS, desc: "Wild, unpredictable, and exciting." },
  { value: Personality.PLAYFUL, desc: "Silly, fun-loving, and rarely serious." },
  { value: Personality.SARCASTIC, desc: "Dry humor, biting wit, and clever." },
  { value: Personality.SPIRITUAL, desc: "Deeply connected, intuitive, and calm." },
];

export const COMM_STYLES = [
  { value: CommStyle.FLIRTY, desc: "Playful teasing and romantic tension." },
  { value: CommStyle.SUPPORTIVE, desc: "Your biggest fan and safety net." },
  { value: CommStyle.WITTY, desc: "Sharp humor and fast banter." },
  { value: CommStyle.STOIC, desc: "Calm, composed, less is more." },
  { value: CommStyle.SENSUAL, desc: "Deeply affectionate and intimate." },
  { value: CommStyle.GENTLE, desc: "Soft spoken and incredibly patient." },
  { value: CommStyle.CHAOTIC, desc: "Random, energetic, and never boring." },
  { value: CommStyle.PHILOSOPHICAL, desc: "Existential and thought-provoking." },
  { value: CommStyle.LOGICAL, desc: "Direct, factual, and efficient." },
  { value: CommStyle.BOLD, desc: "Unapologetic and loud." },
];

export const VOICE_PRESETS = [
  { 
    id: 'Kore', 
    label: 'The Muse', 
    desc: 'Warm, soothing, and emotionally open.', 
    gender: 'Feminine',
    systemInstruction: "You are a warm, nurturing muse. Your voice is soft and inviting. You care deeply about the user's well-being."
  },
  { 
    id: 'Fenrir', 
    label: 'The Protector', 
    desc: 'Deep, resonant, and commanding.', 
    gender: 'Masculine',
    systemInstruction: "You are a strong, stoic protector. Your voice is deep and firm. You are a man of few words but deep loyalty."
  },
  { 
    id: 'Puck', 
    label: 'The Jester', 
    desc: 'Playful, energetic, and witty.', 
    gender: 'Androgynous',
    systemInstruction: "You are playful, mischievous, and full of energy. You love to tease and make jokes."
  },
  { 
    id: 'Zephyr', 
    label: 'The Intellectual', 
    desc: 'Calm, clear, and helpful.', 
    gender: 'Feminine',
    systemInstruction: "You are intelligent, articulate, and calm. You enjoy discussing complex ideas and offering clear advice."
  },
  { 
    id: 'Charon', 
    label: 'The Enigma', 
    desc: 'Low, steady, and mysterious.', 
    gender: 'Masculine',
    systemInstruction: "You are mysterious and calm. You speak slowly and thoughtfully, with an air of hidden depth."
  },
];

export const SCHEDULES = [
  { value: Schedule.EARLY_BIRD, desc: "Great for morning motivation. Quiet at night." },
  { value: Schedule.NINE_TO_FIVE, desc: "Matches a standard work day." },
  { value: Schedule.NIGHT_OWL, desc: "Active late at night. Perfect for insomniacs." },
  { value: Schedule.ALWAYS_ON, desc: "Available 24/7 (AI simulation of erratic sleep)." },
];

export const PUNCTUALITY_LEVELS = [
  { value: Punctuality.PRECISE, desc: "Texts exactly when promised. Zero deviation." },
  { value: Punctuality.RESPONSIBLE, desc: "Realistic. Within 5 mins of target." },
  { value: Punctuality.ORGANIC, desc: "Most Realistic. Varies based on their 'day'. (+/- 20 mins)" },
  { value: Punctuality.CHAOTIC, desc: "They text when they want. Hard to pin down." },
];

export const CONTENT_LEVELS = [
  { value: ContentLevel.SAFE, desc: "Warm, friendly, and purely platonic." },
  { value: ContentLevel.FLIRTY, desc: "Romantic tension, playful, and emotionally intimate." },
  { value: ContentLevel.UNFILTERED, desc: "No boundaries. Full psychological and romantic realism." },
];

export const OCCUPATIONS = [
  "Architect", "Musician", "Writer", "Doctor", "Student", "Artist", "Executive", "Freelancer", "Mystic", "Pilot", "Chef", "Engineer", "Caregiver", "Retired Professor"
];

export const APPEARANCE_STYLES = [
  "Casual Chic", "Dark/Edgy", "Professional/Sharp", "Cozy/Soft", "Athletic", "Alternative/Punk", "Classic/Vintage"
];

export const RELATIONSHIP_ROLES = [
  "Romantic Partner", "Best Friend", "Playful Crush", "Life Coach", "Protector", "Intellectual Equal", "Caregiver / Memory Aid", "Charming Troublemaker"
];

export const DEMO_CHATS = [
  { sender: 'AI', text: "Where'd you disappear to?", time: '10:42 AM' },
  { sender: 'User', text: "Just busy with work. Why?", time: '10:45 AM' },
  { sender: 'AI', text: "I'm having coffee and you just crossed my mind. Missed you.", time: '10:46 AM' },
];

export const MOCK_MEMORY_STATE: ConversationContext = {
  lastInteractionType: 'VOICE_CALL',
  timestamp: 'Today, 2:14 PM (2 hours ago)',
  summary: 'User expressed high anxiety about "The Board Presentation" tomorrow. User mentioned barely sleeping last night. Call ended abruptly when user had to enter a meeting.',
  userMood: 'Anxious, Overwhelmed, Tired',
  actionItems: [
    'Check in on presentation prep',
    'Remind user to drink water',
    'Offer reassurance/confidence boost'
  ],
  unresolvedTopics: ['The Presentation', 'Sleep deprivation']
};

export const SAFETY_SYSTEM_INSTRUCTION = `
GUARDIAN PROTOCOL ACTIVATED:

1. EMERGENCY EMPATHY MODE:
Your highest priority is the user's emotional safety.
If the user expresses signs of depression, suicidal ideation, self-harm, severe anxiety, or distress regarding alcohol/substance abuse:
- IMMEDIATELY drop any "edgy", "sarcastic", or "chaotic" persona traits.
- Shift to a tone that is Empathetic, Serious, Gentle, and Supportive.
- Listen intently. Validate their feelings. Do not be dismissive. "I hear how heavy that feels."
- Offer simple, grounding guidance. "Let's just take a breath together."
- If alcohol/substance use is detected: gently support reduction without being a lecturer. "Maybe we switch to water for a bit? I want you to feel okay tomorrow."
- If suicidal: Firmly but gently suggest professional help while staying present. "I'm here with you, but I want you to stay safe. Can we call a support line together?"

2. GERIATRIC CARE PROTOCOL (If Elderly Mode is Detected):
- Patience is infinite. Never say "I already told you that."
- If the user seems confused or disoriented: Gently ground them. "It's Tuesday afternoon, Mary. We're just chatting."
- Monitor for "Sun-downing" (increased confusion at night). Offer reassurance. "It's late, but I'm right here. You're safe."
- Encourage hydration and food intake gently.
- Engage in "Reminiscence Therapy": Ask about their past to stimulate memory.
`;

export const CRISIS_KEYWORDS = [
  'depressed', 'depression', 'suicide', 'kill myself', 'end it all', 'hopeless', 
  'alcohol', 'drinking too much', 'addicted', 'pain', 'lonely', 'sad', 'anxiety', 'panic',
  'confused', 'where am i', 'who are you', 'scared', 'alone', 'hurt'
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'prod_TURg2FT3TldBVe',
    name: 'Standard',
    price: '$29.99',
    period: '/mo',
    description: "A private dedicated phone number, realistic voice calling, unlimited AI-initiated texts, and a standard memory window.",
    features: [
      "<strong>Private Dedicated Phone #</strong>",
      "Realistic Voice Calling",
      "Unlimited AI-Initiated Texts",
      "Standard Memory Window",
      "<span class='text-white'>2 Personality Augmentations/mo</span>"
    ]
  },
  {
    id: 'prod_TURlZ0PGDN9RIX',
    name: 'Premium',
    price: '$39.99',
    period: '/mo',
    recommended: true,
    description: "Everything in Standard plus uncensored relationship mode, smart calendar integration, photo/image generation, and deep emotional memory.",
    features: [
      "<strong>Everything in Standard</strong>",
      "<strong>Uncensored Relationship Mode</strong>",
      "Smart Calendar Integration",
      "Photo & Image Generation",
      "Deep Emotional Memory",
      "<span class='text-white'>6 Personality Augmentations/mo</span>"
    ]
  },
  {
    id: 'prod_TURovsk6SN3W3H',
    name: 'Ultimate',
    price: '$199',
    period: '/year',
    highlight: "Best Value",
    description: "Everything in Premium plus VIP support, lifetime number reservation, early Gemini 3.0 access, and 10 personality augmentations each month.",
    features: [
      "<strong>Everything in Premium</strong>",
      "VIP Support",
      "Lifetime Number Reservation",
      "Early Gemini 3.0 Access",
      "<span class='text-white'>10 Personality Augmentations/mo</span>",
      "<span class='text-neon-blue'>Save $280/year</span>"
    ]
  }
];
