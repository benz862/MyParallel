import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, age, preferred_name, caregiver_name')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Latest 5 profiles in DB:", JSON.stringify(data, null, 2));
  }
}

check();
