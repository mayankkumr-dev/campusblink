-- ============================================================================
-- FIX: official_notices RLS — replace auth.uid() with public.get_user_id()
-- ============================================================================
-- PROBLEM: The notices RLS policies use auth.uid() which returns NULL for
-- Clerk JWTs (Clerk uses "user_xyz..." sub claims, not UUID subs).
-- The public.get_user_id() function correctly maps Clerk sub → profiles.id.
--
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- Drop all existing notices policies (clean slate)
DROP POLICY IF EXISTS "students read own college notices"    ON public.official_notices;
DROP POLICY IF EXISTS "notice admins manage notices"         ON public.official_notices;
DROP POLICY IF EXISTS "admins manage all notices"            ON public.official_notices;
DROP POLICY IF EXISTS "professors read notices"              ON public.official_notices;
DROP POLICY IF EXISTS "professors write faculty notices"     ON public.official_notices;

-- ── Students: read notices for their college ──────────────────────────────────
CREATE POLICY "students read own college notices"
  ON public.official_notices
  FOR SELECT
  USING (
    is_fully_removed = false
    AND (
      college = 'All'
      OR college = (SELECT college FROM public.profiles WHERE id = public.get_user_id())
    )
    AND target_year != 'faculty'
  );

-- ── Notice admins: full CRUD for their own college ────────────────────────────
CREATE POLICY "notice admins manage notices"
  ON public.official_notices
  FOR ALL
  USING (
    (SELECT is_notice_admin FROM public.profiles WHERE id = public.get_user_id()) = true
    AND (
      college = 'All'
      OR college = (SELECT college FROM public.profiles WHERE id = public.get_user_id())
    )
  )
  WITH CHECK (
    (SELECT is_notice_admin FROM public.profiles WHERE id = public.get_user_id()) = true
    AND (
      college = 'All'
      OR college = (SELECT college FROM public.profiles WHERE id = public.get_user_id())
    )
  );

-- ── Platform admins: manage ALL notices across all colleges ───────────────────
CREATE POLICY "admins manage all notices"
  ON public.official_notices
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = public.get_user_id()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = public.get_user_id()) = 'admin'
  );

-- ── Professors: read 'all' and 'faculty' notices for their college ────────────
CREATE POLICY "professors read notices"
  ON public.official_notices
  FOR SELECT
  USING (
    is_fully_removed = false
    AND (SELECT role FROM public.profiles WHERE id = public.get_user_id()) = 'professor'
    AND target_year IN ('all', 'faculty')
    AND (
      college = 'All'
      OR college = (SELECT college FROM public.profiles WHERE id = public.get_user_id())
    )
  );

-- ── Professors: write faculty notices for their college ───────────────────────
CREATE POLICY "professors write faculty notices"
  ON public.official_notices
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = public.get_user_id()) = 'professor'
    AND college = (SELECT college FROM public.profiles WHERE id = public.get_user_id())
    AND target_year = 'faculty'
  );

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
