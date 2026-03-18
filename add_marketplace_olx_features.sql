-- Run this in Supabase SQL Editor
-- Purpose: Add OLX-style marketplace support for wishlists, conversations,
-- richer listing messages, and safe RLS policies.

alter table if exists public.listing_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists image_url text,
  add column if not exists offer_amount numeric(10,2),
  add column if not exists offer_status text,
  add column if not exists is_read boolean not null default false;

alter table if exists public.listing_messages
  drop constraint if exists listing_messages_message_type_check;

alter table if exists public.listing_messages
  add constraint listing_messages_message_type_check
  check (message_type in ('text', 'image', 'offer'));

alter table if exists public.listing_messages
  drop constraint if exists listing_messages_offer_status_check;

alter table if exists public.listing_messages
  add constraint listing_messages_offer_status_check
  check (offer_status is null or offer_status in ('pending', 'accepted', 'rejected'));

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, listing_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  buyer_unread integer not null default 0,
  seller_unread integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(listing_id, buyer_id)
);

create index if not exists idx_wishlists_user_id on public.wishlists(user_id);
create index if not exists idx_wishlists_listing_id on public.wishlists(listing_id);
create index if not exists idx_conversations_listing_id on public.conversations(listing_id);
create index if not exists idx_conversations_buyer_id on public.conversations(buyer_id);
create index if not exists idx_conversations_seller_id on public.conversations(seller_id);
create index if not exists idx_conversations_last_message_at on public.conversations(last_message_at desc);
create index if not exists idx_listing_messages_listing_id_created_at on public.listing_messages(listing_id, created_at desc);
create index if not exists idx_listing_messages_receiver_id_is_read on public.listing_messages(receiver_id, is_read);

create or replace function public.touch_conversations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_conversations_updated_at on public.conversations;
create trigger touch_conversations_updated_at
before update on public.conversations
for each row
execute function public.touch_conversations_updated_at();

alter table if exists public.wishlists enable row level security;
alter table if exists public.conversations enable row level security;
alter table if exists public.listing_messages enable row level security;

drop policy if exists "wishlists_select_own" on public.wishlists;
drop policy if exists "wishlists_insert_own" on public.wishlists;
drop policy if exists "wishlists_delete_own" on public.wishlists;
drop policy if exists "conversations_select_participants" on public.conversations;
drop policy if exists "conversations_insert_buyer_or_seller" on public.conversations;
drop policy if exists "conversations_update_participants" on public.conversations;
drop policy if exists "listing_messages_select_participants" on public.listing_messages;
drop policy if exists "listing_messages_insert_sender" on public.listing_messages;
drop policy if exists "listing_messages_update_receiver" on public.listing_messages;

create policy "wishlists_select_own"
on public.wishlists
for select
using (auth.uid() = user_id);

create policy "wishlists_insert_own"
on public.wishlists
for insert
with check (auth.uid() = user_id);

create policy "wishlists_delete_own"
on public.wishlists
for delete
using (auth.uid() = user_id);

create policy "conversations_select_participants"
on public.conversations
for select
using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "conversations_insert_buyer_or_seller"
on public.conversations
for insert
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "conversations_update_participants"
on public.conversations
for update
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "listing_messages_select_participants"
on public.listing_messages
for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "listing_messages_insert_sender"
on public.listing_messages
for insert
with check (auth.uid() = sender_id);

create policy "listing_messages_update_receiver"
on public.listing_messages
for update
using (auth.uid() = receiver_id or auth.uid() = sender_id)
with check (auth.uid() = receiver_id or auth.uid() = sender_id);

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('wishlists', 'conversations', 'listing_messages')
order by tablename, cmd, policyname;