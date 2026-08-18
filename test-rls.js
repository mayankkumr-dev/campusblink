const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: pgPolicies, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'official_notices');
  console.log(pgPolicies);
}
run();
