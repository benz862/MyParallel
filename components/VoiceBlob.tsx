import React, { useEffect, useRef, useState } from 'react';

interface VoiceBlobProps {
  isSpeaking: boolean;
  audioLevel?: number; // 0-1, audio amplitude
  size?: number;
}

const VoiceBlob: React.FC<VoiceBlobProps> = ({ 
  isSpeaking, 
  audioLevel = 0, 
  size = 120 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationFrameRef = useRef<number>();
  const [morphValue, setMorphValue] = useState(0);

  useEffect(() => {
    if (!isSpeaking) {
      setMorphValue(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Create smooth, organic morphing animation
      // Multiple sine waves for complex, liquid-like motion
      const wave1 = Math.sin(elapsed / 800) * 0.25;
      const wave2 = Math.cos(elapsed / 1200) * 0.15;
      const wave3 = Math.sin(elapsed / 600) * 0.1;
      
      // Audio level adds dynamic response
      const audioMorph = audioLevel * 0.4;
      
      // Combine all waves for organic movement
      const combinedMorph = wave1 + wave2 + wave3 + audioMorph;
      
      setMorphValue(combinedMorph);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpeaking, audioLevel]);

  // Generate blob path with morphing - creates smooth liquid-like shape
  const generateBlobPath = (morph: number, timeOffset: number = 0): string => {
    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * 0.35;
    
    // More points = smoother, more liquid-like appearance
    const points = 12;
    const path: string[] = [];
    
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const time = timeOffset + angle;
      
      // Create smooth, organic variations
      const wave1 = Math.sin(time * 2) * 0.15;
      const wave2 = Math.cos(time * 3) * 0.1;
      const wave3 = Math.sin(time * 5 + morph) * 0.08;
      
      // Combine waves with morph value for dynamic animation
      const variation = morph * 0.4 + wave1 + wave2 + wave3;
      const r = baseRadius * (1 + variation);
      
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      
      if (i === 0) {
        path.push(`M ${x} ${y}`);
      } else {
        // Smooth cubic bezier for liquid flow
        const prevAngle = ((i - 1) / points) * Math.PI * 2;
        const prevTime = timeOffset + prevAngle;
        const prevWave1 = Math.sin(prevTime * 2) * 0.15;
        const prevWave2 = Math.cos(prevTime * 3) * 0.1;
        const prevVariation = morph * 0.4 + prevWave1 + prevWave2;
        const prevR = baseRadius * (1 + prevVariation);
        
        // Control points for smooth curves
        const cp1x = centerX + Math.cos(prevAngle) * prevR * 1.3;
        const cp1y = centerY + Math.sin(prevAngle) * prevR * 1.3;
        const cp2x = centerX + Math.cos(angle) * r * 1.3;
        const cp2y = centerY + Math.sin(angle) * r * 1.3;
        
        path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`);
      }
    }
    
    path.push('Z');
    return path.join(' ');
  };

  const blobPath = generateBlobPath(morphValue);

  return (
    <div className="flex items-center justify-center">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transition-all duration-300"
      >
        <defs>
          <linearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
          </linearGradient>
          <filter id="blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>
        
        {/* Animated blob - liquid-like morphing */}
        <path
          d={blobPath}
          fill="url(#blobGradient)"
          opacity={isSpeaking ? 0.95 : 0.5}
          filter="url(#blur)"
          style={{
            transition: 'opacity 0.4s ease',
            transformOrigin: `${size / 2}px ${size / 2}px`,
          }}
        />
        
        {/* Inner glow - pulsing effect */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size * (0.2 + morphValue * 0.1)}
          fill="rgba(255, 255, 255, 0.4)"
          opacity={isSpeaking ? 0.7 : 0.2}
          style={{
            transition: 'opacity 0.4s ease',
          }}
        />
        
        {/* Outer glow ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size * (0.45 + morphValue * 0.05)}
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="2"
          opacity={isSpeaking ? 0.5 : 0}
          style={{
            transition: 'opacity 0.4s ease',
          }}
        />
      </svg>
    </div>
  );
};

export default VoiceBlob;

