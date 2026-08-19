/**
 * migrate_passwords_to_clerk.js
 *
 * This script updates existing Clerk users' password hashes to the original
 * bcrypt hashes from Supabase, so users can sign in with their old passwords.
 *
 * Strategy:
 *   1. For each row in the CSV (email + bcrypt hash):
 *      a. Look up the user in Clerk by email address.
 *      b. If found, update their password_digest + password_hasher = 'bcrypt'.
 *      c. If not found, create the user with the bcrypt hash directly.
 *   2. Report success/failure for each user.
 *
 * Usage:
 *   node migrate_passwords_to_clerk.js
 *
 * Requirements:
 *   npm install csv-parse   (Node 18+ has built-in fetch)
 */

const fs   = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// ── Config ────────────────────────────────────────────────────────────────────
const CLERK_SECRET_KEY = 'sk_test_H4RxqFwiVP2jO5yjeCiTbLVDTZ8AWP8w9k2tzdtlqP';
const CLERK_API_BASE   = 'https://api.clerk.com/v1';
const CSV_PATH         = '/Users/mayanksingh/Downloads/Supabase Snippet Untitled query.csv';

// Delay between API calls to stay within Clerk rate limits (ms)
const RATE_LIMIT_DELAY = 300;

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const clerkHeaders = {
  'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
  'Content-Type': 'application/json',
};

async function clerkRequest(method, endpoint, body) {
  const url = `${CLERK_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: clerkHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/** Find a Clerk user by email. Returns the user object or null. */
async function findClerkUserByEmail(email) {
  const { ok, data } = await clerkRequest('GET', `/users?email_address=${encodeURIComponent(email)}&limit=1`);
  if (!ok || !Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

/** Update an existing Clerk user's password with the bcrypt hash. */
async function updateClerkUserPassword(clerkUserId, passwordDigest) {
  const { ok, status, data } = await clerkRequest('PATCH', `/users/${clerkUserId}`, {
    password_digest: passwordDigest,
    password_hasher: 'bcrypt',
    skip_password_checks: true,
  });
  return { ok, status, data };
}

/** Create a new Clerk user with the bcrypt hash (fallback if user was deleted). */
async function createClerkUser(email, passwordDigest) {
  const { ok, status, data } = await clerkRequest('POST', '/users', {
    email_address: [email],
    password_digest: passwordDigest,
    password_hasher: 'bcrypt',
    skip_password_checks: true,
    skip_password_requirement: false,
  });
  return { ok, status, data };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Clerk Password Migration ===\n');

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  console.log(`Loaded ${rows.length} users from CSV.\n`);

  const results = { updated: [], created: [], failed: [], skipped: [] };

  for (const row of rows) {
    const email        = (row['email'] || '').trim().toLowerCase();
    const passwordHash = (row['encrypted_password'] || '').trim();

    if (!email || !passwordHash) {
      console.log(`Skipping row with missing email or password: ${JSON.stringify(row)}`);
      results.skipped.push({ email, reason: 'Missing email or password hash' });
      continue;
    }

    console.log(`Processing: ${email}`);

    try {
      const clerkUser = await findClerkUserByEmail(email);
      await sleep(RATE_LIMIT_DELAY);

      if (clerkUser) {
        const { ok, status, data } = await updateClerkUserPassword(clerkUser.id, passwordHash);
        await sleep(RATE_LIMIT_DELAY);

        if (ok) {
          console.log(`   Updated password for ${email} (Clerk ID: ${clerkUser.id})`);
          results.updated.push({ email, clerkId: clerkUser.id });
        } else {
          const errMsg = data?.errors?.[0]?.message || JSON.stringify(data);
          console.log(`   FAILED to update [${status}]: ${errMsg}`);
          results.failed.push({ email, clerkId: clerkUser.id, error: errMsg });
        }
      } else {
        const { ok, status, data } = await createClerkUser(email, passwordHash);
        await sleep(RATE_LIMIT_DELAY);

        if (ok) {
          console.log(`   Created new user in Clerk (Clerk ID: ${data.id})`);
          results.created.push({ email, clerkId: data.id });
        } else {
          const errMsg = data?.errors?.[0]?.message || JSON.stringify(data);
          console.log(`   FAILED to create [${status}]: ${errMsg}`);
          results.failed.push({ email, error: errMsg });
        }
      }
    } catch (err) {
      console.log(`   Exception: ${err.message}`);
      results.failed.push({ email, error: err.message });
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Updated : ${results.updated.length}`);
  console.log(`Created : ${results.created.length}`);
  console.log(`Skipped : ${results.skipped.length}`);
  console.log(`Failed  : ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed users:');
    results.failed.forEach(f => console.log(`  - ${f.email}: ${f.error}`));
  }

  const logPath = path.join(__dirname, 'migration_results.json');
  fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to: ${logPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
