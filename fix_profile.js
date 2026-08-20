const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: recentProfiles } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Recent profiles:', recentProfiles.map(p => ({ email: p.email, clerk_id: p.clerk_user_id, created: p.created_at })));
}
run();
