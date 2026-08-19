require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ../backend/.env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function cleanOrphanedProfiles() {
  console.log('Fetching all auth users...');
  
  // Note: auth.admin.listUsers() might be paginated, but for a small to medium app this is fine
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (authError) {
    console.error('Error fetching auth users:', authError.message);
    return;
  }
  
  const authUserIds = new Set(authData.users.map(u => u.id));
  console.log(`Found ${authUserIds.size} auth users.`);

  console.log('Fetching all profiles...');
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, username');
    
  if (profileError) {
    console.error('Error fetching profiles:', profileError.message);
    return;
  }
  
  console.log(`Found ${profiles.length} profiles.`);
  
  const orphanedProfiles = profiles.filter(p => !authUserIds.has(p.id));
  console.log(`Found ${orphanedProfiles.length} orphaned profiles.`);
  
  if (orphanedProfiles.length === 0) {
    console.log('No orphaned profiles to clean up.');
    return;
  }
  
  for (const profile of orphanedProfiles) {
    console.log(`Cleaning up orphaned profile: ${profile.username} (ID: ${profile.id})`);
    
    // First, rename the username just to be safe if delete fails
    await supabaseAdmin
      .from('profiles')
      .update({ username: `deleted-${profile.id}-${Date.now()}` })
      .eq('id', profile.id);
      
    // Then attempt to delete
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', profile.id);
      
    if (deleteError) {
      console.error(`Failed to delete profile ${profile.id}:`, deleteError.message);
      console.log(`(The username was still renamed to free it up though)`);
    } else {
      console.log(`Successfully deleted profile ${profile.id}`);
    }
  }
  
  console.log('Cleanup complete!');
}

cleanOrphanedProfiles();
