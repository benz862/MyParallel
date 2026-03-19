import React, { useState, useEffect } from "react";
import UserIntakeForm from "./UserIntakeForm";
import VoicePersonalitySelector from "./VoicePersonalitySelector";
import { UserProfile } from "../types";
import { api } from "../utils/api";

const CompanionSetup: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<"intake" | "voice" | "complete">("intake");
  const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [existingProfile, setExistingProfile] = useState<UserProfile | null>(null);

  // Load existing profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await api.get("/api/get-user-profile");
        if (profile) {
          setExistingProfile(profile);
          setUserProfile(profile);
          setSelectedVoice(profile.selected_voice || null);
          setSelectedPersonality(profile.selected_personality || null);
          if (profile.selected_voice && profile.selected_personality) {
            setCurrentStep("voice");
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };
    loadProfile();
  }, []);

  // Load saved selections from localStorage
  useEffect(() => {
    const savedVoice = localStorage.getItem("parallel_voice");
    const savedPersonality = localStorage.getItem("parallel_personality");
    if (savedVoice) setSelectedVoice(savedVoice);
    if (savedPersonality) setSelectedPersonality(savedPersonality);
  }, []);

  const handleIntakeSave = async (profile: Partial<UserProfile>) => {
    setUserProfile(profile);
    setCurrentStep("voice");
  };

  const handleVoicePersonalityComplete = () => {
    const savedVoice = localStorage.getItem("parallel_voice");
    const savedPersonality = localStorage.getItem("parallel_personality");
    setSelectedVoice(savedVoice);
    setSelectedPersonality(savedPersonality);
  };

  const handleFinalSave = async () => {
    const voice = localStorage.getItem("parallel_voice");
    const personality = localStorage.getItem("parallel_personality");

    if (!voice || !personality) {
      alert("Please select both a voice and personality before saving.");
      return;
    }

    setIsSaving(true);

    try {
      const completeProfile: Partial<UserProfile> = {
        ...userProfile,
        selected_voice: voice,
        selected_personality: personality,
      };

      const result = await api.post("/api/save-user-profile", completeProfile);
      
      if (result.success) {
        setCurrentStep("complete");
        setSelectedVoice(voice);
        setSelectedPersonality(personality);
        
        // Trigger calendar sync if enabled
        if (completeProfile.google_calendar_enabled) {
          try {
            await api.post("/api/calendar-sync-google", completeProfile);
          } catch (error) {
            console.error("Google Calendar sync error:", error);
          }
        }

        if (completeProfile.apple_calendar_enabled) {
          try {
            await api.post("/api/calendar-sync-apple", completeProfile);
          } catch (error) {
            console.error("Apple Calendar sync error:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (currentStep === "complete") {
    return (
      <section className="py-16 sm:py-24 bg-wellness-cream border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-white rounded-3xl border border-slate-200 p-12 shadow-lg">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-wellness-teal/20 mb-4">
                <svg
                  className="w-10 h-10 text-wellness-teal"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Your Companion is Ready!
            </h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Your profile has been saved successfully. Your companion will use your selected voice
              and personality for all conversations. You can start chatting in the terminal below.
            </p>
            <button
              onClick={() => {
                document.getElementById("terminal")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-8 py-4 bg-wellness-blue text-white rounded-full font-bold text-lg hover:bg-wellness-blue/90 hover:scale-105 transition-all shadow-lg"
            >
              Start Chatting
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="companion-setup" className="py-16 sm:py-24 bg-wellness-cream border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                currentStep === "intake"
                  ? "bg-wellness-blue text-white"
                  : "bg-wellness-teal text-white"
              }`}
            >
              1
            </div>
            <div className="h-1 w-24 bg-slate-300"></div>
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                currentStep === "voice"
                  ? "bg-wellness-blue text-white"
                  : "bg-slate-300 text-slate-600"
              }`}
            >
              2
            </div>
          </div>
          <div className="flex justify-center gap-24">
            <p
              className={`text-sm font-medium ${
                currentStep === "intake" ? "text-wellness-blue" : "text-slate-600"
              }`}
            >
              Profile Information
            </p>
            <p
              className={`text-sm font-medium ${
                currentStep === "voice" ? "text-wellness-blue" : "text-slate-600"
              }`}
            >
              Voice & Personality
            </p>
          </div>
        </div>

        {/* Step 1: User Intake Form */}
        {currentStep === "intake" && (
          <div>
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
                Tell Us About Yourself
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Help us understand your needs so we can provide the best support possible.
              </p>
            </div>
            <UserIntakeForm onSave={handleIntakeSave} initialData={existingProfile} />
          </div>
        )}

        {/* Step 2: Voice & Personality Selection */}
        {currentStep === "voice" && (
          <div>
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
                Choose Your Companion Style
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Select a voice and personality that feels most comfortable for you.
              </p>
            </div>
            <VoicePersonalitySelector onComplete={handleVoicePersonalityComplete} />
            
            {/* Final Save Button */}
            <div className="mt-12 flex justify-center">
              <button
                onClick={handleFinalSave}
                disabled={isSaving || !selectedVoice || !selectedPersonality}
                className={`
                  px-10 py-4 rounded-full font-bold text-lg sm:text-xl
                  transition-all duration-200 shadow-lg
                  focus:outline-none focus:ring-4 focus:ring-wellness-blue/30
                  ${
                    isSaving || !selectedVoice || !selectedPersonality
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-wellness-blue text-white hover:bg-wellness-blue/90 hover:scale-105 active:scale-100"
                  }
                `}
              >
                {isSaving
                  ? "Saving Your Companion..."
                  : "Complete Setup"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CompanionSetup;
