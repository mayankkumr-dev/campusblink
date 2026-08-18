require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabaseAdmin.from('pg_policies').select('*').eq('tablename', 'official_notices');
  console.log(data);
}
run();
