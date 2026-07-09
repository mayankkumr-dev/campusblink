const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'newx1@ex.com',
    password: 'pwd',
    user_metadata: { role: 'society', name: 'N', username: 'society_testx7', college: 'MAIT' }
  });
  console.log("Auth user created:", data.user?.id, error);
  const id = data.user?.id;
  if(id) {
    const r2 = await supabaseAdmin.from('profiles').update({ role: 'society' }).eq('id', id);
    console.log("Update result:", r2.error?.message);
  }
}
test();
