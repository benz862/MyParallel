import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UserIntakeForm from './UserIntakeForm';
import VoicePersonalitySelector from './VoicePersonalitySelector';
import { api } from '../utils/api';
import { UserProfile } from '../types';

const Onboarding: React.FC = () => {
  const { user, setHasCompletedOnboarding } = useAuth();
  const [step, setStep] = useState<'profile' | 'voice'>('profile');
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load existing profile if available
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await api.get('/api/get-user-profile', user?.id);
        if (profile) {
          setProfileData(profile);
          // If profile exists but missing voice/personality, go to voice step
          if (profile.full_name && (!profile.selected_voice || !profile.selected_personality)) {
            setStep('voice');
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const handleProfileSave = async (profile: UserProfile) => {
    setProfileData(profile);
    
    // Save profile with user ID
    const profileWithUserId = {
      ...profile,
      id: user?.id, // Link to Supabase auth user
    };

    try {
      await api.post('/api/save-user-profile', profileWithUserId);
      setStep('voice');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    }
  };

  const handleVoiceSave = async (voice: string, personality: string) => {
    setIsSaving(true);
    
    try {
      // Update profile with voice and personality
      const updatedProfile = {
        ...profileData,
        selected_voice: voice,
        selected_personality: personality,
        id: user?.id,
      };

      await api.post('/api/save-user-profile', updatedProfile);
      
      // Mark onboarding as complete
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('Error saving voice/personality:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className={`flex items-center ${step === 'profile' ? 'text-sky-600' : 'text-slate-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step === 'profile' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Profile Setup</span>
            </div>
            <div className="w-16 h-0.5 bg-slate-200"></div>
            <div className={`flex items-center ${step === 'voice' ? 'text-sky-600' : 'text-slate-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step === 'voice' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Voice & Personality</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 'profile' ? (
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome to MyParallel</h2>
              <p className="text-slate-600 mb-8">
                Let's set up your profile so we can provide personalized support.
              </p>
              <UserIntakeForm
                initialData={profileData}
                onSave={handleProfileSave}
              />
            </div>
          ) : (
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Choose Your Companion</h2>
              <p className="text-slate-600 mb-8">
                Select a voice and personality that feels right for you.
              </p>
              <VoicePersonalitySelector
                initialVoice={profileData.selected_voice}
                initialPersonality={profileData.selected_personality}
                onSave={handleVoiceSave}
                isSaving={isSaving}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

