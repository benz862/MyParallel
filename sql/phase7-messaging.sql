-- ============================================
-- Phase 7: Communication Hub - Care Messages
-- ============================================

CREATE TABLE IF NOT EXISTS care_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'caregiver', 'family', 'system')),
  sender_name TEXT NOT NULL DEFAULT 'System',
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'alert', 'request', 'acknowledgment')),
  is_urgent BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_care_messages_patient ON care_messages(patient_id, created_at DESC);
CREATE INDEX idx_care_messages_unread ON care_messages(patient_id, is_read) WHERE is_read = false;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE care_messages;

-- RLS
ALTER TABLE care_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "care_messages_all" ON care_messages FOR ALL USING (true);
