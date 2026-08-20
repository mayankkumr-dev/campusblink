const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Profile columns:', Object.keys(data[0]));
  }
}
run();
