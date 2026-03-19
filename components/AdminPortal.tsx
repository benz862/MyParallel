import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

const AdminPortal: React.FC<{ companyName: string, agencyId: string }> = ({ companyName, agencyId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'caregivers' | 'patients'>('caregivers');
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [entitlements, setEntitlements] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeType, setUpgradeType] = useState<'caregivers' | 'patients'>('patients');

  useEffect(() => {
    fetchAgencyData();
  }, [agencyId]);

  const fetchAgencyData = async () => {
    setLoading(true);
    // Fetch Entitlements
    const { data: ent } = await supabase.from('agency_entitlements').select('*').eq('agency_id', agencyId).single();
    setEntitlements(ent || { patient_limit: 3, caregiver_limit: 1, tier_name: 'starter' });

    // Fetch Caregivers
    const { data: cgs } = await supabase
      .from('agency_users')
      .select('*, user_profiles!agency_users_user_id_fkey(full_name, phone_number)')
      .eq('agency_id', agencyId)
      .eq('role', 'caregiver');
    setCaregivers(cgs || []);

    // Fetch Patients
    const { data: pts } = await supabase.from('user_profiles').select('*').eq('agency_id', agencyId);
    setPatients(pts || []);
    
    setLoading(false);
  };

  const handleAddPatientClick = () => {
    if (patients.length >= (entitlements?.patient_limit || 3)) {
       setUpgradeType('patients');
       setShowUpgradeModal(true);
    } else {
       // Open standard intake form
       alert("Opening Patient Intake Form (Integration Pending)");
    }
  };

  const handleAddCaregiverClick = () => {
    if (caregivers.length >= (entitlements?.caregiver_limit || 1)) {
       setUpgradeType('caregivers');
       setShowUpgradeModal(true);
    } else {
       alert("Opening Caregiver Invite Modal (Integration Pending)");
    }
  };

  const toggleCaregiverStatus = async (caregiverId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await supabase.from('agency_users').update({ status: newStatus }).eq('id', caregiverId);
    fetchAgencyData();
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading Configuration Engine...</div>;

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
                {entitlements?.tier_name.toUpperCase()}
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-8">
         <button 
           onClick={() => setActiveTab('caregivers')}
           className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'caregivers' ? 'border-wellness-blue text-wellness-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
         >
           Caregiver Roster
         </button>
         <button 
           onClick={() => setActiveTab('patients')}
           className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'patients' ? 'border-wellness-blue text-wellness-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
         >
           Patient Network
         </button>
      </div>

      {/* Content */}
      <div className="p-8 bg-slate-50 min-h-[400px]">
         
         {activeTab === 'caregivers' && (
             <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Caregiver Licenses</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {caregivers.length} of {entitlements?.caregiver_limit} Seats Used
                        </p>
                    </div>
                    <button onClick={handleAddCaregiverClick} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow">
                        + Invite Caregiver
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    {caregivers.map((cg) => (
                        <div key={cg.id} className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-3 rounded-full ${cg.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <div>
                                    <div className="font-bold text-slate-800">{cg.user_profiles?.full_name || 'Pending Invite...'}</div>
                                    <div className="text-xs text-slate-500 font-medium">ID: {cg.user_id.split('-')[0]}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                   onClick={() => toggleCaregiverStatus(cg.id, cg.status)}
                                   className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${cg.status === 'active' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                >
                                   {cg.status === 'active' ? 'Pause Access' : 'Reactivate Route'}
                                </button>
                                <button className="px-4 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">
                                   Revoke
                                </button>
                            </div>
                        </div>
                    ))}
                    {caregivers.length === 0 && <div className="p-8 text-center text-slate-400 font-medium">No Caregivers Registered</div>}
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
                    <button onClick={handleAddPatientClick} className="px-5 py-2.5 bg-wellness-blue text-white rounded-xl font-bold hover:bg-sky-600 transition-all shadow">
                        + Initialize Patient
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    {patients.map((p) => (
                        <div key={p.id} className="p-5 flex items-center justify-between hover:bg-slate-50">
                            <div>
                                <div className="font-bold text-slate-800">{p.full_name}</div>
                                <div className="text-xs text-slate-500 mt-1">📞 {p.phone_number}</div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                    <span className="text-xs text-slate-400 uppercase tracking-wide mr-2">Assigned To:</span>
                                    <span className="font-bold">{caregivers.find(c => c.user_id === p.caregiver_id)?.user_profiles?.full_name || 'Unassigned'}</span>
                                </div>
                                <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-sm">
                                    Reassign
                                </button>
                            </div>
                        </div>
                    ))}
                    {patients.length === 0 && <div className="p-8 text-center text-slate-400 font-medium">No Patients Initialized</div>}
                </div>
             </div>
         )}

      </div>

      {/* Stripe Capacity Upgrade Modal */}
      {showUpgradeModal && (
          <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                  <button onClick={() => setShowUpgradeModal(false)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 font-bold transition-colors">✕</button>
                  
                  <div className="text-center mt-4">
                      <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                          ⚡
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-3">Capacity Limit Reached</h2>
                      <p className="text-slate-600 mb-8 leading-relaxed">
                          Your Agency has reached the maximum permitted number of <strong>{upgradeType}</strong> on the <span className="font-bold text-slate-800">{entitlements?.tier_name.charAt(0).toUpperCase() + entitlements?.tier_name.slice(1)} Tier</span>. 
                          Upgrade your Stripe subscription to instantly unlock additional licensing capacity!
                      </p>
                      
                      <button 
                         onClick={() => window.location.href = '/checkout/plan'}
                         className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
                      >
                          Upgrade Plan via Stripe
                      </button>
                      <button 
                         onClick={() => setShowUpgradeModal(false)}
                         className="w-full py-4 mt-3 bg-white text-slate-500 hover:text-slate-800 font-bold rounded-xl transition-colors"
                      >
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
