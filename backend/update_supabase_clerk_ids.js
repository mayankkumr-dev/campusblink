/**
 * update_supabase_clerk_ids.js
 *
 * Updates the clerk_user_id column in the Supabase `profiles` table
 * for all migrated users so the app can find their profile after login.
 *
 * The email-to-ClerkID mapping comes from migration_results.json.
 *
 * Usage:
 *   node update_supabase_clerk_ids.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs   = require('fs');

// ── Config ──────────────────────────────────────────────────────────────────
// Use the service_role key so we can bypass RLS and write freely
const SUPABASE_URL          = 'https://fsbcwsqgkdlaebtzmuop.supabase.co';
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY; // set in env or paste below

if (!SUPABASE_SERVICE_KEY) {
  console.error(
    'ERROR: Set SUPABASE_SERVICE_KEY environment variable to your Supabase service_role key.\n' +
    'You can find it at: Supabase Dashboard → Project Settings → API → service_role key\n\n' +
    'Run as:\n  SUPABASE_SERVICE_KEY=your_key node update_supabase_clerk_ids.js'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('=== Supabase clerk_user_id Update ===\n');

  const results = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'migration_results.json'), 'utf-8')
  );

  const users = results.updated;
  console.log(`Processing ${users.length} users...\n`);

  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (const user of users) {
    const { email, clerkId } = user;

    // Find the profile row by email
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, email')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      console.log(`  ERROR fetching ${email}: ${fetchError.message}`);
      failed++;
      continue;
    }

    if (!profile) {
      console.log(`  NOT FOUND in Supabase: ${email}`);
      notFound++;
      continue;
    }

    if (profile.clerk_user_id === clerkId) {
      console.log(`  Already up to date: ${email}`);
      updated++;
      continue;
    }

    // Update the clerk_user_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ clerk_user_id: clerkId })
      .eq('id', profile.id);

    if (updateError) {
      console.log(`  FAILED to update ${email}: ${updateError.message}`);
      failed++;
    } else {
      console.log(`  Updated ${email} → ${clerkId}`);
      updated++;
    }
  }

  console.log('\n=== Done ===');
  console.log(`Updated  : ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Failed   : ${failed}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
