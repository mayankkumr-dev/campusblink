const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: user } = await supabase.from('profiles').select('*').eq('username', 'teststudent').single();
  console.log('teststudent profile:', user);
  
  const { data: notices } = await supabase.from('official_notices').select('*').limit(5);
  console.log('notices:', notices.map(n => ({ id: n.id, title: n.title, college: n.college, target_year: n.target_year })));
}
run();
