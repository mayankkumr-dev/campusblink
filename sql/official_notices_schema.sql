-- ============================================================================
-- OFFICIAL NOTICES SYSTEM — FULL SCHEMA & MIGRATION SCRIPT
-- Run this in your Supabase SQL Editor to set up or update the table.
-- ============================================================================

-- 1. Create the official_notices table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.official_notices (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  college          text NOT NULL,
  title            text NOT NULL,
  content          text NOT NULL,
  target_year      text NOT NULL DEFAULT 'all',
  attachments      jsonb DEFAULT '[]'::jsonb,
  is_pinned        boolean DEFAULT false,
  pin_expires_at   timestamptz DEFAULT null,
  is_deleted       boolean DEFAULT false,
  is_fully_removed boolean DEFAULT false,
  deleted_by_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now()
);

-- 2. Add columns if table already existed without them
DO $$
BEGIN
  ALTER TABLE public.official_notices ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
  ALTER TABLE public.official_notices ADD COLUMN IF NOT EXISTS is_fully_removed boolean DEFAULT false;
  ALTER TABLE public.official_notices ADD COLUMN IF NOT EXISTS pin_expires_at timestamptz DEFAULT null;
  ALTER TABLE public.official_notices ADD COLUMN IF NOT EXISTS deleted_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 3. Add is_notice_admin permission column to profiles table if missing
DO $$
BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_notice_admin boolean DEFAULT false;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 4. Enable Row Level Security
ALTER TABLE public.official_notices ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to cleanly re-create them
DROP POLICY IF EXISTS "students read own college notices" ON public.official_notices;
DROP POLICY IF EXISTS "notice admins manage notices" ON public.official_notices;
DROP POLICY IF EXISTS "admins manage all notices" ON public.official_notices;

-- 6. RLS Policy: Students can read notices for their college that match their study year (or 'all'),
--    and are not fully removed by platform admins.
CREATE POLICY "students read own college notices"
  ON public.official_notices
  FOR SELECT
  USING (
    college = (SELECT college FROM public.profiles WHERE id = auth.uid())
    AND is_fully_removed = false
    AND (
      target_year = 'all'
      OR target_year = (SELECT study_year FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 7. RLS Policy: Notice admins can insert/update/delete notices for their own college
CREATE POLICY "notice admins manage notices"
  ON public.official_notices
  FOR ALL
  USING (
    (SELECT is_notice_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND college = (SELECT college FROM public.profiles WHERE id = auth.uid())
  );

-- 8. RLS Policy: Platform admins can manage all notices
CREATE POLICY "admins manage all notices"
  ON public.official_notices
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================================
-- STORAGE BUCKET SETUP (Run once or configure via Supabase Storage UI)
-- Bucket name: notice-attachments (Public bucket)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('notice-attachments', 'notice-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Notify Supabase API (PostgREST) to immediately reload the schema cache
NOTIFY pgrst, 'reload schema';
