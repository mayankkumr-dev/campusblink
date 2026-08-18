require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('official_notices').select('target_year').limit(1);
  if (error) console.log(error);
  else console.log('Success, target_year is string-like.');
}
run();
