const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listUsers() {
  console.log("Listing users from", process.env.SUPABASE_URL);
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  
  console.log(`Found ${users.length} users:`);
  for (const user of users) {
    console.log(`- Email: ${user.email}, ID: ${user.id}, Metadata:`, JSON.stringify(user.user_metadata));
  }
}

listUsers();
