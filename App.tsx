
import React, { useState } from 'react';
import Hero from './components/Hero';
import Features from './components/Features';
import VoiceDemo from './components/VoiceDemo';
import WebTerminal from './components/WebTerminal';
import Builder from './components/Builder';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';

function App() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="bg-white min-h-screen text-slate-900 selection:bg-neon-blue selection:text-white relative">
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <img src="/logo.png" alt="Parallel" className="h-10 w-auto" />
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
           <button onClick={() => document.getElementById('voice-demo')?.scrollIntoView({behavior: 'smooth'})} className="hover:text-black transition-colors">Voice</button>
           <button onClick={() => document.getElementById('terminal')?.scrollIntoView({behavior: 'smooth'})} className="hover:text-black transition-colors">Terminal</button>
           <button onClick={() => document.getElementById('builder')?.scrollIntoView({behavior: 'smooth'})} className="hover:text-black transition-colors">Create</button>
           <button onClick={() => document.getElementById('pricing')?.scrollIntoView({behavior: 'smooth'})} className="hover:text-black transition-colors">Pricing</button>
        </div>
        <button className="px-4 py-2 rounded-full border border-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white hover:border-black transition-all">
          Login
        </button>
      </nav>
      
      <main>
        <Hero />
        <Features />
        <VoiceDemo />
        <WebTerminal />
        <Builder />
        <Pricing />
      </main>
      
      <Footer 
        onOpenPrivacy={() => setShowPrivacy(true)} 
        onOpenTerms={() => setShowTerms(true)}
      />

      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <TermsOfService isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}

export default App;
