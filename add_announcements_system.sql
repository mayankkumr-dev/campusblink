-- Announcements system migration
-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text default 'info' check (type in ('info', 'warning', 'success', 'urgent')),
  target text default 'all' check (target in ('all', 'specific_user')),
  target_user_id uuid references public.profiles(id) on delete cascade,
  link_url text,
  is_active boolean default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  expires_at timestamptz
);

alter table public.announcements add column if not exists message text;
alter table public.announcements add column if not exists type text;
alter table public.announcements add column if not exists target text;
alter table public.announcements add column if not exists target_user_id uuid references public.profiles(id) on delete cascade;
alter table public.announcements add column if not exists link_url text;
alter table public.announcements add column if not exists is_active boolean default true;
alter table public.announcements add column if not exists created_by uuid references public.profiles(id);
alter table public.announcements add column if not exists created_at timestamptz default now();
alter table public.announcements add column if not exists expires_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'announcements'
      and column_name = 'content'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'announcements'
      and column_name = 'message'
  ) then
    execute 'alter table public.announcements rename column content to message';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'announcements'
      and column_name = 'content'
  ) then
    execute 'update public.announcements set message = coalesce(message, content) where message is null';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'announcements'
      and column_name = 'priority'
  ) then
    execute $q$
      update public.announcements
      set type = case
        when lower(coalesce(priority, '''')) = 'high' then 'urgent'
        when lower(coalesce(priority, '''')) = 'normal' then 'info'
        else coalesce(type, 'info')
      end
    $q$;
  end if;
end $$;

update public.announcements
set type = coalesce(type, 'info');

update public.announcements
set target = coalesce(target, 'all');

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'announcements'
      and column_name = 'active'
  ) then
    execute 'update public.announcements set is_active = coalesce(is_active, active, true)';
  end if;
end $$;

update public.announcements
set is_active = coalesce(is_active, true);

alter table public.announcements
  alter column message set not null,
  alter column type set default 'info',
  alter column target set default 'all',
  alter column is_active set default true,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'announcements_type_check'
  ) then
    alter table public.announcements
      add constraint announcements_type_check
      check (type in ('info', 'warning', 'success', 'urgent'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'announcements_target_check'
  ) then
    alter table public.announcements
      add constraint announcements_target_check
      check (target in ('all', 'specific_user'));
  end if;
end $$;

alter table public.announcements enable row level security;

-- Admin full access
drop policy if exists "Admins can manage announcements" on public.announcements;
create policy "Admins can manage announcements"
on public.announcements
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- Authenticated users can read all public or direct announcements
drop policy if exists "Users can read allowed announcements" on public.announcements;
create policy "Users can read allowed announcements"
on public.announcements
for select
to authenticated
using (
  target = 'all'
  or target_user_id = auth.uid()
);
