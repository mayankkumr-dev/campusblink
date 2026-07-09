const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data } = await supabaseAdmin.from('profiles').select('id, name, theme_color, role').order('created_at', { ascending: false }).limit(5);
  console.log(data);
}
test();
