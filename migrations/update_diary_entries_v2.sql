-- Update diary_entries for V2 (Canvas + Thumbnail support)

alter table public.diary_entries
  add column if not exists canvas_json jsonb,
  add column if not exists thumbnail_url text,
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'friends', 'private')),
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists tags text[] not null default '{}',
  add column if not exists location_tag text,
  add column if not exists unlock_at timestamptz,
  add column if not exists published_at timestamptz not null default now();

-- Update existing rows to have published_at matching created_at
update public.diary_entries
set published_at = created_at
where published_at is null;

-- Make existing content fields nullable to support thumbnail_url based entries
alter table public.diary_entries
  alter column content drop not null,
  alter column font_family drop not null,
  alter column text_color drop not null,
  alter column bg_color drop not null;
