import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import UserIntakeForm from './UserIntakeForm';
import { UserProfile } from '../types';

interface EditProfileModalProps {
  onClose: () => void;
}

export default function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (!error && data) {
        setProfile(data as UserProfile);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  if (loading) {
     return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center justify-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-600 border-r-transparent"></div>
            </div>
        </div>
     );
  }

  const handleSave = async (updatedData: Partial<UserProfile>) => {
      // UserIntakeForm doesn't auto-save if we override like this, but actually UserIntakeForm has an internal save!
      // Looking at CompanionSetup.tsx, it just receives the data. Wait, UserIntakeForm calls onSave(formData).
      try {
          // Send update to Supabase
          const { error } = await supabase.from('user_profiles').update(updatedData).eq('id', user?.id);
          if (error) throw error;
          onClose();
          // Reload to organically refresh WebTerminal components safely
          window.location.reload();
      } catch (err: any) {
          alert('Error saving profile: ' + err.message);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-fadeIn">
        <button 
            onClick={onClose} 
            className="absolute top-6 right-6 z-[101] w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 hover:text-slate-900 font-bold transition-colors"
        >
            ✕
        </button>
        <div className="p-8 sm:p-12 relative">
           <div className="mb-8">
               <h2 className="text-3xl font-bold text-slate-800">Edit Your Profile</h2>
               <p className="text-slate-500 mt-2">Update your medical conditions, medications, or AI companion settings at any time.</p>
           </div>
           
           <UserIntakeForm 
             initialData={profile} 
             onSave={handleSave} 
           />
        </div>
      </div>
    </div>
  );
}
