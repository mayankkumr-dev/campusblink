/**
 * verify_clerk_emails.js
 *
 * Marks all migrated users' email addresses as verified in Clerk.
 * This fixes the "2FA Required / email_code" error on login caused by
 * unverified emails after a Dashboard CSV import.
 *
 * Usage:
 *   node verify_clerk_emails.js
 */

const path = require('path');
const fs   = require('fs');

const CLERK_SECRET_KEY = 'sk_test_H4RxqFwiVP2jO5yjeCiTbLVDTZ8AWP8w9k2tzdtlqP';
const CLERK_API_BASE   = 'https://api.clerk.com/v1';
const RATE_LIMIT_DELAY = 300;

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

/** Fetch user profile from Clerk to get their email address IDs */
async function getClerkUser(clerkId) {
  const { ok, data } = await clerkRequest('GET', `/users/${clerkId}`);
  if (!ok) return null;
  return data;
}

/** Mark an email address as verified */
async function verifyEmail(emailAddressId) {
  const { ok, status, data } = await clerkRequest('PATCH', `/email_addresses/${emailAddressId}`, {
    verified: true,
  });
  return { ok, status, data };
}

async function main() {
  console.log('=== Clerk Email Verification Fix ===\n');

  const results = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'migration_results.json'), 'utf-8')
  );

  const users = results.updated;
  console.log(`Processing ${users.length} users...\n`);

  const verified = [];
  const failed   = [];

  for (const user of users) {
    console.log(`Processing: ${user.email} (${user.clerkId})`);

    try {
      const clerkUser = await getClerkUser(user.clerkId);
      await sleep(RATE_LIMIT_DELAY);

      if (!clerkUser) {
        console.log(`   NOT FOUND in Clerk`);
        failed.push({ ...user, error: 'User not found in Clerk' });
        continue;
      }

      const emailAddresses = clerkUser.email_addresses || [];
      if (emailAddresses.length === 0) {
        console.log(`   No email addresses found`);
        failed.push({ ...user, error: 'No email addresses on user' });
        continue;
      }

      let allVerified = true;
      for (const emailObj of emailAddresses) {
        if (emailObj.verification?.status === 'verified') {
          console.log(`   Already verified: ${emailObj.email_address}`);
          continue;
        }

        const { ok, status, data } = await verifyEmail(emailObj.id);
        await sleep(RATE_LIMIT_DELAY);

        if (ok) {
          console.log(`   Verified: ${emailObj.email_address}`);
        } else {
          const errMsg = data?.errors?.[0]?.message || JSON.stringify(data);
          console.log(`   FAILED to verify ${emailObj.email_address} [${status}]: ${errMsg}`);
          allVerified = false;
          failed.push({ ...user, emailId: emailObj.id, error: errMsg });
        }
      }

      if (allVerified) {
        verified.push(user);
      }

    } catch (err) {
      console.log(`   Exception: ${err.message}`);
      failed.push({ ...user, error: err.message });
    }
  }

  console.log('\n=== Done ===');
  console.log(`Verified : ${verified.length}`);
  console.log(`Failed   : ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed:');
    failed.forEach(f => console.log(`  - ${f.email}: ${f.error}`));
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
