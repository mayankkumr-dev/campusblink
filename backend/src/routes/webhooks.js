/**
 * Clerk Webhook Handler
 * Listens for Clerk lifecycle events and syncs them to the Supabase profiles table.
 *
 * Supported events:
 *   - user.created  → insert a new profile row
 *   - user.updated  → sync email changes
 *   - user.deleted  → optionally mark profile as deleted (soft-delete)
 *
 * Webhook signature verification uses svix (Clerk's own signing library).
 * The raw request body is required for signature verification, so this route
 * must be mounted BEFORE express.json() parses the body.
 */

const express = require('express');
const router = express.Router();
const { Webhook } = require('svix');
const { supabaseAdmin } = require('../config/supabase');

// ---------------------------------------------------------------------------
// Raw body capture middleware (required for svix signature verification)
// ---------------------------------------------------------------------------
router.use(
  express.raw({ type: 'application/json' })
);

// ---------------------------------------------------------------------------
// POST /api/webhooks/clerk
// ---------------------------------------------------------------------------
router.post('/clerk', async (req, res) => {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!signingSecret) {
    console.warn('[WEBHOOK] CLERK_WEBHOOK_SIGNING_SECRET is not set — skipping signature verification (unsafe in production!)');
  }

  // ── 1. Verify webhook signature ────────────────────────────────────────────
  let payload;
  try {
    if (signingSecret) {
      const wh = new Webhook(signingSecret);
      // svix requires the raw body Buffer and the Svix headers
      const svixId = req.headers['svix-id'];
      const svixTimestamp = req.headers['svix-timestamp'];
      const svixSignature = req.headers['svix-signature'];

      if (!svixId || !svixTimestamp || !svixSignature) {
        return res.status(400).json({ error: 'Missing svix headers' });
      }

      payload = wh.verify(req.body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } else {
      // Development fallback: parse body directly (no verification)
      payload = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('[WEBHOOK] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  const { type, data } = payload;
  console.log(`[WEBHOOK] Received event: ${type} (userId: ${data?.id})`);

  // ── 2. Route by event type ─────────────────────────────────────────────────
  try {
    if (type === 'user.created') {
      await handleUserCreated(data);
    } else if (type === 'user.updated') {
      await handleUserUpdated(data);
    } else if (type === 'user.deleted') {
      await handleUserDeleted(data);
    } else {
      console.log(`[WEBHOOK] Unhandled event type: ${type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(`[WEBHOOK] Error handling event ${type}:`, err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * user.created — Insert a new Supabase profile row for the new Clerk user.
 * A profile row must exist for the backend auth middleware to function.
 */
async function handleUserCreated(data) {
  const clerkId = data.id;
  const primaryEmail = data.email_addresses?.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;

  if (!clerkId) {
    console.warn('[WEBHOOK:user.created] No Clerk ID in payload — skipping');
    return;
  }

  // Check if a profile already exists (e.g. from the sync script or a pre-existing Supabase record)
  const { data: existingByClerkId } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkId)
    .maybeSingle();

  if (existingByClerkId) {
    console.log(`[WEBHOOK:user.created] Profile already exists for clerk_user_id=${clerkId} — skipping insert`);
    return;
  }

  // If there is an existing profile matched by email, just update the clerk_user_id
  if (primaryEmail) {
    const { data: existingByEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', primaryEmail)
      .maybeSingle();

    if (existingByEmail) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          clerk_user_id: clerkId,
          clerk_id: clerkId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingByEmail.id);

      if (updateError) {
        console.error('[WEBHOOK:user.created] Failed to update existing profile with clerk_id:', updateError);
      } else {
        console.log(`[WEBHOOK:user.created] Linked existing profile (by email) to clerk_user_id=${clerkId}`);
      }
      return;
    }
  }

  // No existing profile found — insert a new one
  const firstName = data.first_name || '';
  const lastName = data.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || primaryEmail?.split('@')[0] || 'New User';
  const imageUrl = data.image_url || null;

  const { data: newProfile, error: insertError } = await supabaseAdmin
    .from('profiles')
    .insert({
      clerk_user_id: clerkId,
      clerk_id: clerkId,
      email: primaryEmail || null,
      full_name: fullName,
      avatar_url: imageUrl,
      role: 'student', // default role; admin can change
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[WEBHOOK:user.created] Failed to insert profile:', insertError);
    throw insertError;
  }

  console.log(`[WEBHOOK:user.created] Created profile id=${newProfile.id} for clerk_user_id=${clerkId} email=${primaryEmail}`);
}

/**
 * user.updated — Sync email changes to the Supabase profile.
 */
async function handleUserUpdated(data) {
  const clerkId = data.id;
  const primaryEmail = data.email_addresses?.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;

  if (!clerkId || !primaryEmail) return;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      email: primaryEmail,
      clerk_id: clerkId,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_user_id', clerkId);

  if (error) {
    console.error('[WEBHOOK:user.updated] Failed to update profile:', error);
  } else {
    console.log(`[WEBHOOK:user.updated] Synced email for clerk_user_id=${clerkId}`);
  }
}

/**
 * user.deleted — Soft-delete the Supabase profile so historical data is preserved.
 */
async function handleUserDeleted(data) {
  const clerkId = data.id;
  if (!clerkId) return;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      status: 'deleted',
      clerk_user_id: null,
      clerk_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_user_id', clerkId);

  if (error) {
    console.error('[WEBHOOK:user.deleted] Failed to soft-delete profile:', error);
  } else {
    console.log(`[WEBHOOK:user.deleted] Soft-deleted profile for clerk_user_id=${clerkId}`);
  }
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/deploy
// ---------------------------------------------------------------------------
// Triggered by Vercel/Netlify/GitHub on successful frontend deployment
// Sends a push notification to all users to force update their PWA
router.post('/deploy', async (req, res) => {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;
  const providedSecret = req.headers['x-deploy-secret'] || req.query.secret;

  // Protect the endpoint
  if (!secret || providedSecret !== secret) {
    console.warn('[WEBHOOK:deploy] Unauthorized deployment webhook attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[WEBHOOK:deploy] Deployment success webhook received. Broadcasting push update...');

  // Import lazily to avoid circular dependencies
  const { sendPushToAll } = require('../services/push');

  // Trigger push broadcast asynchronously
  sendPushToAll(
    '✨ Update Available!',
    'A new version of Campus Blink just landed. Tap here to open and automatically update the app!',
    '/?refresh=true'
  ).catch(err => console.error('[WEBHOOK:deploy] Push broadcast failed:', err));

  return res.status(200).json({ success: true, message: 'Update push broadcast initiated' });
});

module.exports = router;
