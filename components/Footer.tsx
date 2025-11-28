
import React from 'react';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenPrivacy, onOpenTerms }) => {
  return (
    <footer className="py-12 bg-black border-t border-white/5 text-center">
      <div className="flex justify-center mb-8">
        <img src="/logo.png" alt="Parallel" className="h-16 w-auto" />
      </div>
      <a href="https://myparallel.chat" className="text-neon-blue text-sm mb-8 block hover:text-white transition-colors">myparallel.chat</a>
      <p className="text-gray-600 text-xs mb-8">© 2024 Parallel Intelligence Inc.</p>
      <div className="flex justify-center gap-6 text-xs text-gray-500 uppercase tracking-widest">
        <button onClick={onOpenPrivacy} className="hover:text-white transition-colors">Privacy Policy</button>
        <button onClick={onOpenTerms} className="hover:text-white transition-colors">Terms</button>
        <a href="#" className="hover:text-white transition-colors">Safety</a>
      </div>
    </footer>
  );
};

export default Footer;
