-- Campus Blink Diaries: Storage Buckets & Moderation Schema
-- Safe to run multiple times (idempotent).
-- Run this in your Supabase SQL Editor to set up the quarantine and diaries storage buckets.

-- ── 1. Ensure image_url column exists in diary_entries ────────────────
alter table public.diary_entries
  add column if not exists image_url text;

create index if not exists diary_entries_image_idx
  on public.diary_entries(image_url) where image_url is not null;

-- ── 2. Create 'quarantine' Bucket (Private - for unmoderated uploads) ──
insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values (
  'quarantine',
  'quarantine',
  false, -- strictly private
  false,
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];

-- ── 3. Create 'diaries' Bucket (Public - for moderated safe photos) ────
insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values (
  'diaries',
  'diaries',
  true, -- public after moderation
  false,
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];

-- ── 4. Storage Policies for 'quarantine' Bucket ───────────────────────
drop policy if exists "Authenticated users can upload to quarantine" on storage.objects;
drop policy if exists "Users can view or delete own quarantined files" on storage.objects;

create policy "Authenticated users can upload to quarantine"
  on storage.objects
  for insert
  with check (
    bucket_id = 'quarantine'
    and auth.role() = 'authenticated'
  );

create policy "Users can view or delete own quarantined files"
  on storage.objects
  for all
  using (
    bucket_id = 'quarantine'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 5. Storage Policies for 'diaries' Bucket ──────────────────────────
drop policy if exists "Anyone can read diaries bucket images" on storage.objects;
drop policy if exists "Service role or backend can manage diaries images" on storage.objects;

create policy "Anyone can read diaries bucket images"
  on storage.objects
  for select
  using (bucket_id = 'diaries');

create policy "Service role or backend can manage diaries images"
  on storage.objects
  for all
  using (bucket_id = 'diaries')
  with check (bucket_id = 'diaries');
