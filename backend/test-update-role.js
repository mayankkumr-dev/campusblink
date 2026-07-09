const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabaseAdmin.from('profiles').update({ role: 'society' }).eq('email', 'campus_blink_100@example.com').select();
  console.log(data, error);
}
test();
