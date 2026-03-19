import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CompanionReady: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-wellness-blue/10 to-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-wellness-teal/20 mb-6">
              <svg className="w-12 h-12 text-wellness-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Your MyParallel Companion is Ready!
            </h1>
            <p className="text-lg text-slate-600 mb-2">
              Welcome, {user?.email}
            </p>
            <p className="text-slate-500">
              Your personalized wellness companion is all set up and ready to support you.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="group p-6 rounded-xl border-2 border-wellness-blue bg-white hover:bg-wellness-blue hover:text-white transition-all text-left"
            >
              <div className="text-3xl mb-3">💻</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-white">Web Companion</h3>
              <p className="text-slate-600 group-hover:text-white/90">
                Access your companion from any browser
              </p>
            </button>

            <button
              onClick={() => {
                // For PWA, this would open the app
                // For now, navigate to web app
                navigate('/dashboard');
              }}
              className="group p-6 rounded-xl border-2 border-wellness-teal bg-white hover:bg-wellness-teal hover:text-white transition-all text-left"
            >
              <div className="text-3xl mb-3">📱</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-white">Mobile Companion</h3>
              <p className="text-slate-600 group-hover:text-white/90">
                Install as PWA for mobile access
              </p>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-4">
              Your companion includes:
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-wellness-teal" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>AI Chat</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-wellness-teal" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Voice & Personality</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-wellness-teal" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Medication Reminders</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-wellness-teal" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Safety Monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanionReady;

