-- ============================================================
-- Migration: Add clerk_id alias column to profiles table
-- This adds a `clerk_id` TEXT UNIQUE column as the canonical
-- Clerk identifier alongside the existing `clerk_user_id`.
-- Both columns hold the same value; a trigger keeps them in sync.
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add clerk_id column (mirrors clerk_user_id)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;

-- 2. Backfill clerk_id from existing clerk_user_id values
UPDATE public.profiles
  SET clerk_id = clerk_user_id
  WHERE clerk_user_id IS NOT NULL AND clerk_id IS NULL;

-- 3. Index for fast lookups by clerk_id
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id
  ON public.profiles(clerk_id);

-- 4. Trigger function: keep clerk_id and clerk_user_id in sync
CREATE OR REPLACE FUNCTION public.sync_clerk_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- If clerk_user_id is being set, sync it to clerk_id
  IF NEW.clerk_user_id IS NOT NULL AND NEW.clerk_id IS DISTINCT FROM NEW.clerk_user_id THEN
    NEW.clerk_id := NEW.clerk_user_id;
  END IF;
  -- If clerk_id is being set, sync it to clerk_user_id
  IF NEW.clerk_id IS NOT NULL AND NEW.clerk_user_id IS DISTINCT FROM NEW.clerk_id THEN
    NEW.clerk_user_id := NEW.clerk_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Attach the trigger to profiles table
DROP TRIGGER IF EXISTS trg_sync_clerk_id ON public.profiles;
CREATE TRIGGER trg_sync_clerk_id
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_clerk_id();
