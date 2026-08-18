require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabaseAdmin.from('profiles').select('*').eq('username', 'teststudent').single();
  console.log(data);
}
run();
