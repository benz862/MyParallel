import React from "react";

const features = [
  {
    icon: "📞",
    title: "Intelligent Voice Check-Ins",
    description:
      "Deploy conversational AI to proactively process wellness checks with your patients throughout the day, ensuring they've eaten and tracking emotional states.",
  },
  {
    icon: "⏰",
    title: "Automated Routine Tracking",
    description:
      "Schedule precise, persistent voice check-ins for medication compliance, hydration, and mobility exercises without having to make the manual calls yourself.",
  },
  {
    icon: "🗂️",
    title: "Centralized Roster Management",
    description:
      "Manage all your patients from a single Command Center. Instantly update medical context, emergency contacts, and private wellness notes natively.",
  },
  {
    icon: "📝",
    title: "Live Transcription Journals",
    description:
      "Every single patient-assistant interaction is actively transcribed line-by-line onto your Dashboard, allowing you to seamlessly monitor compliance offline.",
  },
  {
    icon: "🌙",
    title: "24/7 After-Hours Coverage",
    description:
      "Provide your patients with a reliable, calming companion they can speak to during late-night hours when human administrative staff are unavailable.",
  },
  {
    icon: "🛡️",
    title: "Strict Architecture Privacy",
    description:
      "All medical context and transcriptions are strictly compartmentalized per-patient. The AI is securely fenced to never offer rogue medical diagnoses.",
  },
];

const Features: React.FC = () => {
  return (
    <section
      id="how-it-helps"
      className="py-14 sm:py-20 bg-white border-t border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            More than just reminders.{" "}
            <span className="text-sky-700">A scalable care force.</span>
          </h2>

          <p className="mt-3 text-lg text-slate-700 leading-relaxed">
            Designed for professional caregivers, facility administrators, and families managing multiple loved ones. MyParallel radically multiplies your caregiving capacity safely and consistently.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="h-full rounded-3xl bg-slate-50 border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-sky-100 flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {item.title}
                </h3>
              </div>

              <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;