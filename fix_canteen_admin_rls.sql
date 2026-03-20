-- Run this in the Supabase SQL Editor.
-- Purpose: Allow authenticated admin/dashboard users to manage canteen_shops records.

alter table if exists public.canteen_shops enable row level security;

drop policy if exists "canteen_shops_select_authenticated" on public.canteen_shops;
drop policy if exists "canteen_shops_insert_authenticated" on public.canteen_shops;
drop policy if exists "canteen_shops_update_authenticated" on public.canteen_shops;
drop policy if exists "canteen_shops_delete_authenticated" on public.canteen_shops;

create policy "canteen_shops_select_authenticated"
on public.canteen_shops
for select
using (auth.role() = 'authenticated');

create policy "canteen_shops_insert_authenticated"
on public.canteen_shops
for insert
with check (auth.role() = 'authenticated');

create policy "canteen_shops_update_authenticated"
on public.canteen_shops
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "canteen_shops_delete_authenticated"
on public.canteen_shops
for delete
using (auth.role() = 'authenticated');

-- Verify
select tablename, policyname, cmd
from pg_policies
where tablename = 'canteen_shops'
order by cmd, policyname;
