-- ─────────────────────────────────────────────────────────────────────────────
-- FCM Migration: Add fcm_token column to push_subscriptions
-- Run this in your Supabase SQL editor BEFORE deploying the updated backend.
--
-- This migration is safe to run on a live database:
-- • It uses IF NOT EXISTS — idempotent, can be re-run safely
-- • It does NOT drop the existing endpoint/p256dh/auth columns
-- • Old VAPID subscriptions in those columns will simply be ignored by the new backend
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS fcm_token TEXT,
  ADD COLUMN IF NOT EXISTS token_updated_at TIMESTAMPTZ DEFAULT now();

-- Unique index so one user can't register the same FCM token twice
-- (partial index only covers non-null tokens)
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_fcm_token_key
  ON push_subscriptions (user_id, fcm_token)
  WHERE fcm_token IS NOT NULL;

-- Optional: useful index for the "fetch all tokens" query in sendPushToAll
CREATE INDEX IF NOT EXISTS push_subscriptions_fcm_token_idx
  ON push_subscriptions (fcm_token)
  WHERE fcm_token IS NOT NULL;
