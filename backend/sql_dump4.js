const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data } = await supabaseAdmin.from('profiles').select('name, theme_color, cover_url, role').eq('name', 'Byte').limit(1);
  console.log(data);
}
test();
