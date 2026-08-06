-- Table: public.push_subscriptions
-- Description: Stores VAPID Web Push subscriptions for users across multiple devices (e.g. Android PWAs, desktop browsers).
-- Features RLS to ensure users can only manage their own device subscriptions.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  device_name text default 'Unknown',
  device_info jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, endpoint)
);

-- Index for rapid lookup by user_id during push delivery
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);

-- Enable Row Level Security (RLS)
alter table public.push_subscriptions enable row level security;

-- Drop any conflicting legacy policies before re-creating cleanly
drop policy if exists "Users can view own push subscriptions" on public.push_subscriptions;
create policy "Users can view own push subscriptions"
  on public.push_subscriptions
  for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own push subscriptions" on public.push_subscriptions;
create policy "Users can insert own push subscriptions"
  on public.push_subscriptions
  for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own push subscriptions" on public.push_subscriptions;
create policy "Users can update own push subscriptions"
  on public.push_subscriptions
  for update
  using (user_id = auth.uid());

drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
create policy "Users can delete own push subscriptions"
  on public.push_subscriptions
  for delete
  using (user_id = auth.uid());

drop policy if exists "Service role has full access to push subscriptions" on public.push_subscriptions;
create policy "Service role has full access to push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.role() = 'service_role');
