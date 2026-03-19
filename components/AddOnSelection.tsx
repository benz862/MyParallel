import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';

interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId: string;
  icon: string;
}

const ADD_ONS: AddOn[] = [
  {
    id: 'deep_memory',
    name: 'Deep Emotional Memory',
    description: 'Remembers emotional patterns, tracks preferences & life details',
    price: 6,
    priceId: 'deep_memory',
    icon: '🧠',
  },
  {
    id: 'text_outreach',
    name: 'Proactive Text Outreach',
    description: 'Random check-ins and "thinking about you" messages',
    price: 5,
    priceId: 'text_outreach',
    icon: '💬',
  },
  {
    id: 'email_outreach',
    name: 'Email Outreach',
    description: 'Personalized email notes and morning messages',
    price: 3,
    priceId: 'email_outreach',
    icon: '📧',
  },
  {
    id: 'phone_call',
    name: 'Phone Call Outreach',
    description: 'AI voice calls and voicemail messages',
    price: 12,
    priceId: 'phone_call_outreach',
    icon: '📞',
  },
  {
    id: 'voice_ai',
    name: 'Full Voice AI',
    description: 'Real-time conversational voice (talk + listen)',
    price: 10,
    priceId: 'voice_ai',
    icon: '🎤',
  },
  {
    id: 'voice_clone',
    name: 'Custom Voice Clone',
    description: 'Upload audio to create a unique custom voice',
    price: 9,
    priceId: 'voice_clone',
    icon: '🎭',
  },
  {
    id: 'multi_companion',
    name: 'Multi-Companion Slots',
    description: 'Create multiple companions with different personalities',
    price: 7,
    priceId: 'multi_companion',
    icon: '👥',
  },
  {
    id: 'extended_memory',
    name: 'Extended Memory Retention',
    description: 'Stores months/years of conversations and life events',
    price: 4,
    priceId: 'extended_memory',
    icon: '💾',
  },
];

const AddOnSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const planId = location.state?.planId || 'base';
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [basePrice] = useState(19);

  const toggleAddOn = (id: string) => {
    const newSet = new Set(selectedAddOns);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedAddOns(newSet);
  };

  const calculateTotal = () => {
    const addOnTotal = Array.from(selectedAddOns).reduce((sum, id) => {
      const addOn = ADD_ONS.find(a => a.id === id);
      return sum + (addOn?.price || 0);
    }, 0);
    return basePrice + addOnTotal;
  };

  const handleCheckout = async () => {
    try {
      const addOnPriceIds = Array.from(selectedAddOns).map(id => {
        const addOn = ADD_ONS.find(a => a.id === id);
        return addOn?.priceId;
      }).filter(Boolean);

      const response = await api.post('/api/create-checkout-session', {
        planId,
        addOns: addOnPriceIds,
        metadata: {
          plan_id: planId,
          add_ons: addOnPriceIds.join(','),
        },
      });

      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert('Failed to create checkout session. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Customize Your Experience
          </h1>
          <p className="text-lg text-slate-600">
            Add optional features to enhance your companion
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {ADD_ONS.map((addOn) => (
            <div
              key={addOn.id}
              onClick={() => toggleAddOn(addOn.id)}
              className={`
                relative rounded-xl border-2 p-6 cursor-pointer transition-all
                ${
                  selectedAddOns.has(addOn.id)
                    ? 'border-wellness-blue bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
            >
              {selectedAddOns.has(addOn.id) && (
                <div className="absolute top-3 right-3">
                  <div className="h-5 w-5 rounded-full bg-wellness-blue flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              <div className="text-3xl mb-3">{addOn.icon}</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{addOn.name}</h3>
              <p className="text-sm text-slate-600 mb-4">{addOn.description}</p>
              <div className="text-xl font-bold text-wellness-blue">+${addOn.price}/mo</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-600">Base Plan</p>
              <p className="text-2xl font-bold text-slate-900">${basePrice}/mo</p>
            </div>
            {selectedAddOns.size > 0 && (
              <div className="text-right">
                <p className="text-slate-600">Add-Ons ({selectedAddOns.size})</p>
                <p className="text-2xl font-bold text-wellness-teal">
                  +${calculateTotal() - basePrice}/mo
                </p>
              </div>
            )}
            <div className="text-right border-l-2 border-slate-200 pl-6">
              <p className="text-slate-600">Total</p>
              <p className="text-3xl font-bold text-wellness-blue">${calculateTotal()}/mo</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            Back
          </button>
          <button
            onClick={handleCheckout}
            className="px-8 py-3 rounded-lg bg-wellness-blue text-white font-semibold hover:bg-wellness-blue/90"
          >
            Continue to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddOnSelection;


