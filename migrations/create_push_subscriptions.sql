-- ─────────────────────────────────────────────────────────────────────────────
-- push_subscriptions table
-- Stores Web Push API subscription objects, one row per device per user.
-- Safe to run multiple times (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  device_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One subscription row per (user, device endpoint) pair
  CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON public.push_subscriptions (endpoint);

-- ── updated_at auto-trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_push_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER set_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.set_push_subscriptions_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions' AND policyname = 'push_subscriptions_select_own'
  ) THEN
    CREATE POLICY push_subscriptions_select_own
      ON public.push_subscriptions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can insert their own subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions' AND policyname = 'push_subscriptions_insert_own'
  ) THEN
    CREATE POLICY push_subscriptions_insert_own
      ON public.push_subscriptions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions' AND policyname = 'push_subscriptions_update_own'
  ) THEN
    CREATE POLICY push_subscriptions_update_own
      ON public.push_subscriptions FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions' AND policyname = 'push_subscriptions_delete_own'
  ) THEN
    CREATE POLICY push_subscriptions_delete_own
      ON public.push_subscriptions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role bypass (backend uses supabaseAdmin which has service_role key)
-- Service role already bypasses RLS by default in Supabase — no extra policy needed.

COMMENT ON TABLE public.push_subscriptions IS
  'Web Push API subscription objects. One row per device/browser per user. '
  'Populated when a user grants notification permission in the PWA. '
  'Stale rows (404/410 from push service) are cleaned up automatically by the backend.';
