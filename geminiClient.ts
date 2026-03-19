import { GoogleGenAI } from '@google/genai';
import { UserProfile } from './types';
import { PERSONALITIES } from './components/VoicePersonalitySelector';

const API_KEY = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

const BASE_SYSTEM_INSTRUCTION = `
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

interface ConversationMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export async function generateReply(
  userProfile: UserProfile | null,
  conversationHistory: ConversationMessage[],
  newMessage: string
): Promise<string> {
  try {
    // Build personalized system instruction
    let systemInstruction = BASE_SYSTEM_INSTRUCTION;

    if (userProfile) {
      // Add user context
      systemInstruction += `\n\nUSER PROFILE CONTEXT:\n`;
      
      if (userProfile.preferred_name) {
        systemInstruction += `- Call the user "${userProfile.preferred_name}" (full name: ${userProfile.full_name})\n`;
      } else {
        systemInstruction += `- User's name: ${userProfile.full_name}\n`;
      }

      if (userProfile.age) {
        systemInstruction += `- Age: ${userProfile.age}\n`;
      }

      if (userProfile.conditions && userProfile.conditions.length > 0) {
        systemInstruction += `- Health conditions: ${userProfile.conditions.join(', ')}\n`;
      }

      if (userProfile.cognitive_status) {
        systemInstruction += `- Cognitive status: ${userProfile.cognitive_status}\n`;
        if (userProfile.cognitive_status === 'severe' || userProfile.cognitive_status === 'moderate') {
          systemInstruction += `  → Be EXTRA patient. Use simple language. Repeat important information.\n`;
        }
      }

      if (userProfile.mobility_issues) {
        systemInstruction += `- Has mobility issues - be mindful of physical limitations\n`;
      }

      if (userProfile.loneliness_level !== null && userProfile.loneliness_level !== undefined) {
        systemInstruction += `- Loneliness level: ${userProfile.loneliness_level}/10\n`;
        if (userProfile.loneliness_level >= 7) {
          systemInstruction += `  → User is experiencing significant loneliness. Be extra warm and present.\n`;
        }
      }

      if (userProfile.medications && userProfile.medications.length > 0) {
        systemInstruction += `- Medications:\n`;
        userProfile.medications.forEach(med => {
          systemInstruction += `  * ${med.name} (${med.dosage}) - ${med.schedule}\n`;
        });
        systemInstruction += `  → Remind user about upcoming medication times when appropriate.\n`;
      }

      if (userProfile.caregiver_name) {
        systemInstruction += `- Caregiver: ${userProfile.caregiver_name}`;
        if (userProfile.caregiver_phone) {
          systemInstruction += ` (${userProfile.caregiver_phone})`;
        }
        systemInstruction += `\n`;
      }

      if (userProfile.emergency_contact_name) {
        systemInstruction += `- Emergency contact: ${userProfile.emergency_contact_name}`;
        if (userProfile.emergency_contact_phone) {
          systemInstruction += ` (${userProfile.emergency_contact_phone})`;
        }
        systemInstruction += `\n`;
      }

      if (userProfile.notes) {
        systemInstruction += `- Additional notes: ${userProfile.notes}\n`;
      }

      // Add personality style
      if (userProfile.selected_personality) {
        const personality = PERSONALITIES.find(p => p.id === userProfile.selected_personality);
        if (personality) {
          systemInstruction += `\nPERSONALITY STYLE:\n`;
          systemInstruction += `- Name: ${personality.name}\n`;
          systemInstruction += `- Description: ${personality.description}\n`;
          systemInstruction += `- Warmth level: ${personality.style.warmth}/10\n`;
          systemInstruction += `- Humor level: ${personality.style.humor}/10\n`;
          systemInstruction += `- Directness level: ${personality.style.directness}/10\n`;
          systemInstruction += `\nAdjust your communication style to match these personality traits. `;
          systemInstruction += `Be ${personality.style.warmth >= 7 ? 'very warm and' : personality.style.warmth >= 4 ? 'moderately warm and' : 'professional and'} `;
          systemInstruction += `${personality.style.humor >= 5 ? 'occasionally lighthearted' : personality.style.humor >= 2 ? 'slightly warm' : 'serious'}, `;
          systemInstruction += `and ${personality.style.directness >= 7 ? 'direct and action-oriented' : personality.style.directness >= 4 ? 'balanced' : 'gentle and indirect'}.\n`;
        }
      }

      // Add voice preference (for reference, though voice is handled separately)
      if (userProfile.selected_voice) {
        systemInstruction += `\n- Selected voice: ${userProfile.selected_voice}\n`;
      }
    }

    // Create chat with personalized context
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        tools: [{ codeExecution: {} }], // Enable code execution
      },
      history: conversationHistory,
    });

    // Generate reply
    const result = await chat.sendMessage({ message: newMessage });
    const reply = result.text;

    // After generating reply, check for crisis in the user's message
    if (userProfile) {
      try {
        await fetch('/api/detect-crisis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: newMessage,
            userId: userProfile.id,
          }),
        });
      } catch (crisisError) {
        console.error('Error in crisis detection:', crisisError);
        // Don't fail the reply if crisis detection fails
      }
    }

    return reply;
  } catch (error) {
    console.error('Error generating reply:', error);
    throw error;
  }
}

