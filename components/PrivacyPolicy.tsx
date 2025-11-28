
import React from 'react';

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900">Privacy Policy</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto text-sm text-slate-600 space-y-6 leading-relaxed">
          
          <section>
            <h3 className="text-slate-900 font-bold mb-2">1. Introduction</h3>
            <p>Parallel Intelligence Inc. ("we," "our," or "us") respects your privacy. This Privacy Policy describes how we collect, use, and protect your personal information when you use our AI companion services.</p>
          </section>

          <section className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <h3 className="text-blue-900 font-bold mb-2">2. SMS & Mobile Information (Important)</h3>
            <p className="font-medium text-blue-800">
              No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. All other categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
            </p>
            <p className="mt-2">
              We only use your phone number to provide the AI companion service you explicitly requested. We do not sell, rent, or trade your phone number to data brokers or marketing agencies.
            </p>
          </section>

          <section>
            <h3 className="text-slate-900 font-bold mb-2">3. Information We Collect</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Phone Number: To facilitate SMS and voice interactions.</li>
              <li>Conversation History: To provide context-aware AI responses.</li>
              <li>Payment Information: Processed securely via Stripe; we do not store full credit card numbers.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-slate-900 font-bold mb-2">4. How We Use Your Information</h3>
            <p>We use your data solely to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Deliver the AI companion service.</li>
              <li>Maintain memory continuity in your conversations.</li>
              <li>Improve the emotional intelligence of our models.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-slate-900 font-bold mb-2">5. Data Security</h3>
            <p>We implement enterprise-grade encryption (AES-256) to protect your conversation history and personal details.</p>
          </section>

          <section>
            <h3 className="text-slate-900 font-bold mb-2">6. Contact Us</h3>
            <p>If you have questions about this policy, please contact support at privacy@myparallel.chat.</p>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;
