import React from 'react';

interface TalkingCircleProps {
  amplitude: number; // 0-1
  aiSpeaking: boolean;
  size?: number;
}

const TalkingCircle: React.FC<TalkingCircleProps> = ({ 
  amplitude, 
  aiSpeaking,
  size = 120 
}) => {
  // Calculate size based on amplitude
  const baseSize = size;
  const maxSize = size * 1.8;
  const currentSize = baseSize + (amplitude * (maxSize - baseSize));

  return (
    <div className="flex items-center justify-center relative">
      <div
        className={`
          rounded-full
          bg-gradient-to-br from-wellness-blue via-wellness-teal to-wellness-violet
          transition-all duration-75 ease-out
          relative
          ${aiSpeaking ? 'animate-pulse' : ''}
          shadow-lg
        `}
        style={{
          width: `${currentSize}px`,
          height: `${currentSize}px`,
          boxShadow: `0 0 ${30 + amplitude * 50}px rgba(14, 165, 233, ${0.4 + amplitude * 0.3})`,
          opacity: 0.9 + amplitude * 0.1,
          animation: aiSpeaking 
            ? 'pulse 0.2s infinite alternate' 
            : 'slowpulse 1.6s infinite alternate',
        }}
      >
        {/* Inner glow */}
        <div
          className="absolute inset-0 rounded-full bg-white/30"
          style={{
            transform: `scale(${0.3 + amplitude * 0.2})`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      </div>
      
    </div>
  );
};

export default TalkingCircle;

