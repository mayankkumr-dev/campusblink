-- Run this in Supabase SQL Editor
-- Purpose: Ensure notifications can be inserted for students by authenticated app actors
-- (e.g. canteen/print owners sending rejection/ready alerts).

alter table if exists public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_insert_authenticated" on public.notifications;

-- Students can read only their own notifications
create policy "notifications_select_own"
on public.notifications
for select
using (auth.uid() = user_id);

-- Students can mark only their own notifications as read
create policy "notifications_update_own"
on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Any authenticated user can create notifications for app workflows
create policy "notifications_insert_authenticated"
on public.notifications
for insert
with check (auth.role() = 'authenticated');

-- Verify
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'notifications'
order by cmd, policyname;
