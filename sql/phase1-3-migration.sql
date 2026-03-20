-- ============================================================
-- MyParallel — Phase 1 Completion + Phase 3 Family Care Layer
-- SQL Migration: Daily Care, Vitals, Incidents, Family Access
-- ============================================================

-- ────────────────────────────────────────────
-- PHASE 1: Daily Care Task Templates
-- Reusable templates (e.g. "Morning Hygiene", "Evening Vitals")
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general', -- hygiene, medication, meals, exercise, vitals, emotional, safety, custom
  icon TEXT DEFAULT '📋',
  default_time TIME,
  recurrence_type TEXT DEFAULT 'daily', -- daily, weekdays, weekends, weekly, custom
  recurrence_days TEXT[], -- for weekly/custom: ['Mon','Wed','Fri']
  priority TEXT DEFAULT 'normal', -- low, normal, high, critical
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- PHASE 1: Daily Care Task Instances
-- Concrete tasks generated from templates for specific dates
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_task_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES care_task_templates(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  icon TEXT DEFAULT '📋',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status TEXT DEFAULT 'pending', -- pending, completed, skipped, refused, delayed
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_care_tasks_patient_date ON care_task_instances(patient_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_care_tasks_status ON care_task_instances(status);

-- ────────────────────────────────────────────
-- PHASE 1: Health Vitals Logs
-- Track BP, pulse, O2, temp, weight, glucose, pain, mood
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_vitals_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  recorded_by UUID,
  -- Cardiovascular
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  oxygen_saturation NUMERIC(5,2),
  -- Temperature & Weight
  temperature NUMERIC(5,2),
  temperature_unit TEXT DEFAULT 'F', -- F or C
  weight NUMERIC(6,2),
  weight_unit TEXT DEFAULT 'lbs',
  -- Glucose
  blood_glucose INTEGER,
  blood_glucose_timing TEXT, -- fasting, before_meal, after_meal, bedtime
  -- Subjective
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  pain_location TEXT,
  mood_level INTEGER CHECK (mood_level BETWEEN 1 AND 10),
  mood_description TEXT,
  -- Sleep
  sleep_hours NUMERIC(4,2),
  sleep_quality TEXT, -- poor, fair, good, excellent
  -- Hydration & Nutrition
  hydration_oz INTEGER,
  meals_eaten INTEGER,
  appetite TEXT, -- poor, fair, good, excellent
  -- Activity
  activity_minutes INTEGER,
  mobility_status TEXT, -- independent, assisted, wheelchair, bedbound
  -- General
  bowel_activity BOOLEAN,
  fatigue_level INTEGER CHECK (fatigue_level BETWEEN 0 AND 10),
  symptoms TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient_date ON health_vitals_logs(patient_id, recorded_at);

-- ────────────────────────────────────────────
-- PHASE 1: Incidents
-- Falls, missed meds, wandering, behavioral, injuries
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  incident_type TEXT NOT NULL, -- fall, missed_medication, wandering, behavioral, injury, fever, hospitalization, emergency, other
  severity TEXT DEFAULT 'low', -- low, moderate, high, critical
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  location TEXT,
  witnesses TEXT,
  injuries_sustained TEXT,
  actions_taken TEXT,
  who_was_notified TEXT[],
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  resolution_status TEXT DEFAULT 'open', -- open, in_progress, resolved, escalated
  resolved_at TIMESTAMPTZ,
  reported_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_patient ON incidents(patient_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

-- ────────────────────────────────────────────
-- PHASE 3: Family Members
-- Linked family accounts with role-based access
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  user_id UUID, -- links to auth.users if they have an account
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL, -- spouse, child, sibling, parent, grandchild, friend, guardian, other
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'viewer', -- primary_family, secondary_caregiver, supportive, viewer, emergency_only
  invite_code TEXT UNIQUE,
  invite_status TEXT DEFAULT 'pending', -- pending, accepted, declined, revoked
  invited_by UUID,
  accepted_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_patient ON family_members(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_invite ON family_members(invite_code);
CREATE INDEX IF NOT EXISTS idx_family_user ON family_members(user_id);

-- ────────────────────────────────────────────
-- PHASE 3: Family Access Permissions
-- Granular per-family-member visibility controls
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_access_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  can_view_medications BOOLEAN DEFAULT true,
  can_view_adherence BOOLEAN DEFAULT true,
  can_view_appointments BOOLEAN DEFAULT true,
  can_view_vitals BOOLEAN DEFAULT false,
  can_view_care_tasks BOOLEAN DEFAULT true,
  can_view_incidents BOOLEAN DEFAULT false,
  can_view_care_notes BOOLEAN DEFAULT false,
  can_view_documents BOOLEAN DEFAULT false,
  can_message_caregiver BOOLEAN DEFAULT true,
  can_receive_alerts BOOLEAN DEFAULT true,
  can_receive_daily_summary BOOLEAN DEFAULT true,
  can_receive_urgent_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- PHASE 3: Family Alerts / Feed
-- Automatic updates pushed to family members
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- medication_taken, medication_missed, appointment_upcoming, incident, vitals_alert, care_task_completed, daily_summary, custom
  severity TEXT DEFAULT 'info', -- info, warning, urgent, critical
  title TEXT NOT NULL,
  body TEXT,
  reference_type TEXT, -- medication, appointment, incident, vitals, care_task
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  delivered_via TEXT[], -- in_app, email, sms
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_alerts_member ON family_alerts(family_member_id, is_read);
CREATE INDEX IF NOT EXISTS idx_family_alerts_patient ON family_alerts(patient_id);

-- ────────────────────────────────────────────
-- Enable Realtime for new tables
-- ────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE care_task_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE health_vitals_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE family_alerts;

-- ────────────────────────────────────────────
-- Enable RLS
-- ────────────────────────────────────────────
ALTER TABLE care_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_vitals_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_access_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_alerts ENABLE ROW LEVEL SECURITY;

-- Open policies for authenticated users (lock down later with proper role checks)
CREATE POLICY "Allow all for authenticated" ON care_task_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON care_task_instances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON health_vitals_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON incidents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON family_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON family_access_permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON family_alerts FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────
-- Seed: Default care task templates for new patients
-- (Run manually per patient as needed)
-- ────────────────────────────────────────────
-- INSERT INTO care_task_templates (patient_id, title, category, icon, default_time, priority) VALUES
--   ('<patient_id>', 'Morning Hygiene', 'hygiene', '🪥', '07:00', 'normal'),
--   ('<patient_id>', 'Breakfast', 'meals', '🍳', '08:00', 'normal'),
--   ('<patient_id>', 'Morning Medications', 'medication', '💊', '08:30', 'high'),
--   ('<patient_id>', 'Morning Vitals Check', 'vitals', '🩺', '09:00', 'high'),
--   ('<patient_id>', 'Lunch', 'meals', '🥗', '12:00', 'normal'),
--   ('<patient_id>', 'Afternoon Activity', 'exercise', '🚶', '14:00', 'normal'),
--   ('<patient_id>', 'Evening Medications', 'medication', '💊', '18:00', 'high'),
--   ('<patient_id>', 'Dinner', 'meals', '🍽️', '18:30', 'normal'),
--   ('<patient_id>', 'Evening Hygiene', 'hygiene', '🛁', '20:00', 'normal'),
--   ('<patient_id>', 'Bedtime Routine', 'safety', '🛏️', '21:00', 'normal');
