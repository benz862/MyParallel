import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Hero from './components/Hero';
import Features from './components/Features';
import Builder from './components/Builder';
import WebTerminal from './components/WebTerminal';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import Login from './components/Login';
import ProductSelection from './components/ProductSelection';
import AddOnSelection from './components/AddOnSelection';
import OnboardingWizard from './components/OnboardingWizard';
import CompanionReady from './components/CompanionReady';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import EditProfileModal from './components/EditProfileModal';
import PatientPortal from './components/PatientPortal';
import AdminPortal from './components/AdminPortal';
import { supabase } from './utils/supabase';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Onboarding Check Component
const OnboardingCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, hasCompletedOnboarding, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (user && !hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
};

// Homepage Component
const Homepage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img 
              src="/images/Logo_MyParallel.png" 
              alt="MyParallel" 
              className="h-20"
              style={{ height: '80px' }}
            />
            <div>
              <p className="font-semibold tracking-tight">MyParallel</p>
              <p className="text-xs text-slate-500">Your Wellness Support Companion</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Log in
            </a>
            <a
              href="/checkout/plan"
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
            >
              Buy Now
            </a>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Hero />
        <Features />
        <Builder />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

// Main App Component
const AppContent: React.FC = () => {
  const { user, signOut, hasCompletedOnboarding } = useAuth();
  const [isEditing, setIsEditing] = React.useState(false);
  const [agencyAdminData, setAgencyAdminData] = React.useState<{ companyName: string, agencyId: string } | null>(null);

  React.useEffect(() => {
     if (user) {
        supabase.from('agency_users')
          .select('role, agency_id, agencies(name)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
          .then(({ data }) => {
              // Ensure agencies exists since it's a join to prevent null pointer exceptions
              if (data && data.agencies && (data.role === 'admin' || data.role === 'owner')) {
                 setAgencyAdminData({ companyName: data.agencies.name || 'Agency Admin', agencyId: data.agency_id });
              }
          });
     }
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img 
              src="/images/Logo_MyParallel.png" 
              alt="MyParallel" 
              className="h-20"
              style={{ height: '80px' }}
            />
            <div>
              <p className="font-semibold tracking-tight">MyParallel</p>
              <p className="text-xs text-slate-500">Your Wellness Support Companion</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:inline-block">{user?.email}</span>
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-sky-50 text-sky-600 rounded-full text-sm font-semibold hover:bg-sky-100 transition-colors"
            >
              Edit Profile
            </button>
            <button 
              onClick={signOut}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 ml-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-slate-50">
        {agencyAdminData ? (
            <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto min-h-[80vh]">
                <AdminPortal companyName={agencyAdminData.companyName} agencyId={agencyAdminData.agencyId} />
            </div>
        ) : (
            <WebTerminal />
        )}
      </main>
      
      {isEditing && <EditProfileModal onClose={() => setIsEditing(false)} />}
    </div>
  );
};

// Router Setup
const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          
          {/* Checkout Flow */}
          <Route path="/checkout/plan" element={<ProductSelection />} />
          <Route path="/checkout/add-ons" element={<AddOnSelection />} />
          
          {/* Patient PWA Formally Isolated Route */}
          <Route path="/patient" element={<PatientPortal />} />

          {/* Protected Routes */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingWizard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/complete"
            element={
              <ProtectedRoute>
                <CompanionReady />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;

