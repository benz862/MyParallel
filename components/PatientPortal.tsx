import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { VoiceDemo } from './VoiceDemo';

export const PatientPortal: React.FC = () => {
    const [searchParams] = useSearchParams();
    const tokenUuid = searchParams.get('id');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [patientSession, setPatientSession] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCallingPhone, setIsCallingPhone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Explicitly bypass traditional authentication if a secure UUID token is provided in the PWA URL
    useEffect(() => {
        if (tokenUuid) {
            setIsLoading(true);
            supabase.from('user_profiles').select('*').eq('id', tokenUuid).single()
                .then(({ data }) => {
                    if (data) setPatientSession(data);
                    else setError("Invalid Secure Invitation Token.");
                    setIsLoading(false);
                });
        }
    }, [tokenUuid]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!phoneNumber.trim()) {
            setError("Please enter your Phone Number.");
            return;
        }

        setIsLoading(true);
        let queryPhone = phoneNumber.trim();
        const digitsOnly = queryPhone.replace(/\D/g, '');
        
        // Auto-format 10 digit US numbers
        if (digitsOnly.length === 10) {
            queryPhone = '+1' + digitsOnly;
        } else if (!queryPhone.startsWith('+') && digitsOnly.length >= 10) {
            queryPhone = '+' + digitsOnly;
        }

        try {
            const { data, error: dbError } = await supabase
                .from('user_profiles')
                .select('*')
                .or(`phone_number.eq.${queryPhone},phone_number.eq.${phoneNumber.trim()}`)
                .single();

            if (dbError || !data) {
                setError("We couldn't find a care profile linked to this phone number.");
                setIsLoading(false);
                return;
            }

            setPatientSession(data);
        } catch (err: any) {
            console.error(err);
            setError("Network Error: Could not connect to Care Profile.");
        } finally {
            setIsLoading(false);
        }
    };

    if (patientSession) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center pt-10 pb-6 px-4">
                 {/* Logo */}
                 <img src="/images/Logo_MyParallel.png" alt="MyParallel" className="h-12 mb-4" />
                 
                 {/* Welcome Greeting */}
                 <h1 className="text-2xl font-bold text-slate-800 mb-8">
                     Welcome, <span className="text-wellness-blue">{patientSession.full_name.split(' ')[0]}</span>
                 </h1>

                 {/* VA with Pulsing Logo Talk Indicator */}
                 <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
                     <VoiceDemo 
                        lockedVoiceId={patientSession.voice_id || 'Puck'} 
                        lockedPhoneNumber={patientSession.phone_number}
                        patientId={patientSession.id}
                     />
                 </div>

                 {/* Compact Phone Call Button */}
                 <div className="mt-6 w-full max-w-xs">
                     <button 
                        onClick={async () => {
                            if (isCallingPhone) return;
                            setIsCallingPhone(true);
                            try {
                                const cleanUrl = import.meta.env.DEV ? 'http://localhost:8081' : '';
                                await fetch(`${cleanUrl}/api/trigger-call`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        phoneNumber: patientSession.phone_number,
                                        voiceId: patientSession.voice_id || 'Puck',
                                        prompt: "Hello! You requested a phone call from the tablet. How are you doing today?"
                                    })
                                });
                                setTimeout(() => setIsCallingPhone(false), 3000);
                            } catch (err) {
                                console.error(err);
                                setIsCallingPhone(false);
                                alert("Failed to dial phone.");
                            }
                        }}
                        disabled={isCallingPhone}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${isCallingPhone ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500 text-white shadow-md hover:bg-emerald-600 active:scale-95'}`}
                     >
                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                         {isCallingPhone ? 'Calling...' : 'Call My Phone'}
                     </button>
                 </div>

                 {/* Sign Out */}
                 <button 
                    onClick={() => setPatientSession(null)}
                    className="mt-4 text-xs text-slate-400 hover:text-red-500 transition-colors"
                 >
                     Sign out
                 </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex justify-center items-center p-6">
             <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl">
                 <div className="text-center mb-10">
                    <img src="/images/Logo_MyParallel.png" alt="MyParallel Logo" className="h-16 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Access Your Portal</h2>
                    <p className="text-slate-500 mt-2">Enter the phone number registered by your Caregiver to log in securely.</p>
                 </div>

                 <form onSubmit={handleLogin} className="space-y-6">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Phone Number</label>
                          <input 
                             type="tel"
                             value={phoneNumber}
                             onChange={(e) => setPhoneNumber(e.target.value)}
                             placeholder="+1 (555) 123-4567"
                             className="w-full text-lg py-4 px-6 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-wellness-blue focus:border-transparent transition-all"
                             autoFocus
                          />
                      </div>

                      {error && (
                          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                              {error}
                          </div>
                      )}

                      <button 
                         type="submit"
                         disabled={isLoading}
                         className="w-full bg-wellness-blue text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-sky-700 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                          {isLoading ? 'Verifying...' : 'Access Companion Room'}
                      </button>
                 </form>
             </div>
        </div>
    );
};

export default PatientPortal;
