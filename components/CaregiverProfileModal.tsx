import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CaregiverProfileModalProps {
  onClose: () => void;
}

interface CaregiverDoc {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size: number;
  expiration_date: string | null;
  notes: string | null;
  uploaded_at: string;
}

const CaregiverProfileModal: React.FC<CaregiverProfileModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'personal' | 'documents' | 'security'>('personal');

  // Personal info
  const [profile, setProfile] = useState({
    full_name: '', phone_number: '',
    address_line1: '', address_line2: '', city: '', state: '', zip_code: '',
    bio: '', date_of_birth: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    headshot_url: '',
  });

  // Agency
  const [agencyData, setAgencyData] = useState<{name: string, role: string} | null>(null);

  // Headshot
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Documents
  const [docs, setDocs] = useState<CaregiverDoc[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docForm, setDocForm] = useState({ document_name: '', document_type: 'certificate', expiration_date: '', notes: '' });
  const docInputRef = useRef<HTMLInputElement>(null);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => { fetchAll(); }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);

    // Profile
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('full_name, phone_number, address_line1, address_line2, city, state, zip_code, bio, date_of_birth, emergency_contact_name, emergency_contact_phone, headshot_url')
      .eq('id', user.id)
      .maybeSingle();
    if (userData) {
      setProfile({
        full_name: userData.full_name || '', phone_number: userData.phone_number || '',
        address_line1: userData.address_line1 || '', address_line2: userData.address_line2 || '',
        city: userData.city || '', state: userData.state || '', zip_code: userData.zip_code || '',
        bio: userData.bio || '', date_of_birth: userData.date_of_birth || '',
        emergency_contact_name: userData.emergency_contact_name || '',
        emergency_contact_phone: userData.emergency_contact_phone || '',
        headshot_url: userData.headshot_url || '',
      });
    }

    // Agency
    const { data: agencyUser } = await supabase
      .from('agency_users').select('role, agencies(name)')
      .eq('user_id', user.id).maybeSingle();
    if (agencyUser?.agencies) {
      const name = Array.isArray(agencyUser.agencies) ? (agencyUser.agencies[0] as any)?.name : (agencyUser.agencies as any).name;
      setAgencyData({ name: name || 'Agency', role: agencyUser.role });
    }

    // Documents
    const { data: docData } = await supabase
      .from('caregiver_documents').select('*')
      .eq('user_id', user.id).order('uploaded_at', { ascending: false });
    setDocs(docData || []);

    setLoading(false);
  };

  // ───── SAVE PERSONAL INFO ─────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase.from('user_profiles').upsert([{
      id: user.id, ...profile, updated_at: new Date().toISOString(),
    }], { onConflict: 'id' });
    setSaving(false);
  };

  // ───── HEADSHOT UPLOAD ─────
  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    setUploadingPhoto(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `headshots/${user.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from('parallel_files').upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploadingPhoto(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('parallel_files').getPublicUrl(path);
    await supabase.from('user_profiles').update({ headshot_url: publicUrl }).eq('id', user.id);
    setProfile(p => ({ ...p, headshot_url: publicUrl }));
    setUploadingPhoto(false);
  };

  // ───── DOCUMENT UPLOAD ─────
  const handleDocUpload = async (file: File) => {
    if (!user || !docForm.document_name.trim()) { alert('Please enter a document name first'); return; }
    setUploadingDoc(true);
    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `documents/${user.id}/${ts}_${safeName}`;
    const { error: upErr } = await supabase.storage.from('parallel_files').upload(path, file, { contentType: file.type });
    if (upErr) { alert('Upload failed: ' + upErr.message); setUploadingDoc(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('parallel_files').getPublicUrl(path);
    await supabase.from('caregiver_documents').insert({
      user_id: user.id,
      document_type: docForm.document_type,
      document_name: docForm.document_name.trim(),
      file_url: publicUrl,
      file_size: file.size,
      expiration_date: docForm.expiration_date || null,
      notes: docForm.notes || null,
    });
    setDocForm({ document_name: '', document_type: 'certificate', expiration_date: '', notes: '' });
    setUploadingDoc(false);
    fetchAll();
  };

  const deleteDoc = async (doc: CaregiverDoc) => {
    if (!window.confirm(`Delete "${doc.document_name}"?`)) return;
    await supabase.from('caregiver_documents').delete().eq('id', doc.id);
    setDocs(d => d.filter(x => x.id !== doc.id));
  };

  const formatFileSize = (bytes: number) => bytes < 1024 ? bytes + 'B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + 'KB' : (bytes / 1048576).toFixed(1) + 'MB';

  if (loading) return (
    <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-3xl p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto"></div><p className="mt-4 text-slate-500">Loading Profile...</p></div>
    </div>
  );

  const tabs = [
    { id: 'personal' as const, label: '👤 Personal Info', icon: '👤' },
    { id: 'documents' as const, label: '📄 Certificates', icon: '📄' },
    { id: 'security' as const, label: '🔐 Security', icon: '🔐' },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Headshot */}
            <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
              {profile.headshot_url ? (
                <img src={profile.headshot_url} alt="Headshot" className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                  {(profile.full_name || '?')[0]}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold">{uploadingPhoto ? '...' : '📷'}</span>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.full_name || 'Caregiver Profile'}</h2>
              {agencyData && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">{agencyData.name}</span>
                  <span className="px-2 py-0.5 bg-white/10 rounded text-xs font-bold uppercase">{agencyData.role}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✕</button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveSection(t.id)}
              className={`px-4 py-3 text-sm font-bold transition-colors border-b-2 ${activeSection === t.id ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ═══ PERSONAL INFO TAB ═══ */}
          {activeSection === 'personal' && (
            <form id="profile-form" onSubmit={handleSave} className="space-y-5">
              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name *" value={profile.full_name} onChange={v => setProfile(p => ({ ...p, full_name: v }))} placeholder="Jane Smith" required />
                <Field label="Phone Number *" value={profile.phone_number} onChange={v => setProfile(p => ({ ...p, phone_number: v }))} placeholder="+1 555-123-4567" type="tel" required />
              </div>

              {/* Date of Birth */}
              <Field label="Date of Birth" value={profile.date_of_birth} onChange={v => setProfile(p => ({ ...p, date_of_birth: v }))} type="date" />

              {/* Address */}
              <div className="pt-2">
                <h3 className="text-sm font-bold text-slate-700 mb-3">📍 Address</h3>
                <div className="space-y-3">
                  <Field label="Street Address" value={profile.address_line1} onChange={v => setProfile(p => ({ ...p, address_line1: v }))} placeholder="123 Main St" />
                  <Field label="Apt / Suite / Unit" value={profile.address_line2} onChange={v => setProfile(p => ({ ...p, address_line2: v }))} placeholder="Apt 4B" />
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="City" value={profile.city} onChange={v => setProfile(p => ({ ...p, city: v }))} placeholder="Springfield" />
                    <Field label="State" value={profile.state} onChange={v => setProfile(p => ({ ...p, state: v }))} placeholder="IL" />
                    <Field label="ZIP Code" value={profile.zip_code} onChange={v => setProfile(p => ({ ...p, zip_code: v }))} placeholder="62701" />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-2">
                <h3 className="text-sm font-bold text-slate-700 mb-3">🚨 Emergency Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Contact Name" value={profile.emergency_contact_name} onChange={v => setProfile(p => ({ ...p, emergency_contact_name: v }))} placeholder="John Smith" />
                  <Field label="Contact Phone" value={profile.emergency_contact_phone} onChange={v => setProfile(p => ({ ...p, emergency_contact_phone: v }))} placeholder="+1 555-987-6543" type="tel" />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Bio / About</label>
                <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors resize-none"
                  rows={3} placeholder="Brief professional bio, experience, specializations..." />
              </div>
            </form>
          )}

          {/* ═══ DOCUMENTS TAB ═══ */}
          {activeSection === 'documents' && (
            <div className="space-y-6">
              {/* Upload Form */}
              <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-sky-800 mb-4">📤 Upload Certificate or License</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Document Name *" value={docForm.document_name} onChange={v => setDocForm(f => ({ ...f, document_name: v }))} placeholder="CPR Certification" />
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Type</label>
                      <select value={docForm.document_type} onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500">
                        <option value="certificate">Certificate</option>
                        <option value="license">License</option>
                        <option value="training">Training</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Expiration Date" value={docForm.expiration_date} onChange={v => setDocForm(f => ({ ...f, expiration_date: v }))} type="date" />
                    <Field label="Notes" value={docForm.notes} onChange={v => setDocForm(f => ({ ...f, notes: v }))} placeholder="Issued by..." />
                  </div>
                  <button type="button" disabled={uploadingDoc || !docForm.document_name.trim()}
                    onClick={() => docInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-sky-300 rounded-xl text-sm font-bold text-sky-600 hover:bg-sky-100 transition-colors disabled:opacity-40">
                    {uploadingDoc ? 'Uploading...' : '📎 Choose File & Upload'}
                  </button>
                  <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" 
                    onChange={e => e.target.files?.[0] && handleDocUpload(e.target.files[0])} />
                </div>
              </div>

              {/* Document List */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">📋 Your Documents ({docs.length})</h3>
                {docs.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-sm text-slate-400">No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docs.map(doc => {
                      const isExpired = doc.expiration_date && new Date(doc.expiration_date) < new Date();
                      const typeColors: Record<string, string> = {
                        certificate: 'bg-green-100 text-green-700',
                        license: 'bg-blue-100 text-blue-700',
                        training: 'bg-purple-100 text-purple-700',
                        other: 'bg-slate-100 text-slate-600',
                      };
                      return (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-2xl flex-shrink-0">
                              {doc.file_url.endsWith('.pdf') ? '📑' : '📄'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">{doc.document_name}</div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${typeColors[doc.document_type] || typeColors.other}`}>
                                  {doc.document_type}
                                </span>
                                {doc.file_size && <span className="text-xs text-slate-400">{formatFileSize(doc.file_size)}</span>}
                                {doc.expiration_date && (
                                  <span className={`text-xs font-semibold ${isExpired ? 'text-red-500' : 'text-slate-500'}`}>
                                    {isExpired ? '⚠️ Expired' : 'Exp:'} {doc.expiration_date}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs font-bold hover:bg-sky-100 transition-colors">
                              View
                            </a>
                            <button onClick={() => deleteDoc(doc)}
                              className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ SECURITY TAB ═══ */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              {/* Email Display */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-2">Account Email</p>
                <div className="px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-600 font-mono select-all">
                  {user?.email}
                </div>
              </div>

              {/* Password Change */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-700 mb-4">🔑 Change Password</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">New Password</label>
                    <input type="password" value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setPasswordMsg(null); }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 text-sm"
                      placeholder="Min 6 characters" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Confirm Password</label>
                    <input type="password" value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setPasswordMsg(null); }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 text-sm"
                      placeholder="Confirm new password" />
                  </div>
                  {passwordMsg && (
                    <div className={`p-2.5 rounded-xl text-xs font-medium ${passwordMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {passwordMsg.text}
                    </div>
                  )}
                  <button type="button" disabled={changingPassword || !newPassword}
                    onClick={async () => {
                      if (newPassword.length < 6) { setPasswordMsg({type:'error',text:'Password must be at least 6 characters'}); return; }
                      if (newPassword !== confirmPassword) { setPasswordMsg({type:'error',text:'Passwords do not match'}); return; }
                      setChangingPassword(true);
                      const { error } = await supabase.auth.updateUser({ password: newPassword });
                      setChangingPassword(false);
                      if (error) setPasswordMsg({type:'error',text:error.message});
                      else { setPasswordMsg({type:'success',text:'✅ Password updated!'}); setNewPassword(''); setConfirmPassword(''); }
                    }}
                    className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors disabled:opacity-40">
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors">
            Close
          </button>
          {activeSection === 'personal' && (
            <button type="submit" form="profile-form" disabled={saving}
              className="px-6 py-2.5 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Reusable Field Component ───
const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }> = 
  ({ label, value, onChange, placeholder, type = 'text', required }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors text-sm"
      placeholder={placeholder} />
  </div>
);

export default CaregiverProfileModal;
