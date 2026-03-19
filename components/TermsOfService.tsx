import React from "react";

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-sm p-8 sm:p-10">

        {/* Header */}
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: {new Date().getFullYear()}
        </p>

        <p className="mt-6 text-lg text-slate-700 leading-relaxed">
          Welcome to MyParallel. These Terms of Service outline what you can
          expect from the service, what your responsibilities are, and the
          important limitations of the system. We aim to make this as clear and
          supportive as possible while ensuring your safety and proper use.
        </p>

        {/* Section 1 */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          1. Purpose of MyParallel
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          MyParallel is a wellness-focused support tool designed to offer gentle
          check-ins, reminders, and calming messages for people who live alone, 
          older adults, caregivers, or anyone needing help building daily structure.
        </p>

        <p className="mt-3 text-slate-700 leading-relaxed">
          MyParallel is <span className="font-semibold">not</span> a medical 
          service, emergency monitoring system, crisis resource, counseling tool,
          or romantic/relationship-oriented platform.
        </p>

        {/* Section 2 */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          2. Eligibility
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          You must be at least 18 years old to use MyParallel.  
          Caregivers may configure the service on behalf of an adult user.
        </p>

        {/* Section 3 */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          3. User Responsibilities
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          By using MyParallel, you agree to:
        </p>

        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-700">
          <li>Provide accurate contact information for reminders</li>
          <li>Use the service in a lawful, respectful manner</li>
          <li>Acknowledge that reminders are not medical instructions</li>
          <li>Understand that check-ins are supportive, not diagnostic</li>
          <li>Maintain your own medical care, medication routines, and emergency plans</li>
        </ul>

        {/* Section 4 */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          4. What MyParallel Does NOT Provide
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          MyParallel does <strong>not</strong> provide:
        </p>

        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-700">
          <li>Medical care, medical advice, or diagnosis</li>
          <li>Emergency response or safety monitoring</li>
          <li>Therapy or mental health counseling</li>
          <li>Professional recommendations</li>
          <li>Romantic, affectionate, flirtatious, or emotional-dependency messaging</li>
        </ul>

        <p className="mt-3 text-sm text-slate-500">
          For emergencies, always call your local emergency number.
        </p>

        {/* Section 5 */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          5. Subscription & Billing
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          MyParallel operates on a subscription model.  
          By subscribing, you agree to recurring billing until you cancel.
        </p>

        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-700">
          <li>You may cancel at any time</li>
          <li>No long-term commitments</li>
          <li>No refunds for partial billing cycles</li>
          <li>Prices may change, but you will always be notified first</li>
        </ul>

        {/* Section 6 */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          6. Acceptable Use
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          You agree not to misuse the service.  
          Examples of prohibited use include:
        </p>

        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-700">
          <li>Attempting to reverse engineer or disrupt the service</li>
          <li>Submitting harmful, abusive, or illegal content</li>
          <li>Using MyParallel as a substitute for urgent care or medical assistance</li>
          <li>Trying to create romantic, intimate, or suggestive interactions</li>
        </ul>

        {/* Section 7 */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          7. Service Availability
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          MyParallel strives to maintain consistent uptime, but may be temporarily
          unavailable due to maintenance, technical issues, or service provider outages.
        </p>

        <p className="mt-3 text-sm text-slate-500">
          We cannot guarantee uninterrupted service at all times.
        </p>

        {/* Section 8 */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          8. Limitation of Liability
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          MyParallel is provided “as is” without warranties of any kind.  
          We are not liable for:
        </p>

        <ul className="mt-3 list-disc list-inside space-y-2 text-slate-700">
          <li>Delays in message delivery</li>
          <li>Incorrect reminders caused by inaccurate user input</li>
          <li>Losses or harm caused by reliance on non-medical reminders</li>
          <li>Any outcomes resulting from emergency situations</li>
        </ul>

        {/* Section 9 */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          9. Changes to These Terms
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          We may update these Terms of Service occasionally.  
          When we do, we will update the date above.  
          Continued use of MyParallel means you accept the updated terms.
        </p>

        {/* Section 10 */}
        <h2 className="mt-10 text-xl font-semibold text-slate-900">
          10. Contact Us
        </h2>

        <p className="mt-3 text-slate-700 leading-relaxed">
          If you have questions about these Terms, we're here to support you.
        </p>

        <p className="mt-2 text-sm text-slate-600">
          Email: <span className="font-medium">support@myparallel.chat</span>
        </p>

        {/* Back button */}
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

export default TermsOfService;