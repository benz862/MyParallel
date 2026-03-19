import React, { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import VoiceBlob from './VoiceBlob';
import TalkingCircle from './TalkingCircle';
import { calculateAmplitudeFromBase64 } from '../utils/audioAmplitude';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audio?: string; // base64 audio data
}

const VoiceChatDemo: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [inputText, setInputText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Detect iOS/Safari
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      // Load voices (required on some browsers)
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available voices:', voices.length);
      };
      
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      loadVoices(); // Try loading immediately
    }

    // Initialize Speech Recognition (Web Speech API)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setIsProcessing(true);

        // Add user message
        const userMessage: Message = {
          role: 'user',
          content: transcript,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        try {
          // Call backend to generate voice reply (with audio)
          const data = await api.post('/api/generate-voice-reply', {
            message: transcript,
            conversationHistory: messages.map(m => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }],
            })),
            userProfile: null, // Demo mode
            voiceId: 'Kore', // Default voice
          });

          const assistantMessage: Message = {
            role: 'assistant',
            content: data.reply,
            timestamp: new Date(),
            audio: data.audio || undefined,
          };
          setMessages(prev => [...prev, assistantMessage]);

          // Show text immediately, play audio when ready
          // If audio is available, play it; otherwise use TTS fallback
          if (data.audio) {
            // Small delay to ensure UI updates first
            setTimeout(() => playAudioResponse(data.audio!), 100);
          } else {
            // Fallback to TTS if no audio
            speakText(data.reply);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to get response');
          console.error('Error:', err);
        } finally {
          setIsProcessing(false);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        setIsListening(false);
        setError('Speech recognition error: ' + event.error);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setSpeechSupported(false);
      // Don't show error for iOS - it's expected
      if (!isIOSDevice) {
        setError('Speech recognition not supported in this browser');
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [messages]);

  const playAudioResponse = (base64Audio: string) => {
    try {
      // Decode base64 PCM to Uint8Array
      const binaryString = atob(base64Audio);
      const pcmBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pcmBytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM to WAV
      const sampleRate = 24000;
      const numChannels = 1;
      const bytesPerSample = 2;
      const blockAlign = numChannels * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = pcmBytes.length;

      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      const writeString = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) {
          view.setUint8(offset + i, s.charCodeAt(i));
        }
      };

      writeString(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bytesPerSample * 8, true);
      writeString(36, "data");
      view.setUint32(40, dataSize, true);

      const audioData = new Uint8Array(buffer, 44);
      audioData.set(pcmBytes);

      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      // Create audio context for real-time amplitude analysis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audio);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      // Real-time amplitude analysis
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let animationId: number;
      
      const analyzeAudio = () => {
        if (isSpeaking) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalizedAmplitude = Math.min(average / 255, 1);
          setAudioLevel(normalizedAmplitude);
          animationId = requestAnimationFrame(analyzeAudio);
        }
      };

      audio.onplay = () => {
        setIsSpeaking(true);
        analyzeAudio();
      };

      audio.onended = () => {
        setIsSpeaking(false);
        stopAudioAnalysis();
        if (animationId) cancelAnimationFrame(animationId);
        audioContext.close();
        URL.revokeObjectURL(url);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        stopAudioAnalysis();
        if (animationId) cancelAnimationFrame(animationId);
        audioContext.close();
        URL.revokeObjectURL(url);
      };

      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setIsSpeaking(false);
        stopAudioAnalysis();
        if (animationId) cancelAnimationFrame(animationId);
        audioContext.close();
      });
    } catch (error) {
      console.error('Error playing audio response:', error);
      setIsSpeaking(false);
      // Note: Don't call speakText here as it's already handled in the main handler
    }
  };

  const startAudioAnalysis = () => {
    // Stop any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Simulate smooth audio level variations for blob animation
    const updateAudioLevel = () => {
      // Check if still speaking (use ref or state check)
      const level = 0.3 + Math.random() * 0.4 + Math.sin(Date.now() / 200) * 0.2;
      setAudioLevel(Math.max(0, Math.min(1, level)));
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };
    updateAudioLevel();
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setAudioLevel(0);
  };

  const speakText = (text: string) => {
    console.log('speakText called with:', text);
    
    // Use browser TTS with improved voice selection
    if (!synthRef.current) {
      console.error('Speech synthesis not available');
      return;
    }
    
    // Resume speech synthesis if it's paused (Safari fix)
    if (synthRef.current.paused) {
      synthRef.current.resume();
    }
    
    // Cancel any ongoing speech first
    synthRef.current.cancel();
    
    // Small delay to ensure cancel completes
    setTimeout(() => {
      if (!synthRef.current) return;
      
      // Get available voices and select a good quality one
      const voices = window.speechSynthesis.getVoices();
      console.log('Available voices:', voices.length);
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a high-quality female voice (preferably Samantha on Mac)
      const preferredVoice = voices.find(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Ava') ||
        v.name.includes('Allison') ||
        (v.lang.includes('en') && v.name.includes('Female'))
      );
      
      if (preferredVoice) {
        console.log('Using voice:', preferredVoice.name);
        utterance.voice = preferredVoice;
      } else {
        console.log('Using default voice');
      }
      
      utterance.rate = 0.95; // Slightly slower for warmth
      utterance.pitch = 1.05; // Slightly higher for friendliness
      utterance.volume = 1;
      
      utterance.onstart = () => {
        console.log('Speech started');
        setIsSpeaking(true);
        startAudioAnalysis();
      };
      
      utterance.onend = () => {
        console.log('Speech ended');
        setIsSpeaking(false);
        stopAudioAnalysis();
      };
      
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        setIsSpeaking(false);
        stopAudioAnalysis();
        
        // If error is "not-allowed", speech synthesis needs user interaction
        if (e.error === 'not-allowed') {
          setError('Please click the send button or microphone to enable voice. Browser security requires user interaction.');
        }
      };
      
      console.log('Calling speak()...');
      synthRef.current.speak(utterance);
      
      // Safari workaround - resume immediately after speak
      setTimeout(() => {
        if (synthRef.current && synthRef.current.paused) {
          console.log('Resuming paused speech');
          synthRef.current.resume();
        }
      }, 50);
    }, 100); // Wait 100ms after cancel
  };

  const handleVoiceButtonClick = () => {
    if (!recognitionRef.current || !speechSupported) {
      if (isIOS) {
        setError('Voice input is not available on iOS Safari. Please use the text input below.');
      } else {
        setError('Speech recognition not available');
      }
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    setIsProcessing(true);
    setError(null);

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // For voice chat, use voice reply endpoint
      const data = await api.post('/api/generate-voice-reply', {
        message: text,
        conversationHistory: messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        userProfile: null,
        voiceId: 'Kore',
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        audio: data.audio || undefined,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Play audio response if available
      if (data.audio) {
        playAudioResponse(data.audio);
      } else {
        speakText(data.reply);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-wellness-blue to-wellness-teal px-6 py-4">
        <h3 className="text-xl font-bold text-white">Try Voice Chat</h3>
        <p className="text-sm text-white/90 mt-1">Speak naturally with your companion</p>
      </div>

      {/* Messages Area */}
      <div className="h-[400px] overflow-y-auto p-6 bg-slate-50 space-y-4 relative">
        {/* Talking Circle - shows when speaking (ChatGPT-style) */}
        {isSpeaking && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/30 backdrop-blur-sm">
            <TalkingCircle 
              amplitude={audioLevel} 
              aiSpeaking={isSpeaking} 
              size={150}
            />
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            {!isSpeaking && (
              <>
                {isIOS ? (
                  <>
                    <div className="text-4xl mb-4">💬</div>
                    <p className="text-lg font-medium">Type a message below</p>
                    <p className="text-sm mt-2">Your companion will respond with voice</p>
                    <p className="text-xs mt-4 text-slate-400 px-4 text-center">
                      Note: Voice input isn't available on iOS Safari. Use text input for the best experience.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-4">🎤</div>
                    <p className="text-lg font-medium">Click the microphone to start talking</p>
                    <p className="text-sm mt-2">Your companion will respond with voice</p>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-wellness-blue text-white'
                    : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                ) : (
                  <div>
                    {message.audio && (
                      <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                        </svg>
                        <span>Voice response</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm italic text-slate-600">
                      {message.content}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p className="text-sm text-slate-500">Generating voice response...</p>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 p-4 bg-white">
        <form onSubmit={handleTextSubmit} className="flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isIOS ? "Type your message here..." : "Type a message or use voice..."}
            disabled={isProcessing || isListening}
            className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base disabled:bg-slate-100"
            autoFocus={isIOS}
          />
          {speechSupported && (
            <button
              type="button"
              onClick={handleVoiceButtonClick}
              disabled={isProcessing}
              className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all
                ${isListening
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-wellness-blue hover:bg-wellness-blue/90'
                }
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                shadow-lg
              `}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
            {isListening ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
            </button>
          )}
          <button
            type="submit"
            disabled={isProcessing || isListening || !inputText.trim()}
            className="px-6 py-3 bg-wellness-teal text-white rounded-lg font-semibold hover:bg-wellness-teal/90 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Sending...' : 'Send'}
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-2 text-center">
          {isListening ? '🎤 Listening...' : isSpeaking ? '🔊 Speaking...' : 'Click the microphone to speak'}
        </p>
      </div>
    </div>
  );
};

export default VoiceChatDemo;

