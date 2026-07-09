const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: users } = await supabaseAdmin.from('profiles').select('id, email, username').order('created_at', { ascending: false }).limit(2);
  console.log('Most recent users:', users);
  
  if (users.length > 0) {
    const { data: updateData, error: updateError } = await supabaseAdmin.from('profiles').update({ role: 'society' }).eq('id', users[0].id).select();
    console.log('Update result:', updateData, updateError);
  }
}
test();
