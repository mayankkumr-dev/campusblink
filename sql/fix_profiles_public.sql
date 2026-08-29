-- ============================================================================
-- FIX: Make profiles readable by everyone (fixes "Campus Student" bug)
-- ============================================================================
-- PROBLEM: The previous RLS policy required `auth.role() = 'authenticated'`.
-- If the Clerk JWT token is missing the Supabase template, requests are 
-- downgraded to `anon`. This blocked the diary feed from reading user names,
-- causing it to fallback to "Campus Student".
-- 
-- SOLUTION: Since profile info (name, avatar, college) is public for the app 
-- to function, this policy makes it readable by all roles.
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

CREATE POLICY "profiles_select_public"
ON public.profiles
FOR SELECT
USING (true);

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
