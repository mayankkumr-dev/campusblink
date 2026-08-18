require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
  const { data: user } = await supabaseAdmin.from('profiles').select('*').eq('username', 'teststudent').single();
  // Get teststudent's email to login
  console.log('User email:', user.email);
  // Wait, I can't login without password.
  // I will just get a session token or use RLS inspection.
}
run();
