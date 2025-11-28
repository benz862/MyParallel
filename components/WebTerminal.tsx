
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { SAFETY_SYSTEM_INSTRUCTION, CRISIS_KEYWORDS, MOCK_MEMORY_STATE } from '../constants';

interface ChatMessage {
  sender: 'user' | 'ai' | 'system';
  text: string;
  time: string;
  mediaUrl?: string;
}

const WebTerminal: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Connection State
  const [uplinkUrl, setUplinkUrl] = useState('http://localhost:8080');
  const [showConfig, setShowConfig] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  
  const [syncStatus, setSyncStatus] = useState('INITIALIZING...');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  // Load saved URL on mount
  useEffect(() => {
    const saved = localStorage.getItem('parallel_uplink');
    if (saved) {
        setUplinkUrl(saved);
        setTempUrl(saved);
    }
  }, []);

  // Sync with Local Backend
  useEffect(() => {
    let isMounted = true;

    const fetchContext = async (isBackgroundPoll = false) => {
        // Only show "Connecting" on initial load or config change, NOT every 2 seconds
        if (!isBackgroundPoll) {
             setSyncStatus('CONNECTING...');
        }

        try {
            // Append /api/context to the base URL
            const endpoint = uplinkUrl.replace(/\/$/, '') + '/api/context';
            
            // CRITICAL: Add header to bypass Ngrok's "Visit Site" warning page
            const res = await fetch(endpoint, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (isMounted) {
                    setSyncStatus('DATABASE: CONNECTED');
                    
                    // Convert DB messages to ChatMessages
                    const dbMessages: ChatMessage[] = data.map((m: any) => ({
                        sender: m.sender === 'user' ? 'user' : 'ai',
                        text: m.content || (m.media_url ? '[Photo Sent]' : ''),
                        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        mediaUrl: m.media_url
                    }));
                    
                    // Only update if we have new data or empty
                    if (dbMessages.length > 0) {
                         setMessages(dbMessages);
                    }
                }
            } else {
                throw new Error("Failed to fetch");
            }
        } catch (e) {
            if (isMounted) {
                // If we are on HTTPS but trying to hit HTTP localhost, it's a Mixed Content error
                const isMixedContent = window.location.protocol === 'https:' && uplinkUrl.includes('localhost');
                
                if (isMixedContent) {
                    setSyncStatus('ERROR: MIXED CONTENT BLOCK');
                } else {
                    setSyncStatus('BACKEND OFFLINE (USING MOCK)');
                }

                // If offline/error, ensure at least one message exists
                if (messages.length === 0) {
                   const errorMsg = isMixedContent 
                        ? "BROWSER SECURITY BLOCK: You are on HTTPS, but the backend is HTTP. Please click the Gear Icon (⚙️) and enter your Ngrok URL."
                        : "Hey... I can't reach your local database. Make sure 'npm start' is running and Ngrok is connected.";
                        
                    // Only add error msg once
                    setMessages(prev => {
                        if (prev.length === 0) {
                             return [{
                                sender: 'ai',
                                text: errorMsg,
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }];
                        }
                        return prev;
                    });
                }
            }
        }
    };
    
    // Initial fetch
    fetchContext(false);
    
    // Background polling
    const interval = setInterval(() => fetchContext(true), 2000);
    
    return () => {
        isMounted = false;
        clearInterval(interval);
    };
  }, [uplinkUrl]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const initChat = async () => {
    if (!chatRef.current) {
      const apiKey = process.env.API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        chatRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: "You are Parallel. Continue the conversation naturally.",
          },
        });
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      await initChat();
      if (chatRef.current) {
        const result = await chatRef.current.sendMessage({ message: input });
        const aiMsg: ChatMessage = {
          sender: 'ai',
          text: result.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error("Chat error", err);
    } finally {
      setIsTyping(false);
    }
  };

  const saveConfig = () => {
      let finalUrl = tempUrl.trim();
      // Ensure protocol
      if (finalUrl && !finalUrl.startsWith('http')) {
          finalUrl = 'https://' + finalUrl;
      }
      setUplinkUrl(finalUrl || 'http://localhost:8080');
      if (finalUrl) {
          localStorage.setItem('parallel_uplink', finalUrl);
      }
      setShowConfig(false);
      setMessages([]); // Clear mock data to allow refresh
  };

  return (
    <section id="terminal" className="py-24 bg-neon-dark relative border-t border-white/5">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          
          <div className="flex-1 space-y-8 lg:sticky lg:top-24">
             <div className="inline-block px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-500 text-xs font-bold tracking-widest uppercase mb-2">
                Persistence Engine v2.0
             </div>
             <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
               It remembers <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">everything.</span>
             </h2>
             <p className="text-lg text-gray-400 font-light">
               Parallel isn't a series of disconnected chats. It's one continuous stream of consciousness. 
               <br/><br/>
               <span className="text-xs text-gray-500">
                   NOTE: If you see "MIXED CONTENT BLOCK", you must click the Gear icon (⚙️) and add your Ngrok URL.
               </span>
             </p>
          </div>

          <div className="flex-1 w-full max-w-xl relative group">
            <div className="bg-black border border-gray-800 rounded-lg shadow-2xl overflow-hidden font-mono text-sm relative z-10 min-h-[500px] flex flex-col">
                  
                  {/* Configuration Overlay */}
                  {showConfig && (
                      <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-6 animate-fadeIn">
                          <div className="w-full max-w-sm space-y-4">
                              <h3 className="text-green-500 font-bold uppercase tracking-widest text-center">System Uplink Config</h3>
                              <p className="text-gray-500 text-xs text-center">
                                  Enter your Ngrok URL to bridge the browser to your local backend.
                              </p>
                              <input 
                                type="text" 
                                value={tempUrl}
                                onChange={(e) => setTempUrl(e.target.value)}
                                placeholder="https://xxxx.ngrok-free.dev"
                                className="w-full bg-gray-900 border border-green-500/30 rounded p-3 text-white focus:border-green-500 outline-none"
                              />
                              <div className="flex gap-2">
                                  <button onClick={() => setShowConfig(false)} className="flex-1 py-3 border border-gray-700 text-gray-400 rounded hover:bg-gray-800">Cancel</button>
                                  <button onClick={saveConfig} className="flex-1 py-3 bg-green-600 text-black font-bold rounded hover:bg-green-500">Connect</button>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* Header */}
                  <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${syncStatus.includes('CONNECTED') ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      <div className="flex flex-col">
                        <div className="text-[10px] text-gray-400 tracking-widest uppercase">
                            {syncStatus}
                        </div>
                      </div>
                    </div>
                    
                    {/* Gear Icon */}
                    <button 
                        onClick={() => setShowConfig(!showConfig)}
                        className="text-gray-500 hover:text-white transition-colors p-1"
                        title="Configure Connection"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                  </div>

                  {/* Messages */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/50">
                        {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'} animate-[fadeIn_0.3s_ease-out]`}>
                                <div className={`max-w-[90%] px-4 py-3 rounded-lg border leading-relaxed ${
                                    msg.sender === 'user'
                                    ? 'bg-green-900/10 border-green-500/30 text-green-100 rounded-br-none'
                                    : 'bg-gray-900 border-gray-700 text-gray-300 rounded-bl-none'
                                }`}>
                                    {msg.text}
                                    {msg.mediaUrl && (
                                        <div className="mt-2 rounded overflow-hidden border border-gray-700">
                                            <img src={msg.mediaUrl} alt="MMS" className="w-full h-auto" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-gray-600 mt-1">{msg.time}</span>
                        </div>
                        ))}
                    {isTyping && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs pl-2">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSend} className="p-4 bg-gray-900/50 border-t border-gray-800 flex gap-3">
                    <span className="text-green-500 py-2">{'>'}</span>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type response..."
                      className="flex-1 bg-transparent text-white focus:outline-none placeholder-gray-600"
                    />
                  </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default WebTerminal;
