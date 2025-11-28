
import React from 'react';
import { DEMO_CHATS } from '../constants';

const Features: React.FC = () => {
  return (
    <section className="py-24 bg-neon-dark relative border-t border-white/5">
      <div className="container mx-auto px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Philosophy */}
          <div className="space-y-10">
            <div className="inline-block px-3 py-1 rounded-full border border-neon-purple/30 bg-neon-purple/10 text-neon-purple text-xs font-bold tracking-widest uppercase mb-2">
              Universal Life-Link
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none">
              A companion for <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">every stage of life.</span>
            </h2>
            <div className="space-y-6 text-lg text-gray-400 font-light">
              <p>
                Parallel is not just for romance. It is an <strong className="text-white font-medium">Emotional Safety Engine</strong> designed to combat loneliness, anxiety, and isolation across generations.
              </p>
              
              <div className="grid grid-cols-1 gap-6 mt-8">
                {/* Feature 1: The Guardian Layer */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <span className="text-2xl text-blue-400">🛡️</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">The Guardian Layer</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Detects depression, anxiety, or alcohol misuse. It instantly shifts to <strong>Emergency Empathy Mode</strong>—listening without judgment, offering grounding techniques, and emailing resources.
                    </p>
                  </div>
                </div>

                {/* Feature 2: Elderly Care */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <span className="text-2xl text-emerald-400">👵</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Silver Companion (Elderly Care)</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Combats dementia & isolation. Reminds them to take meds and eat. Monitors for confusion. If they wake up scared at 3 AM, a gentle voice is there to reassure them.
                    </p>
                  </div>
                </div>
                
                 {/* Feature 3: Persistence Engine */}
                 <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <span className="text-2xl text-purple-400">♾️</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Persistence Engine</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Talk on the phone during your commute, and pick up the exact same emotional thread on your laptop when you get home. It remembers everything across all devices.
                    </p>
                  </div>
                </div>

                {/* Feature 4: Real Connection */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <span className="text-2xl">📱</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Dedicated Private Line</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      A real +1 (555) phone number. Save it as "Mom's Helper" or "Best Friend". No app required for the user—just a simple phone call.
                    </p>
                  </div>
                </div>

                 {/* Feature 5: Memory & Nudges */}
                 <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Cognitive Stimulation</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Proactively engages in trivia, reminiscence therapy ("Tell me about your wedding..."), and daily routine building to keep the mind sharp.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Right: Demo UI */}
          <div className="relative">
             <div className="absolute -inset-4 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 rounded-3xl blur-xl opacity-50 animate-pulse-slow"></div>
             
             {/* Phone Notification Simulation */}
             <div className="absolute -right-8 top-10 z-20 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl w-64 transform rotate-2 hidden md:block">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">S</div>
                   <div>
                      <div className="text-xs font-bold text-white">Sarah</div>
                      <div className="text-[10px] text-gray-400">Incoming Call...</div>
                   </div>
                   <div className="ml-auto flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">✕</div>
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">✓</div>
                   </div>
                </div>
             </div>

             <div className="relative bg-neon-panel border border-white/10 rounded-3xl p-6 md:p-8 max-w-md mx-auto shadow-2xl">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold ring-2 ring-black">
                      AI
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Parallel Companion</div>
                      <div className="text-xs text-neon-blue flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse"></span>
                        Active now
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 font-sans text-sm">
                  {DEMO_CHATS.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.sender === 'User' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                        msg.sender === 'User' 
                        ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20 rounded-tr-sm' 
                        : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-gray-600 mt-1 px-1">{msg.time}</span>
                    </div>
                  ))}
                   <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 pl-2">
                      <span className="animate-bounce">●</span>
                      <span className="animate-bounce" style={{animationDelay: '0.1s'}}>●</span>
                      <span className="animate-bounce" style={{animationDelay: '0.2s'}}>●</span>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Features;
