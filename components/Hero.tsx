import React, { useState } from "react";
import VoiceDemo from "./VoiceDemo";

const Hero: React.FC = () => {
  const [showVoiceDemo, setShowVoiceDemo] = useState(false);

  const scrollToBuilder = () => {
    document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToVoiceDemo = () => {
    document.getElementById("voice-demo")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="top"
      className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-wellness-cream text-wellness-slate pt-24 pb-16"
    >
      {/* Soft Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-wellness-blue/10 rounded-full blur-[100px] animate-breathe"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-wellness-teal/10 rounded-full blur-[100px] animate-breathe" style={{ animationDelay: "3s" }}></div>
        <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[40%] h-[40%] bg-wellness-violet/8 rounded-full blur-[120px] animate-breathe" style={{ animationDelay: "1.5s" }}></div>
      </div>

      <div className="relative z-20 text-center px-6 max-w-5xl mx-auto flex flex-col items-center">
        {/* Badge */}
        <div className="mb-8 animate-fadeIn">
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-wellness-blue/20 text-wellness-blue text-base font-semibold tracking-wide shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-wellness-teal"></span>
            Empower the ones you love with proactive care.
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 text-slate-800 drop-shadow-sm animate-fadeIn leading-tight">
          Proactive care that{" "}
          <br className="hidden sm:block" />
          <span className="text-wellness-blue">scales with you.</span>
        </h1>

        {/* Description */}
        <p className="text-xl sm:text-2xl md:text-3xl text-slate-600 mb-12 max-w-3xl mx-auto font-normal leading-relaxed animate-fadeIn" style={{ animationDelay: "0.2s" }}>
          The ultimate Caregiver Command Center. Deploy intelligent Voice AI check-ins, manage patient rosters, and securely monitor live transcriptions from anywhere.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center mb-16 animate-fadeIn" style={{ animationDelay: "0.4s" }}>
          <button
            onClick={scrollToBuilder}
            className="px-10 py-5 bg-wellness-blue text-white rounded-full font-bold text-lg sm:text-xl hover:bg-wellness-blue/90 hover:scale-105 active:scale-100 transition-all shadow-lg shadow-wellness-blue/20 focus:outline-none focus:ring-4 focus:ring-wellness-blue/30"
          >
            Start Managing Care
          </button>

          <button
            onClick={() => setShowVoiceDemo(!showVoiceDemo)}
            className="px-10 py-5 bg-white text-slate-700 font-bold text-lg sm:text-xl rounded-full border-2 border-slate-200 hover:border-wellness-teal hover:text-wellness-teal transition-all shadow-sm focus:outline-none focus:ring-4 focus:ring-wellness-teal/20"
          >
            {showVoiceDemo ? 'Hide Voice Demo' : 'Try Caregiver Voice Chat'}
          </button>
        </div>

        {/* Voice Demo */}
        {showVoiceDemo && (
          <div className="w-full mb-12 animate-fadeIn">
            <VoiceDemo />
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap justify-center gap-8 sm:gap-12 text-slate-500 font-medium text-base sm:text-lg animate-fadeIn" style={{ animationDelay: "0.6s" }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <span>Private & Secure</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💙</span>
            <span>Non-Judgmental</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🕰️</span>
            <span>24/7 Availability</span>
          </div>
        </div>

        {/* Who It's For */}
        <div className="mt-20 w-full max-w-4xl animate-fadeIn" style={{ animationDelay: "0.8s" }}>
          <p className="text-lg sm:text-xl text-slate-500 mb-8 font-medium">
            Designed for:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="px-6 py-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">👥</div>
              <div className="text-base font-semibold text-slate-800">People Living Alone</div>
            </div>
            <div className="px-6 py-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">👴</div>
              <div className="text-base font-semibold text-slate-800">Elderly Adults</div>
            </div>
            <div className="px-6 py-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">🏥</div>
              <div className="text-base font-semibold text-slate-800">Recovering Patients</div>
            </div>
            <div className="px-6 py-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">🤝</div>
              <div className="text-base font-semibold text-slate-800">Caregivers</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
