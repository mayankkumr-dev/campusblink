-- Update vw_diary_feed to include new V2 fields

DROP VIEW IF EXISTS public.vw_diary_feed;

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
  e.canvas_json,
  e.thumbnail_url,
  e.visibility,
  e.is_anonymous,
  e.tags,
  e.location_tag,
  e.unlock_at,
  e.published_at,
  e.created_at,
  e.status,
  COALESCE(count(l.id), 0) AS likes_count,
  COALESCE(array_agg(l.user_id) FILTER (WHERE l.user_id IS NOT NULL), '{}') AS liked_by
FROM public.diary_entries e
LEFT JOIN public.diary_likes l ON e.id = l.diary_id
GROUP BY e.id;
