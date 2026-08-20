const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { error } = await supabaseAdmin.from('profiles').delete().eq('email', 'contactus.mayank@gmail.com');
  console.log('Deleted contactus.mayank@gmail.com?', error || 'Success');
}
run();
