import React, { useState, useEffect } from "react";
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { VOICE_PRESETS } from '../constants';

// Unified persona list — each entry maps to a Gemini voice + personality
const PERSONAS = VOICE_PRESETS.map(v => ({
  geminiVoiceId: v.id,
  label: v.label,
  description: v.desc,
  sampleText: v.systemInstruction,  // Use system instruction as preview context
  previewLine: (() => {
    switch (v.label) {
      case 'The Nurturer': return "Hi there, I'll be here whenever you need me.";
      case 'The Anchor': return "Take your time. I'm right here with you.";
      case 'The Optimist': return "Hey! You're doing great. Let's tackle today together!";
      case 'The Guide': return "I'm here to help keep things organized for you.";
      default: return "Hello, I'm MyParallel.";
    }
  })()
}));

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Initialize from saved values
  useEffect(() => {
    if (initialVoice) {
      // Match by Gemini voice ID
      const match = PERSONAS.find(p => p.geminiVoiceId === initialVoice);
      if (match) setSelectedPersona(match.geminiVoiceId);
    }
    if (!initialVoice) {
      const saved = localStorage.getItem("parallel_voice");
      if (saved) {
        const match = PERSONAS.find(p => p.geminiVoiceId === saved);
        if (match) setSelectedPersona(match.geminiVoiceId);
      }
    }
  }, [initialVoice]);

  const handlePreview = async (persona: typeof PERSONAS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingId) return;
    setPlayingId(persona.geminiVoiceId);
    try {
      await playVoiceSample(persona.geminiVoiceId, persona.previewLine);
    } finally {
      setPlayingId(null);
    }
  };

  const handleSave = async () => {
    if (!selectedPersona) return;
    const persona = PERSONAS.find(p => p.geminiVoiceId === selectedPersona);
    if (!persona) return;

    localStorage.setItem("parallel_voice", persona.geminiVoiceId);
    localStorage.setItem("parallel_personality", persona.label);
    
    if (onSave) {
      await onSave(persona.geminiVoiceId, persona.label);
    } else {
      alert("Your companion setup is complete!");
      if (onComplete) onComplete();
    }
  };

  return (
    <section className="py-16 sm:py-24 bg-wellness-cream border-t border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
            Choose Your Companion
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            Each companion has a unique voice and personality. Click "Preview" to hear them before deciding.
          </p>
        </div>

        {/* Persona Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PERSONAS.map((persona) => {
            const isSelected = selectedPersona === persona.geminiVoiceId;
            const isPlaying = playingId === persona.geminiVoiceId;

            return (
              <button
                key={persona.geminiVoiceId}
                onClick={() => setSelectedPersona(persona.geminiVoiceId)}
                className={`
                  relative p-6 rounded-2xl border-2 transition-all duration-200
                  text-left focus:outline-none focus:ring-4 focus:ring-wellness-blue/20
                  ${isSelected
                    ? "border-wellness-blue bg-white shadow-lg scale-[1.02]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                  }
                `}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-wellness-blue flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="pr-8">
                  <h4 className="text-xl font-bold text-slate-900 mb-1">
                    {persona.label}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {persona.description}
                  </p>
                  
                  {/* Preview Button */}
                  <div 
                    onClick={(e) => handlePreview(persona, e)}
                    className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                      isPlaying 
                        ? 'bg-wellness-blue/10 text-wellness-blue animate-pulse' 
                        : 'bg-slate-100 text-wellness-blue hover:bg-wellness-blue/10'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {isPlaying ? 'Playing...' : 'Preview Voice'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={handleSave}
            disabled={!selectedPersona || isSaving}
            className={`
              px-10 py-4 rounded-full font-bold text-lg
              transition-all duration-200 shadow-lg
              focus:outline-none focus:ring-4 focus:ring-wellness-blue/30
              ${selectedPersona && !isSaving
                ? "bg-wellness-blue text-white hover:bg-wellness-blue/90 hover:scale-105 active:scale-100"
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }
            `}
          >
            {isSaving
              ? "Saving..."
              : selectedPersona
              ? "Save My Companion"
              : "Select a companion to continue"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default VoicePersonalitySelector;
