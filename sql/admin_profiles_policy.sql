-- Run this in the Supabase SQL Editor to allow admins to see all pending professor profiles

drop policy if exists "Admins read all profiles" on profiles;

create policy "Admins read all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );
