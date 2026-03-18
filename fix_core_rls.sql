-- Run this in Supabase SQL Editor.
-- Purpose: clear recursive/broken RLS policies that trigger 500 errors on common app tables.

begin;

alter table if exists public.profiles enable row level security;
alter table if exists public.posts enable row level security;
alter table if exists public.comments enable row level security;
alter table if exists public.listings enable row level security;
alter table if exists public.canteen_shops enable row level security;
alter table if exists public.print_shops enable row level security;

-- Drop all existing policies on affected tables so we can recreate clean non-recursive rules.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'posts', 'comments', 'listings', 'canteen_shops', 'print_shops')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Profiles: no self-join inside policy -> prevents recursion.
create policy "profiles_select_authenticated"
on public.profiles
for select
using (auth.role() = 'authenticated');

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Posts policies
create policy "posts_select_authenticated"
on public.posts
for select
using (auth.role() = 'authenticated');

create policy "posts_insert_own"
on public.posts
for insert
with check (auth.uid() = author_id);

create policy "posts_update_own"
on public.posts
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "posts_delete_own"
on public.posts
for delete
using (auth.uid() = author_id);

-- Comments policies
create policy "comments_select_authenticated"
on public.comments
for select
using (auth.role() = 'authenticated');

create policy "comments_insert_own"
on public.comments
for insert
with check (auth.uid() = author_id);

create policy "comments_update_own"
on public.comments
for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "comments_delete_own"
on public.comments
for delete
using (auth.uid() = author_id);

-- Listings policies (owner column may differ between schemas).
create policy "listings_select_authenticated"
on public.listings
for select
using (auth.role() = 'authenticated');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'seller_id'
  ) then
    execute 'create policy "listings_insert_owner_seller" on public.listings for insert with check (auth.uid() = seller_id)';
    execute 'create policy "listings_update_owner_seller" on public.listings for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id)';
    execute 'create policy "listings_delete_owner_seller" on public.listings for delete using (auth.uid() = seller_id)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'user_id'
  ) then
    execute 'create policy "listings_insert_owner_user" on public.listings for insert with check (auth.uid() = user_id)';
    execute 'create policy "listings_update_owner_user" on public.listings for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
    execute 'create policy "listings_delete_owner_user" on public.listings for delete using (auth.uid() = user_id)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'author_id'
  ) then
    execute 'create policy "listings_insert_owner_author" on public.listings for insert with check (auth.uid() = author_id)';
    execute 'create policy "listings_update_owner_author" on public.listings for update using (auth.uid() = author_id) with check (auth.uid() = author_id)';
    execute 'create policy "listings_delete_owner_author" on public.listings for delete using (auth.uid() = author_id)';
  end if;
end $$;

-- Shop read policies used by student dashboards.
create policy "canteen_shops_select_authenticated"
on public.canteen_shops
for select
using (auth.role() = 'authenticated');

create policy "print_shops_select_authenticated"
on public.print_shops
for select
using (auth.role() = 'authenticated');

commit;
