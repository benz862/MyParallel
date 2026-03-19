import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'base',
    name: 'Base Plan',
    description: 'Essential AI companion with core features',
    price: 19,
    priceId: 'base_monthly',
    features: [
      '1 Custom AI Companion',
      'Full text chat',
      'Personality + preference customization',
      'Light proactive messaging',
      'Basic emotional memory',
      'Safe-mode filters',
      'Access via app/web interface',
    ],
  },
];

const ProductSelection: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>('base');

  const handleContinue = () => {
    navigate('/checkout/add-ons', { state: { planId: selectedPlan } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-600">
            Select the perfect plan for your wellness journey
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`
                relative rounded-2xl border-2 p-8 cursor-pointer transition-all
                ${
                  selectedPlan === plan.id
                    ? 'border-wellness-blue bg-blue-50 shadow-lg'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
            >
              {selectedPlan === plan.id && (
                <div className="absolute top-4 right-4">
                  <div className="h-6 w-6 rounded-full bg-wellness-blue flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-slate-600">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                  <span className="text-slate-600">/month</span>
                </div>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-wellness-teal mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            Back
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedPlan}
            className="px-8 py-3 rounded-lg bg-wellness-blue text-white font-semibold hover:bg-wellness-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Add-Ons
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelection;


