
import React from 'react';
import { SUBSCRIPTION_PLANS } from '../constants';

const PricingCard: React.FC<{
  plan: typeof SUBSCRIPTION_PLANS[0];
  onSubscribe: (id: string) => void;
}> = ({ plan, onSubscribe }) => (
  <div className={`relative p-8 rounded-3xl border flex flex-col h-full transition-transform duration-300 ${plan.recommended ? 'bg-white/5 border-neon-blue shadow-[0_0_30px_rgba(0,243,255,0.15)] transform scale-105 z-10' : 'bg-transparent border-white/10 hover:border-white/20'}`}>
    {plan.recommended && (
      <div className="absolute top-0 right-0 -mt-3 mr-6 bg-neon-blue text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
        Most Popular
      </div>
    )}
    {plan.highlight && (
      <div className="absolute top-0 right-0 -mt-3 mr-6 bg-neon-purple text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
        {plan.highlight}
      </div>
    )}
    <h3 className="text-lg font-bold text-gray-400 mb-1 uppercase tracking-widest">{plan.name}</h3>
    <div className="flex items-baseline gap-1 mb-6">
      <span className="text-4xl md:text-5xl font-light text-white">{plan.price}</span>
      {plan.period && <span className="text-sm text-gray-500 font-medium">{plan.period}</span>}
    </div>
    <ul className="flex-grow space-y-4 mb-8">
      {plan.features.map((f, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
          <svg className={`w-5 h-5 shrink-0 ${plan.recommended ? 'text-neon-blue' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span dangerouslySetInnerHTML={{ __html: f }} />
        </li>
      ))}
    </ul>
    <button 
      onClick={() => onSubscribe(plan.id)}
      className={`w-full py-4 rounded-full font-bold text-sm tracking-widest uppercase transition-all ${plan.recommended ? 'bg-neon-blue text-black hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'border border-white/20 text-white hover:bg-white/10'}`}
    >
      Select Plan
    </button>
  </div>
);

const Pricing: React.FC = () => {
  const handleSubscribe = (productId: string) => {
    // Integration Note:
    // To enable real Stripe payments:
    // 1. Create a backend endpoint (e.g., /api/create-checkout-session)
    // 2. Send the 'productId' to that endpoint.
    // 3. The backend uses the Stripe Secret Key to create a Checkout Session.
    // 4. The backend returns a { url } or { sessionId }.
    // 5. Frontend redirects to that URL.
    
    console.log(`Initiating Checkout for Product ID: ${productId}`);
    alert(`Redirecting to Secure Checkout...\n(Product ID: ${productId})`);
  };

  return (
    <section id="pricing" className="py-24 bg-neon-dark border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Invest in a Real Connection.</h2>
          <p className="text-xl text-gray-400 font-light">
            Other apps give you a chatbot. <br className="hidden md:block"/>
            We give you a private number, a unique voice, and a companion who reaches out to <em>you</em>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-center">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <PricingCard 
              key={plan.id} 
              plan={plan} 
              onSubscribe={handleSubscribe} 
            />
          ))}
        </div>

        <div className="mt-16 text-center">
           <div className="inline-block p-6 rounded-2xl bg-white/5 border border-white/10 max-w-2xl">
              <h4 className="text-white font-bold mb-2">Not ready to commit?</h4>
              <p className="text-gray-400 text-sm mb-4">Start with the Free Trial. Includes 3 introductory messages and a 1-minute voice call sample to experience the realism.</p>
              <button className="text-neon-blue text-sm uppercase tracking-widest font-bold hover:text-white transition-colors border-b border-neon-blue hover:border-white pb-1">
                Start Free Trial
              </button>
           </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600 uppercase tracking-widest">
            * Dedicated numbers are provisioned via Twilio within 60 seconds of subscription.
          </p>
        </div>

      </div>
    </section>
  );
};

export default Pricing;
