-- Campus Blink multi-college scoping update
-- Shared across all colleges: posts, listings, profiles
-- College specific: canteen_shops, print_shops, stationery_items, canteen_orders, print_orders

begin;

create schema if not exists app_private;

create or replace function app_private.current_user_college()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.college
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

-- Enable RLS on all scoped tables if they exist.
do $$
declare
  t text;
  tables text[] := array[
    'profiles',
    'posts',
    'listings',
    'canteen_shops',
    'print_shops',
    'stationery_items',
    'canteen_orders',
    'print_orders'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- Drop existing policies on these tables so rules are deterministic.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'posts',
        'listings',
        'canteen_shops',
        'print_shops',
        'stationery_items',
        'canteen_orders',
        'print_orders'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Shared: profiles
create policy profiles_select_authenticated on public.profiles
for select using (auth.role() = 'authenticated');

create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

-- Shared: posts
create policy posts_select_authenticated on public.posts
for select using (auth.role() = 'authenticated');

create policy posts_insert_own on public.posts
for insert with check (auth.uid() = author_id);

create policy posts_update_own on public.posts
for update using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy posts_delete_own on public.posts
for delete using (auth.uid() = author_id);

-- Shared: listings
create policy listings_select_authenticated on public.listings
for select using (auth.role() = 'authenticated');

-- Owner-key fallback for listings owner columns.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'seller_id'
  ) then
    execute 'create policy listings_insert_owner_seller on public.listings for insert with check (auth.uid() = seller_id)';
    execute 'create policy listings_update_owner_seller on public.listings for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id)';
    execute 'create policy listings_delete_owner_seller on public.listings for delete using (auth.uid() = seller_id)';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'user_id'
  ) then
    execute 'create policy listings_insert_owner_user on public.listings for insert with check (auth.uid() = user_id)';
    execute 'create policy listings_update_owner_user on public.listings for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
    execute 'create policy listings_delete_owner_user on public.listings for delete using (auth.uid() = user_id)';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'author_id'
  ) then
    execute 'create policy listings_insert_owner_author on public.listings for insert with check (auth.uid() = author_id)';
    execute 'create policy listings_update_owner_author on public.listings for update using (auth.uid() = author_id) with check (auth.uid() = author_id)';
    execute 'create policy listings_delete_owner_author on public.listings for delete using (auth.uid() = author_id)';
  end if;
end $$;

-- College-specific read policy helper.
-- Uses either college_id or college text column if present.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'canteen_shops'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'canteen_shops' and column_name = 'college_id'
    ) then
      execute 'create policy canteen_shops_select_same_college_id on public.canteen_shops for select using (college_id::text = app_private.current_user_college())';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'canteen_shops' and column_name = 'college'
    ) then
      execute 'create policy canteen_shops_select_same_college on public.canteen_shops for select using (college = app_private.current_user_college())';
    end if;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'print_shops'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'print_shops' and column_name = 'college_id'
    ) then
      execute 'create policy print_shops_select_same_college_id on public.print_shops for select using (college_id::text = app_private.current_user_college())';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'print_shops' and column_name = 'college'
    ) then
      execute 'create policy print_shops_select_same_college on public.print_shops for select using (college = app_private.current_user_college())';
    end if;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'stationery_items'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'stationery_items' and column_name = 'college_id'
    ) then
      execute 'create policy stationery_items_select_same_college_id on public.stationery_items for select using (college_id::text = app_private.current_user_college())';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'stationery_items' and column_name = 'college'
    ) then
      execute 'create policy stationery_items_select_same_college on public.stationery_items for select using (college = app_private.current_user_college())';
    end if;
  end if;
end $$;

commit;
