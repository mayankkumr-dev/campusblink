-- Run this in the Supabase SQL Editor.
-- Purpose: Allow students to place canteen orders while keeping canteen/admin dashboards functional.

alter table if exists public.canteen_orders enable row level security;

drop policy if exists "canteen_orders_insert_own" on public.canteen_orders;
drop policy if exists "canteen_orders_select_access" on public.canteen_orders;
drop policy if exists "canteen_orders_update_authenticated" on public.canteen_orders;
drop policy if exists "canteen_orders_delete_authenticated" on public.canteen_orders;

-- Students can place their own orders.
create policy "canteen_orders_insert_own"
on public.canteen_orders
for insert
with check (auth.uid() = student_id);

-- Students can see their own orders; authenticated canteen/admin users can read for dashboards.
create policy "canteen_orders_select_access"
on public.canteen_orders
for select
using (
  auth.uid() = student_id
  or auth.role() = 'authenticated'
);

-- Authenticated canteen/admin users can move status through prep lifecycle.
create policy "canteen_orders_update_authenticated"
on public.canteen_orders
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Optional cleanup ability for authenticated operators.
create policy "canteen_orders_delete_authenticated"
on public.canteen_orders
for delete
using (auth.role() = 'authenticated');

-- Verify
select tablename, policyname, cmd
from pg_policies
where tablename = 'canteen_orders'
order by cmd, policyname;
