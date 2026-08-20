-- =============================================================================
-- Fix: Clerk JWT → Supabase UUID mapping (NO auth schema required)
-- =============================================================================
--
-- PROBLEM:
--   auth.uid() in Supabase returns the JWT "sub" claim as a UUID.
--   With Clerk, the "sub" is "user_2xyz..." (a string, not a UUID).
--   Modifying auth.uid() itself requires the postgres superuser role
--   which is NOT available in the regular Supabase SQL editor → 42501 error.
--
-- SOLUTION:
--   Create public.get_user_id() in the PUBLIC schema (no superuser needed).
--   This function reads the Clerk JWT sub and maps it to the profiles.id UUID.
--   All RLS policies are then rewritten to use public.get_user_id() instead
--   of auth.uid().
--
-- Run in: Supabase Dashboard → SQL Editor (as the default anon/service user)
-- =============================================================================

-- ── STEP 1: Create the Clerk → UUID mapping function ─────────────────────────
-- Lives in public schema so no special permissions needed.
-- SECURITY DEFINER so it can read profiles even with RLS enabled.

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim_sub  text;
  mapped_id  uuid;
BEGIN
  -- Read the raw "sub" claim from the current JWT
  claim_sub := current_setting('request.jwt.claim.sub', true);

  -- No JWT present (anon request)
  IF claim_sub IS NULL OR claim_sub = '' THEN
    RETURN NULL;
  END IF;

  -- Already a standard UUID (Supabase-native auth, not Clerk)
  IF claim_sub ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN claim_sub::uuid;
  END IF;

  -- Clerk ID ("user_2xyz...") → look up the matching profiles row
  -- Returns NULL safely when the profile doesn't exist yet (bootstrap phase)
  SELECT id INTO mapped_id
  FROM public.profiles
  WHERE clerk_user_id = claim_sub
  LIMIT 1;

  RETURN mapped_id;
END;
$$;

-- Grant execute to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_user_id() TO anon, authenticated;


-- ── STEP 2: Rewrite all public-schema RLS policies ───────────────────────────
-- Replaces every occurrence of auth.uid() with public.get_user_id() in
-- all existing policies on the public schema.
-- This is safe to run multiple times (idempotent via DROP + CREATE).

DO $$
DECLARE
  pol         RECORD;
  new_qual    text;
  new_check   text;
  stmt        text;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual       LIKE '%auth.uid()%'
        OR with_check LIKE '%auth.uid()%'
      )
  LOOP
    new_qual  := replace(pol.qual,       'auth.uid()', 'public.get_user_id()');
    new_check := replace(pol.with_check, 'auth.uid()', 'public.get_user_id()');

    -- Drop the old policy
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename
    );

    -- Rebuild it
    stmt := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s',
      pol.policyname, pol.schemaname, pol.tablename,
      pol.permissive, pol.cmd
    );

    -- Add role restriction if it's not the default "public" role
    IF pol.roles IS NOT NULL
       AND array_length(pol.roles, 1) > 0
       AND pol.roles[1] != 'public'
    THEN
      stmt := stmt || ' TO ' || array_to_string(pol.roles, ', ');
    END IF;

    IF new_qual IS NOT NULL THEN
      stmt := stmt || ' USING (' || new_qual || ')';
    END IF;

    IF new_check IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' || new_check || ')';
    END IF;

    EXECUTE stmt;
  END LOOP;
END $$;


-- ── STEP 3: Fix invite_codes_update_consume policy ───────────────────────────
-- Ensure the invite-code consumption policy doesn't require a non-null uid
-- (it fails for new users who have no profile row yet).

DROP POLICY IF EXISTS "invite_codes_update_consume" ON public.invite_codes;

CREATE POLICY "invite_codes_update_consume"
ON public.invite_codes
FOR UPDATE
USING (
  is_used = false
  AND (expires_at IS NULL OR expires_at > now())
)
WITH CHECK (
  is_used = true
  AND used_by IS NOT NULL
);


-- ── STEP 4: Fix profiles insert policy ───────────────────────────────────────
-- Allow insert when public.get_user_id() matches id OR when the role is
-- authenticated but the uid is still null (new-user bootstrap via backend).

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_clerk_bootstrap" ON public.profiles;

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (
  public.get_user_id() = id
  OR (auth.role() = 'authenticated' AND public.get_user_id() IS NULL)
);


-- ── STEP 5: Fix profiles select / update policies ────────────────────────────
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (public.get_user_id() = id)
WITH CHECK (public.get_user_id() = id);


-- ── STEP 6: Re-assert invite_codes SELECT for signup validation ───────────────
DROP POLICY IF EXISTS "invite_codes_select_valid_for_signup" ON public.invite_codes;

CREATE POLICY "invite_codes_select_valid_for_signup"
ON public.invite_codes
FOR SELECT
USING (
  is_used = false
  AND (expires_at IS NULL OR expires_at > now())
);
