-- Migration: Create diary_likes junction table & refactor toggle_diary_like RPC

-- 1. Create junction table
CREATE TABLE IF NOT EXISTS public.diary_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id uuid NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(diary_id, user_id)
);

-- 2. Migrate existing data from array to junction table
-- (Safely ignores conflicts if already migrated)
INSERT INTO public.diary_likes (diary_id, user_id)
SELECT e.id, u as user_id
FROM public.diary_entries e, unnest(e.liked_by) u
ON CONFLICT DO NOTHING;

-- 3. RLS for diary_likes
ALTER TABLE public.diary_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read diary_likes" ON public.diary_likes;
CREATE POLICY "Anyone can read diary_likes" ON public.diary_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own diary likes" ON public.diary_likes;
CREATE POLICY "Users can manage their own diary likes" ON public.diary_likes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Create View for feed querying (Security Invoker allows RLS to pass through)
CREATE OR REPLACE VIEW public.vw_diary_feed WITH (security_invoker = true) AS
SELECT
  e.id,
  e.author_id,
  e.content,
  e.font_family,
  e.text_color,
  e.bg_color,
  e.gradient,
  e.scale,
  e.image_url,
  e.created_at,
  e.status,
  COALESCE(count(l.id), 0) AS likes_count,
  COALESCE(array_agg(l.user_id) FILTER (WHERE l.user_id IS NOT NULL), '{}') AS liked_by
FROM public.diary_entries e
LEFT JOIN public.diary_likes l ON e.id = l.diary_id
GROUP BY e.id;

-- 5. Update atomic RPC function to use junction table
CREATE OR REPLACE FUNCTION public.toggle_diary_like(
  p_entry_id uuid,
  p_user_id uuid
)
RETURNS TABLE(new_likes_count integer, user_liked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
  v_count integer;
BEGIN
  -- Check if already liked
  SELECT EXISTS(
    SELECT 1 FROM public.diary_likes
    WHERE diary_id = p_entry_id AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Unlike
    DELETE FROM public.diary_likes
    WHERE diary_id = p_entry_id AND user_id = p_user_id;
  ELSE
    -- Like
    INSERT INTO public.diary_likes (diary_id, user_id)
    VALUES (p_entry_id, p_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Get exact new count
  SELECT count(*) INTO v_count
  FROM public.diary_likes
  WHERE diary_id = p_entry_id;

  RETURN QUERY SELECT v_count, NOT v_exists;
END;
$$;
