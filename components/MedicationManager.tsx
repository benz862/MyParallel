import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

interface MedicationManagerProps {
  patientId: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'three_times_daily', label: 'Three times daily' },
  { value: 'every_other_day', label: 'Every other day' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'prn', label: 'As needed (PRN)' },
];

const FORM_OPTIONS = ['tablet', 'capsule', 'liquid', 'patch', 'injection', 'inhaler', 'cream', 'drops', 'suppository', 'other'];
const ROUTE_OPTIONS = ['oral', 'topical', 'sublingual', 'inhaled', 'injection', 'rectal', 'optic', 'otic', 'nasal', 'transdermal'];

const INSTRUCTION_TOGGLES = [
  { key: 'take_with_food', label: 'Take with food', icon: '🍽️' },
  { key: 'take_before_meal', label: 'Take before meals', icon: '⏰' },
  { key: 'take_after_meal', label: 'Take after meals', icon: '🍴' },
  { key: 'empty_stomach', label: 'Take on empty stomach', icon: '🚫' },
  { key: 'take_with_water', label: 'Take with water', icon: '💧' },
  { key: 'morning_only', label: 'Morning only', icon: '🌅' },
  { key: 'afternoon_only', label: 'Afternoon only', icon: '☀️' },
  { key: 'evening_only', label: 'Evening only', icon: '🌆' },
  { key: 'bedtime_only', label: 'Bedtime only', icon: '🌙' },
  { key: 'do_not_crush', label: 'Do not crush', icon: '🔨' },
  { key: 'do_not_split', label: 'Do not split', icon: '✂️' },
  { key: 'do_not_chew', label: 'Do not chew', icon: '🦷' },
  { key: 'avoid_alcohol', label: 'Avoid alcohol', icon: '🍷' },
  { key: 'avoid_dairy', label: 'Avoid dairy', icon: '🥛' },
  { key: 'avoid_grapefruit', label: 'Avoid grapefruit', icon: '🍊' },
  { key: 'monitoring_required', label: 'Monitoring required', icon: '📋' },
];

const emptyInstructions = () => ({
  take_with_food: false, take_before_meal: false, take_after_meal: false,
  empty_stomach: false, take_with_water: false, morning_only: false,
  afternoon_only: false, evening_only: false, bedtime_only: false,
  do_not_crush: false, do_not_split: false, do_not_chew: false,
  avoid_alcohol: false, avoid_dairy: false, avoid_grapefruit: false,
  monitoring_required: false, remain_upright_minutes: 0,
  required_fluid_amount_text: '', food_requirement_note: '', drink_requirement_note: '',
  special_handling_note: '', warning_note: '', monitoring_note: '',
  hold_if_condition_text: '', missed_dose_instructions: '', prn_condition_text: '',
  custom_instruction_note: '', avoid_other_medications_text: '',
});

const MedicationManager: React.FC<MedicationManagerProps> = ({ patientId }) => {
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);

  // Change modal
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeType, setChangeType] = useState('instruction_change');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [changeReason, setChangeReason] = useState('');

  // Form state
  const [master, setMaster] = useState({
    name: '', generic_name: '', brand_name: '', dosage_strength: '',
    strength_unit: 'mg', form: 'tablet', purpose: '', prescriber_name: '',
    pharmacy_name: '', is_prn: false, is_controlled: false,
  });

  const [instructions, setInstructions] = useState<any>(emptyInstructions());

  const [regimen, setRegimen] = useState({
    route: 'oral',
    frequency_type: 'once_daily', specific_times: ['08:00'],
    effective_start_at: new Date().toISOString().split('T')[0],
  });

  const UPLINK_URL = import.meta.env.DEV ? 'http://localhost:8081' : '';

  useEffect(() => { if (patientId) fetchMedications(); }, [patientId]);

  const fetchMedications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${UPLINK_URL}/api/medications/${patientId}`);
      const data = await res.json();
      setMedications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch medications:', err);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setMaster({ name: '', generic_name: '', brand_name: '', dosage_strength: '', strength_unit: 'mg', form: 'tablet', purpose: '', prescriber_name: '', pharmacy_name: '', is_prn: false, is_controlled: false });
    setInstructions(emptyInstructions());
    setRegimen({ route: 'oral', frequency_type: 'once_daily', specific_times: ['08:00'], effective_start_at: new Date().toISOString().split('T')[0] });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!master.name.trim()) return alert('Medication name is required');
    setSaving(true);
    try {
      const res = await fetch(`${UPLINK_URL}/api/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, master: { ...master, dosage_strength: master.dosage_strength || null }, instructions, regimen: { ...regimen, assigned_dose_amount: master.dosage_strength || null, assigned_dose_unit: master.strength_unit, effective_start_at: new Date(regimen.effective_start_at).toISOString() } }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        resetForm();
        fetchMedications();
      } else {
        alert('Failed to save: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Network error saving medication');
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const body: any = { changeType, effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : new Date().toISOString(), changeReason };
      if (changeType === 'instruction_change') body.instructions = instructions;
      else if (changeType === 'dosage_timing_change') body.regimen = { ...regimen, assigned_dose_amount: master.dosage_strength || null, assigned_dose_unit: master.strength_unit };

      const res = await fetch(`${UPLINK_URL}/api/medications/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowChangeModal(false);
        setShowForm(false);
        resetForm();
        fetchMedications();
      }
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleAction = async (assignmentId: string, action: string) => {
    try {
      await fetch(`${UPLINK_URL}/api/medications/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeType: action, changeReason: action === 'discontinue' ? 'Discontinued by caregiver' : 'Placed on hold by caregiver', effectiveDate: new Date().toISOString() }),
      });
      fetchMedications();
    } catch (err) { console.error(err); }
  };

  const openEdit = (med: any) => {
    const m = med.medications_master;
    const v = (med.patient_medication_versions || []).find((ver: any) => ver.is_active) || med.patient_medication_versions?.[0];
    setMaster({ name: m.name, generic_name: m.generic_name || '', brand_name: m.brand_name || '', dosage_strength: String(m.dosage_strength || ''), strength_unit: m.strength_unit || 'mg', form: m.form || 'tablet', purpose: m.purpose || '', prescriber_name: m.prescriber_name || '', pharmacy_name: m.pharmacy_name || '', is_prn: m.is_prn, is_controlled: m.is_controlled });
    if (v?.snapshot_instruction_profile) setInstructions({ ...emptyInstructions(), ...v.snapshot_instruction_profile });
    if (v) setRegimen({ route: v.route || 'oral', frequency_type: v.frequency_type || 'once_daily', specific_times: v.specific_times || ['08:00'], effective_start_at: new Date().toISOString().split('T')[0] });
    setEditingId(med.id);
    setShowForm(true);
  };

  const addTimeSlot = () => setRegimen(prev => ({ ...prev, specific_times: [...prev.specific_times, '12:00'] }));
  const removeTimeSlot = (idx: number) => setRegimen(prev => ({ ...prev, specific_times: prev.specific_times.filter((_, i) => i !== idx) }));
  const updateTime = (idx: number, val: string) => setRegimen(prev => ({ ...prev, specific_times: prev.specific_times.map((t, i) => i === idx ? val : t) }));

  // ──────── RENDER ────────
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Medications</h2>
          <p className="text-sm text-slate-500">{medications.length} active medication{medications.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="px-5 py-2.5 bg-wellness-blue text-white rounded-xl text-sm font-bold shadow hover:bg-sky-600 transition-colors">
          + Add Medication
        </button>
      </div>

      {/* MEDICATION LIST */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading medications...</div>
      ) : medications.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="text-4xl mb-3">💊</div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Medications Yet</h3>
          <p className="text-sm text-slate-500">Click "Add Medication" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map(med => {
            const m = med.medications_master;
            const v = (med.patient_medication_versions || []).find((ver: any) => ver.is_active) || med.patient_medication_versions?.[0];
            const isExpanded = expandedMedId === med.id;
            const statusColor = med.status === 'active' ? 'bg-emerald-100 text-emerald-700' : med.status === 'on_hold' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500';

            return (
              <div key={med.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                {/* Summary Row */}
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpandedMedId(isExpanded ? null : med.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-2xl">💊</div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">{m?.name || 'Unknown'}</div>
                      <div className="text-sm text-slate-500 truncate">
                        {v?.assigned_dose_amount} {v?.assigned_dose_unit} • {FREQUENCY_OPTIONS.find(f => f.value === v?.frequency_type)?.label || v?.frequency_type} • {v?.route}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor}`}>{med.status}</span>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
                    {/* Instructions */}
                    {v?.snapshot_instruction_summary && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Instructions</h4>
                        <div className="space-y-1">
                          {v.snapshot_instruction_summary.split('\n').map((line: string, i: number) => (
                            <div key={i} className="text-sm text-slate-700 flex items-start gap-2">
                              <span className="text-wellness-blue mt-0.5">•</span> {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Schedule */}
                    {v?.specific_times && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Schedule</h4>
                        <div className="flex flex-wrap gap-2">
                          {(v.specific_times || []).map((t: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-sky-50 text-sky-700 rounded-lg text-sm font-semibold border border-sky-100">⏰ {t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {m?.prescriber_name && <div><span className="text-slate-500">Prescriber:</span> <span className="font-medium">{m.prescriber_name}</span></div>}
                      {m?.pharmacy_name && <div><span className="text-slate-500">Pharmacy:</span> <span className="font-medium">{m.pharmacy_name}</span></div>}
                      {m?.purpose && <div className="col-span-2"><span className="text-slate-500">Purpose:</span> <span className="font-medium">{m.purpose}</span></div>}
                      {m?.is_prn && <div><span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-bold border border-purple-100">PRN</span></div>}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                      <button onClick={() => openEdit(med)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">✏️ Edit</button>
                      {med.status === 'active' && (
                        <>
                          <button onClick={() => handleAction(med.id, 'hold')} className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors">⏸ Hold</button>
                          <button onClick={() => { if (window.confirm('Discontinue this medication?')) handleAction(med.id, 'discontinue'); }} className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">🛑 Discontinue</button>
                        </>
                      )}
                      {med.status === 'on_hold' && (
                        <button onClick={() => handleAction(med.id, 'resume')} className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors">▶️ Resume</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ ADD / EDIT FORM MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-sky-50">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? '✏️ Edit Medication' : '💊 Add New Medication'}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* SECTION A — Basic Info */}
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Medication Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Medication Name *</label>
                    <input value={master.name} onChange={e => setMaster(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-wellness-blue focus:border-wellness-blue text-sm" placeholder="e.g. Lisinopril" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Strength</label>
                    <div className="flex gap-2">
                      <input value={master.dosage_strength} onChange={e => setMaster(p => ({ ...p, dosage_strength: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="e.g. 10, 100-12.5, 140/mL" />
                      <select value={master.strength_unit} onChange={e => setMaster(p => ({ ...p, strength_unit: e.target.value }))} className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white">
                        {['mg', 'mg/mL', 'mcg', 'g', 'mL', 'units', 'IU', 'meq', '%'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Form</label>
                    <select value={master.form} onChange={e => setMaster(p => ({ ...p, form: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white">
                      {FORM_OPTIONS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Purpose / Indication</label>
                    <input value={master.purpose} onChange={e => setMaster(p => ({ ...p, purpose: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="e.g. Blood pressure" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Prescriber</label>
                    <input value={master.prescriber_name} onChange={e => setMaster(p => ({ ...p, prescriber_name: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="Dr. Smith" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Pharmacy</label>
                    <input value={master.pharmacy_name} onChange={e => setMaster(p => ({ ...p, pharmacy_name: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="CVS Pharmacy" />
                  </div>
                  <div className="flex items-center gap-4 sm:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={master.is_prn} onChange={e => setMaster(p => ({ ...p, is_prn: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-wellness-blue focus:ring-wellness-blue" />
                      <span className="text-sm font-medium text-slate-700">PRN (as needed)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={master.is_controlled} onChange={e => setMaster(p => ({ ...p, is_controlled: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-wellness-blue focus:ring-wellness-blue" />
                      <span className="text-sm font-medium text-slate-700">Controlled substance</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION B — Instruction Rules */}
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Instruction Rules</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {INSTRUCTION_TOGGLES.map(toggle => (
                    <button key={toggle.key} type="button" onClick={() => setInstructions((p: any) => ({ ...p, [toggle.key]: !p[toggle.key] }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${instructions[toggle.key] ? 'bg-sky-50 border-sky-300 text-sky-700 ring-1 ring-sky-200' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      <span className="text-base">{toggle.icon}</span>
                      <span className="truncate">{toggle.label}</span>
                    </button>
                  ))}
                </div>
                {/* Text instruction fields */}
                <div className="space-y-3">
                  {instructions.remain_upright_minutes !== undefined && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Remain upright (minutes)</label>
                      <input type="number" value={instructions.remain_upright_minutes || ''} onChange={e => setInstructions((p: any) => ({ ...p, remain_upright_minutes: Number(e.target.value) || 0 }))} className="w-32 px-3 py-2 border border-slate-300 rounded-xl text-sm" placeholder="30" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Warning note</label>
                    <input value={instructions.warning_note || ''} onChange={e => setInstructions((p: any) => ({ ...p, warning_note: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="e.g. Monitor for dizziness" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Hold if condition</label>
                    <input value={instructions.hold_if_condition_text || ''} onChange={e => setInstructions((p: any) => ({ ...p, hold_if_condition_text: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="e.g. Blood pressure below 90/60" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Special instructions / notes</label>
                    <textarea value={instructions.custom_instruction_note || ''} onChange={e => setInstructions((p: any) => ({ ...p, custom_instruction_note: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm" rows={2} placeholder="Any additional instructions..." />
                  </div>
                </div>
              </div>

              {/* SECTION C — Regimen */}
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Dosage & Schedule</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Route</label>
                    <select value={regimen.route} onChange={e => setRegimen(p => ({ ...p, route: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white">
                      {ROUTE_OPTIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Frequency</label>
                    <select value={regimen.frequency_type} onChange={e => setRegimen(p => ({ ...p, frequency_type: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white">
                      {FREQUENCY_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                    <input type="date" value={regimen.effective_start_at} onChange={e => setRegimen(p => ({ ...p, effective_start_at: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Administration Times</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {regimen.specific_times.map((t, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input type="time" value={t} onChange={e => updateTime(i, e.target.value)} className="px-3 py-2 border border-slate-300 rounded-xl text-sm" />
                          {regimen.specific_times.length > 1 && (
                            <button type="button" onClick={() => removeTimeSlot(i)} className="w-7 h-7 rounded-full bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100">✕</button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={addTimeSlot} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">+ Time</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50">Cancel</button>
              {editingId ? (
                <button onClick={() => setShowChangeModal(true)} disabled={saving} className="px-5 py-2.5 bg-wellness-blue text-white rounded-xl text-sm font-bold shadow hover:bg-sky-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Apply Changes'}
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-wellness-blue text-white rounded-xl text-sm font-bold shadow hover:bg-sky-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Medication'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CHANGE APPLICATION MODAL ═══ */}
      {showChangeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-800">Apply Medication Change</h3>
            <p className="text-sm text-slate-500">This medication has active scheduled reminders. How should this change be applied?</p>
            <div className="space-y-2">
              {[
                { value: 'instruction_change', label: 'Update instructions on future doses', icon: '📝' },
                { value: 'dosage_timing_change', label: 'Change dosage or timing', icon: '⏰' },
                { value: 'discontinue', label: 'Discontinue this medication', icon: '🛑' },
                { value: 'hold', label: 'Place on temporary hold', icon: '⏸️' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setChangeType(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 ${changeType === opt.value ? 'bg-sky-50 border-sky-300 text-sky-700 ring-1 ring-sky-200' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  <span className="text-lg">{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Effective date</label>
              <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for change</label>
              <input value={changeReason} onChange={e => setChangeReason(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm" placeholder="e.g. Dosage increased per Dr. Smith" />
            </div>
            <p className="text-xs text-slate-400 italic">Note: Past medication logs will remain unchanged for historical accuracy.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowChangeModal(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold">Cancel</button>
              <button onClick={handleUpdate} disabled={saving} className="px-5 py-2.5 bg-wellness-blue text-white rounded-xl text-sm font-bold shadow hover:bg-sky-600 disabled:opacity-50">
                {saving ? 'Applying...' : 'Apply Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationManager;
