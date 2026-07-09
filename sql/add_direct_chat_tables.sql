create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  context_type text not null default 'general',
  context_title text not null default 'Direct chat',
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  participant_a_unread integer not null default 0,
  participant_b_unread integer not null default 0,
  request_for uuid null references public.profiles(id) on delete set null,
  accepted_by_a boolean not null default false,
  accepted_by_b boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_conversations_participant_order check (participant_a < participant_b),
  constraint direct_conversations_context_type_check check (context_type in ('product', 'roommate', 'general')),
  unique(participant_a, participant_b, context_type, context_title)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_direct_conversations_participant_a on public.direct_conversations(participant_a);
create index if not exists idx_direct_conversations_participant_b on public.direct_conversations(participant_b);
create index if not exists idx_direct_conversations_last_message_at on public.direct_conversations(last_message_at desc);
create index if not exists idx_direct_messages_conversation_created_at on public.direct_messages(conversation_id, created_at desc);
create index if not exists idx_direct_messages_receiver_is_read on public.direct_messages(receiver_id, is_read);

create or replace function public.touch_direct_conversations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_direct_conversations_updated_at on public.direct_conversations;
create trigger touch_direct_conversations_updated_at
before update on public.direct_conversations
for each row
execute function public.touch_direct_conversations_updated_at();

alter table if exists public.direct_conversations enable row level security;
alter table if exists public.direct_messages enable row level security;

drop policy if exists "direct_conversations_select_participants" on public.direct_conversations;
drop policy if exists "direct_conversations_insert_participants" on public.direct_conversations;
drop policy if exists "direct_conversations_update_participants" on public.direct_conversations;
drop policy if exists "direct_messages_select_participants" on public.direct_messages;
drop policy if exists "direct_messages_insert_sender" on public.direct_messages;
drop policy if exists "direct_messages_update_receiver" on public.direct_messages;

create policy "direct_conversations_select_participants"
on public.direct_conversations
for select
using (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "direct_conversations_insert_participants"
on public.direct_conversations
for insert
with check (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "direct_conversations_update_participants"
on public.direct_conversations
for update
using (auth.uid() = participant_a or auth.uid() = participant_b)
with check (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "direct_messages_select_participants"
on public.direct_messages
for select
using (
  auth.uid() = sender_id
  or auth.uid() = receiver_id
  or exists (
    select 1
    from public.direct_conversations conversation
    where conversation.id = direct_messages.conversation_id
      and (conversation.participant_a = auth.uid() or conversation.participant_b = auth.uid())
  )
);

create policy "direct_messages_insert_sender"
on public.direct_messages
for insert
with check (auth.uid() = sender_id);

create policy "direct_messages_update_receiver"
on public.direct_messages
for update
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

grant all on public.direct_conversations to authenticated;
grant all on public.direct_messages to authenticated;