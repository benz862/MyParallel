-- MyParallel Medication Architecture — Database Migration
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. medications_master — Reusable medication definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS medications_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  generic_name text,
  brand_name text,
  dosage_strength numeric,
  strength_unit text,
  form text DEFAULT 'tablet',
  purpose text,
  prescriber_name text,
  pharmacy_name text,
  is_prn boolean DEFAULT false,
  is_controlled boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. medication_instruction_profiles — Structured rules
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_instruction_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_master_id uuid NOT NULL REFERENCES medications_master(id) ON DELETE CASCADE,
  take_with_food boolean DEFAULT false,
  take_before_meal boolean DEFAULT false,
  take_after_meal boolean DEFAULT false,
  empty_stomach boolean DEFAULT false,
  take_with_water boolean DEFAULT false,
  required_fluid_amount_text text,
  morning_only boolean DEFAULT false,
  afternoon_only boolean DEFAULT false,
  evening_only boolean DEFAULT false,
  bedtime_only boolean DEFAULT false,
  do_not_crush boolean DEFAULT false,
  do_not_split boolean DEFAULT false,
  do_not_chew boolean DEFAULT false,
  remain_upright_minutes integer,
  avoid_alcohol boolean DEFAULT false,
  avoid_dairy boolean DEFAULT false,
  avoid_grapefruit boolean DEFAULT false,
  avoid_other_medications_text text,
  food_requirement_note text,
  drink_requirement_note text,
  special_handling_note text,
  warning_note text,
  monitoring_required boolean DEFAULT false,
  monitoring_note text,
  hold_if_condition_text text,
  missed_dose_instructions text,
  prn_condition_text text,
  custom_instruction_note text,
  instruction_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. patient_medication_assignments — Links patient → med
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_medication_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  medication_master_id uuid NOT NULL REFERENCES medications_master(id),
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. patient_medication_versions — Versioned regimen
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_medication_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_medication_assignment_id uuid NOT NULL REFERENCES patient_medication_assignments(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  change_type text,
  change_reason text,
  source_of_change text DEFAULT 'manual',
  assigned_dose_amount numeric,
  assigned_dose_unit text,
  route text,
  frequency_type text DEFAULT 'once_daily',
  recurrence_rule text,
  specific_times jsonb DEFAULT '["08:00"]'::jsonb,
  caregiver_assignee_id uuid,
  effective_start_at timestamptz NOT NULL DEFAULT now(),
  effective_end_at timestamptz,
  is_active boolean DEFAULT true,
  snapshot_medication_name text,
  snapshot_strength text,
  snapshot_instruction_summary text,
  snapshot_instruction_profile jsonb,
  snapshot_schedule_profile jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 5. medication_schedule_events — Generated dose reminders
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  patient_medication_assignment_id uuid NOT NULL REFERENCES patient_medication_assignments(id) ON DELETE CASCADE,
  patient_medication_version_id uuid NOT NULL REFERENCES patient_medication_versions(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  medication_name text NOT NULL,
  dose_text text,
  route text,
  instruction_summary text,
  instruction_profile jsonb,
  status text NOT NULL DEFAULT 'due',
  generated_at timestamptz DEFAULT now(),
  invalidated_at timestamptz,
  invalidation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 6. medication_administration_logs — Immutable dose records
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_administration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_schedule_event_id uuid REFERENCES medication_schedule_events(id),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  patient_medication_assignment_id uuid NOT NULL REFERENCES patient_medication_assignments(id) ON DELETE CASCADE,
  patient_medication_version_id uuid REFERENCES patient_medication_versions(id),
  status text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  administered_at timestamptz,
  recorded_by uuid,
  recorded_at timestamptz DEFAULT now(),
  reason_text text,
  note_text text,
  snapshot_medication_name text NOT NULL,
  snapshot_dose_text text,
  snapshot_instruction_summary text,
  snapshot_instruction_profile jsonb
);

-- ============================================================
-- 7. medication_change_audit_logs — Every edit tracked
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_change_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  patient_medication_assignment_id uuid NOT NULL REFERENCES patient_medication_assignments(id) ON DELETE CASCADE,
  old_version_id uuid,
  new_version_id uuid,
  change_type text NOT NULL,
  change_summary text,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  metadata jsonb
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_med_assignments_patient ON patient_medication_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_assignments_status ON patient_medication_assignments(status);
CREATE INDEX IF NOT EXISTS idx_med_versions_assignment ON patient_medication_versions(patient_medication_assignment_id);
CREATE INDEX IF NOT EXISTS idx_med_versions_active ON patient_medication_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_med_schedule_patient ON medication_schedule_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_schedule_date ON medication_schedule_events(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_med_schedule_status ON medication_schedule_events(status);
CREATE INDEX IF NOT EXISTS idx_med_admin_patient ON medication_administration_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_audit_patient ON medication_change_audit_logs(patient_id);

-- Enable Realtime for schedule events (so calendar updates live)
ALTER PUBLICATION supabase_realtime ADD TABLE medication_schedule_events;
