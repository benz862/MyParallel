import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

const CSV_TEMPLATE_CONTENT = `Full Name,Phone Number,Age,Caregiver Name,Caregiver Phone,Conditions (comma separated inside quotes),Voice ID (Puck/Aoede/Charon)
Jane Doe,+15551234567,82,Mark Doe,+15559876543,"Hypertension, Diabetes",Puck`;

export const BulkPatientUploader: React.FC = () => {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<string>('');
    const UPLINK_URL = import.meta.env.DEV ? 'http://localhost:8081' : '';

    const triggerStaticDownload = () => {
        const csvContent = `Full Name,Preferred Name,Phone Number,Age,Timezone,Voice ID,Personality,Caregiver Name,Caregiver Phone,Caregiver Email,Emergency Contact Name,Emergency Contact Phone,Conditions (comma separated inside quotes),Medications (comma separated inside quotes),Notes\nJane Doe,Janie,+15551234567,82,America/New_York,Puck,Supportive Companion,Mark Doe,+15559876543,mark@example.com,Sarah Doe,+15553334444,"Hypertension, Diabetes","Lisinopril 10mg, Metformin 500mg","Patient prefers morning calls"`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Patient_Upload_Template.csv';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
    };

    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !user) return;
        setIsProcessing(true);
        setStatus('Parsing CSV...');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                
                const parseCSVLine = (line: string) => {
                    const result = [];
                    let cur = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (inQuotes) {
                            if (char === '"') {
                                if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
                                else { inQuotes = false; }
                            } else { cur += char; }
                        } else {
                            if (char === '"') inQuotes = true;
                            else if (char === ',') { result.push(cur.trim()); cur = ''; }
                            else cur += char;
                        }
                    }
                    result.push(cur.trim());
                    return result;
                };

                const rows = text.split('\n').map(parseCSVLine).filter(r => r.length > 0 && r.join('').trim() !== '');

                // Drop header row length > 0
                if (rows.length < 2) {
                    setStatus('Error: CSV must contain at least one data row.');
                    setIsProcessing(false);
                    return;
                }

                const headerRow = rows[0];
                const isLegacy = headerRow.length <= 8; // Safely detect if they uploaded the older 7/8 column format
                const dataRows = rows.slice(1);

                const patientsToInsert = dataRows.map(row => {
                    if (isLegacy) {
                        return {
                            caregiver_id: user.id,
                            full_name: row[0] || 'Unknown Patient',
                            preferred_name: null,
                            phone_number: row[1] || `+${Math.floor(Math.random()*1000000000)}`,
                            age: parseInt(row[2]) || null,
                            timezone: 'America/New_York',
                            voice_id: row[6] || 'Puck',
                            emotional_trait: 'Supportive Companion',
                            caregiver_name: row[3] || '',
                            caregiver_phone: row[4] || '',
                            caregiver_email: null,
                            emergency_contact_name: null,
                            emergency_contact_phone: null,
                            conditions: row[5] ? row[5].split(',').map((c: string) => c.trim()) : [],
                            medications: [],
                            notes: null
                        };
                    } else {
                        return {
                            caregiver_id: user.id,
                            full_name: row[0] || 'Unknown Patient',
                            preferred_name: row[1] || null,
                            phone_number: row[2] || `+${Math.floor(Math.random()*1000000000)}`,
                            age: parseInt(row[3]) || null,
                            timezone: row[4] || 'America/New_York',
                            voice_id: row[5] || 'Puck',
                            emotional_trait: row[6] || 'Supportive Companion',
                            caregiver_name: row[7] || '',
                            caregiver_phone: row[8] || '',
                            caregiver_email: row[9] || null,
                            emergency_contact_name: row[10] || null,
                            emergency_contact_phone: row[11] || null,
                            conditions: row[12] ? row[12].split(',').map((c: string) => c.trim()) : [],
                            // Force strict JSONB mapping for medications array!
                            medications: row[13] ? row[13].split(',').map((c: string) => ({ name: c.trim(), dosage: "", schedule: "" })) : [],
                            notes: row[14] || null
                        };
                    }
                });

                setStatus(`Inserting ${patientsToInsert.length} patients...`);

                const { error } = await supabase.from('user_profiles').insert(patientsToInsert);
                if (error) throw error;

                setStatus(`Success! Successfully boarded ${patientsToInsert.length} Caregiver Patients.`);
                setFile(null);
            } catch (err: any) {
                console.error(err);
                setStatus('Error: ' + err.message);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
            setStatus('Failed to read file.');
            setIsProcessing(false);
        };
        reader.readAsText(file);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="text-xl font-bold text-slate-800">Bulk Patient Onboarding</h3>
                   <p className="text-sm text-slate-500 mt-1">Upload a CSV roster to instantly generate and link new AI companions.</p>
                </div>
                <button 
                  onClick={triggerStaticDownload}
                  type="button"
                  className="px-4 py-2 text-wellness-blue bg-blue-50 border border-blue-100 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-sm inline-flex items-center"
                >
                    ↓ Download CSV Template
                </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center transition-colors hover:border-wellness-blue hover:bg-slate-50">
                    <input 
                       type="file" 
                       accept=".csv"
                       onChange={(e) => setFile(e.target.files?.[0] || null)}
                       className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-wellness-blue file:text-white hover:file:bg-sky-700 cursor-pointer"
                    />
                </div>
                
                {status && (
                    <div className={`p-3 rounded-lg text-sm font-medium ${status.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                        {status}
                    </div>
                )}

                <div className="flex justify-end">
                    <button 
                       type="submit" 
                       disabled={!file || isProcessing}
                       className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Processing Batch...' : 'Begin Bulk Upload'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BulkPatientUploader;
