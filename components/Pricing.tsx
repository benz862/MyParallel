import React, { useState } from "react";
import { api } from "../utils/api";
import { useNavigate } from "react-router-dom";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  billingLabel: string;
  features: string[];
  highlighted: boolean;
  ctaLabel: string;
  stripePriceId?: string;
  patientCapacity?: number | null;
  caregiverSeatLimit?: number | null;
}

const COMMON_FEATURES = [
  "1 caregiver account",
  "1 patient profile",
  "core dashboard",
  "medication / appointment / notes / document tracking",
  "basic reminders",
  "standard conversation history",
  "secure patient record management"
];

const pricingPlans: PricingPlan[] = [
  {
    id: 'solo-care',
    name: 'Solo Care',
    description: 'For caregivers supporting one loved one.',
    priceMonthly: 24,
    billingLabel: '/month',
    features: [...COMMON_FEATURES],
    highlighted: false,
    ctaLabel: 'Choose Solo Care',
    stripePriceId: 'solo_care'
  },
  {
    id: 'family-care',
    name: 'Family Care',
    description: 'For households managing care for multiple family members.',
    priceMonthly: 44,
    billingLabel: '/month',
    features: [...COMMON_FEATURES].map(f => f.replace('1 patient profile', 'Up to 3 patient profiles')),
    highlighted: true,
    ctaLabel: 'Choose Family Care',
    stripePriceId: 'family_care'
  },
  {
    id: 'extended-care',
    name: 'Extended Care',
    description: 'For more active caregivers handling a broader circle of support.',
    priceMonthly: 64,
    billingLabel: '/month',
    features: [...COMMON_FEATURES].map(f => f.replace('1 patient profile', 'Up to 5 patient profiles')),
    highlighted: false,
    ctaLabel: 'Choose Extended Care',
    stripePriceId: 'extended_care'
  },
  {
    id: 'care-network',
    name: 'Care Network',
    description: 'For advanced caregivers, coordinators, or small care teams.',
    priceMonthly: 99,
    billingLabel: '/month',
    features: [...COMMON_FEATURES].map(f => f.replace('1 patient profile', 'Up to 10 patient profiles')),
    highlighted: false,
    ctaLabel: 'Choose Care Network',
    stripePriceId: 'care_network'
  }
];

const PricingFeatureList: React.FC<{ features: string[] }> = ({ features }) => (
  <ul className="space-y-4 my-8 flex-1">
    {features.map((feature, idx) => (
      <li key={idx} className="flex items-start gap-3 text-slate-700 text-sm">
        <svg className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="leading-tight">{feature}</span>
      </li>
    ))}
  </ul>
);

const PricingCard: React.FC<{ plan: PricingPlan; onSelect: (plan: PricingPlan) => void; isProcessing: boolean }> = ({ plan, onSelect, isProcessing }) => {
  return (
    <div className={`relative flex flex-col bg-white rounded-3xl p-8 transition-transform duration-300 ${plan.highlighted ? 'border-2 border-sky-600 shadow-xl lg:scale-105 z-10' : 'border border-slate-200 shadow-sm hover:shadow-md'}`}>
      {plan.highlighted && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <span className="bg-sky-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
            Most Popular
          </span>
        </div>
      )}
      <div className="mb-2">
        <h3 className="text-2xl font-bold text-slate-800">{plan.name}</h3>
      </div>
      <p className="text-sm text-slate-500 min-h-[40px] leading-relaxed mb-6">{plan.description}</p>
      
      <div className="flex items-baseline gap-1 mb-2 border-b border-slate-100 pb-6">
        <span className="text-4xl font-extrabold text-slate-900">${plan.priceMonthly}</span>
        <span className="text-slate-500 font-medium">{plan.billingLabel}</span>
      </div>

      <PricingFeatureList features={plan.features} />

      <button
        onClick={() => onSelect(plan)}
        disabled={isProcessing}
        className={`w-full py-4 px-6 rounded-xl font-bold text-sm transition-all focus:outline-none focus:ring-4 ${
          plan.highlighted
            ? "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-600/30 shadow-md"
            : "bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100 focus:ring-slate-200"
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isProcessing ? "Processing..." : plan.ctaLabel}
      </button>
    </div>
  );
};

const Pricing: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectPlan = async (plan: PricingPlan) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const response = await api.post("/api/create-checkout-session", {
        planId: plan.stripePriceId,
        metadata: {
          plan_id: plan.id,
          max_patients: plan.name === 'Solo Care' ? 1 : (plan.name === 'Family Care' ? 3 : (plan.name === 'Extended Care' ? 5 : 10))
        },
      });

      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No checkout URL returned from server.');
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      setErrorMsg("We couldn't start checkout right now. Please try again in a moment.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-[#f8fafc] border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-6">
            Simple pricing for caregivers
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
            Choose the plan that fits the level of support you provide. Upgrade any time as your caregiving needs grow.
          </p>
        </div>

        {errorMsg && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center font-medium">
             {errorMsg}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 xl:gap-6 relative isolate">
          {pricingPlans.map((plan) => (
            <PricingCard 
               key={plan.id} 
               plan={plan} 
               onSelect={handleSelectPlan} 
               isProcessing={isProcessing} 
            />
          ))}
        </div>

        {/* Trust Section */}
        <div className="mt-20 text-center max-w-2xl mx-auto">
           <h3 className="text-2xl font-bold text-slate-800 mb-4">Designed for real caregiving needs</h3>
           <p className="text-slate-600 mb-8 leading-relaxed">
              Track appointments, medications, notes, reminders, and important documents in one secure place. Start with the level of support you need today and upgrade as care responsibilities grow.
           </p>
           
           <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-2">
                 <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 Upgrade any time
              </span>
              <span className="flex items-center gap-2">
                 <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 20 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                 Secure billing
              </span>
              <span className="flex items-center gap-2">
                 <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 Cancel any time
              </span>
           </div>
        </div>

      </div>
    </section>
  );
};

export default Pricing;
