-- ============================================================================
-- FIX: Replace auth.uid() with public.get_user_id() for Clerk compatibility
-- ============================================================================
-- This script fixes the 403 Forbidden errors for Official Notices and
-- Notification Settings by replacing the native Supabase auth.uid() function
-- with our custom public.get_user_id() function which supports Clerk JWTs.
--
-- INSTRUCTIONS:
-- Please copy this entire script and run it in your Supabase SQL Editor.
-- ============================================================================

-- 1. Fix Notification Preferences
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences
  FOR ALL
  USING (user_id = public.get_user_id())
  WITH CHECK (user_id = public.get_user_id());

-- 2. Fix Push Subscriptions
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (user_id = public.get_user_id())
  WITH CHECK (user_id = public.get_user_id());

-- 3. Fix Official Notices (Drop old policies)
DROP POLICY IF EXISTS "students read own college notices"    ON public.official_notices;
DROP POLICY IF EXISTS "notice admins manage notices"         ON public.official_notices;
DROP POLICY IF EXISTS "admins manage all notices"            ON public.official_notices;
DROP POLICY IF EXISTS "professors read notices"              ON public.official_notices;
DROP POLICY IF EXISTS "professors write faculty notices"     ON public.official_notices;

-- 4. Recreate Official Notices policies with public.get_user_id()
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

CREATE POLICY "admins manage all notices"
  ON public.official_notices
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = public.get_user_id()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = public.get_user_id()) = 'admin'
  );

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
