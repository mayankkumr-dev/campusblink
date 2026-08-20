const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Fetching all Clerk users...');
  const res = await fetch('https://api.clerk.com/v1/users?limit=100', {
    headers: { 'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}` }
  });
  const users = await res.json();
  console.log(`Found ${users.length} users in Clerk.`);
  
  let deletedCount = 0;
  for (const user of users) {
    const email = user.email_addresses[0]?.email_address;
    const { data: profile } = await supabase.from('profiles').select('id, status').eq('clerk_user_id', user.id).maybeSingle();
    
    if (!profile) {
      console.log(`Ghost Clerk user found! ID: ${user.id}, Email: ${email}`);
      console.log(`Deleting ${email} from Clerk...`);
      const delRes = await fetch(`https://api.clerk.com/v1/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}` }
      });
      if (delRes.ok) {
        console.log(`Successfully deleted ghost user ${email}`);
        deletedCount++;
      } else {
        console.log(`Failed to delete ghost user ${email}:`, await delRes.text());
      }
    }
  }
  console.log(`Cleanup complete. Deleted ${deletedCount} ghost accounts.`);
}
run();
