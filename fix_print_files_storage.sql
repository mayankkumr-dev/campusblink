-- Run this in Supabase SQL Editor
-- Purpose: enable PDF file uploads for student print orders and access for print shop owners/admins.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'print-files',
  'print-files',
  false,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "print_files_students_upload" on storage.objects;
drop policy if exists "print_files_authenticated_read" on storage.objects;
drop policy if exists "print_files_owner_update" on storage.objects;
drop policy if exists "print_files_owner_delete" on storage.objects;

create policy "print_files_students_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'print-files'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "print_files_authenticated_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'print-files');

create policy "print_files_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'print-files'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'print-files'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "print_files_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'print-files'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Verify
select id, name, public from storage.buckets where id = 'print-files';
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'print_files_%' order by policyname;
