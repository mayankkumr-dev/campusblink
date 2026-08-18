-- ============================================================
-- Migration: Add Clerk user ID support to profiles
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add clerk_user_id column (stores the Clerk user ID string, e.g. "user_2xvMG...")
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- 2. Create an index for fast lookups by Clerk user ID
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id
  ON public.profiles(clerk_user_id);

-- 3. Helper function: get current user's identifier (works for both Supabase auth + Clerk)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    auth.uid()::text,
    (auth.jwt()->>'sub')
  )
$$;
