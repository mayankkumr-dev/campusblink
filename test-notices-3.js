const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  await supabase.from('profiles').update({ academic_year: 1 }).eq('username', 'teststudent');
  await supabase.from('official_notices').insert({
    title: 'Welcome 1st Year',
    content: 'test',
    target_year: '1st Year',
    college: 'Maharaja Agrasen Institute of Technology (MAIT)',
    author_id: 'f5ee05fe-76fe-458d-aa27-17c54e652eae', // teststudent's ID
    is_pinned: false
  });
  console.log('Test notice added');
}
run();
