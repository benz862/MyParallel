import React from "react";
import { Link } from "react-router-dom";

interface FooterProps {
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenPrivacy, onOpenTerms }) => {
  return (
    <footer className="mt-14 border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

        {/* Brand + Mission */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <img 
              src="/images/Logo_MyParallel.png" 
              alt="MyParallel" 
              style={{ height: '80px' }}
            />
            <span className="font-semibold text-slate-800 tracking-tight">
              MyParallel
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed max-w-xs">
            A supportive, non-judgmental wellness companion for people who live
            alone, seniors, and anyone who could use gentle daily structure.
          </p>

          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} MyParallel. All rights reserved.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-col sm:flex-row gap-4 text-sm text-slate-600">
          <Link
            to="/privacy"
            className="hover:text-sky-700 transition-colors"
          >
            Privacy Policy
          </Link>

          <Link
            to="/terms"
            className="hover:text-sky-700 transition-colors"
          >
            Terms of Service
          </Link>

          <a
            href="#top"
            className="hover:text-sky-700 transition-colors"
          >
            Back to top
          </a>
        </div>

      </div>
    </footer>
  );
};

export default Footer;