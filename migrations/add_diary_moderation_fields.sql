-- Campus Blink Diaries: Async Moderation & Flagged Status Schema
-- Safe to run multiple times (idempotent).
-- Run this in your Supabase SQL Editor to add status, flagged_reason, and moderation_labels columns.

alter table public.diary_entries
  add column if not exists status text not null default 'active',
  add column if not exists flagged_reason text,
  add column if not exists moderation_labels jsonb default '[]'::jsonb;

create index if not exists diary_entries_status_idx
  on public.diary_entries(status);

-- Ensure existing entries default to 'active'
update public.diary_entries set status = 'active' where status is null;
