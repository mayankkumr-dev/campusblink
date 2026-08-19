require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function listUsernames() {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('username, email, role');
    
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log('Current Usernames in DB:');
  profiles.forEach(p => console.log(`- ${p.username} (${p.email}) [${p.role}]`));
}
listUsernames();
