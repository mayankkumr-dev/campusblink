const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'frontend/.env' });
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, require('fs').readFileSync('.env').toString().match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1]);

async function run() {
  const { data } = await supabaseAdmin.from('pg_policies').select('*').eq('tablename', 'official_notices');
  console.log(data);
}
run();
