const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'akash.abhishek144@gmail.com'; // I don't know the exact email they are using, maybe it's this one from my previous DB check?
  
  // Let's just delete ANY profile that doesn't have a matching Clerk user ID!
  // Wait, I can just delete the profile for the email they are likely using, but they could be using ANY email.
  
  // Wait, let's fetch profiles from the last 15 minutes
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: recentProfiles } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(20);
  
  console.log('Recent profiles:', recentProfiles.map(p => ({ email: p.email, id: p.id, created: p.created_at })));
}
run();
