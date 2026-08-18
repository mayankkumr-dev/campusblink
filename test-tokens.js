const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: user } = await supabaseAdmin.from('profiles').select('id, username').eq('username', 'teststudent').single();
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*').eq('user_id', user.id);
  console.log('Push Subscriptions:', subs);
}
run();
