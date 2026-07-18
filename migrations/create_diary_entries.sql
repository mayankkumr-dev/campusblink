-- Campus Diary: Create diary_entries table + likes support
-- Safe to run multiple times (idempotent).
-- Run this in your Supabase SQL Editor.

-- ── Create table ────────────────────────────────────────────────────
create table if not exists public.diary_entries (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles(id) on delete cascade,
  content      text not null check (char_length(content) >= 1),
  font_family  text not null default 'Caveat',
  text_color   text not null default '#2D1B10',
  bg_color     text not null default '#F5E6C8',
  gradient     text,
  scale        numeric(4,2) not null default 1.0 check (scale > 0),
  likes_count  integer not null default 0,
  liked_by     uuid[] not null default '{}',
  image_url    text,
  created_at   timestamptz not null default now()
);

-- ── Add new columns if table already existed ─────────────────────────
alter table public.diary_entries
  add column if not exists likes_count  integer not null default 0,
  add column if not exists liked_by     uuid[] not null default '{}',
  add column if not exists image_url    text;

-- ── Indexes ──────────────────────────────────────────────────────────
create index if not exists diary_entries_author_idx
  on public.diary_entries(author_id, created_at desc);

create index if not exists diary_entries_created_idx
  on public.diary_entries(created_at desc);

create index if not exists diary_entries_likes_idx
  on public.diary_entries(likes_count desc, created_at desc);

-- ── Row Level Security ───────────────────────────────────────────────
alter table public.diary_entries enable row level security;

-- Drop then recreate policies (CREATE POLICY has no IF NOT EXISTS)
drop policy if exists "Anyone can read diary entries"               on public.diary_entries;
drop policy if exists "Users can create their own diary entries"    on public.diary_entries;
drop policy if exists "Users can delete their own diary entries"    on public.diary_entries;
drop policy if exists "Authenticated users can like diary entries"  on public.diary_entries;

create policy "Anyone can read diary entries"
  on public.diary_entries
  for select
  using (true);

create policy "Users can create their own diary entries"
  on public.diary_entries
  for insert
  with check (auth.uid() = author_id);

create policy "Users can delete their own diary entries"
  on public.diary_entries
  for delete
  using (auth.uid() = author_id);

create policy "Authenticated users can like diary entries"
  on public.diary_entries
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ── Atomic like toggle RPC ───────────────────────────────────────────
create or replace function public.toggle_diary_like(
  p_entry_id uuid,
  p_user_id  uuid
)
returns table(new_likes_count integer, user_liked boolean)
language plpgsql
security definer
as $$
declare
  v_liked boolean;
begin
  select p_user_id = any(liked_by)
  into v_liked
  from public.diary_entries
  where id = p_entry_id;

  if v_liked then
    update public.diary_entries
    set
      liked_by    = array_remove(liked_by, p_user_id),
      likes_count = greatest(0, likes_count - 1)
    where id = p_entry_id;
  else
    update public.diary_entries
    set
      liked_by    = array_append(liked_by, p_user_id),
      likes_count = likes_count + 1
    where id = p_entry_id;
  end if;

  return query
    select e.likes_count, (p_user_id = any(e.liked_by))
    from public.diary_entries e
    where e.id = p_entry_id;
end;
$$;
