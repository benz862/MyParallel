-- Create user_profiles table
-- Note: id should match auth.users.id for authenticated users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  age INTEGER,
  caregiver_name TEXT,
  caregiver_phone TEXT,
  caregiver_email TEXT,
  conditions TEXT[],
  medications JSONB,
  loneliness_level INTEGER,
  mobility_issues BOOLEAN DEFAULT FALSE,
  cognitive_status TEXT,
  notes TEXT,
  selected_voice TEXT,
  selected_personality TEXT,
  google_calendar_enabled BOOLEAN DEFAULT FALSE,
  apple_calendar_enabled BOOLEAN DEFAULT FALSE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  phone_number TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  checkin_times TEXT[],
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_features JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Note: Run these commands if you already created the table previously:
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS checkin_times TEXT[];

-- Calendar Events Table for Phase 3
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phase 4: Recurring Schedules & Voice Personalities
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS repeat_type TEXT DEFAULT 'none';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS voice_id TEXT DEFAULT 'Puck';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emotional_trait TEXT DEFAULT 'Empathetic and warm';

-- Phase 5: Advanced Recurrence Matrix
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS repeat_interval INTEGER DEFAULT 1;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS repeat_days JSONB DEFAULT '[]'::jsonb;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS repeat_end_date TIMESTAMP WITH TIME ZONE;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (can be locked down later)
DROP POLICY IF EXISTS "allow_all" ON user_profiles;
CREATE POLICY "allow_all" ON user_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create resource_deliveries table to track wellness resource sends
CREATE TABLE IF NOT EXISTS resource_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  topics TEXT[] NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('sms', 'email')),
  recipient_contact TEXT NOT NULL,
  resources_sent INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE resource_deliveries ENABLE ROW LEVEL SECURITY;

-- Phase 26: B2B Agency & Multi-Tenancy Architecture
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_email TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'caregiver')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agency_id, user_id)
);

CREATE TABLE IF NOT EXISTS agency_entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    patient_limit INTEGER DEFAULT 3,
    caregiver_limit INTEGER DEFAULT 2,
    tier_name TEXT DEFAULT 'starter',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modify user_profiles (Patients) to link directly to an Agency and specific Caregiver
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS caregiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create policy to allow all operations (can be locked down later)
DROP POLICY IF EXISTS "allow_all" ON resource_deliveries;
CREATE POLICY "allow_all" ON resource_deliveries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resource_deliveries_user_id ON resource_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_deliveries_created_at ON resource_deliveries(created_at);

