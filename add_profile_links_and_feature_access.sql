create table if not exists public.profile_social_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_social_links_user_id_idx on public.profile_social_links(user_id, position);

alter table public.profile_social_links enable row level security;

drop policy if exists "profile social links readable" on public.profile_social_links;
create policy "profile social links readable"
on public.profile_social_links
for select
to authenticated
using (true);

drop policy if exists "profile social links insert own" on public.profile_social_links;
create policy "profile social links insert own"
on public.profile_social_links
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profile social links update own" on public.profile_social_links;
create policy "profile social links update own"
on public.profile_social_links
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profile social links delete own" on public.profile_social_links;
create policy "profile social links delete own"
on public.profile_social_links
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.user_feature_access (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text unique,
  disabled_features text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_feature_access_email_idx on public.user_feature_access(lower(email));

alter table public.user_feature_access enable row level security;

drop policy if exists "user feature access select own or admin" on public.user_feature_access;
create policy "user feature access select own or admin"
on public.user_feature_access
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

drop policy if exists "user feature access admin write" on public.user_feature_access;
create policy "user feature access admin write"
on public.user_feature_access
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);