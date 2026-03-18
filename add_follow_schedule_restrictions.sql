alter table if exists public.profiles
  add column if not exists followers_count integer not null default 0,
  add column if not exists following_count integer not null default 0;

drop table if exists public.user_restrictions cascade;

create table if not exists public.user_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  feature text not null,
  is_enabled boolean default false,
  reason text,
  restricted_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, feature)
);

alter table if exists public.listings
  add column if not exists is_admin_disabled boolean not null default false,
  add column if not exists disabled_reason text,
  add column if not exists disabled_by uuid references public.profiles(id);

alter table if exists public.canteen_shops
  add column if not exists schedule_json jsonb not null default '{}'::jsonb,
  add column if not exists is_open_now boolean not null default true,
  add column if not exists manual_override_status text;

alter table if exists public.print_shops
  add column if not exists schedule_json jsonb not null default '{}'::jsonb,
  add column if not exists is_open_now boolean not null default true,
  add column if not exists manual_override_status text;

create or replace function public.refresh_follow_counts(profile_uuid uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set followers_count = (select count(*) from public.follows where following_id = profile_uuid),
      following_count = (select count(*) from public.follows where follower_id = profile_uuid)
  where id = profile_uuid;
end;
$$;

create or replace function public.handle_follow_count_refresh()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_follow_counts(new.follower_id);
    perform public.refresh_follow_counts(new.following_id);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_follow_counts(old.follower_id);
    perform public.refresh_follow_counts(old.following_id);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists follows_refresh_counts on public.follows;
create trigger follows_refresh_counts
after insert or delete on public.follows
for each row execute procedure public.handle_follow_count_refresh();

create or replace function public.toggle_follow(follower_user_id uuid, following_user_id uuid)
returns table(is_following boolean, followers_count integer, following_count integer)
language plpgsql
security definer
as $$
declare
  exists_row boolean;
begin
  if follower_user_id is null or following_user_id is null then
    raise exception 'Both follower and following users are required';
  end if;

  if follower_user_id = following_user_id then
    raise exception 'Users cannot follow themselves';
  end if;

  select exists(
    select 1 from public.follows
    where follower_id = follower_user_id and following_id = following_user_id
  ) into exists_row;

  if exists_row then
    delete from public.follows
    where follower_id = follower_user_id and following_id = following_user_id;
    is_following := false;
  else
    insert into public.follows (follower_id, following_id)
    values (follower_user_id, following_user_id)
    on conflict (follower_id, following_id) do nothing;
    is_following := true;
  end if;

  perform public.refresh_follow_counts(follower_user_id);
  perform public.refresh_follow_counts(following_user_id);

  select p.followers_count, p.following_count
  into followers_count, following_count
  from public.profiles p
  where p.id = following_user_id;

  return next;
end;
$$;

alter table public.user_restrictions enable row level security;

drop policy if exists "Admins manage restrictions" on public.user_restrictions;
drop policy if exists "Users read own restrictions" on public.user_restrictions;
drop policy if exists "Service role manages restrictions" on public.user_restrictions;

create policy "Admins manage restrictions"
on public.user_restrictions
for all
using (
  auth.role() = 'service_role'
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role = 'admin'
        or lower(coalesce(email, '')) = 'contactus.mayank@gmail.com'
      )
  )
)
with check (
  auth.role() = 'service_role'
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role = 'admin'
        or lower(coalesce(email, '')) = 'contactus.mayank@gmail.com'
      )
  )
);

create policy "Users read own restrictions"
on public.user_restrictions
for select
using (user_id = auth.uid());

insert into public.platform_settings (key, value)
values
  ('search', 'true'::jsonb),
  ('exchange', 'true'::jsonb),
  ('canteen', 'true'::jsonb),
  ('print', 'true'::jsonb),
  ('community', 'true'::jsonb),
  ('alerts', 'true'::jsonb),
  ('ordering', 'true'::jsonb),
  ('listing_creation', 'true'::jsonb),
  ('community_posting', 'true'::jsonb),
  ('registrations_enabled', 'true'::jsonb),
  ('maintenance_mode', 'false'::jsonb)
on conflict (key) do nothing;