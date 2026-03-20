import React, { useState, useRef, useEffect, memo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, Type } from '@google/genai';
import { VOICE_PRESETS, BASE_SYSTEM_INSTRUCTION } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

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
          className={`w-1 rounded-full transition-all duration-150 ${
            isActive ? 'bg-wellness-blue animate-pulse' : 'bg-slate-300 h-1'
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

interface VoiceDemoProps {
    lockedVoiceId?: string;
    lockedPhoneNumber?: string;
    patientId?: string;
    patientPhone?: string;
    initialVoiceId?: string;
    patientContextString?: string;
}

export const VoiceDemo: React.FC<VoiceDemoProps> = ({ lockedVoiceId, lockedPhoneNumber, patientId, patientPhone, initialVoiceId, patientContextString }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState(lockedVoiceId || initialVoiceId || VOICE_PRESETS[0].id);
  const [detectedTopics, setDetectedTopics] = useState<string[]>([]); // Topics detected in conversation
  const [showResourceOptions, setShowResourceOptions] = useState(false); // Show resource request UI
  const [deliveryMethod, setDeliveryMethod] = useState<'sms' | 'email'>('sms');
  const [resourceContact, setResourceContact] = useState('');
  const [sendingResources, setSendingResources] = useState(false);
  
  // Refs for Audio Contexts and cleanup
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeSessionRef = useRef<any>(null); 
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const aiTranscriptBufferRef = useRef('');

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

  useEffect(() => {
     if (initialVoiceId && !lockedVoiceId) {
         setSelectedVoiceId(initialVoiceId);
     }
  }, [initialVoiceId, lockedVoiceId]);

  const handleVoiceChange = async (newVoiceId: string) => {
      setSelectedVoiceId(newVoiceId);
      let targetId = patientId || (user && !lockedVoiceId ? user.id : null);
      if (targetId) {
          try {
              await supabase
                  .from('user_profiles')
                  .update({ voice_id: newVoiceId, selected_personality: newVoiceId })
                  .eq('id', targetId);
          } catch (e) {
              console.error("Failed to commit voice change to DB:", e);
          }
      }
  };

  const startInteraction = async () => {
    setError(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
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
              
              // Detect if user is speaking (simple amplitude check to interrupt AI)
              const amplitude = Array.from(inputData).reduce<number>((sum, val) => sum + Math.abs(val as number), 0) / inputData.length;
              if (amplitude > 0.02) {  // User is speaking - interrupt AI
                // Stop all playing audio sources (interrupt the AI)
                sourcesRef.current.forEach(source => {
                  try { source.stop(); } catch(e) {}
                });
                sourcesRef.current.clear();
                setIsTalking(false);
              }
              
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
           },
           onmessage: async (message: LiveServerMessage) => {
             // === TOP-LEVEL toolCall interception (Gemini 2.5 Native Audio format) ===
             if ((message as any).toolCall && (message as any).toolCall.functionCalls) {
                 console.log("[WebRTC] TOP-LEVEL TOOL CALL:", JSON.stringify((message as any).toolCall));
                 for (const fc of (message as any).toolCall.functionCalls) {
                     if (fc.name === 'schedule_calendar_event') {
                         console.log("Gemini WebRTC requested schedule_calendar_event:", fc.args);
                         const targetPhone = lockedPhoneNumber || patientPhone;
                         const cleanUrl = import.meta.env.DEV ? 'http://localhost:8081' : '';
                         fetch(`${cleanUrl}/api/schedule-event`, {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({ userNumber: targetPhone || null, user_id: patientId || null, ...fc.args })
                         }).then(res => res.json()).then(result => {
                             activeSessionRef.current?.send({
                                 toolResponse: {
                                     functionResponses: [{
                                         id: fc.id,
                                         name: "schedule_calendar_event",
                                         response: { result: { success: result.success ? "Successfully scheduled" : "Database error" } }
                                     }]
                                 }
                             } as any);
                         }).catch(e => console.error("Schedule API error:", e));
                     }
                 }
             }

             if (message.serverContent?.modelTurn?.parts) {
                for (const part of message.serverContent.modelTurn.parts) {
                    if (part.text) {
                        aiTranscriptBufferRef.current += part.text;
                    }
                }
             }

            if (message.serverContent?.turnComplete) {
                const finalTranscript = aiTranscriptBufferRef.current.trim();
                const targetPhone = lockedPhoneNumber || patientPhone;
                if (finalTranscript && targetPhone) {
                    try {
                        const cleanUrl = import.meta.env.DEV ? 'http://localhost:8081' : '';
                        fetch(`${cleanUrl}/api/log-transcription`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                phoneNumber: targetPhone,
                                sender: 'ai',
                                text: finalTranscript,
                                type: 'voice_assistant'
                            })
                        });
                    } catch(err) { console.error("Could not post PWA transcription", err); }
                }
                aiTranscriptBufferRef.current = '';
            }

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
          tools: [{
              functionDeclarations: [{
                 name: 'schedule_calendar_event',
                 description: 'Schedule a calendar appointment natively into the caregiver system.',
                 parameters: {
                    type: "OBJECT",
                    properties: {
                       title: { type: "STRING" },
                       description: { type: "STRING" },
                       start_time: { type: "STRING", description: "ISO 8601 formatted start time in the user's local timezone" },
                       reminder_minutes: { type: "NUMBER", description: "Minutes before event to call with a reminder. Use 0 for no reminder." }
                    },
                    required: ["title", "description", "start_time"]
                 }
              }]
          }] as any,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoiceId } },
          },
          systemInstruction: `You are MyParallel. ${selectedVoice.systemInstruction} Keep responses relatively short, natural, and conversational. Do not sound like a robot. 
          
CRITICAL TEMPORAL CONTEXT:
The current accurate actual local time for the physical user is: ${new Date().toLocaleString()}. Their timezone is ${Intl.DateTimeFormat().resolvedOptions().timeZone}. When scheduling appointments, ALWAYS use the user's local timezone. NEVER schedule in UTC.

CRITICAL RULES:
1. If the user explicitly asks to schedule an appointment or check-in on their calendar, you MUST natively execute the "schedule_calendar_event" function tool. Do not simply verbally agree. You must trigger the tool API correctly to physically place it on the caregiver's calendar!

${patientContextString || ''}

If the user mentions any of these wellness topics: depression, anxiety, loneliness, sleep issues, grief, nutrition, or exercise - immediately follow up by offering to send them helpful resources. Say something like: "Would you like me to send you some helpful resources about this? I can send them via text or email."

After each response, analyze the conversation for wellness topics and be ready to help the user get resources. ${BASE_SYSTEM_INSTRUCTION}`,
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

  const sendResources = async (topics: string[]) => {
    if (!resourceContact) {
      setError('Please enter your contact information');
      return;
    }

    setSendingResources(true);
    setError(null);

    try {
      const cleanUrl = import.meta.env.DEV ? 'http://localhost:8081' : '';
      const response = await fetch(`${cleanUrl}/api/send-resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user', // In real app, get from auth context
          topics,
          deliveryMethod,
          recipientContact: resourceContact,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError('This feature requires a subscription. Please upgrade to access wellness resources.');
        } else {
          setError(data.error || 'Failed to send resources');
        }
      } else {
        setError(null);
        setShowResourceOptions(false);
        setResourceContact('');
        // Show success message
        const successMsg = `✅ ${data.resources.length} resources sent via ${deliveryMethod}!`;
        setError(null);
        alert(successMsg);
      }
    } catch (err) {
      console.error('Error sending resources:', err);
      setError('Connection error. Please try again.');
    } finally {
      setSendingResources(false);
    }
  };

  useEffect(() => {
    return () => stopAudio(); // Cleanup on unmount
  }, []);

  return (
    <section id="voice-demo" className="py-24 bg-slate-50 relative overflow-hidden border-t border-slate-200">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-blue-100 blur-[100px] pointer-events-none opacity-50"></div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900">Hear the Connection</h2>
        <p className="text-slate-500 max-w-2xl mx-auto mb-10">
          Select a voice profile below. The emotions adapt to the personality you choose.
          <br/> <span className="text-xs text-slate-400 uppercase tracking-widest mt-2 block">Powered by Gemini 2.5 Flash Native Audio</span>
        </p>

        <div className="flex flex-col items-center justify-center">
          
        <h3 className="text-xl font-bold text-slate-800 text-center mb-6 border-b border-slate-200 pb-4">
          Talk to <span className="text-wellness-blue">{selectedVoice.label}</span>
        </h3>

        {!lockedVoiceId && (
            <div className="mb-6 bg-slate-50 p-4 rounded-xl shadow-inner border border-slate-100 relative max-w-sm mx-auto">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Change Companion Voice</label>
              <select 
                value={selectedVoiceId} 
                onChange={(e) => handleVoiceChange(e.target.value)}
                disabled={isConnected}
                className="w-full bg-white border border-slate-200 text-slate-700 py-3 px-4 rounded-lg focus:outline-none focus:border-wellness-blue focus:ring-1 focus:ring-wellness-blue appearance-none cursor-pointer disabled:opacity-50 transition-colors"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231E293B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
              >
                {VOICE_PRESETS.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.label} - {v.desc}
                  </option>
                ))}
              </select>
            </div>
        )}

          <div className={`w-40 h-40 sm:w-52 sm:h-52 rounded-full flex items-center justify-center relative transition-all duration-300 ${isConnected ? 'bg-sky-50' : 'bg-slate-50'}`}>
            
            {/* Pulsing ring when connected */}
            {isConnected && (
               <>
                 <div className="absolute inset-0 rounded-full border-2 border-wellness-blue animate-ping opacity-20"></div>
                 <div className="absolute inset-[-4px] rounded-full border border-wellness-blue/30 animate-pulse"></div>
               </>
            )}
            
            {/* MyParallel Logo as talk indicator */}
            <img 
              src="/images/Logo_MyParallel.png" 
              alt="MyParallel" 
              className={`w-24 h-24 sm:w-32 sm:h-32 object-contain transition-transform duration-200 ${isTalking ? 'scale-110' : isConnected ? 'scale-100' : 'scale-90 opacity-60'}`}
            />
            
            {/* Status label */}
            <div className={`absolute -bottom-6 text-xs font-medium tracking-wider uppercase ${isConnected ? 'text-wellness-blue' : 'text-slate-400'}`}>
               {isConnected ? (isTalking ? 'Speaking' : 'Listening...') : 'Tap to start'}
            </div>

          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            {!isConnected ? (
              <button
                onClick={startInteraction}
                className="group relative px-8 py-3 bg-slate-900 text-white font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                 <span className="relative z-10 flex items-center gap-2">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                   Start Conversation
                 </span>
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("End Call clicked");
                  stopAudio();
                }}
                className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                🔴 End Call
              </button>
            )}
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <p className="text-xs text-slate-400 max-w-xs text-center">
              Requires microphone access.
            </p>

            {/* Resource Request Panel */}
            {isConnected && !lockedVoiceId && (
              <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg max-w-sm">
                <p className="text-sm font-semibold text-green-900 mb-3">Get Wellness Resources</p>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="delivery"
                        value="sms"
                        checked={deliveryMethod === 'sms'}
                        onChange={(e) => setDeliveryMethod('sms')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-green-900">Send via SMS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="delivery"
                        value="email"
                        checked={deliveryMethod === 'email'}
                        onChange={(e) => setDeliveryMethod('email')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-green-900">Send via Email</span>
                    </label>
                  </div>

                  <input
                    type={deliveryMethod === 'sms' ? 'tel' : 'email'}
                    placeholder={deliveryMethod === 'sms' ? '+1 (555) 123-4567' : 'your@email.com'}
                    value={resourceContact}
                    onChange={(e) => setResourceContact(e.target.value)}
                    className="w-full px-3 py-2 border border-green-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => sendResources(['depression', 'anxiety', 'loneliness'])}
                      disabled={!resourceContact || sendingResources}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded transition-all"
                    >
                      {sendingResources ? 'Sending...' : 'Send Resources'}
                    </button>
                    <button
                      onClick={() => setShowResourceOptions(false)}
                      className="px-3 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 text-sm rounded transition-all"
                    >
                      Close
                    </button>
                  </div>

                  <p className="text-xs text-green-700">
                    💡 Resources are tailored to topics discussed in our conversation.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

export default VoiceDemo;