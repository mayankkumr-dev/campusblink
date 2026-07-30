-- Migration: Create diary_bookmarks table & RLS policies
-- Safe to run multiple times (idempotent).

CREATE TABLE IF NOT EXISTS public.diary_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id uuid NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(diary_id, user_id)
);

-- Index for fast user bookmarks lookup
CREATE INDEX IF NOT EXISTS diary_bookmarks_user_idx
  ON public.diary_bookmarks(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.diary_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can read diary bookmarks" ON public.diary_bookmarks;
CREATE POLICY "Anyone can read diary bookmarks"
  ON public.diary_bookmarks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage their own diary bookmarks" ON public.diary_bookmarks;
CREATE POLICY "Users can manage their own diary bookmarks"
  ON public.diary_bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
