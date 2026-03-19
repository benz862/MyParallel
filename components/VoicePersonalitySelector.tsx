import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { GoogleGenAI, LiveServerMessage } from '@google/genai';

// Voice Options
export const VOICES = [
  {
    id: "calm_female",
    name: "Calm Female",
    description: "Warm, steady, reassuring tone.",
    sampleText: "Hi there, I'll be here whenever you need me.",
    geminiVoiceId: "Kore", // Gemini voice ID
  },
  {
    id: "friendly_male",
    name: "Friendly Male",
    description: "Upbeat, positive, approachable.",
    sampleText: "Hey! You're doing great. Let's tackle today together.",
    geminiVoiceId: "Fenrir",
  },
  {
    id: "gentle_elder",
    name: "Gentle Elder",
    description: "Soft, wise, comforting — great for seniors.",
    sampleText: "It's okay to take things one step at a time.",
    geminiVoiceId: "Kore",
  },
  {
    id: "energetic_youth",
    name: "Energetic Youth",
    description: "Bright, enthusiastic, supportive.",
    sampleText: "Let's go! I believe in you!",
    geminiVoiceId: "Puck",
  },
  {
    id: "neutral_guide",
    name: "Neutral Guide",
    description: "Professional, balanced, emotion-neutral.",
    sampleText: "I'm here to assist you whenever you're ready.",
    geminiVoiceId: "Zephyr",
  },
  {
    id: "soft_whisper",
    name: "Soft Whisper",
    description: "Quiet, soothing, great for anxiety relief.",
    sampleText: "Take a breath. You're safe, and you're not alone.",
    geminiVoiceId: "Kore",
  },
];

// Personality Options
export const PERSONALITIES = [
  {
    id: "supportive",
    name: "Supportive Companion",
    description: "Encouraging, uplifting, gentle affirmation.",
    icon: "💙",
    style: {
      warmth: 9,
      humor: 3,
      directness: 4,
    },
  },
  {
    id: "calm_therapist",
    name: "Calm Therapist",
    description: "Steady, grounding, soothing, emotionally regulated.",
    icon: "🧘",
    style: {
      warmth: 8,
      humor: 1,
      directness: 6,
    },
  },
  {
    id: "practical_coach",
    name: "Practical Coach",
    description: "Action-oriented, structured, helpful guidance.",
    icon: "📋",
    style: {
      warmth: 5,
      humor: 2,
      directness: 9,
    },
  },
  {
    id: "friendly_neighbor",
    name: "Friendly Neighbor",
    description: "Casual, chatty, friendly tone.",
    icon: "👋",
    style: {
      warmth: 7,
      humor: 5,
      directness: 3,
    },
  },
  {
    id: "elder_wisdom",
    name: "Elder Wisdom",
    description: "Slow, comforting, kind, grandfather/grandmother energy.",
    icon: "🌳",
    style: {
      warmth: 9,
      humor: 2,
      directness: 4,
    },
  },
  {
    id: "neutral_assistant",
    name: "Neutral Assistant",
    description: "Calm, professional, balanced tone.",
    icon: "🤝",
    style: {
      warmth: 4,
      humor: 0,
      directness: 7,
    },
  },
];

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Play voice sample function using High-Quality Native Gemini Live WebSocket Stream
async function playVoiceSample(voiceId: string, text: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
        if (!apiKey) throw new Error("API Key not found in environment.");
        
        const ai = new GoogleGenAI({ apiKey });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        let nextStartTime = 0;
        let activeSources = 0;

        const session = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                systemInstruction: "You are a specialized voice preview actor. The user will give you a sentence to read aloud. Read it EXACTLY as written, without adding any other words or commentary.",
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } },
            },
            callbacks: {
                onmessage: async (message: LiveServerMessage) => {
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio) {
                        if (outputCtx.state === 'running') {
                            nextStartTime = Math.max(nextStartTime, outputCtx.currentTime);
                        }
                        
                        const pcmData = decode(base64Audio);
                        const dataInt16 = new Int16Array(pcmData.buffer);
                        const frameCount = dataInt16.length;
                        const buffer = outputCtx.createBuffer(1, frameCount, 24000);
                        const channelData = buffer.getChannelData(0);
                        for (let i = 0; i < frameCount; i++) {
                            channelData[i] = dataInt16[i] / 32768.0;
                        }

                        const source = outputCtx.createBufferSource();
                        source.buffer = buffer;
                        source.connect(outputCtx.destination);
                        
                        activeSources++;
                        source.addEventListener('ended', () => {
                            activeSources--;
                            if (activeSources === 0) {
                                session.close();
                                outputCtx.close();
                                resolve();
                            }
                        });

                        source.start(nextStartTime);
                        nextStartTime += buffer.duration;
                    }
                },
                onerror: (e) => reject(e)
            }
        });

        // Trigger the voice by sending the exact text to be spoken
        await (session as any).send({
            clientContent: {
                turns: [{ role: 'user', parts: [{ text: `Say exactly this sentence and nothing else: "${text}"` }] }]
            }
        });

    } catch (e) {
        console.error('High-fidelity Stream failed, falling back to local browser TTS', e);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => resolve();
        window.speechSynthesis.speak(utterance);
    }
  });
}

interface VoicePersonalitySelectorProps {
  onComplete?: () => void;
  onSave?: (voice: string, personality: string) => Promise<void>;
  initialVoice?: string | null;
  initialPersonality?: string | null;
  isSaving?: boolean;
}

const VoicePersonalitySelector: React.FC<VoicePersonalitySelectorProps> = ({
  onComplete,
  onSave,
  initialVoice,
  initialPersonality,
  isSaving = false,
}) => {
  const [selectedVoice, setSelectedVoice] = useState<string | null>(initialVoice || null);
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(initialPersonality || null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Load saved selections from localStorage on mount (if not provided as props)
  useEffect(() => {
    if (!initialVoice) {
      const savedVoice = localStorage.getItem("parallel_voice");
      if (savedVoice) setSelectedVoice(savedVoice);
    }
    if (!initialPersonality) {
      const savedPersonality = localStorage.getItem("parallel_personality");
      if (savedPersonality) setSelectedPersonality(savedPersonality);
    }
  }, [initialVoice, initialPersonality]);

  const handleVoiceClick = async (voice: typeof VOICES[0]) => {
    setSelectedVoice(voice.id);
    setPlayingVoiceId(voice.id);
    
    try {
      await playVoiceSample(voice.geminiVoiceId, voice.sampleText);
    } finally {
      setPlayingVoiceId(null);
    }
  };

  const handlePersonalityClick = (personalityId: string) => {
    setSelectedPersonality(personalityId);
  };

  const handleSave = async () => {
    if (!selectedVoice || !selectedPersonality) return;

    localStorage.setItem("parallel_voice", selectedVoice);
    localStorage.setItem("parallel_personality", selectedPersonality);
    
    // If onSave callback is provided (for onboarding), use it
    if (onSave) {
      await onSave(selectedVoice, selectedPersonality);
    } else {
      alert("Your companion setup is complete!");
      
      if (onComplete) {
        onComplete();
      }
    }
  };

  const canSave = selectedVoice !== null && selectedPersonality !== null;

  return (
    <section className="py-16 sm:py-24 bg-wellness-cream border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Choose Your Companion Style
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Select a voice and personality that feels most comfortable for you. 
            You can preview each voice before deciding.
          </p>
        </div>

        {/* Voice Selection Grid */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
            Select Your Voice
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {VOICES.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              const isPlaying = playingVoiceId === voice.id;

              return (
                <button
                  key={voice.id}
                  onClick={() => handleVoiceClick(voice)}
                  disabled={isPlaying}
                  className={`
                    relative p-6 rounded-2xl border-2 transition-all duration-200
                    text-left focus:outline-none focus:ring-4 focus:ring-wellness-blue/20
                    ${
                      isSelected
                        ? "border-wellness-blue bg-white shadow-lg scale-105"
                        : "border-slate-200 bg-white hover:border-wellness-teal hover:shadow-md"
                    }
                    ${isPlaying ? "opacity-75 cursor-wait" : "cursor-pointer"}
                  `}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-wellness-blue flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Play Indicator */}
                  {isPlaying && (
                    <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-wellness-teal flex items-center justify-center animate-pulse">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}

                  <div className="pr-8">
                    <h4 className="text-lg font-bold text-slate-900 mb-2">
                      {voice.name}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {voice.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-wellness-blue font-medium">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Click to preview
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Personality Selection Grid */}
        <div className="mb-12">
          <h3 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
            Select Your Personality
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {PERSONALITIES.map((personality) => {
              const isSelected = selectedPersonality === personality.id;

              return (
                <button
                  key={personality.id}
                  onClick={() => handlePersonalityClick(personality.id)}
                  className={`
                    relative p-6 rounded-2xl border-2 transition-all duration-200
                    text-left focus:outline-none focus:ring-4 focus:ring-wellness-blue/20
                    ${
                      isSelected
                        ? "border-wellness-blue bg-white shadow-lg scale-105"
                        : "border-slate-200 bg-white hover:border-wellness-teal hover:shadow-md"
                    }
                    cursor-pointer
                  `}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-wellness-blue flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}

                  <div className="pr-8">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{personality.icon}</span>
                      <h4 className="text-lg font-bold text-slate-900">
                        {personality.name}
                      </h4>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {personality.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className={`
              px-10 py-4 rounded-full font-bold text-lg sm:text-xl
              transition-all duration-200 shadow-lg
              focus:outline-none focus:ring-4 focus:ring-wellness-blue/30
              ${
                canSave && !isSaving
                  ? "bg-wellness-blue text-white hover:bg-wellness-blue/90 hover:scale-105 active:scale-100"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }
            `}
          >
            {isSaving
              ? "Saving..."
              : canSave
              ? "Save My Companion Style"
              : "Please select both voice and personality"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default VoicePersonalitySelector;

