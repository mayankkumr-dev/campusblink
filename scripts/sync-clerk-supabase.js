/**
 * sync-clerk-supabase.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Legacy user reconciliation script.
 *
 * Purpose:
 *   Match existing Clerk users to existing Supabase profiles by email address,
 *   then UPDATE the Supabase `profiles.clerk_user_id` and `profiles.clerk_id`
 *   columns so the backend auth middleware can authenticate those users.
 *
 * Usage:
 *   node scripts/sync-clerk-supabase.js
 *   DRY_RUN=true node scripts/sync-clerk-supabase.js   # preview only, no writes
 *
 * Requirements:
 *   - CLERK_SECRET_KEY in backend/.env (or process env)
 *   - SUPABASE_URL in backend/.env
 *   - SUPABASE_SERVICE_ROLE_KEY in backend/.env
 * ──────────────────────────────────────────────────────────────────────────────
 */

const path = require('path');

// Load env from backend/.env (adjust path if running from repo root)
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // fallback

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// ── Config ───────────────────────────────────────────────────────────────────

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === 'true';

// Validate required env vars
if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY is not set. Check backend/.env');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Check backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

if (DRY_RUN) {
  console.log('🔍 DRY RUN mode — no database writes will be made.\n');
}

// ── Clerk API helpers ─────────────────────────────────────────────────────────

/**
 * Simple HTTPS GET helper that returns parsed JSON.
 */
function clerkGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.clerk.com',
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Clerk API error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Fetch ALL Clerk users using cursor-based pagination.
 * Returns an array of Clerk user objects.
 */
async function fetchAllClerkUsers() {
  const allUsers = [];
  let offset = 0;
  const limit = 100;

  console.log('📥 Fetching Clerk users...');

  while (true) {
    const page = await clerkGet(`/v1/users?limit=${limit}&offset=${offset}`);

    // Clerk returns either an array directly or { data: [...] }
    const users = Array.isArray(page) ? page : (page.data || []);

    if (users.length === 0) break;

    allUsers.push(...users);
    console.log(`   Fetched ${allUsers.length} users so far...`);

    if (users.length < limit) break;
    offset += limit;
  }

  console.log(`✅ Total Clerk users fetched: ${allUsers.length}\n`);
  return allUsers;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

/**
 * Fetch ALL Supabase profiles using range-based pagination.
 * Returns an array of profile rows.
 */
async function fetchAllSupabaseProfiles() {
  const allProfiles = [];
  let from = 0;
  const batchSize = 1000;

  console.log('📥 Fetching Supabase profiles...');

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, clerk_user_id, clerk_id')
      .range(from, from + batchSize - 1);

    if (error) {
      throw new Error(`Supabase profiles fetch error: ${error.message}`);
    }

    if (!data || data.length === 0) break;

    allProfiles.push(...data);
    console.log(`   Fetched ${allProfiles.length} profiles so far...`);

    if (data.length < batchSize) break;
    from += batchSize;
  }

  console.log(`✅ Total Supabase profiles fetched: ${allProfiles.length}\n`);
  return allProfiles;
}

// ── Main reconciliation logic ─────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CampusBlink — Clerk ↔ Supabase User Reconciliation');
  console.log('═══════════════════════════════════════════════════════════\n');

  const [clerkUsers, supabaseProfiles] = await Promise.all([
    fetchAllClerkUsers(),
    fetchAllSupabaseProfiles(),
  ]);

  // Build an email → profile map for O(1) lookups
  const profilesByEmail = new Map();
  for (const profile of supabaseProfiles) {
    if (profile.email) {
      profilesByEmail.set(profile.email.toLowerCase().trim(), profile);
    }
  }

  // Stats
  const stats = {
    total: clerkUsers.length,
    alreadyLinked: 0,
    matched: 0,
    noEmailInClerk: 0,
    noMatchInSupabase: 0,
    updateErrors: 0,
  };

  const updates = []; // collect updates for batch reporting

  for (const clerkUser of clerkUsers) {
    const clerkId = clerkUser.id;
    const primaryEmail = clerkUser.email_addresses?.find(
      (e) => e.id === clerkUser.primary_email_address_id
    )?.email_address;

    if (!primaryEmail) {
      console.warn(`⚠️  Clerk user ${clerkId} has no primary email — skipping`);
      stats.noEmailInClerk++;
      continue;
    }

    const emailKey = primaryEmail.toLowerCase().trim();
    const supabaseProfile = profilesByEmail.get(emailKey);

    if (!supabaseProfile) {
      console.warn(`⚠️  No Supabase profile found for email: ${primaryEmail} (Clerk ID: ${clerkId})`);
      stats.noMatchInSupabase++;
      continue;
    }

    // Already linked?
    if (supabaseProfile.clerk_user_id === clerkId) {
      console.log(`✔  Already linked: ${primaryEmail} → ${clerkId}`);
      stats.alreadyLinked++;
      continue;
    }

    // Match found — queue update
    console.log(`🔗 Match: ${primaryEmail}`);
    console.log(`   Supabase profile.id = ${supabaseProfile.id}`);
    console.log(`   Clerk ID            = ${clerkId}`);
    if (supabaseProfile.clerk_user_id) {
      console.log(`   ⚠️  Overwriting existing clerk_user_id: ${supabaseProfile.clerk_user_id}`);
    }

    updates.push({ profileId: supabaseProfile.id, clerkId, email: primaryEmail });
    stats.matched++;
  }

  // Apply updates
  console.log(`\n📝 Updates to apply: ${updates.length}\n`);

  for (const { profileId, clerkId, email } of updates) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would UPDATE profiles SET clerk_user_id='${clerkId}', clerk_id='${clerkId}' WHERE id='${profileId}' -- email: ${email}`);
      continue;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        clerk_user_id: clerkId,
        clerk_id: clerkId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (error) {
      console.error(`❌ Failed to update profile ${profileId} (${email}):`, error.message);
      stats.updateErrors++;
    } else {
      console.log(`✅ Updated: ${email} → clerk_user_id=${clerkId}`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Reconciliation Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total Clerk users:          ${stats.total}`);
  console.log(`  Already correctly linked:   ${stats.alreadyLinked}`);
  console.log(`  Matched & updated:          ${stats.matched}`);
  console.log(`  Clerk users w/o email:      ${stats.noEmailInClerk}`);
  console.log(`  No matching Supabase row:   ${stats.noMatchInSupabase}`);
  console.log(`  Update errors:              ${stats.updateErrors}`);
  if (DRY_RUN) {
    console.log('\n  ⚠️  DRY RUN — no changes were written to the database.');
    console.log('  Run without DRY_RUN=true to apply changes.');
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n❌ Fatal error during reconciliation:', err);
  process.exit(1);
});
