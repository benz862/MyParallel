import React from "react";

const Builder: React.FC = () => {
  return (
    <section
      id="builder"
      className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid gap-16 lg:grid-cols-[1.1fr,1fr] items-center">
        
        {/* LEFT — TEXT INTRO */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            A comprehensive dashboard  
            <span className="text-sky-600 block mt-1">for proactive caregivers.</span>
          </h2>

          <p className="mt-4 text-lg text-slate-600 max-w-xl leading-relaxed">
            MyParallel replaces scattered notes and disconnected check-ins. Centralize your patient roster, let our Voice AI handle gentle wellness conversations, and securely review the transcriptions all in one secure command center.
          </p>

          {/* STEPS */}
          <ol className="mt-12 space-y-8">
            {/* STEP 1 */}
            <li className="flex gap-5">
              <span className="h-10 w-10 shrink-0 shadow-sm rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-extrabold border border-sky-200">
                1
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Build Your Patient Roster
                </h3>
                <p className="text-slate-600 mt-1.5 leading-relaxed">
                  Easily add loved ones or patients individually, or drag-and-drop massive CSV matrices for bulk facility onboarding.
                </p>
              </div>
            </li>

            {/* STEP 2 */}
            <li className="flex gap-5">
              <span className="h-10 w-10 shrink-0 shadow-sm rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-extrabold border border-sky-200">
                2
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Bind Dynamic Health Context
                </h3>
                <p className="text-slate-600 mt-1.5 leading-relaxed">
                  Securely attach medications, known conditions, emergency contacts, and private wellness notes natively to each patient.
                </p>
              </div>
            </li>

            {/* STEP 3 */}
            <li className="flex gap-5">
              <span className="h-10 w-10 shrink-0 shadow-sm rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-extrabold border border-sky-200">
                3
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Engage the Voice AI Companion
                </h3>
                <p className="text-slate-600 mt-1.5 leading-relaxed">
                  Patients can interact with a warm, conversational AI via phone or tablet. The AI explicitly remembers their medical context and medications natively.
                </p>
              </div>
            </li>

            {/* STEP 4 */}
            <li className="flex gap-5">
              <span className="h-10 w-10 shrink-0 shadow-sm rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-extrabold border border-sky-200">
                4
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Review the Live Transcription Journal
                </h3>
                <p className="text-slate-600 mt-1.5 leading-relaxed">
                  Every interaction is actively transcribed line-by-line onto your Dashboard, allowing you to seamlessly monitor mental well-being and medication compliance offline.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* RIGHT — MOCK DASHBOARD PREVIEW */}
        <div className="w-full relative lg:ml-auto group">
          {/* Decorative background glow */}
          <div className="absolute inset-0 bg-sky-400/20 rounded-3xl blur-3xl transform group-hover:bg-sky-400/30 transition-all duration-500"></div>
          
          <div className="relative rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[520px]">
             {/* Fake Mac Header */}
             <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                 <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                 </div>
                 <div className="mx-auto text-xs font-semibold text-slate-400">Caregiver Command Center</div>
             </div>
             
             {/* Fake Body */}
             <div className="flex flex-1 overflow-hidden">
                {/* Mock Roster */}
                <div className="w-1/3 border-r border-slate-100 bg-slate-50 p-4 flex flex-col gap-3">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Roster</div>
                   <div className="bg-white border border-sky-200 border-l-4 border-l-sky-500 rounded-xl p-3 shadow-sm">
                      <div className="text-sm font-bold text-slate-800">Jane Doe</div>
                      <div className="text-[10px] text-slate-500 mt-1">📞 555-0192</div>
                   </div>
                   <div className="bg-white border border-slate-100 rounded-xl p-3 opacity-60">
                      <div className="text-sm font-bold text-slate-800">Arthur Smith</div>
                      <div className="text-[10px] text-slate-500 mt-1">📞 555-0844</div>
                   </div>
                   <div className="bg-white border border-slate-100 rounded-xl p-3 opacity-60">
                      <div className="text-sm font-bold text-slate-800">Maria Garcia</div>
                      <div className="text-[10px] text-slate-500 mt-1">📞 555-0113</div>
                   </div>
                </div>

                {/* Mock Journal */}
                <div className="w-2/3 bg-white p-5 flex flex-col">
                   <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4">
                      <div className="text-emerald-800 font-bold text-xs">Managing: Jane Doe</div>
                      <div className="text-[10px] text-emerald-600">Active Live Journal & AI Context</div>
                   </div>

                   <div className="flex-1 space-y-4">
                      <div className="flex flex-col items-start pb-4 border-b border-slate-50">
                         <div className="text-[10px] text-slate-400 mb-1">9:01 AM • PUCK (AI VOICE)</div>
                         <div className="bg-slate-100 text-slate-700 text-xs px-3 py-2 rounded-xl rounded-tl-none">
                            Good morning Jane! Did you remember to take your Lisinopril with breakfast?
                         </div>
                      </div>
                      <div className="flex flex-col items-end pb-4 border-b border-slate-50">
                         <div className="text-[10px] text-slate-400 mb-1">9:02 AM • JANE DOE</div>
                         <div className="bg-sky-600 text-white text-xs px-3 py-2 rounded-xl rounded-tr-none shadow-sm">
                            Oh thank you for reminding me! I'm grabbing it from the kitchen right now.
                         </div>
                      </div>
                      <div className="flex flex-col items-start">
                         <div className="text-[10px] text-slate-400 mb-1">9:02 AM • PUCK (AI VOICE)</div>
                         <div className="bg-slate-100 text-slate-700 text-xs px-3 py-2 rounded-xl rounded-tl-none">
                            Great! Drink plenty of water. Let me know if you need anything else!
                         </div>
                      </div>
                   </div>
                   
                   <div className="mt-4 pt-3 border-t border-slate-100">
                       <button className="w-full bg-slate-50 border-2 border-dashed border-slate-200 text-slate-500 text-xs font-bold py-2 rounded-xl">
                          ↓ Export Transcript CSV
                       </button>
                   </div>
                </div>
             </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Builder;