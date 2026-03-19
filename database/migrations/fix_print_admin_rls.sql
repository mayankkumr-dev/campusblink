-- Run this in the Supabase SQL Editor.
-- Purpose: Fix RLS for print_shops (admin writes) and print_orders (student inserts).

-- ── print_shops ──────────────────────────────────────────────────────────────
alter table if exists public.print_shops enable row level security;

drop policy if exists "print_shops_admin_select" on public.print_shops;
drop policy if exists "print_shops_admin_insert" on public.print_shops;
drop policy if exists "print_shops_admin_update" on public.print_shops;
drop policy if exists "print_shops_admin_delete" on public.print_shops;

create policy "print_shops_admin_insert"
on public.print_shops
for insert
with check (auth.role() = 'authenticated');

create policy "print_shops_admin_update"
on public.print_shops
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "print_shops_admin_delete"
on public.print_shops
for delete
using (auth.role() = 'authenticated');

-- ── print_orders ─────────────────────────────────────────────────────────────
alter table if exists public.print_orders enable row level security;

drop policy if exists "print_orders_insert_own" on public.print_orders;
drop policy if exists "print_orders_select_own" on public.print_orders;
drop policy if exists "print_orders_update_status" on public.print_orders;
drop policy if exists "print_orders_delete_any_authenticated" on public.print_orders;

-- Students can place their own orders
create policy "print_orders_insert_own"
on public.print_orders
for insert
with check (auth.uid() = student_id);

-- Students see their own; any authenticated user (admin/print shop) sees all
create policy "print_orders_select_own"
on public.print_orders
for select
using (
	auth.uid() = student_id
	or auth.role() = 'authenticated'
);

-- Print shops and admins can update order status
create policy "print_orders_update_status"
on public.print_orders
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Print shops/admins can remove collected orders from DB
create policy "print_orders_delete_any_authenticated"
on public.print_orders
for delete
using (auth.role() = 'authenticated');

-- ── Verify (should show rows for both tables) ─────────────────────────────────
select tablename, policyname, cmd
from pg_policies
where tablename in ('print_shops', 'print_orders')
order by tablename, cmd;
