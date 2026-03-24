-- Caregiver Profile Portal: Schema Extensions
-- Run in Supabase SQL Editor

-- 1. Add caregiver-specific columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS headshot_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- 2. Create caregiver_documents table for certificates/licenses
CREATE TABLE IF NOT EXISTS caregiver_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL DEFAULT 'certificate', -- certificate, license, training, other
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    expiration_date DATE,
    notes TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE caregiver_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON caregiver_documents;
CREATE POLICY "allow_all" ON caregiver_documents FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_caregiver_docs_user ON caregiver_documents(user_id);
