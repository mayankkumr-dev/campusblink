require('../env-loader');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*').limit(10);
  console.log('Total subscriptions found (up to 10):', subs.length);
  if (subs.length > 0) console.log(subs[0]);
}
run();
