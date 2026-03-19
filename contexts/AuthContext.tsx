import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
           setLoading(true);
           try { await checkOnboardingStatus(session.user.id); } 
           finally { setLoading(false); }
        } else {
           checkOnboardingStatus(session.user.id);
        }
      } else {
        setHasCompletedOnboarding(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (userId: string) => {
    try {
      const timeoutFuse = new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error("Onboarding status check timed out")), 5000)
      );

      const dbQuery = supabase
        .from('user_profiles')
        .select('full_name, selected_voice, selected_personality')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([dbQuery, timeoutFuse]);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking onboarding:', error);
        return;
      }

      // User has completed onboarding if they have a profile with name and voice/personality
      if (data && data.full_name && data.selected_voice && data.selected_personality) {
        setHasCompletedOnboarding(true);
      } else {
        setHasCompletedOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // In case of error (timeout/network) just act like they haven't completed it so they don't get stuck
      setHasCompletedOnboarding(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setHasCompletedOnboarding(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        hasCompletedOnboarding,
        setHasCompletedOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


