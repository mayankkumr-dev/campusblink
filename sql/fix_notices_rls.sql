-- Fix RLS Policies for Official Notices
-- Run this script in the Supabase SQL Editor

-- 1. Drop the existing overly strict policies
DROP POLICY IF EXISTS "students read own college notices" ON public.official_notices;
DROP POLICY IF EXISTS "professors read notices" ON public.official_notices;

-- 2. Create the relaxed policy for students
-- Fixes:
-- A) Allows seeing notices where college is 'All'
-- B) Removes strict target_year equality so the frontend can handle the formatting (e.g. '1' vs '1st Year')
CREATE POLICY "students read own college notices"
  ON public.official_notices
  FOR SELECT
  USING (
    is_fully_removed = false
    AND (
      college = 'All' 
      OR college = (SELECT college FROM public.profiles WHERE id = auth.uid())
    )
    -- We allow the frontend to filter the specific year, as long as it's not a faculty notice
    AND target_year != 'faculty'
  );

-- 3. Create the relaxed policy for professors
-- Fixes: Allows seeing notices where college is 'All'
CREATE POLICY "professors read notices"
  ON public.official_notices
  FOR SELECT
  USING (
    is_fully_removed = false
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'professor'
    AND target_year IN ('all', 'faculty')
    AND (
      college = 'All' 
      OR college = (SELECT college FROM public.profiles WHERE id = auth.uid())
    )
  );
