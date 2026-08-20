const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { error } = await supabaseAdmin.from('profiles').insert([{
    id:            '123e4567-e89b-12d3-a456-426614174000',
    clerk_user_id: 'user_dummy_123',
    email: 'test@example.com',
    name: 'Test Name',
    username: 'test_username',
    college: 'Test College',
    study_year: '1st Year',
    branch: 'CSE',
    section: 'A',
    role: 'student',
    expected_roll_number: null,
  }]);
  console.log('Insert error:', error);
}
run();
