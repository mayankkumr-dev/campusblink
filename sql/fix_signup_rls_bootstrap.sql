-- =============================================================================
-- Fix: Sign-up RLS bootstrap problem (Clerk → Supabase)
-- =============================================================================
--
-- PROBLEM:
-- When a brand-new Clerk user signs up, their Clerk JWT sub is "user_2xyz..."
-- Our auth.uid() override tries to map this to a UUID by querying profiles.
-- But the profile doesn't exist yet → auth.uid() returns NULL → 403 on INSERT/UPDATE.
--
-- PRIMARY SOLUTION (already in code):
-- The backend /api/auth/complete-signup uses the Supabase service-role key,
-- which bypasses all RLS. This SQL is a belt-and-suspenders DB fix.
--
-- NOTE: We do NOT modify auth.uid() here because that requires the postgres
-- superuser role (permission denied for schema auth in regular SQL editor).
-- The auth.uid() override is already set via fix_clerk_auth_uid.sql separately.
--
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

BEGIN;

-- ── 1. Fix invite_codes "consume" update policy ───────────────────────────────
-- OLD policy required is_used=false AND (auth.uid() IS NOT NULL) which blocks
-- the backend's service-role upsert path.
-- NEW policy only checks row state — service role bypasses RLS anyway, and
-- for any client-side path we just check that the code transitions correctly.
DROP POLICY IF EXISTS "invite_codes_update_consume" ON public.invite_codes;

CREATE POLICY "invite_codes_update_consume"
ON public.invite_codes
FOR UPDATE
USING (
  -- Can only update a code that is currently unused and not expired
  is_used = false
  AND (expires_at IS NULL OR expires_at > now())
)
WITH CHECK (
  -- After update, the row must be marked used with a non-null used_by
  is_used = true
  AND used_by IS NOT NULL
);

-- ── 2. profiles: ensure RLS is enabled ───────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── 3. profiles: drop & recreate the insert policy ───────────────────────────
-- The old "profiles_insert_own" checked auth.uid() = id which always fails
-- for new users (their UUID can't be resolved until the profile exists).
-- The backend service-role handles all new-user inserts now, so the client-side
-- insert policy only needs to exist for edge cases (it won't be hit normally).
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_clerk_bootstrap" ON public.profiles;

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (
  -- Standard path: auth.uid() resolves to the profile's id (existing users)
  auth.uid() = id
  -- OR: Allow when auth role is authenticated but uid is null (new user bootstrap)
  -- This is the fallback; in practice the backend handles new-user inserts.
  OR (auth.role() = 'authenticated' AND auth.uid() IS NULL)
);

-- ── 4. invite_codes: ensure anon can SELECT valid codes (for validation step) ─
-- This already exists in add_invite_only_system.sql but re-assert it here
-- in case it was dropped by a previous migration.
DROP POLICY IF EXISTS "invite_codes_select_valid_for_signup" ON public.invite_codes;

CREATE POLICY "invite_codes_select_valid_for_signup"
ON public.invite_codes
FOR SELECT
USING (
  is_used = false
  AND (expires_at IS NULL OR expires_at > now())
);

COMMIT;
