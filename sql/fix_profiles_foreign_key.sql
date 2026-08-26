-- =============================================================================
-- Fix: Drop foreign key constraint on profiles.id
-- =============================================================================
--
-- PROBLEM:
-- The `profiles` table has a foreign key constraint (`profiles_id_fkey`) linking
-- `profiles.id` to `auth.users(id)`. Since we are using Clerk for authentication,
-- the user does not exist in Supabase's `auth.users` table, which causes the 
-- backend profile creation to fail with:
-- "violates foreign key constraint 'profiles_id_fkey'".
--
-- SOLUTION:
-- Drop the foreign key constraint so that `profiles.id` can be independent of 
-- `auth.users(id)`.
--
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

BEGIN;

-- Drop the foreign key constraint from profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey1;

COMMIT;
