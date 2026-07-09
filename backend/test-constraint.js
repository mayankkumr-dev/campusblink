const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabaseAdmin.rpc('get_table_info', { table_name: 'profiles' }).catch(x => ({error: x}));
  console.log(data, error);
}
test();
