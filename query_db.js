import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY);

async function check() {
  const { data: users } = await supabase.from('user_profiles').select('id, full_name, phone_number');
  console.log('Profiles:', users);
  const { data: events } = await supabase.from('calendar_events').select('*');
  console.log('Events:', events);
}
check();
