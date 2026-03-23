-- Care Tasks: recurring daily routines with caregiver notes and day-of-week scheduling
-- Run this in Supabase SQL Editor

-- Task definitions (the template)
CREATE TABLE IF NOT EXISTS care_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,                          -- caregiver note relayed to patient via VA
  scheduled_time TIME NOT NULL DEFAULT '09:00',
  category TEXT DEFAULT 'general',           -- health | meals | hygiene | exercise | social | general
  active_days JSONB DEFAULT '["mon","tue","wed","thu","fri","sat","sun"]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily completion log
CREATE TABLE IF NOT EXISTS care_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES care_tasks(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  completed_by TEXT DEFAULT 'patient',       -- patient | caregiver | ai
  UNIQUE(task_id, completed_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_care_tasks_patient ON care_tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_completions_date ON care_task_completions(task_id, completed_date);
