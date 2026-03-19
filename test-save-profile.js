import { api } from './utils/api.js';

async function test() {
  try {
    const profile = {
      id: 'demo-user-id',
      full_name: 'Test Setup User',
      selected_voice: 'gentle_elder',
      selected_personality: 'elder_wisdom'
    };
    
    // Test the running server locally
    const res = await fetch('http://localhost:8081/api/save-user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    
    const data = await res.json();
    console.log('Save Result:', res.status, data);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
