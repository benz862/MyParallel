
import React from 'react';

interface TermsProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfService: React.FC<TermsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900">Terms of Service</h2>
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
            <h3 className="text-slate-900 font-bold mb-2">1. Acceptance of Terms</h3>
            <p>By creating an account, subscribing to, or using Parallel Intelligence Inc. ("Parallel"), you agree to be bound by these Terms of Service. If you do not agree, you must not use our services.</p>
          </section>

          <section className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
            <h3 className="text-amber-900 font-bold mb-2">2. Nature of Service (Disclaimer)</h3>
            <p className="font-medium text-amber-800">
              Parallel is an Artificial Intelligence system provided for entertainment and companionship purposes only.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-amber-900/80">
              <li><strong>Not a Human:</strong> You understand you are interacting with software, not a real person.</li>
              <li><strong>Not Medical Advice:</strong> Parallel is NOT a substitute for professional therapy, medical care, or crisis intervention. If you are in danger, contact emergency services immediately.</li>
              <li><strong>No Real-World Action:</strong> Parallel cannot perform real-world tasks (like calling 911 or buying groceries).</li>
            </ul>
          </section>

          <section>
            <h3 className="text-slate-900 font-bold mb-2">3. User Conduct</h3>
            <p>You agree not to use the service to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Generate illegal, abusive, or threatening content.</li>
              <li>Attempt to jailbreak or manipulate the AI's core safety protocols.</li>
              <li>Harass or impersonate others.</li>
            </ul>
            <p className="mt-2">We reserve the right to terminate accounts that violate these safety standards without refund.</p>
          </section>

          <section>
            <h3 className="text-slate-900 font-bold mb-2">4. Subscription & Billing</h3>
            <p>Subscriptions are billed on a recurring monthly or annual basis via Stripe. You may cancel at any time. Cancellations will stop future billing, but no refunds will be issued for partial months.</p>
          </section>

          <section>
            <h3 className="text-slate-900 font-bold mb-2">5. Messaging & Data Rates</h3>
            <p>Standard message and data rates may apply for SMS interactions depending on your mobile carrier plan. You are responsible for any carrier charges incurred.</p>
          </section>

          <section>
            <h3 className="text-slate-900 font-bold mb-2">6. Limitation of Liability</h3>
            <p>Parallel Intelligence Inc. is not liable for any emotional distress, reliance on AI advice, or data loss resulting from the use of our service. You use Parallel at your own risk.</p>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            I Agree
          </button>
        </div>

      </div>
    </div>
  );
};

export default TermsOfService;
