import React from "react";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-sm p-8 sm:p-10">
        
        {/* Header */}
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: {new Date().getFullYear()}
        </p>

        <p className="mt-6 text-lg text-slate-700 leading-relaxed">
          MyParallel is designed to provide gentle check-ins, reminders, and supportive 
          wellness messages. We understand that many of our users are seniors, individuals 
          living alone, or people navigating difficult circumstances. Your privacy is extremely important to us, 
          and this policy explains how we protect it.
        </p>

        {/* Section */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          1. Information We Collect
        </h2>

        <p className="mt-3 text-slate-700">
          MyParallel collects only the information needed to deliver supportive reminders 
          and messages. This may include:
        </p>

        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-700">
          <li>Your name or preferred display name</li>
          <li>Your communication preferences (tone, frequency, reminder types)</li>
          <li>Phone number or email for sending messages</li>
          <li>Optional support details such as:
            <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
              <li>Medication reminders you choose to enter</li>
              <li>Daily routine preferences</li>
              <li>Check-in times</li>
            </ul>
          </li>
        </ul>

        <p className="mt-3 text-sm text-slate-500">
          We do NOT collect medical records, diagnoses, emergency contacts, or any 
          protected health information (PHI). MyParallel is NOT a medical service.
        </p>

        {/* Section */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          2. How We Use Your Information
        </h2>

        <p className="mt-3 text-slate-700">
          Your information is used solely to:
        </p>

        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-700">
          <li>Send check-in messages</li>
          <li>Send reminders you choose (hydration, meals, medications, routines)</li>
          <li>Deliver optional voice messages</li>
          <li>Improve service reliability and performance</li>
        </ul>

        <p className="mt-3 text-sm text-slate-500">
          We do NOT use your information for advertising or data resale.
        </p>

        {/* Section */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          3. Data Protection & Security
        </h2>

        <p className="mt-3 text-slate-700">
          We use encrypted systems and industry-standard safeguards to protect your data. 
          Access is limited to essential systems that enable communication and reminders.
        </p>

        <p className="mt-3 text-sm text-slate-500">
          While no system can be 100% secure, we take your privacy seriously and work 
          continuously to keep your information safe.
        </p>

        {/* Section */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          4. What We Do NOT Do
        </h2>

        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-700">
          <li>No medical advice or diagnoses</li>
          <li>No emergency monitoring or response</li>
          <li>No selling or trading your information</li>
          <li>No romantic or emotionally dependent messaging</li>
          <li>No monitoring beyond check-ins you schedule voluntarily</li>
        </ul>

        {/* Section */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          5. Voice & Message Content
        </h2>

        <p className="mt-3 text-slate-700">
          MyParallel’s messages are supportive, neutral, and non-romantic. Voice content is 
          generated in calm, gentle tones intended to provide comfort, not attachment.
        </p>

        <p className="mt-3 text-sm text-slate-500">
          You may customize how often you receive messages and what types of reminders you want.
        </p>

        {/* Section */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          6. Sharing Information
        </h2>

        <p className="mt-3 text-slate-700">
          We do not share your data with third parties except:
        </p>

        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-700">
          <li>Services that deliver your text messages or emails</li>
          <li>Services powering the AI conversation engine</li>
        </ul>

        <p className="mt-3 text-slate-700">
          These services are required to follow strict privacy and data handling standards.
        </p>

        {/* Section */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          7. Your Rights & Choices
        </h2>

        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-700">
          <li>You may delete your data at any time</li>
          <li>You may request access to your stored information</li>
          <li>You may adjust or disable reminders whenever you choose</li>
          <li>You may cancel your subscription at any time</li>
        </ul>

        {/* Section */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          8. Contact Us
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          If you have questions or concerns about your privacy, please reach out.  
          We’re here to help and want you to feel safe using MyParallel.
        </p>

        <p className="mt-2 text-sm text-slate-600">
          Email: <span className="font-medium">support@myparallel.chat</span>
        </p>

        {/* Back to top / close button placeholder */}
        <div className="mt-12 text-center">
          <a
            href="#"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center rounded-full bg-sky-600 text-white px-6 py-2.5 text-sm font-semibold shadow hover:bg-sky-700 transition-colors"
          >
            Return to MyParallel
          </a>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;