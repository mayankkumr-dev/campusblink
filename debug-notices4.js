const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('official_notices').select('title, target_year, college, is_fully_removed, is_deleted, created_at').order('created_at', { ascending: false }).limit(10);
  console.log('Recent Notices:', data);
}
run();
