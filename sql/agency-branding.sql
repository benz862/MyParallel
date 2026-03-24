-- White-label branding columns for agencies
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS call_company_name TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS call_greeting TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS call_system_instructions TEXT;

-- call_company_name: What the AI introduces itself as (e.g., "SkillBinder Care" instead of "MyParallel")
-- call_greeting: Custom opening line (e.g., "Hello! This is your SkillBinder wellness companion calling to check in.")
-- call_system_instructions: Any extra instructions the SA wants injected into every call prompt
