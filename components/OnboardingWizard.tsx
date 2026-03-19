import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserIntakeForm from './UserIntakeForm';
import VoicePersonalitySelector from './VoicePersonalitySelector';
import { api } from '../utils/api';
import { UserProfile } from '../types';

type WizardStep = 'profile' | 'caregiver' | 'conditions' | 'medications' | 'emergency';

const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user, setHasCompletedOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('profile');
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  const steps: WizardStep[] = ['profile', 'caregiver', 'conditions', 'medications', 'emergency'];
  const stepLabels: Record<WizardStep, string> = {
    profile: 'Personal Info',
    caregiver: 'Caregiver Info',
    conditions: 'Medical Conditions',
    medications: 'Medications',
    emergency: 'Emergency Contact',
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await api.get('/api/get-user-profile', user?.id);
        if (profile) {
          setProfileData(profile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const getCurrentStepIndex = () => steps.indexOf(currentStep);

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleStepSave = async (stepData: Partial<UserProfile>) => {
    const updatedProfile = {
      ...profileData,
      ...stepData,
      id: user?.id,
    };
    setProfileData(updatedProfile);

    try {
      await api.post('/api/save-user-profile', updatedProfile);
      return true;
    } catch (error) {
      console.error('Error saving step:', error);
      alert('Failed to save. Please try again.');
      return false;
    }
  };

  const handleFinalSave = async () => {
    setIsSaving(true);
    try {
      await api.post('/api/save-user-profile', {
        ...profileData,
        id: user?.id,
      });
      setHasCompletedOnboarding(true);
      navigate('/onboarding/complete');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete setup. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'profile':
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Personal Information</h2>
            <UserIntakeForm
              initialData={profileData}
              onSave={async (profile) => {
                await handleStepSave(profile);
                handleNext();
              }}
              showOnlyPersonalInfo
            />
          </div>
        );

      case 'caregiver':
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Caregiver Information</h2>
            <UserIntakeForm
              initialData={profileData}
              onSave={async (profile) => {
                await handleStepSave(profile);
                handleNext();
              }}
              showOnlyCaregiverInfo
            />
          </div>
        );

      case 'conditions':
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Medical Conditions</h2>
            <UserIntakeForm
              initialData={profileData}
              onSave={async (profile) => {
                await handleStepSave(profile);
                handleNext();
              }}
              showOnlyConditions
            />
          </div>
        );

      case 'medications':
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Medications & Scheduling</h2>
            <UserIntakeForm
              initialData={profileData}
              onSave={async (profile) => {
                await handleStepSave(profile);
                handleNext();
              }}
              showOnlyMedications
            />
          </div>
        );

      case 'emergency':
        return (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Emergency Contact</h2>
            <UserIntakeForm
              initialData={profileData}
              onSave={async (profile) => {
                await handleStepSave(profile);
                handleFinalSave();
              }}
              showOnlyEmergency
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 ${
                      index <= getCurrentStepIndex()
                        ? 'bg-wellness-blue text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-xs text-center text-slate-600 hidden sm:block">
                    {stepLabels[step]}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      index < getCurrentStepIndex() ? 'bg-wellness-blue' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {currentStep !== 'profile' && (
          <div className="mt-6 flex justify-between">
            <button
              onClick={handleBack}
              className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;



