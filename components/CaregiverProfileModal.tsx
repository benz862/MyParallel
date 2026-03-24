import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CaregiverProfileModalProps {
  onClose: () => void;
}

const CaregiverProfileModal: React.FC<CaregiverProfileModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [profile, setProfile] = useState({
      full_name: '',
      phone_number: '',
  });

  const [agencyData, setAgencyData] = useState<{name: string, role: string, maxCaregivers?: number} | null>(null);

  useEffect(() => {
    fetchCaregiverData();
  }, [user]);

  const fetchCaregiverData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch personal profile from user_profiles (if it exists)
    const { data: userData } = await supabase
        .from('user_profiles')
        .select('full_name, phone_number')
        .eq('id', user.id)
        .maybeSingle();
        
    if (userData) {
        setProfile({ full_name: userData.full_name || '', phone_number: userData.phone_number || '' });
    }

    // Fetch Licensing/Agency Info exactly as requested by the Administrator
    const { data: agencyUser } = await supabase
        .from('agency_users')
        .select('role, agencies(name)')
        .eq('user_id', user.id)
        .maybeSingle();

    if (agencyUser && agencyUser.agencies) {
        const agencyName = Array.isArray(agencyUser.agencies) 
            ? (agencyUser.agencies[0] as any)?.name 
            : (agencyUser.agencies as any).name;
            
        setAgencyData({
            name: agencyName || 'Unknown Agency',
            role: agencyUser.role
        });
    }

    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    // Upsert the Caregiver's personal anchor record using standard schema mapping
    const { error } = await supabase.from('user_profiles').upsert([{
        id: user.id,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        updated_at: new Date().toISOString()
    }], { onConflict: 'id' });

    setSaving(false);
    if (!error) onClose();
    else alert('Failed to save profile: ' + error.message);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Caregiver Profile</h2>
            <p className="text-sm text-slate-500">Manage your personal account and licensing.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white shadow-sm border border-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✕</button>
        </div>

        {loading ? (
            <div className="p-12 text-center text-slate-500">Loading Profile Data...</div>
        ) : (
            <div className="p-6 overflow-y-auto">
              {/* Licensing Banner overlay */}
              {agencyData ? (
                  <div className="mb-8 p-4 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl text-white shadow-md flex justify-between items-center">
                      <div>
                          <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Active License</div>
                          <div className="font-bold text-lg">{agencyData.name}</div>
                      </div>
                      <div className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold uppercase tracking-wide">
                          {agencyData.role}
                      </div>
                  </div>
              ) : (
                  <div className="mb-8 p-4 bg-sky-50 rounded-2xl border border-sky-100 flex items-center gap-3">
                      <div className="text-2xl">👩‍⚕️</div>
                      <div>
                          <p className="text-sm font-bold text-sky-800">Independent Caregiver</p>
                          <p className="text-xs text-sky-600">You are not currently bound to an Agency License.</p>
                      </div>
                  </div>
              )}

              <form id="caregiver-profile-form" onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue focus:bg-white transition-colors"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={profile.phone_number}
                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue focus:bg-white transition-colors"
                    placeholder="+1 (555) 000-0000"
                    required
                  />
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-sm font-bold text-slate-700 mb-2">Account Authentication</p>
                    <p className="text-xs text-slate-500 mb-3">Your login email is managed by Supabase Auth.</p>
                    <div className="px-3 py-2 bg-slate-200/50 rounded-lg text-sm text-slate-600 font-mono tracking-tight select-all">
                        {user?.email}
                    </div>
                </div>

                {/* Password Change */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-sm font-bold text-slate-700 mb-3">🔑 Change Password</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setPasswordMsg(null); }}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors text-sm"
                          placeholder="Enter new password (min 6 chars)"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Confirm Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMsg(null); }}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors text-sm"
                          placeholder="Confirm new password"
                        />
                      </div>
                      {passwordMsg && (
                        <div className={`p-2.5 rounded-lg text-xs font-medium ${passwordMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {passwordMsg.text}
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={changingPassword || !newPassword}
                        onClick={async () => {
                          if (newPassword.length < 6) { setPasswordMsg({type: 'error', text: 'Password must be at least 6 characters'}); return; }
                          if (newPassword !== confirmPassword) { setPasswordMsg({type: 'error', text: 'Passwords do not match'}); return; }
                          setChangingPassword(true);
                          const { error } = await supabase.auth.updateUser({ password: newPassword });
                          setChangingPassword(false);
                          if (error) { setPasswordMsg({type: 'error', text: error.message}); }
                          else { setPasswordMsg({type: 'success', text: '✅ Password updated successfully!'}); setNewPassword(''); setConfirmPassword(''); }
                        }}
                        className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors disabled:opacity-40"
                      >
                        {changingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                </div>
              </form>
            </div>
        )}

        <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="caregiver-profile-form"
            disabled={saving}
            className="px-6 py-2.5 bg-wellness-blue text-white font-bold rounded-xl hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaregiverProfileModal;
