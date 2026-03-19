import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL in .env');
  console.error('   Add: SUPABASE_URL=https://your-project.supabase.co');
  console.error('   Or: VITE_SUPABASE_URL=https://your-project.supabase.co');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('   Get it from: Supabase Dashboard -> Settings -> API -> service_role key');
  process.exit(1);
}

console.log('📋 Configuration:');
console.log('   SUPABASE_URL:', SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'MISSING');
console.log('   SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? `${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : 'MISSING');
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDemoUser() {
  const email = 'info@myparallel.chat';
  const password = 'Demo123!';

  console.log('Creating demo user...');

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('User already exists, fetching existing user...');
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const user = existingUser.users.find(u => u.email === email);
        if (!user) {
          throw new Error('User exists but could not be found');
        }
        var userId = user.id;
      } else {
        throw authError;
      }
    } else {
      var userId = authData.user.id;
      console.log('✅ Auth user created:', userId);
    }

    // 2. Create comprehensive user profile with all features
    const profileData = {
      id: userId, // Link to auth user
      full_name: 'Demo User',
      preferred_name: 'Demo',
      age: 65,
      caregiver_name: 'Sarah Johnson',
      caregiver_phone: '+1234567890',
      caregiver_email: 'sarah.johnson@example.com',
      conditions: ['diabetes', 'hypertension', 'mild arthritis'],
      medications: [
        {
          name: 'Metformin',
          dosage: '500mg',
          schedule: '8:00 AM, 8:00 PM'
        },
        {
          name: 'Lisinopril',
          dosage: '10mg',
          schedule: '8:00 AM'
        },
        {
          name: 'Aspirin',
          dosage: '81mg',
          schedule: '8:00 AM'
        }
      ],
      loneliness_level: 6,
      mobility_issues: true,
      cognitive_status: 'mild',
      notes: 'Prefers morning check-ins. Enjoys talking about gardening and family. Has difficulty with technology.',
      selected_voice: 'gentle_elder',
      selected_personality: 'elder_wisdom',
      google_calendar_enabled: true,
      apple_calendar_enabled: false,
      emergency_contact_name: 'Emergency Services',
      emergency_contact_phone: '911',
    };

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    let result;
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
      console.log('✅ Profile updated');
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
      console.log('✅ Profile created');
    }

    console.log('\n🎉 Demo user created successfully!');
    console.log('\n📋 User Details:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   User ID:', userId);
    console.log('\n✨ Features Enabled:');
    console.log('   ✅ Full profile with conditions and medications');
    console.log('   ✅ Caregiver information');
    console.log('   ✅ Emergency contact');
    console.log('   ✅ Voice: gentle_elder');
    console.log('   ✅ Personality: elder_wisdom');
    console.log('   ✅ Google Calendar sync enabled');
    console.log('   ✅ Loneliness level tracking');
    console.log('   ✅ Mobility issues noted');
    console.log('   ✅ Cognitive status: mild');
    console.log('\n🚀 You can now log in with:');
    console.log('   Email: info@myparallel.chat');
    console.log('   Password: Demo123!');

  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    process.exit(1);
  }
}

createDemoUser();

