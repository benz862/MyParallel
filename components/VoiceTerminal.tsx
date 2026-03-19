import React from "react";

const VoiceTerminal: React.FC = () => {
  return (
    <section
      id="voice-demo"
      className="py-12 sm:py-16 bg-white border-t border-slate-200"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Hear how a check-in could sound.
            </h2>
            <p className="mt-3 text-base text-slate-700">
              Voice support is designed to feel like a steady, calm presence –
              not a doctor, not a relative, and not a romantic partner. Just a
              friendly, respectful voice checking on you.
            </p>
          </div>

          <div className="w-full max-w-sm">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-900">
                Sample script:
              </p>
              <div className="text-sm text-slate-800 bg-white rounded-2xl px-4 py-3 shadow-sm">
                “Hi, it&apos;s MyParallel checking in. I hope your day hasn&apos;t
                been too overwhelming. Have you taken your medications and had
                something to drink in the last couple of hours? If not, this is
                your gentle reminder to pause and look after yourself. You&apos;re
                doing your best, and that&apos;s enough for today.”
              </div>
              <p className="text-[11px] text-slate-500">
                In the app, you&apos;ll be able to choose from several calm,
                clear voices and set how often you want voice check-ins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VoiceTerminal;