import React, { useState, useEffect, useCallback } from 'react';

interface Contact {
  id: string;
  patient_id: string;
  contact_type: string;
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  specialty: string | null;
  clinic_name: string | null;
  notes: string | null;
  is_primary: boolean;
}

interface ContactsDirectoryProps {
  patientId: string;
}

const CONTACT_TYPES = [
  { value: 'doctor', label: '🩺 Doctor', color: '#ef4444' },
  { value: 'family', label: '👨‍👩‍👧 Family', color: '#3b82f6' },
  { value: 'friend', label: '👋 Friend', color: '#8b5cf6' },
];

const ContactsDirectory: React.FC<ContactsDirectoryProps> = ({ patientId }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>('all');

  // Form state
  const [contactType, setContactType] = useState('family');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [notes, setNotes] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient-contacts/${patientId}`);
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const resetForm = () => {
    setContactType('family'); setName(''); setPhone(''); setEmail('');
    setRelationship(''); setSpecialty(''); setClinicName('');
    setNotes(''); setIsPrimary(false); setEditingId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = {
      patient_id: patientId, contact_type: contactType, name: name.trim(),
      phone: phone.trim() || null, email: email.trim() || null,
      relationship: relationship.trim() || null,
      specialty: specialty.trim() || null,
      clinic_name: clinicName.trim() || null,
      notes: notes.trim() || null, is_primary: isPrimary
    };
    try {
      if (editingId) {
        await fetch(`/api/patient-contacts/${editingId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/patient-contacts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      resetForm(); fetchContacts();
    } catch (err) { console.error(err); }
  };

  const startEdit = (c: Contact) => {
    setContactType(c.contact_type); setName(c.name);
    setPhone(c.phone || ''); setEmail(c.email || '');
    setRelationship(c.relationship || ''); setSpecialty(c.specialty || '');
    setClinicName(c.clinic_name || ''); setNotes(c.notes || '');
    setIsPrimary(c.is_primary); setEditingId(c.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this contact?')) return;
    await fetch(`/api/patient-contacts/${id}`, { method: 'DELETE' });
    fetchContacts();
  };

  const filtered = activeType === 'all' ? contacts : contacts.filter(c => c.contact_type === activeType);
  const getTypeInfo = (type: string) => CONTACT_TYPES.find(t => t.value === type);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-semibold text-slate-900">📇 Contacts Directory</h3>
          <p className="text-sm text-slate-500 mt-1">Doctors, family & friends — the VA can share these with your patient</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
        >
          + Add Contact
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveType('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            activeType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >All ({contacts.length})</button>
        {CONTACT_TYPES.map(t => {
          const count = contacts.filter(c => c.contact_type === t.value).length;
          return (
            <button key={t.value} onClick={() => setActiveType(t.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                activeType === t.value ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              style={activeType === t.value ? { backgroundColor: t.color } : {}}
            >{t.label.split(' ')[0]} {t.label.split(' ').slice(1).join(' ')} ({count})</button>
          );
        })}
      </div>

      {/* Contact List */}
      {loading ? (
        <p className="text-sm text-slate-400 py-4 text-center">Loading...</p>
      ) : filtered.length === 0 && !showForm ? (
        <div className="text-center py-6 text-slate-400">
          <p className="text-2xl mb-2">📇</p>
          <p className="text-sm">No contacts yet. Add doctors, family, or friends.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const typeInfo = getTypeInfo(c.contact_type);
            return (
              <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
                {/* Type Badge */}
                <span className="text-xs font-bold px-2 py-1 rounded-full text-white flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: typeInfo?.color || '#64748b' }}
                >
                  {typeInfo?.label.split(' ')[0]}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">
                      {c.contact_type === 'doctor' ? `Dr. ${c.name}` : c.name}
                    </span>
                    {c.is_primary && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">⭐ Primary</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                    {c.contact_type === 'doctor' && c.specialty && <p>🏥 {c.specialty}{c.clinic_name ? ` — ${c.clinic_name}` : ''}</p>}
                    {c.contact_type !== 'doctor' && c.relationship && <p>👤 {c.relationship}</p>}
                    {c.phone && <p>📞 {c.phone}</p>}
                    {c.email && <p>✉️ {c.email}</p>}
                    {c.notes && <p className="italic text-slate-400">📝 {c.notes}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(c)} className="text-slate-400 hover:text-blue-500 p-1" title="Edit">✏️</button>
                  <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-500 p-1" title="Delete">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/30">
          <h4 className="font-semibold text-sm text-slate-700 mb-3">
            {editingId ? '✏️ Edit Contact' : '➕ New Contact'}
          </h4>
          <div className="space-y-3">
            {/* Type Selector */}
            <div className="flex gap-2">
              {CONTACT_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setContactType(t.value)}
                  className={`text-xs px-3 py-2 rounded-lg font-medium transition-all ${
                    contactType === t.value ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  style={contactType === t.value ? { backgroundColor: t.color } : {}}
                >{t.label}</button>
              ))}
            </div>

            {/* Name + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder={contactType === 'doctor' ? "Doctor's name (e.g. Smith)" : "Full name"}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-400"
              />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Conditional fields */}
            {contactType === 'doctor' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={specialty} onChange={e => setSpecialty(e.target.value)}
                  placeholder="Specialty (e.g. Cardiologist)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-400"
                />
                <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)}
                  placeholder="Clinic / Hospital name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ) : (
              <input type="text" value={relationship} onChange={e => setRelationship(e.target.value)}
                placeholder={contactType === 'family' ? "Relationship (e.g. Daughter, Son)" : "How they know the patient"}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-400"
              />
            )}

            {/* Email + Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-400"
              />
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notes (e.g. only available Mon-Fri)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Primary checkbox */}
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-400"
              />
              ⭐ Mark as primary contact
            </label>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={!name.trim()}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {editingId ? 'Update' : 'Save Contact'}
              </button>
              <button onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsDirectory;
