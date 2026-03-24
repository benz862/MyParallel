-- Fix: Clean up duplicate agencies and re-link everything
-- Run this in Supabase SQL Editor

-- First, find the canonical SkillBinder agency (the first one created)
-- and delete duplicates
DELETE FROM agencies
WHERE name = 'SkillBinder'
AND id != (SELECT id FROM agencies WHERE name = 'SkillBinder' ORDER BY created_at ASC LIMIT 1);

-- Now safely link Glenn as caregiver (using LIMIT 1 to be safe)
INSERT INTO agency_users (agency_id, user_id, role, status)
VALUES (
  (SELECT id FROM agencies WHERE name = 'SkillBinder' LIMIT 1),
  '89fcbbb7-0e22-4dc9-85e0-8bac96613cd0',
  'caregiver',
  'active'
)
ON CONFLICT (agency_id, user_id) DO UPDATE SET role = 'caregiver', status = 'active';

-- Set Glenn's profile agency_id
UPDATE user_profiles
SET agency_id = (SELECT id FROM agencies WHERE name = 'SkillBinder' LIMIT 1)
WHERE id = '89fcbbb7-0e22-4dc9-85e0-8bac96613cd0';

-- Set Glenn's patients' agency_id
UPDATE user_profiles
SET agency_id = (SELECT id FROM agencies WHERE name = 'SkillBinder' LIMIT 1)
WHERE caregiver_id = '89fcbbb7-0e22-4dc9-85e0-8bac96613cd0';

-- Also add a unique constraint on agency name to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_name ON agencies(name);
