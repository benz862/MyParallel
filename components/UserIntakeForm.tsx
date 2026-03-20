import React, { useState, useEffect } from "react";
import { UserProfile, Medication } from "../types";
import { VOICE_PRESETS } from '../constants';



interface UserIntakeFormProps {
  onSave: (profile: Partial<UserProfile>) => Promise<void>;
  initialData?: Partial<UserProfile> | null;
  showOnlyPersonalInfo?: boolean;
  showOnlyCaregiverInfo?: boolean;
  showOnlyConditions?: boolean;
  showOnlyMedications?: boolean;
  showOnlyCalendar?: boolean;
  showOnlyEmergency?: boolean;
}

const UserIntakeForm: React.FC<UserIntakeFormProps> = ({ 
  onSave, 
  initialData,
  showOnlyPersonalInfo,
  showOnlyCaregiverInfo,
  showOnlyConditions,
  showOnlyMedications,
  showOnlyCalendar,
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
    medications: null,
    loneliness_level: 5,
    mobility_issues: false,
    cognitive_status: "normal",
    notes: null,
    google_calendar_enabled: false,
    apple_calendar_enabled: false,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    phone_number: null,
    timezone: 'America/New_York',
    checkin_times: [],
  });

  const [currentCheckinTime, setCurrentCheckinTime] = useState("");
  const [currentCheckinReason, setCurrentCheckinReason] = useState("");
  const [currentCondition, setCurrentCondition] = useState("");
  const [currentMedication, setCurrentMedication] = useState<Medication>({
    name: "",
    dosage: "",
    schedule: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

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
        medications: initialData.medications || null,
      });
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

  const handleAddMedication = () => {
    if (currentMedication.name.trim()) {
      const newMedications = [...(formData.medications || []), { ...currentMedication }];
      setFormData((prev) => ({
        ...prev,
        medications: newMedications,
      }));
      setCurrentMedication({ name: "", dosage: "", schedule: "" });
    }
  };

  const handleRemoveMedication = (index: number) => {
    const newMedications = formData.medications?.filter((_, i) => i !== index) || null;
    setFormData((prev) => ({
      ...prev,
      medications: newMedications && newMedications.length > 0 ? newMedications : null,
    }));
  };

  const handleMedicationChange = (field: keyof Medication, value: string) => {
    setCurrentMedication((prev) => ({ ...prev, [field]: value }));
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

  const isWizardMode = showOnlyPersonalInfo || showOnlyCaregiverInfo || showOnlyConditions || showOnlyMedications || showOnlyCalendar || showOnlyEmergency;

  const showPersonal = !isWizardMode || showOnlyPersonalInfo;
  const showConditions = !isWizardMode || showOnlyConditions;
  const showMedications = !isWizardMode || showOnlyMedications;
  const showCaregiver = !isWizardMode || showOnlyCaregiverInfo;
  const showCalendar = !isWizardMode || showOnlyCalendar;
  const showEmergency = !isWizardMode || showOnlyEmergency;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {showPersonal && (
        <>
          {/* Basic Information */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-6">Basic Information</h3>
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

      {showMedications && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-6">Medications</h3>
          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={currentMedication.name}
                onChange={(e) => handleMedicationChange("name", e.target.value)}
                className="px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                placeholder="Medication name"
              />
              <input
                type="text"
                value={currentMedication.dosage}
                onChange={(e) => handleMedicationChange("dosage", e.target.value)}
                className="px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                placeholder="Dosage (e.g., 10mg)"
              />
              <input
                type="text"
                value={currentMedication.schedule}
                onChange={(e) => handleMedicationChange("schedule", e.target.value)}
                className="px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-base"
                placeholder="Schedule (e.g., Morning, 8am)"
              />
            </div>
            <button
              type="button"
              onClick={handleAddMedication}
              className="px-6 py-3 bg-wellness-teal text-white rounded-lg font-semibold hover:bg-wellness-teal/90 transition-colors text-base"
            >
              Add Medication
            </button>
          </div>
          {formData.medications && formData.medications.length > 0 && (
            <div className="space-y-3">
              {formData.medications.map((med, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-base">{med.name}</p>
                    <p className="text-sm text-slate-600">
                      {med.dosage} • {med.schedule}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedication(index)}
                    className="ml-4 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-base"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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

      {showCalendar && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-6">Calendar Integration</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-semibold text-slate-900 text-base">Google Calendar</p>
                <p className="text-sm text-slate-600">
                  Sync medication reminders to your Google Calendar
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="google_calendar_enabled"
                  checked={formData.google_calendar_enabled || false}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-wellness-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wellness-blue"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-semibold text-slate-900 text-base">Apple Calendar</p>
                <p className="text-sm text-slate-600">
                  Sync medication reminders to your Apple/iCloud Calendar
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="apple_calendar_enabled"
                  checked={formData.apple_calendar_enabled || false}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-wellness-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wellness-blue"></div>
              </label>
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

      {/* Companion Style Selection */}
      {(!isWizardMode || showOnlyEmergency) && (
          <div className="bg-slate-50/50 rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-inner my-12">
              <div className="mb-12 text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a2332] mb-4">Choose Your Companion Style</h2>
                <p className="text-slate-500 max-w-2xl mx-auto text-lg">Select a voice and personality that feels most comfortable for you. You can preview each voice before deciding.</p>
              </div>

              <h3 className="text-2xl font-bold text-center text-[#1a2332] mb-8">Choose Your Companion</h3>
              <p className="text-center text-slate-500 mb-8">Each companion has a unique voice and personality combined.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {VOICE_PRESETS.map((persona) => {
                  const isSelected = formData.voice_id === persona.id;
                  return (
                  <div
                    key={persona.id}
                    onClick={() => setFormData((prev) => ({ ...prev, voice_id: persona.id, emotional_trait: persona.label }))}
                    className={`relative p-6 sm:p-8 rounded-2xl border-2 cursor-pointer transition-all bg-white min-h-[160px] flex flex-col justify-between ${
                      isSelected
                        ? "border-[#2c81c0] shadow-md ring-4 ring-blue-50"
                        : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    {isSelected && (
                       <div className="absolute top-4 right-4 text-white bg-[#2c81c0] rounded-full p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                       </div>
                    )}
                    <div>
                       <h4 className="font-bold text-xl text-slate-900 mb-2">{persona.label}</h4>
                       <p className="text-sm text-slate-500 leading-relaxed">{persona.desc}</p>
                    </div>
                    <div className="mt-4">
                        <button 
                           onClick={(e) => playVoicePreview(persona.id, persona.label, e)}
                           className="text-sm font-semibold text-[#2c81c0] hover:text-sky-700 flex items-center gap-2"
                        >
                           {playingVoice === persona.id ? (
                               <span className="flex gap-1.5 items-center">
                                   <span className="w-2 h-2 bg-[#2c81c0] rounded-full animate-bounce"></span>
                                   <span className="w-2 h-2 bg-[#2c81c0] rounded-full animate-bounce delay-100"></span>
                                   <span className="w-2 h-2 bg-[#2c81c0] rounded-full animate-bounce delay-200"></span>
                               </span>
                           ) : (
                               <>
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                 Preview voice
                               </>
                           )}
                        </button>
                    </div>
                  </div>
                )})}
              </div>
          </div>
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
