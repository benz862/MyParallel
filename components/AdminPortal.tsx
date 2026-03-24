import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CaregiverRow {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  user_profiles?: { full_name: string; phone_number: string; email?: string } | null;
}

const AdminPortal: React.FC<{ companyName: string, agencyId: string }> = ({ companyName, agencyId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'caregivers' | 'patients'>('caregivers');
  const [caregivers, setCaregivers] = useState<CaregiverRow[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [entitlements, setEntitlements] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Edit modal
  const [editingCg, setEditingCg] = useState<CaregiverRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone_number: '' });
  const [saving, setSaving] = useState(false);

  // Upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeType, setUpgradeType] = useState<'caregivers' | 'patients'>('patients');

  // Patient assignment
  const [assigningPatient, setAssigningPatient] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL || '';

  useEffect(() => { fetchAgencyData(); }, [agencyId]);

  const fetchAgencyData = async () => {
    setLoading(true);
    const { data: ent } = await supabase.from('agency_entitlements').select('*').eq('agency_id', agencyId).single();
    setEntitlements(ent || { patient_limit: 3, caregiver_limit: 1, tier_name: 'starter' });

    // Fetch agency_users (no FK join — it fails with PGRST200)
    const { data: rawUsers } = await supabase
      .from('agency_users')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: true });

    // Batch-fetch their profiles separately using user_ids
    const userIds = (rawUsers || []).map(u => u.user_id);
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone_number, email, headshot_url, bio, address_line1, city, state, zip_code, emergency_contact_name, emergency_contact_phone')
        .in('id', userIds);
      if (profiles) {
        for (const p of profiles) { profileMap[p.id] = p; }
      }
    }

    // Merge profiles into the agency_users rows
    const enriched = (rawUsers || []).map(u => ({
      ...u,
      user_profiles: profileMap[u.user_id] || null,
    }));
    setCaregivers(enriched);

    const { data: pts } = await supabase.from('user_profiles').select('*').eq('agency_id', agencyId);
    setPatients(pts || []);
    setLoading(false);
  };

  // ───── INVITE CAREGIVER ─────
  const handleInviteCaregiver = async () => {
    const activeCaregivers = caregivers.filter(c => c.role === 'caregiver');
    if (activeCaregivers.length >= (entitlements?.caregiver_limit || 1)) {
      setUpgradeType('caregivers');
      setShowUpgradeModal(true);
      return;
    }
    setInviteForm({ full_name: '', email: '', phone: '', password: '' });
    setInviteError('');
    setInviteSuccess('');
    setShowInvite(true);
  };

  const submitInvite = async () => {
    if (!inviteForm.email.trim() || !inviteForm.full_name.trim()) {
      setInviteError('Name and email are required.');
      return;
    }
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      // Create the auth user via the server (uses service_role on the backend)
      const res = await fetch(`${apiBase}/api/admin/invite-caregiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agency_id: agencyId,
          email: inviteForm.email.trim(),
          password: inviteForm.password.trim() || 'Welcome123!',
          full_name: inviteForm.full_name.trim(),
          phone_number: inviteForm.phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite caregiver');
      setInviteSuccess(`✅ ${inviteForm.full_name} has been added! They can log in with ${inviteForm.email}`);
      fetchAgencyData();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  // ───── EDIT CAREGIVER ─────
  const openEdit = (cg: CaregiverRow) => {
    setEditingCg(cg);
    setEditForm({
      full_name: cg.user_profiles?.full_name || '',
      phone_number: cg.user_profiles?.phone_number || '',
    });
  };

  const saveEdit = async () => {
    if (!editingCg) return;
    setSaving(true);
    await supabase.from('user_profiles').update({
      full_name: editForm.full_name,
      phone_number: editForm.phone_number,
    }).eq('id', editingCg.user_id);
    setSaving(false);
    setEditingCg(null);
    fetchAgencyData();
  };

  // ───── TOGGLE STATUS / REVOKE ─────
  const toggleStatus = async (cg: CaregiverRow) => {
    const newStatus = cg.status === 'active' ? 'paused' : 'active';
    await supabase.from('agency_users').update({ status: newStatus }).eq('id', cg.id);
    fetchAgencyData();
  };

  const revokeCaregiver = async (cg: CaregiverRow) => {
    if (!window.confirm(`Remove ${cg.user_profiles?.full_name || 'this caregiver'} from the agency? Their patients will be unassigned.`)) return;
    // Unassign patients
    await supabase.from('user_profiles').update({ caregiver_id: null }).eq('caregiver_id', cg.user_id).eq('agency_id', agencyId);
    // Remove the agency_users link
    await supabase.from('agency_users').delete().eq('id', cg.id);
    fetchAgencyData();
  };

  // ───── PATIENT REASSIGNMENT ─────
  const reassignPatient = async (patientId: string, caregiverId: string | null) => {
    // Build the update payload with caregiver_id + legacy fields
    const updateData: Record<string, any> = { caregiver_id: caregiverId };

    if (caregiverId) {
      // Look up the new caregiver's profile to sync legacy fields
      const cg = caregivers.find(c => c.user_id === caregiverId);
      if (cg?.user_profiles) {
        updateData.caregiver_name = cg.user_profiles.full_name || null;
        updateData.caregiver_phone = cg.user_profiles.phone_number || null;
        updateData.caregiver_email = cg.user_profiles.email || null;
      }
    } else {
      // Unassigning — clear the legacy fields
      updateData.caregiver_name = null;
      updateData.caregiver_phone = null;
      updateData.caregiver_email = null;
    }

    await supabase.from('user_profiles').update(updateData).eq('id', patientId);
    setAssigningPatient(null);
    fetchAgencyData();
  };

  // ───── ADD PATIENT ─────
  const handleAddPatient = () => {
    if (patients.length >= (entitlements?.patient_limit || 3)) {
      setUpgradeType('patients');
      setShowUpgradeModal(true);
    } else {
      alert("Opening Patient Intake Form (Integration Pending)");
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading Configuration Engine...</div>;

  const activeCaregivers = caregivers.filter(c => c.role === 'caregiver');
  const teamMembers = caregivers.filter(c => c.role === 'owner' || c.role === 'admin');

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[600px] border border-slate-200">

      {/* Header */}
      <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">{companyName}</h1>
          <p className="text-slate-400 mt-1">Agency Management Portal</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1">Current Tier</div>
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
            {entitlements?.tier_name?.toUpperCase() || 'STARTER'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-8">
        <button
          onClick={() => setActiveTab('caregivers')}
          className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'caregivers' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          👥 Caregiver Roster
        </button>
        <button
          onClick={() => setActiveTab('patients')}
          className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'patients' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          🏥 Patient Network
        </button>
      </div>

      {/* Content */}
      <div className="p-8 bg-slate-50 min-h-[400px]">

        {activeTab === 'caregivers' && (
          <div className="space-y-6">

            {/* Admin/Owner Section */}
            {teamMembers.length > 0 && (
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">🛡️ Administrators</h3>
                <div className="space-y-3">
                  {teamMembers.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.user_profiles?.headshot_url ? (
                          <img src={m.user_profiles.headshot_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-lg font-bold">
                            {(m.user_profiles?.full_name || '?')[0]}
                          </div>
                        )}
                        <div>
                          <div className="font-bold">{m.user_profiles?.full_name || 'Admin'}</div>
                          <div className="text-xs text-slate-300">{m.role.toUpperCase()} • {m.user_profiles?.phone_number || 'No phone'}</div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caregiver Count + Invite */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Caregiver Licenses</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {activeCaregivers.length} of {entitlements?.caregiver_limit} Seats Used
                </p>
              </div>
              <button onClick={handleInviteCaregiver} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow">
                + Add Caregiver
              </button>
            </div>

            {/* Caregiver List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {activeCaregivers.map((cg) => (
                <div key={cg.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative">
                      {cg.user_profiles?.headshot_url ? (
                        <img src={cg.user_profiles.headshot_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-lg font-bold">
                          {(cg.user_profiles?.full_name || '?')[0]}
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${cg.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg">{cg.user_profiles?.full_name || 'Pending Invite...'}</div>
                      <div className="text-sm text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {cg.user_profiles?.phone_number && <span>📞 {cg.user_profiles.phone_number}</span>}
                        <span className={`font-semibold ${cg.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                          {cg.status === 'active' ? '● Active' : '● Paused'}
                        </span>
                        <span className="text-slate-400">
                          Patients: {patients.filter(p => p.caregiver_id === cg.user_id).length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(cg)}
                      className="px-4 py-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg text-xs font-bold transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => toggleStatus(cg)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${cg.status === 'active' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                    >
                      {cg.status === 'active' ? '⏸ Pause' : '▶ Reactivate'}
                    </button>
                    <button
                      onClick={() => revokeCaregiver(cg)}
                      className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
              {activeCaregivers.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-3">👥</div>
                  <div className="text-slate-500 font-medium">No caregivers registered yet</div>
                  <p className="text-sm text-slate-400 mt-1">Click "+ Add Caregiver" above to invite your first team member</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Global Patient Network</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {patients.length} of {entitlements?.patient_limit} Patients Tracked
                </p>
              </div>
              <button onClick={handleAddPatient} className="px-5 py-2.5 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 transition-all shadow">
                + Initialize Patient
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {patients.map((p) => (
                <div key={p.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-bold text-slate-800">{p.full_name}</div>
                    <div className="text-xs text-slate-500 mt-1 flex gap-3">
                      <span>📞 {p.phone_number || 'No phone'}</span>
                      {p.age && <span>Age: {p.age}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-xs text-slate-400 uppercase tracking-wide mr-2">Assigned:</span>
                      <span className="font-bold">
                        {caregivers.find(c => c.user_id === p.caregiver_id)?.user_profiles?.full_name || 'Unassigned'}
                      </span>
                    </div>
                    {assigningPatient === p.id ? (
                      <div className="flex gap-2 items-center">
                        <select
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
                          defaultValue={p.caregiver_id || ''}
                          onChange={(e) => reassignPatient(p.id, e.target.value || null)}
                        >
                          <option value="">Unassigned</option>
                          {caregivers.filter(c => c.role === 'caregiver' && c.status === 'active').map(c => (
                            <option key={c.user_id} value={c.user_id}>{c.user_profiles?.full_name}</option>
                          ))}
                        </select>
                        <button onClick={() => setAssigningPatient(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningPatient(p.id)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-sm"
                      >
                        Reassign
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {patients.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-3">🏥</div>
                  <div className="text-slate-500 font-medium">No patients initialized</div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ──── INVITE CAREGIVER MODAL ──── */}
      {showInvite && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowInvite(false)} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 font-bold">✕</button>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Add Caregiver</h2>
            <p className="text-sm text-slate-500 mb-6">Create an account for a new caregiver on your team. They'll be able to log in and manage assigned patients.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Full Name *</label>
                <input value={inviteForm.full_name} onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Email *</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none" placeholder="jane@agency.com" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Phone Number</label>
                <input type="tel" value={inviteForm.phone} onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none" placeholder="+1 555-123-4567" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Initial Password</label>
                <input type="text" value={inviteForm.password} onChange={e => setInviteForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none" placeholder="Welcome123! (default)" />
                <p className="text-xs text-slate-400 mt-1">The caregiver can change this after first login.</p>
              </div>
            </div>

            {inviteError && <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{inviteError}</div>}
            {inviteSuccess && <div className="mt-4 p-3 rounded-xl bg-green-50 text-green-700 text-sm font-medium">{inviteSuccess}</div>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={submitInvite} disabled={inviting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-lg">
                {inviting ? 'Creating...' : 'Add Caregiver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── EDIT CAREGIVER MODAL ──── */}
      {editingCg && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
            <button onClick={() => setEditingCg(null)} className="absolute top-5 right-5 z-10 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 font-bold">✕</button>

            {/* Header with headshot */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex items-center gap-4">
              {editingCg.user_profiles?.headshot_url ? (
                <img src={editingCg.user_profiles.headshot_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                  {(editingCg.user_profiles?.full_name || '?')[0]}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{editingCg.user_profiles?.full_name || 'Caregiver'}</h2>
                <p className="text-sm text-slate-300">Caregiver Profile</p>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Full Name</label>
                  <input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Phone</label>
                  <input value={editForm.phone_number} onChange={e => setEditForm(f => ({ ...f, phone_number: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none text-sm" />
                </div>
              </div>

              {/* Read-only info from their profile */}
              {editingCg.user_profiles?.bio && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Bio</label>
                  <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600">{editingCg.user_profiles.bio}</div>
                </div>
              )}
              {(editingCg.user_profiles?.address_line1 || editingCg.user_profiles?.city) && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">📍 Address</label>
                  <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600">
                    {editingCg.user_profiles.address_line1 && <div>{editingCg.user_profiles.address_line1}</div>}
                    {editingCg.user_profiles.city && <div>{editingCg.user_profiles.city}{editingCg.user_profiles.state ? `, ${editingCg.user_profiles.state}` : ''} {editingCg.user_profiles.zip_code || ''}</div>}
                  </div>
                </div>
              )}
              {editingCg.user_profiles?.emergency_contact_name && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">🚨 Emergency Contact</label>
                  <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600">
                    {editingCg.user_profiles.emergency_contact_name} — {editingCg.user_profiles.emergency_contact_phone || 'No phone'}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Assigned Patients</label>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                  {patients.filter(p => p.caregiver_id === editingCg.user_id).length === 0
                    ? <span className="text-sm text-slate-400">No patients assigned</span>
                    : patients.filter(p => p.caregiver_id === editingCg.user_id).map(p => (
                        <span key={p.id} className="inline-block px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold mr-2 mb-1">{p.full_name}</span>
                      ))
                  }
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3">
              <button onClick={() => setEditingCg(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 transition-colors disabled:opacity-50 shadow-lg">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── UPGRADE MODAL ──── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500"></div>
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 font-bold">✕</button>
            <div className="text-center mt-4">
              <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">⚡</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Capacity Limit Reached</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Your agency has reached the maximum number of <strong>{upgradeType}</strong> on the{' '}
                <span className="font-bold text-slate-800">{entitlements?.tier_name?.charAt(0).toUpperCase() + entitlements?.tier_name?.slice(1)} Tier</span>.
                Upgrade your subscription to unlock additional capacity!
              </p>
              <button onClick={() => window.location.href = '/checkout/plan'}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-xl hover:bg-slate-800 transition-all">
                Upgrade Plan
              </button>
              <button onClick={() => setShowUpgradeModal(false)}
                className="w-full py-4 mt-3 bg-white text-slate-500 hover:text-slate-800 font-bold rounded-xl transition-colors">
                Not Right Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPortal;
