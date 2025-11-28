import React, { useState, useEffect } from 'react';
import { Gender, Personality, CommStyle, CompanionConfig, ContentLevel, Schedule, Punctuality } from '../types';
import { 
  PERSONALITIES, COMM_STYLES, VOICE_PRESETS, SCHEDULES, CONTENT_LEVELS, 
  OCCUPATIONS, APPEARANCE_STYLES, RELATIONSHIP_ROLES, PUNCTUALITY_LEVELS 
} from '../constants';

const Builder: React.FC = () => {
  const [config, setConfig] = useState<CompanionConfig>({
    name: '',
    gender: Gender.FEMALE,
    age: 24,
    appearance: '',
    clothingStyle: 'Casual Chic',
    personalityTraits: [Personality.SWEET],
    expressiveness: 70,
    spontaneity: 50,
    voiceId: VOICE_PRESETS[0].id,
    accent: 'American',
    commStyle: CommStyle.SUPPORTIVE,
    textLength: 'Balanced',
    emojiUsage: 'Occasionally',
    initiationFreq: 'Balanced',
    role: 'Romantic Partner',
    tone: 'Soft & Loving',
    affectionLevel: 80,
    jealousyLevel: 20,
    contentLevel: ContentLevel.FLIRTY,
    topicsToAvoid: '',
    occupation: 'Artist',
    schedule: Schedule.NINE_TO_FIVE,
    punctuality: Punctuality.ORGANIC,
    backstory: '',
    enableCalendar: false,
    enableHealthReminders: false,
    enableElderlyMode: false,
    enableConfusionMonitoring: false,
    enableFamilyDashboard: false,
    enableNightCompanion: false,
    coreMemories: '',
    userNickname: '',
    enablePhotos: true,
    enableVoiceCalls: true,
  });
  
  const [step, setStep] = useState(1);
  const [provisioningStatus, setProvisioningStatus] = useState<string>('');
  const [provisionedNumber, setProvisionedNumber] = useState<string | null>(null);

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const toggleTrait = (trait: string) => {
    if (config.personalityTraits.includes(trait)) {
      setConfig({...config, personalityTraits: config.personalityTraits.filter(t => t !== trait)});
    } else {
      if (config.personalityTraits.length < 5) {
        setConfig({...config, personalityTraits: [...config.personalityTraits, trait]});
      }
    }
  };

  // Simulate Provisioning Process
  useEffect(() => {
    if (step === 7) {
      const sequence = [
        { msg: "Compiling personality DNA...", delay: 800 },
        { msg: "Generating vocal fingerprint & accent model...", delay: 1800 },
        { msg: config.enableElderlyMode ? "Activating Geriatric Care & Confusion Protocols..." : `Setting emotional volatility...`, delay: 2800 },
        { msg: `Calibrating Punctuality Engine: ${config.punctuality}...`, delay: 3800 },
        { msg: "Connecting to Twilio Telecom Backbone...", delay: 5000 },
        { msg: config.enableFamilyDashboard ? "Linking Family Care Dashboard..." : "Allocating private dedicated line...", delay: 6200 },
      ];

      let timeouts: ReturnType<typeof setTimeout>[] = [];

      sequence.forEach(({ msg, delay }) => {
        const t = setTimeout(() => setProvisioningStatus(msg), delay);
        timeouts.push(t);
      });

      const finalT = setTimeout(() => {
        setProvisioningStatus("READY");
        setProvisionedNumber("+1 (555) 019-2834");
      }, 7500);
      timeouts.push(finalT);

      return () => timeouts.forEach(clearTimeout);
    }
  }, [step, config.punctuality, config.enableElderlyMode, config.enableFamilyDashboard]);

  return (
    <section id="builder" className="py-24 bg-neon-dark min-h-screen flex flex-col justify-center border-t border-white/5">
      <div className="container mx-auto px-6 max-w-5xl">
        
        <div className="mb-12 text-center">
           <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Companion Calibration</h2>
           <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className={`h-1 w-10 rounded-full transition-all duration-500 ${step >= i ? 'bg-neon-blue' : 'bg-white/10'}`}></div>
              ))}
           </div>
           <div className="text-xs text-gray-500 uppercase tracking-widest font-mono">
             Module {step} / 7: {
               step === 1 ? "Core Identity" :
               step === 2 ? "The Mind (Personality)" :
               step === 3 ? "Communication Matrix" :
               step === 4 ? "Relationship Dynamic" :
               step === 5 ? "Life & Care Simulation" :
               step === 6 ? "Final Context" :
               "System Provisioning"
             }
           </div>
        </div>

        <div className="bg-neon-panel border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden min-h-[600px]">
            {/* Decoration */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-neon-blue/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* MODULE 1: IDENTITY */}
            {step === 1 && (
              <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                <h3 className="text-2xl text-white font-light border-b border-white/10 pb-4">Module 1: Core Identity</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-xs text-neon-blue uppercase tracking-widest">Name</label>
                    <input 
                      type="text" 
                      value={config.name}
                      onChange={(e) => setConfig({...config, name: e.target.value})}
                      placeholder="e.g. Sarah, Alex, Kai"
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue transition-colors"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-xs text-neon-blue uppercase tracking-widest">Apparent Age</label>
                    <input 
                      type="number" 
                      value={config.age}
                      onChange={(e) => setConfig({...config, age: parseInt(e.target.value)})}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs text-neon-blue uppercase tracking-widest">Gender Identity</label>
                  <div className="flex gap-4">
                    {[Gender.FEMALE, Gender.MALE, Gender.NON_BINARY, Gender.ANDROGYNOUS].map(g => (
                      <button 
                        key={g}
                        onClick={() => setConfig({...config, gender: g})}
                        className={`px-4 py-2 rounded-full border text-sm transition-all ${config.gender === g ? 'bg-white text-black' : 'border-white/20 text-gray-400'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs text-neon-blue uppercase tracking-widest">Visual Aesthetic</label>
                  <div className="flex flex-wrap gap-2">
                    {APPEARANCE_STYLES.map(style => (
                       <button 
                       key={style}
                       onClick={() => setConfig({...config, clothingStyle: style})}
                       className={`px-3 py-1 rounded-md border text-xs transition-all ${config.clothingStyle === style ? 'bg-neon-purple/20 border-neon-purple text-white' : 'border-white/10 text-gray-500'}`}
                     >
                       {style}
                     </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="block text-xs text-neon-blue uppercase tracking-widest">Detailed Description</label>
                   <textarea 
                     value={config.appearance}
                     onChange={(e) => setConfig({...config, appearance: e.target.value})}
                     placeholder="Hair color, eye color, tattoos, height, build..."
                     className="w-full h-24 bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:border-neon-blue"
                   />
                </div>
              </div>
            )}

            {/* MODULE 2: PERSONALITY */}
            {step === 2 && (
              <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                 <h3 className="text-2xl text-white font-light border-b border-white/10 pb-4">Module 2: The Mind</h3>
                 
                 <div className="space-y-4">
                    <label className="block text-xs text-neon-blue uppercase tracking-widest">Personality DNA (Select up to 5)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {PERSONALITIES.map(p => (
                         <button
                           key={p.value}
                           onClick={() => toggleTrait(p.value)}
                           className={`p-3 rounded-lg border text-left transition-all ${
                             config.personalityTraits.includes(p.value)
                             ? 'bg-neon-blue/20 border-neon-blue text-white'
                             : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'
                           }`}
                         >
                            <div className="text-sm font-bold">{p.value}</div>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6">
                    <div className="space-y-4">
                       <div className="flex justify-between">
                          <label className="text-xs text-neon-blue uppercase tracking-widest">Emotional Expressiveness</label>
                          <span className="text-xs text-white">{config.expressiveness}%</span>
                       </div>
                       <input 
                         type="range" min="0" max="100" 
                         value={config.expressiveness} 
                         onChange={(e) => setConfig({...config, expressiveness: parseInt(e.target.value)})}
                         className="w-full accent-neon-blue"
                       />
                       <div className="flex justify-between text-[10px] text-gray-500">
                          <span>Stoic</span>
                          <span>Dramatic</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between">
                          <label className="text-xs text-neon-blue uppercase tracking-widest">Spontaneity / Chaos</label>
                          <span className="text-xs text-white">{config.spontaneity}%</span>
                       </div>
                       <input 
                         type="range" min="0" max="100" 
                         value={config.spontaneity} 
                         onChange={(e) => setConfig({...config, spontaneity: parseInt(e.target.value)})}
                         className="w-full accent-neon-blue"
                       />
                       <div className="flex justify-between text-[10px] text-gray-500">
                          <span>Predictable</span>
                          <span>Wild</span>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {/* MODULE 3: COMMUNICATION */}
            {step === 3 && (
               <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                  <h3 className="text-2xl text-white font-light border-b border-white/10 pb-4">Module 3: Communication Matrix</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <label className="block text-xs text-neon-blue uppercase tracking-widest">Voice Core</label>
                        <select 
                          value={config.voiceId}
                          onChange={(e) => setConfig({...config, voiceId: e.target.value})}
                          className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue"
                        >
                           {VOICE_PRESETS.map(v => <option key={v.id} value={v.id}>{v.label} ({v.gender})</option>)}
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="block text-xs text-neon-blue uppercase tracking-widest">Accent / Dialect</label>
                        <select 
                          value={config.accent}
                          onChange={(e) => setConfig({...config, accent: e.target.value})}
                          className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue"
                        >
                           {['American (General)', 'British (RP)', 'Australian', 'French-English', 'Soft Southern', 'New York'].map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="block text-xs text-neon-blue uppercase tracking-widest">Texting Style</label>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {COMM_STYLES.slice(0, 8).map(s => (
                           <button
                             key={s.value}
                             onClick={() => setConfig({...config, commStyle: s.value})}
                             className={`p-2 rounded border text-xs transition-all ${config.commStyle === s.value ? 'bg-white text-black' : 'border-white/10 text-gray-400'}`}
                           >
                             {s.value}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                     <div className="space-y-2">
                        <label className="block text-xs text-gray-500 uppercase">Message Length</label>
                        <div className="flex flex-col gap-2">
                           {['Short', 'Balanced', 'Paragraphs'].map((opt: any) => (
                             <button key={opt} onClick={() => setConfig({...config, textLength: opt})} className={`text-left text-xs px-3 py-2 rounded border ${config.textLength === opt ? 'border-neon-blue text-neon-blue' : 'border-white/5 text-gray-500'}`}>
                                {opt}
                             </button>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="block text-xs text-gray-500 uppercase">Emoji Usage</label>
                        <div className="flex flex-col gap-2">
                           {['Never', 'Occasionally', 'Often', 'Constantly'].map((opt: any) => (
                             <button key={opt} onClick={() => setConfig({...config, emojiUsage: opt})} className={`text-left text-xs px-3 py-2 rounded border ${config.emojiUsage === opt ? 'border-neon-blue text-neon-blue' : 'border-white/5 text-gray-500'}`}>
                                {opt}
                             </button>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="block text-xs text-gray-500 uppercase">Initiation Frequency</label>
                        <div className="flex flex-col gap-2">
                           {['Rarely', 'Balanced', 'Aggressive'].map((opt: any) => (
                             <button key={opt} onClick={() => setConfig({...config, initiationFreq: opt})} className={`text-left text-xs px-3 py-2 rounded border ${config.initiationFreq === opt ? 'border-neon-blue text-neon-blue' : 'border-white/5 text-gray-500'}`}>
                                {opt}
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* MODULE 4: RELATIONSHIP */}
            {step === 4 && (
               <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                 <h3 className="text-2xl text-white font-light border-b border-white/10 pb-4">Module 4: Relationship Dynamic</h3>

                 <div className="space-y-4">
                    <label className="block text-xs text-neon-blue uppercase tracking-widest">Role</label>
                    <div className="flex flex-wrap gap-2">
                       {RELATIONSHIP_ROLES.map(r => (
                          <button 
                            key={r}
                            onClick={() => {
                              setConfig({...config, role: r, enableElderlyMode: r.includes('Caregiver')});
                            }}
                            className={`px-4 py-2 rounded-full border text-sm transition-all ${config.role === r ? 'bg-neon-purple/20 border-neon-purple text-white' : 'border-white/10 text-gray-500'}`}
                          >
                             {r}
                          </button>
                       ))}
                    </div>
                    {config.enableElderlyMode && (
                        <div className="text-xs text-green-400 bg-green-500/10 p-2 rounded border border-green-500/30">
                            ℹ️ "Silver Companion" Mode Activated. Patience levels maxed. Memory Aid features enabled.
                        </div>
                    )}
                 </div>

                 <div className="space-y-4">
                    <label className="block text-xs text-neon-blue uppercase tracking-widest">Content Boundaries</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {CONTENT_LEVELS.map(l => (
                          <button
                            key={l.value}
                            onClick={() => setConfig({...config, contentLevel: l.value})}
                            className={`p-3 rounded-xl border text-left transition-all ${config.contentLevel === l.value ? 'bg-white/10 border-white text-white' : 'border-white/10 text-gray-500'}`}
                          >
                             <div className="font-bold text-sm">{l.value}</div>
                             <div className="text-[10px] opacity-60">{l.desc}</div>
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6">
                    <div className="space-y-4">
                       <div className="flex justify-between">
                          <label className="text-xs text-neon-blue uppercase tracking-widest">Affection Level</label>
                          <span className="text-xs text-white">{config.affectionLevel}%</span>
                       </div>
                       <input 
                         type="range" min="0" max="100" 
                         value={config.affectionLevel} 
                         onChange={(e) => setConfig({...config, affectionLevel: parseInt(e.target.value)})}
                         className="w-full accent-neon-blue"
                       />
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between">
                          <label className="text-xs text-neon-blue uppercase tracking-widest">Jealousy / Possessiveness</label>
                          <span className="text-xs text-white">{config.jealousyLevel}%</span>
                       </div>
                       <input 
                         type="range" min="0" max="100" 
                         value={config.jealousyLevel} 
                         onChange={(e) => setConfig({...config, jealousyLevel: parseInt(e.target.value)})}
                         className="w-full accent-neon-blue"
                       />
                       <p className="text-[10px] text-gray-500">Controls how they react to mentions of others.</p>
                    </div>
                 </div>

                 <div className="space-y-2 mt-4">
                   <label className="block text-xs text-neon-blue uppercase tracking-widest">Avoidance / Negative Constraints</label>
                   <textarea 
                     value={config.topicsToAvoid}
                     onChange={(e) => setConfig({...config, topicsToAvoid: e.target.value})}
                     placeholder="Topics to NEVER discuss (e.g. Politics, Ex-partners, Specific phobias)..."
                     className="w-full h-20 bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:border-neon-blue"
                   />
                   <p className="text-[10px] text-gray-500">The Adaptive Learning Engine will permanently block these conceptual clusters.</p>
                 </div>
               </div>
            )}

            {/* MODULE 5: LIFE SIMULATION */}
            {step === 5 && (
               <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                  <h3 className="text-2xl text-white font-light border-b border-white/10 pb-4">Module 5: Life & Care Simulation</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <label className="block text-xs text-neon-blue uppercase tracking-widest">Occupation</label>
                        <div className="flex flex-wrap gap-2">
                           {OCCUPATIONS.map(job => (
                              <button
                              key={job}
                              onClick={() => setConfig({...config, occupation: job})}
                              className={`px-3 py-1 rounded border text-xs transition-all ${config.occupation === job ? 'bg-white text-black' : 'border-white/20 text-gray-500'}`}
                              >
                                 {job}
                              </button>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-4">
                        <label className="block text-xs text-neon-blue uppercase tracking-widest">Sleep Schedule</label>
                        <select 
                          value={config.schedule}
                          onChange={(e) => setConfig({...config, schedule: e.target.value as Schedule})}
                          className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue"
                        >
                           {SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                        </select>
                     </div>
                  </div>

                  {/* Calendar & Reminders */}
                  <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
                    <label className="block text-xs text-neon-blue uppercase tracking-widest mb-4">Smart Integration</label>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-bold text-sm">Calendar Access</div>
                          <div className="text-xs text-gray-400">Allow reading Google/Apple Calendar for awareness of your meetings.</div>
                        </div>
                        <input 
                           type="checkbox" 
                           checked={config.enableCalendar}
                           onChange={(e) => setConfig({...config, enableCalendar: e.target.checked})}
                           className="w-5 h-5 accent-neon-blue"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-bold text-sm">Health & Medication Reminders</div>
                          <div className="text-xs text-gray-400">Allow them to remind you to take meds, hydrate, or rest.</div>
                        </div>
                        <input 
                           type="checkbox" 
                           checked={config.enableHealthReminders}
                           onChange={(e) => setConfig({...config, enableHealthReminders: e.target.checked})}
                           className="w-5 h-5 accent-neon-blue"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* ELDERLY CARE FEATURES */}
                  <div className="space-y-4 bg-emerald-900/10 p-6 rounded-xl border border-emerald-500/20">
                     <label className="block text-xs text-emerald-400 uppercase tracking-widest mb-4">Silver Companion / Care Mode</label>
                     <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                           <div>
                              <div className="text-white font-bold text-sm">Confusion Monitoring</div>
                              <div className="text-xs text-gray-400">Detect disoriented speech patterns and respond with grounding techniques.</div>
                           </div>
                           <input 
                              type="checkbox" 
                              checked={config.enableConfusionMonitoring}
                              onChange={(e) => setConfig({...config, enableConfusionMonitoring: e.target.checked})}
                              className="w-5 h-5 accent-emerald-500"
                           />
                        </div>
                        <div className="flex items-center justify-between">
                           <div>
                              <div className="text-white font-bold text-sm">Night Companion Mode</div>
                              <div className="text-xs text-gray-400">If awake late (1 AM - 5 AM), shift tone to 'Whisper/Calming' to reduce anxiety.</div>
                           </div>
                           <input 
                              type="checkbox" 
                              checked={config.enableNightCompanion}
                              onChange={(e) => setConfig({...config, enableNightCompanion: e.target.checked})}
                              className="w-5 h-5 accent-emerald-500"
                           />
                        </div>
                        <div className="flex items-center justify-between border-t border-emerald-500/20 pt-4 mt-2">
                           <div>
                              <div className="text-white font-bold text-sm">Family Care Dashboard</div>
                              <div className="text-xs text-gray-400">Allow verified family members to see activity logs (mood, hydration, confusion events). <span className="text-emerald-400 font-bold">+$15/mo</span></div>
                           </div>
                           <input 
                              type="checkbox" 
                              checked={config.enableFamilyDashboard}
                              onChange={(e) => setConfig({...config, enableFamilyDashboard: e.target.checked})}
                              className="w-5 h-5 accent-emerald-500"
                           />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
                     <label className="block text-xs text-neon-blue uppercase tracking-widest mb-2">Punctuality & Human Variance</label>
                     <p className="text-xs text-gray-400 mb-4">
                        Controls how they handle time commitments. "Robotically Precise" means they text exactly at 4:00. "Organic" adds realistic human delay.
                     </p>
                     <div className="grid grid-cols-1 gap-3">
                        {PUNCTUALITY_LEVELS.map(p => (
                           <button
                             key={p.value}
                             onClick={() => setConfig({...config, punctuality: p.value})}
                             className={`p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                               config.punctuality === p.value
                               ? 'bg-neon-blue/10 border-neon-blue text-white'
                               : 'bg-transparent border-white/10 text-gray-500'
                             }`}
                           >
                              <span className="text-sm font-bold">{p.value}</span>
                              <span className="text-xs opacity-60">{p.desc}</span>
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {/* MODULE 6: FINAL TOUCHES */}
            {step === 6 && (
               <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                  <h3 className="text-2xl text-white font-light border-b border-white/10 pb-4">Module 6: Final Context</h3>

                  <div className="space-y-4">
                     <label className="block text-xs text-neon-blue uppercase tracking-widest">Implant Core Memories</label>
                     <textarea 
                        value={config.coreMemories}
                        onChange={(e) => setConfig({...config, coreMemories: e.target.value})}
                        placeholder="e.g. We met in college. I hate sushi. My birthday is in July."
                        className="w-full h-32 bg-black/30 border border-white/10 rounded-lg p-4 text-white text-sm resize-none focus:border-neon-blue"
                     />
                     <p className="text-[10px] text-gray-500">This data is permanently embedded in their long-term context window.</p>
                  </div>

                  <div className="space-y-4">
                     <label className="block text-xs text-neon-blue uppercase tracking-widest">What should they call you?</label>
                     <input 
                       type="text" 
                       value={config.userNickname}
                       onChange={(e) => setConfig({...config, userNickname: e.target.value})}
                       placeholder="Your name or nickname"
                       className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue"
                     />
                  </div>

                  <div className="flex flex-col gap-4 pt-4">
                     <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
                        <input 
                           type="checkbox" 
                           checked={config.enablePhotos}
                           onChange={(e) => setConfig({...config, enablePhotos: e.target.checked})}
                           className="w-5 h-5 accent-neon-blue"
                        />
                        <div>
                           <div className="text-white font-bold text-sm">Enable Visual Selfies</div>
                           <div className="text-xs text-gray-400">Allow them to generate photos of themselves based on context.</div>
                        </div>
                     </div>
                     <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
                        <input 
                           type="checkbox" 
                           checked={config.enableVoiceCalls}
                           onChange={(e) => setConfig({...config, enableVoiceCalls: e.target.checked})}
                           className="w-5 h-5 accent-neon-blue"
                        />
                        <div>
                           <div className="text-white font-bold text-sm">Enable Inbound Voice Calls</div>
                           <div className="text-xs text-gray-400">Allow them to call you spontaneously.</div>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* MODULE 7: PROVISIONING (Existing Step 5 logic moved to 7) */}
            {step === 7 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-[fadeIn_0.5s_ease-out]">
                
                {!provisionedNumber ? (
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div className="font-mono text-neon-blue text-lg animate-pulse">
                      {provisioningStatus}
                    </div>
                    <div className="font-mono text-xs text-gray-500 max-w-sm mx-auto">
                      Running Twilio Allocation Protocol...<br/>
                      Handshaking with Gemini Neural Core...
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-6 animate-[fadeIn_1s_ease-out]">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full border border-green-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                      <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    
                    <h3 className="text-3xl font-bold text-white">System Ready</h3>
                    
                    <div className="bg-black/40 p-6 rounded-2xl border border-white/10 max-w-sm mx-auto">
                      <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">Dedicated Private Line</div>
                      <div className="text-3xl font-mono text-neon-blue tracking-wider mb-2">{provisionedNumber}</div>
                      <div className="text-xs text-gray-400">Reserved for 15:00 minutes</div>
                    </div>

                    <p className="text-gray-400 max-w-md mx-auto">
                      {config.name} is online and waiting for your first text.
                    </p>

                    <button 
                      onClick={() => document.getElementById('pricing')?.scrollIntoView({behavior: 'smooth'})}
                      className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                      Activate Subscription
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* Navigation */}
            {step < 7 && (
              <div className="flex justify-between mt-12 pt-8 border-t border-white/10">
                <button 
                  onClick={handlePrev}
                  disabled={step === 1}
                  className={`px-6 py-2 rounded-full text-sm font-bold ${step === 1 ? 'opacity-0' : 'text-gray-400 hover:text-white'}`}
                >
                  Back
                </button>
                
                <button 
                  onClick={handleNext}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
                >
                  {step === 6 ? "Initialize System" : "Next Module"}
                </button>
              </div>
            )}

        </div>
      </div>
    </section>
  );
};

export default Builder;