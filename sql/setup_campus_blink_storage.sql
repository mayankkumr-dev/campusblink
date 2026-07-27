-- ============================================================================
-- CAMPUS BLINK GENERAL STORAGE BUCKET SETUP
-- Run this in your Supabase SQL Editor to set up the 'campus-blink' storage bucket.
-- ============================================================================

-- 1. Create 'campus-blink' bucket (Public - for avatars, covers, attachments, and general uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campus-blink',
  'campus-blink',
  true,
  26214400, -- 25MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 26214400;

-- 2. Storage RLS Policies for 'campus-blink' Bucket
DROP POLICY IF EXISTS "Public read access for campus-blink" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload access for campus-blink" ON storage.objects;
DROP POLICY IF EXISTS "Owner update and delete access for campus-blink" ON storage.objects;

-- Allow anyone to view/read objects in the public campus-blink bucket
CREATE POLICY "Public read access for campus-blink"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'campus-blink');

-- Allow authenticated users to upload files to campus-blink bucket
CREATE POLICY "Authenticated upload access for campus-blink"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'campus-blink');

-- Allow authenticated users to update or delete files in campus-blink bucket
CREATE POLICY "Owner update and delete access for campus-blink"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'campus-blink')
  WITH CHECK (bucket_id = 'campus-blink');

-- 3. Verify bucket creation
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'campus-blink';
