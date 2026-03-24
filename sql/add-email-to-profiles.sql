-- Add email to user_profiles and backfill from auth.users
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing users' emails from auth
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id AND up.email IS NULL;
