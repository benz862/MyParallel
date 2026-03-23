-- ============================================
-- VA Personalization: Companion Name, Personality, Call Tone
-- ============================================

-- Per-patient companion identity
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS companion_name TEXT DEFAULT 'MyParallel';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS companion_personality TEXT DEFAULT 'warm_empathetic';

-- Per-event tone override (humorous, serious, empathetic, etc.)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS call_tone TEXT DEFAULT 'warm_empathetic';
