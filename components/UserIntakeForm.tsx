import React, { useState, useEffect, useRef } from "react";
import { UserProfile } from "../types";
import { VOICE_PRESETS } from '../constants';
import { supabase } from '../utils/supabase';



interface UserIntakeFormProps {
  onSave: (profile: Partial<UserProfile>) => Promise<void>;
  initialData?: Partial<UserProfile> | null;
  showOnlyPersonalInfo?: boolean;
  showOnlyCaregiverInfo?: boolean;
  showOnlyConditions?: boolean;
  showOnlyMedications?: boolean;
  showOnlyEmergency?: boolean;
}

const UserIntakeForm: React.FC<UserIntakeFormProps> = ({ 
  onSave, 
  initialData,
  showOnlyPersonalInfo,
  showOnlyCaregiverInfo,
  showOnlyConditions,
  showOnlyMedications,
  showOnlyEmergency
}) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    full_name: "",
    preferred_name: null,
    age: null,
    caregiver_name: null,
    caregiver_phone: null,
    caregiver_email: null,
    conditions: [],
    loneliness_level: 5,
    mobility_issues: false,
    cognitive_status: "normal",
    notes: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    phone_number: null,
    timezone: 'America/New_York',
    checkin_times: [],
  });

  const [currentCheckinTime, setCurrentCheckinTime] = useState("");
  const [currentCheckinReason, setCurrentCheckinReason] = useState("");
  const [currentCondition, setCurrentCondition] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const playVoicePreview = async (voiceId: string, modelName: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPlayingVoice(voiceId);
      try {
          const res = await fetch('/api/preview-voice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  voiceId: voiceId,
                  text: `Hi, I am your ${modelName}. I'm here to support you whenever you need me.`
              })
          });
          const data = await res.json();
          if (data.audioWavBase64) {
              const audioSrc = `data:audio/wav;base64,${data.audioWavBase64}`;
              const audio = new Audio(audioSrc);
              audio.onended = () => setPlayingVoice(null);
              audio.play().catch(() => setPlayingVoice(null));
          } else {
              setPlayingVoice(null);
          }
      } catch (err) {
          console.error(err);
          setPlayingVoice(null);
      }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
      });

      // If patient has an assigned caregiver_id, auto-populate the legacy caregiver fields
      if (initialData.caregiver_id) {
        supabase
          .from('user_profiles')
          .select('full_name, phone_number, email')
          .eq('id', initialData.caregiver_id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setFormData(prev => ({
                ...prev,
                caregiver_name: data.full_name || prev.caregiver_name,
                caregiver_phone: data.phone_number || prev.caregiver_phone,
                caregiver_email: data.email || prev.caregiver_email,
              }));
            }
          });
      }
    }
  }, [initialData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? value === ""
          ? null
          : parseInt(value, 10)
          : value === ""
          ? null
          : value,
    }));
  };

  const handleAddCondition = () => {
    if (currentCondition.trim()) {
      setFormData((prev) => ({
        ...prev,
        conditions: [...(prev.conditions || []), currentCondition.trim()],
      }));
      setCurrentCondition("");
    }
  };

  const handleAddCheckinTime = () => {
    if (currentCheckinTime) {
      const payload = JSON.stringify({ time: currentCheckinTime, reason: currentCheckinReason.trim() });
      if (!formData.checkin_times?.includes(payload)) {
        setFormData((prev) => ({
          ...prev,
          checkin_times: [...(prev.checkin_times || []), payload],
        }));
      }
      setCurrentCheckinTime("");
      setCurrentCheckinReason("");
    }
  };

  const handleRemoveCheckinTime = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      checkin_times: prev.checkin_times?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleRemoveCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index) || [],
    }));
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWizardMode = showOnlyPersonalInfo || showOnlyCaregiverInfo || showOnlyConditions || showOnlyMedications || showOnlyEmergency;

  const showPersonal = !isWizardMode || showOnlyPersonalInfo;
  const showConditions = !isWizardMode || showOnlyConditions;
  const showCaregiver = !isWizardMode || showOnlyCaregiverInfo;
  const showEmergency = !isWizardMode || showOnlyEmergency;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {showPersonal && (
        <>
          {/* Basic Information */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-6">Basic Information</h3>
            
            {/* Headshot Upload */}
            <div className="flex items-center gap-6 mb-6 pb-6 border-b border-slate-100">
              <div className="relative group cursor-pointer" onClick={() => photoRef.current?.click()}>
                {formData.headshot_url ? (
                  <img src={formData.headshot_url} alt="Patient" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-3xl text-slate-400 border-2 border-slate-200">
                    {(formData.full_name || '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold">{uploadingPhoto ? '...' : '📷'}</span>
                </div>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingPhoto(true);
                  const ext = file.name.split('.').pop() || 'jpg';
                  const path = `headshots/patient_${Date.now()}.${ext}`;
                  const { error } = await supabase.storage.from('parallel_files').upload(path, file, { upsert: true, contentType: file.type });
                  if (error) { alert('Upload failed: ' + error.message); setUploadingPhoto(false); return; }
                  const { data: { publicUrl } } = supabase.storage.from('parallel_files').getPublicUrl(path);
                  setFormData(prev => ({ ...prev, headshot_url: publicUrl }));
                  setUploadingPhoto(false);
                }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Patient Photo</p>
                <p className="text-xs text-slate-500">Click to upload a headshot</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name || ""}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Preferred Name
                </label>
                <input
                  type="text"
                  name="preferred_name"
                  value={formData.preferred_name || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                  placeholder="What should we call you?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age || ""}
                  onChange={handleInputChange}
                  min="1"
                  max="120"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                  placeholder="Your age"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cognitive Status
                </label>
                <select
                  name="cognitive_status"
                  value={formData.cognitive_status || "normal"}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                >
                  <option value="normal">Normal</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact & Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-6">Contact & Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number || ""}
                  onChange={handleInputChange}
                  required={showPersonal}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                  placeholder="+1 (555) 123-4567"
                />
                <p className="text-xs text-slate-500 mt-1">Include country code (e.g., +1)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Timezone
                </label>
                <select
                  name="timezone"
                  value={formData.timezone || "America/New_York"}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Automated Check-in Schedule</label>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <input
                      type="time"
                      value={currentCheckinTime}
                      onChange={(e) => setCurrentCheckinTime(e.target.value)}
                      className="px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue text-base w-full sm:w-40"
                  />
                  <input
                      type="text"
                      placeholder="Reason for call (e.g. 'Check if meds taken at noon')"
                      value={currentCheckinReason}
                      onChange={(e) => setCurrentCheckinReason(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddCheckinTime(); } }}
                      className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue text-base"
                  />
                  <button
                      type="button"
                      onClick={handleAddCheckinTime}
                      className="px-6 py-3 bg-wellness-blue text-white rounded-lg font-semibold hover:bg-wellness-blue/90 whitespace-nowrap"
                  >
                      Add Time
                  </button>
                </div>
                {formData.checkin_times && formData.checkin_times.length > 0 && (
                <div className="flex flex-col gap-2">
                    {formData.checkin_times.map((item, index) => {
                      let timeVal = item;
                      let reasonVal = "";
                      try {
                        if (item.startsWith('{')) {
                           const parsed = JSON.parse(item);
                           timeVal = parsed.time;
                           reasonVal = parsed.reason;
                        }
                      } catch(e) {}
                      
                      // Convert 24h to 12h AM/PM
                      let timeStr = timeVal;
                      if (timeVal && timeVal.includes(':')) {
                        const [hoursStr, minutesStr] = timeVal.split(':');
                        const hours = parseInt(hoursStr, 10);
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        const h12 = hours % 12 || 12;
                        timeStr = `${h12}:${minutesStr} ${ampm}`;
                      }

                      return (
                        <div key={index} className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <div>
                            <span className="font-semibold text-slate-700 mr-3">{timeStr}</span>
                            {reasonVal && <span className="text-sm text-slate-500 italic">"{reasonVal}"</span>}
                          </div>
                          <button type="button" onClick={() => handleRemoveCheckinTime(index)} className="text-slate-400 hover:text-red-500 font-bold px-2">×</button>
                        </div>
                      )
                    })}
                </div>
                )}
            </div>
          </div>

          {/* Voice Companion */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2">🤖 Voice Companion</h3>
            <p className="text-sm text-slate-500 mb-6">Customize how the AI assistant introduces itself and behaves during calls</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Companion Name
                </label>
                <input
                  type="text"
                  name="companion_name"
                  value={formData.companion_name || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                  placeholder="e.g. Buddy, Sarah, Companion"
                />
                <p className="text-xs text-slate-500 mt-1">The name the VA uses when greeting your patient</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Default Personality
                </label>
                <select
                  name="companion_personality"
                  value={formData.companion_personality || 'warm_empathetic'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                >
                  <option value="warm_empathetic">🤗 Warm & Empathetic</option>
                  <option value="cheerful_humorous">😄 Cheerful & Humorous</option>
                  <option value="calm_gentle">🧘 Calm & Gentle</option>
                  <option value="direct_clinical">🩺 Direct & Clinical</option>
                  <option value="playful_friendly">🎉 Playful & Friendly</option>
                  <option value="motivational">💪 Motivational & Upbeat</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Default tone; individual check-ins can override this</p>
              </div>
            </div>

            {/* Voice Selection */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                🔊 Companion Voice
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VOICE_PRESETS.map((voice) => (
                  <div
                    key={voice.id}
                    onClick={() => setFormData(prev => ({ ...prev, voice_id: voice.id }))}
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      (formData.voice_id || 'Puck') === voice.id
                        ? 'border-wellness-blue bg-blue-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800">{voice.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{voice.gender}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{voice.desc}</p>
                    <button
                      type="button"
                      onClick={(e) => playVoicePreview(voice.id, voice.label, e)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        playingVoice === voice.id
                          ? 'bg-wellness-blue text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {playingVoice === voice.id ? '🔊 Playing...' : '▶️ Preview'}
                    </button>
                    {(formData.voice_id || 'Puck') === voice.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-wellness-blue rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {showConditions && (
        <>
          {/* Health Conditions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-6">Health Conditions</h3>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={currentCondition}
                onChange={(e) => setCurrentCondition(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCondition();
                  }
                }}
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                placeholder="Add a condition (e.g., diabetes, anxiety, arthritis)"
              />
              <button
                type="button"
                onClick={handleAddCondition}
                className="px-6 py-3 bg-wellness-blue text-white rounded-lg font-semibold hover:bg-wellness-blue/90 transition-colors text-base"
              >
                Add
              </button>
            </div>
            {formData.conditions && formData.conditions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.conditions.map((condition, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-700"
                  >
                    {condition}
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(index)}
                      className="text-slate-500 hover:text-red-600 text-lg leading-none"
                      aria-label="Remove condition"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Wellness Assessment */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-6">Wellness Assessment</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Loneliness Level (1-10, where 10 is very lonely)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    name="loneliness_level"
                    min="1"
                    max="10"
                    value={formData.loneliness_level || 5}
                    onChange={handleInputChange}
                    className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-wellness-blue"
                  />
                  <span className="text-lg font-semibold text-wellness-blue w-12 text-center">
                    {formData.loneliness_level || 5}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="mobility_issues"
                  checked={formData.mobility_issues || false}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-slate-300 text-wellness-blue focus:ring-wellness-blue"
                />
                <label className="text-base text-slate-700">
                  I have mobility issues or difficulty moving around
                </label>
              </div>
            </div>
          </div>
        </>
      )}



      {showCaregiver && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-6">Caregiver Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Caregiver Name
              </label>
              <input
                type="text"
                name="caregiver_name"
                value={formData.caregiver_name || ""}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                placeholder="Name of your caregiver"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Caregiver Phone
              </label>
              <input
                type="tel"
                name="caregiver_phone"
                value={formData.caregiver_phone || ""}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Caregiver Email
              </label>
              <input
                type="email"
                name="caregiver_email"
                value={formData.caregiver_email || ""}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                placeholder="caregiver@example.com"
              />
            </div>
          </div>
        </div>
      )}



      {showEmergency && (
        <>
          {/* Emergency Contact */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-6">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                  placeholder="Emergency contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Additional Notes (Only on last step or static view) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-6">Additional Notes</h3>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
              placeholder="Any additional information you'd like to share..."
            />
          </div>
        </>
      )}


      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isSubmitting || (showPersonal && !formData.full_name)}
          className={`
            px-10 py-4 rounded-full font-bold text-lg sm:text-xl
            transition-all duration-200 shadow-lg
            focus:outline-none focus:ring-4 focus:ring-wellness-blue/30
            ${
              isSubmitting || (showPersonal && !formData.full_name)
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-wellness-blue text-white hover:bg-wellness-blue/90 hover:scale-105 active:scale-100"
            }
          `}
        >
          {isSubmitting ? "Saving..." : (isWizardMode ? "Continue" : "Save Profile")}
        </button>
      </div>
    </form>
  );
};

export default UserIntakeForm;
