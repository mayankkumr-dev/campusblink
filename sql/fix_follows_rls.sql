-- Fix: Add missing RLS policies for the `follows` table.
--
-- The `follows` table had RLS enabled but ZERO policies defined,
-- causing all direct SELECT/INSERT/DELETE operations from the
-- authenticated frontend client to be silently blocked by Supabase.
--
-- This follows the exact same pattern used for `post_likes` in
-- add_post_likes_system.sql.
--
-- Run this in the Supabase SQL Editor.

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see who follows whom
-- (needed for counts, follower/following lists, feed filtering, messaging privacy checks)
DROP POLICY IF EXISTS "follows_select_authenticated" ON public.follows;
CREATE POLICY "follows_select_authenticated"
ON public.follows FOR SELECT TO authenticated
USING (true);

-- Users can follow others (insert their own follow rows only)
DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
CREATE POLICY "follows_insert_own"
ON public.follows FOR INSERT TO authenticated
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow (delete their own follow rows only)
DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;
CREATE POLICY "follows_delete_own"
ON public.follows FOR DELETE TO authenticated
USING (auth.uid() = follower_id);
