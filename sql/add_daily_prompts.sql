-- Migration: Daily Prompts System for Campus Diary
-- Run this in Supabase SQL Editor

-- 1. daily_prompts table (one prompt per day, set by admins)
CREATE TABLE IF NOT EXISTS public.daily_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text text NOT NULL,
  emoji text,
  active_date date NOT NULL UNIQUE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. daily_prompt_participants table
--    Records intent-to-participate only on final publish (not on "Participate" tap)
CREATE TABLE IF NOT EXISTS public.daily_prompt_participants (
  prompt_id uuid NOT NULL REFERENCES public.daily_prompts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  diary_entry_id uuid REFERENCES public.diary_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prompt_id, user_id)
);

-- 3. RLS for daily_prompts (public read, no public write)
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read daily_prompts" ON public.daily_prompts;
CREATE POLICY "Anyone can read daily_prompts"
  ON public.daily_prompts
  FOR SELECT
  USING (true);

-- 4. RLS for daily_prompt_participants
--    Users can only read/insert their own rows — prevents reading others' participation
ALTER TABLE public.daily_prompt_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own participation" ON public.daily_prompt_participants;
CREATE POLICY "Users can read own participation"
  ON public.daily_prompt_participants
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own participation" ON public.daily_prompt_participants;
CREATE POLICY "Users can insert own participation"
  ON public.daily_prompt_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Seed today's prompt as a starting example (optional — delete if unwanted)
-- INSERT INTO public.daily_prompts (prompt_text, emoji, active_date)
-- VALUES ('Campus life in 3 words', '🎓', CURRENT_DATE)
-- ON CONFLICT (active_date) DO NOTHING;

-- 6. Index for fast date lookup
CREATE INDEX IF NOT EXISTS idx_daily_prompts_active_date
  ON public.daily_prompts (active_date);
