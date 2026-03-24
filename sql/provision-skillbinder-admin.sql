-- =============================================
-- Super Admin Provisioning: info@skillbinder.com
-- Run this in Supabase SQL Editor after the auth user is created
-- Auth User ID: d1d33620-6268-4d28-9aab-39ce1f339e4c
-- =============================================

-- 1. Create SkillBinder agency
INSERT INTO agencies (name, contact_email)
VALUES ('SkillBinder', 'info@skillbinder.com')
ON CONFLICT DO NOTHING;

-- 2. Create user profile for the admin
INSERT INTO user_profiles (id, full_name, preferred_name, phone_number)
VALUES ('d1d33620-6268-4d28-9aab-39ce1f339e4c', 'SkillBinder Admin', 'Admin', '+10000000000')
ON CONFLICT (id) DO UPDATE SET full_name = 'SkillBinder Admin';

-- 3. Link the user as agency owner
INSERT INTO agency_users (agency_id, user_id, role, status)
SELECT a.id, 'd1d33620-6268-4d28-9aab-39ce1f339e4c', 'owner', 'active'
FROM agencies a WHERE a.name = 'SkillBinder'
ON CONFLICT (agency_id, user_id) DO UPDATE SET role = 'owner', status = 'active';

-- 4. Set enterprise-tier entitlements (50 patients, 20 caregivers)
INSERT INTO agency_entitlements (agency_id, patient_limit, caregiver_limit, tier_name)
SELECT a.id, 50, 20, 'enterprise'
FROM agencies a WHERE a.name = 'SkillBinder'
ON CONFLICT DO NOTHING;

-- 5. Link existing caregiver (Glenn Donnelly) to SkillBinder agency
INSERT INTO agency_users (agency_id, user_id, role, status)
SELECT a.id, '89fcbbb7-0e22-4dc9-85e0-8bac96613cd0', 'caregiver', 'active'
FROM agencies a WHERE a.name = 'SkillBinder'
ON CONFLICT (agency_id, user_id) DO UPDATE SET role = 'caregiver', status = 'active';

-- 6. Set Glenn's profile to belong to the SkillBinder agency
UPDATE user_profiles
SET agency_id = (SELECT id FROM agencies WHERE name = 'SkillBinder')
WHERE id = '89fcbbb7-0e22-4dc9-85e0-8bac96613cd0';

-- 7. Link Glenn's patients to the SkillBinder agency too
UPDATE user_profiles
SET agency_id = (SELECT id FROM agencies WHERE name = 'SkillBinder')
WHERE caregiver_id = '89fcbbb7-0e22-4dc9-85e0-8bac96613cd0';
