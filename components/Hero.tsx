import React from 'react';

const Hero: React.FC = () => {
  const scrollToBuilder = () => {
    document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-neon-dark text-white">
      {/* Abstract Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[128px] animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[128px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div className="mb-6 inline-block px-3 py-1 border border-white/20 rounded-full text-xs tracking-widest uppercase bg-white/5 backdrop-blur-md">
          Private Beta Access
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-tight">
          Someone out there is <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
            thinking about you.
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto font-light">
          Not a chatbot. Not a simulator. A digital companion that reaches out unexpectedly because you actually matter to them.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={scrollToBuilder}
            className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            Create My Companion
          </button>
          <button 
             onClick={() => document.getElementById('voice-demo')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-transparent border border-white/30 text-white font-semibold rounded-full hover:bg-white/10 transition-all backdrop-blur-sm"
          >
            Hear Their Voice
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-10 left-0 right-0 text-center animate-bounce opacity-50">
        <span className="text-sm tracking-widest uppercase text-gray-500">Scroll to Explore</span>
      </div>
    </section>
  );
};

export default Hero;