import React, { useState, useRef, useEffect, memo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { VOICE_PRESETS, SAFETY_SYSTEM_INSTRUCTION } from '../constants';

// --- Helper Functions for Audio Processing ---
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] range before scaling to Int16
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Waveform Visualizer ---
const Visualizer = memo(({ isActive }: { isActive: boolean }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-1 bg-neon-blue rounded-full transition-all duration-150 ${
            isActive ? 'animate-pulse' : 'h-1'
          }`}
          style={{
            height: isActive ? `${Math.random() * 24 + 8}px` : '4px',
            animationDuration: `${0.5 + Math.random() * 0.5}s` 
          }}
        />
      ))}
    </div>
  );
});

Visualizer.displayName = "Visualizer";


const VoiceDemo: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState(VOICE_PRESETS[0].id);
  
  // Refs for Audio Contexts and cleanup
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeSessionRef = useRef<any>(null); 
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const selectedVoice = VOICE_PRESETS.find(v => v.id === selectedVoiceId) || VOICE_PRESETS[0];

  const stopAudio = () => {
    // Close Gemini Session
    if (activeSessionRef.current) {
      try {
        activeSessionRef.current.close();
        console.log("Session closed explicitly");
      } catch (e) {
        console.warn("Error closing session:", e);
      }
      activeSessionRef.current = null;
    }

    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();

    // Close contexts
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;

    // Stop mic stream
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
            try { track.stop(); } catch(e) {}
        });
        mediaStreamRef.current = null;
    }
    
    // Reset state
    setIsConnected(false);
    setIsTalking(false);
    nextStartTimeRef.current = 0;
  };

  const startInteraction = async () => {
    setError(null);
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found in environment.");
      }

      const ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination); // Ensure output connects to speakers

      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      setIsConnected(true);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              // Check if we are still connected before sending
              if (!inputAudioContextRef.current) return;

              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
               setIsTalking(true);
               
               // Ensure nextStartTime is at least current time to avoid scheduling in past
               if (outputCtx.state === 'running') {
                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
               }

               const audioBuffer = await decodeAudioData(
                 decode(base64Audio),
                 outputCtx,
                 24000,
                 1
               );

               const source = outputCtx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNode);
               
               source.addEventListener('ended', () => {
                 sourcesRef.current.delete(source);
                 if (sourcesRef.current.size === 0) {
                    setIsTalking(false);
                 }
               });

               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               sourcesRef.current.add(source);
            }
          },
          onclose: () => {
             console.log("Gemini Live Closed");
             // Only auto-stop if we haven't already manually stopped
             // Use a timeout to avoid react state update loops if triggered rapidly
             setTimeout(() => {
                if (inputAudioContextRef.current) {
                     stopAudio();
                }
             }, 0);
          },
          onerror: (e) => {
             console.error("Gemini Live Error", e);
             setError("Connection lost. Please try again.");
             stopAudio();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoiceId } },
          },
          systemInstruction: `You are Parallel. ${selectedVoice.systemInstruction} Keep responses relatively short, natural, and conversational. Do not sound like a robot. ${SAFETY_SYSTEM_INSTRUCTION}`,
        },
      });
      
      // Store the session object when promise resolves
      sessionPromise.then(session => {
        // Fix for race condition: 
        // If user stopped the call while connecting (inputAudioContextRef is null),
        // we must immediately close the newly established session.
        if (!inputAudioContextRef.current) {
            console.log("Connection established after stop command. Terminating session.");
            session.close();
            return;
        }
        activeSessionRef.current = session;
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start audio session.");
      stopAudio();
    }
  };

  useEffect(() => {
    return () => stopAudio(); // Cleanup on unmount
  }, []);

  return (
    <section id="voice-demo" className="py-24 bg-neon-panel relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-neon-blue/5 blur-[100px] pointer-events-none"></div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Hear the Connection</h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-10">
          Select a voice profile below. The emotions adapt to the personality you choose.
          <br/> <span className="text-xs text-gray-500 uppercase tracking-widest mt-2 block">Powered by Gemini 2.5 Flash Native Audio</span>
        </p>

        <div className="flex flex-col items-center justify-center">
          
          {/* Voice Selector */}
          <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-3xl">
             {VOICE_PRESETS.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => !isConnected && setSelectedVoiceId(voice.id)}
                  disabled={isConnected}
                  className={`flex flex-col items-start px-4 py-3 rounded-xl border transition-all ${
                    selectedVoiceId === voice.id 
                    ? 'bg-white/10 border-neon-blue ring-1 ring-neon-blue/50' 
                    : 'bg-transparent border-white/10 hover:border-white/30 opacity-60 hover:opacity-100'
                  } ${isConnected ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <span className="text-sm font-bold text-white">{voice.label}</span>
                  <span className="text-xs text-gray-400">{voice.desc}</span>
                </button>
             ))}
          </div>

          <div className="w-64 h-64 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center relative shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all">
            
            {/* Animation ring */}
            {isConnected && (
               <div className="absolute inset-0 rounded-full border border-neon-blue/30 animate-ping opacity-20"></div>
            )}
            
            {/* Visualizer inside circle */}
            <div className="flex flex-col items-center gap-4">
               <Visualizer isActive={isTalking || isConnected} />
               <div className="text-sm font-mono text-neon-blue tracking-widest uppercase">
                  {isConnected ? (isTalking ? `${selectedVoice.label} Speaking` : "Listening...") : "Offline"}
               </div>
            </div>

          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            {!isConnected ? (
              <button
                onClick={startInteraction}
                className="group relative px-8 py-3 bg-white text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
              >
                 <span className="relative z-10 flex items-center gap-2">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                   Start Conversation
                 </span>
                 <div className="absolute inset-0 bg-neon-blue opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </button>
            ) : (
              <button
                onClick={stopAudio}
                className="px-8 py-3 border border-red-500/50 text-red-400 font-bold rounded-full hover:bg-red-500/10 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                End Call
              </button>
            )}
            
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <p className="text-xs text-gray-600 max-w-xs text-center">
              Requires microphone access.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default VoiceDemo;