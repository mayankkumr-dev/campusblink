-- Run this in Supabase SQL editor.
-- Adds support for professor signup request moderation.

alter table public.profiles
  add column if not exists requested_role text;

alter table public.profiles
  add column if not exists role_request_status text;

alter table public.profiles
  add column if not exists role_request_updated_at timestamptz;

create index if not exists idx_profiles_requested_role_status
  on public.profiles(requested_role, role_request_status);

-- Keep values constrained but backward compatible.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_requested_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_requested_role_check
      check (requested_role is null or requested_role in ('teacher'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_request_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_request_status_check
      check (role_request_status is null or role_request_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create or replace function public.touch_role_request_timestamp()
returns trigger
language plpgsql
as $$
begin
  if new.requested_role is distinct from old.requested_role
     or new.role_request_status is distinct from old.role_request_status then
    new.role_request_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_touch_role_request_timestamp on public.profiles;
create trigger profiles_touch_role_request_timestamp
before update on public.profiles
for each row execute procedure public.touch_role_request_timestamp();
