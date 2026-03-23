-- Patient Contacts Directory: doctors, family, friends
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS patient_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL DEFAULT 'family',  -- doctor | family | friend
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  relationship TEXT,        -- e.g. "Son", "Daughter", "Neighbor", "Best Friend"
  specialty TEXT,            -- for doctors: "Cardiologist", "Primary Care"
  clinic_name TEXT,          -- for doctors: "St. Mary's Hospital"
  notes TEXT,                -- any extra info ("only available Mon-Fri")
  is_primary BOOLEAN DEFAULT false,  -- mark primary doctor, primary family contact
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_contacts_patient ON patient_contacts(patient_id);
