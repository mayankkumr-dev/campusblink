-- ============================================================================
-- Campus Blink — Algorithmic Hybrid Recommendation Feed RPC
-- File: sql/add_trending_feed_rpc.sql
--
-- Algorithmic Stages:
--   1. Graph / Visibility Filter: excludes hidden posts (`is_hidden = false`).
--      Optionally filters by post type (`p_type`).
--   2. Engagement Weighting:
--        raw_engagement = (likes_count * 1) + (comments_count * 3) + (reposts_count * 2)
--   3. Mathematical Time-Decay:
--        age_hours = (NOW - created_at) / 3600
--        time_decay = 1 / ((1 + age_hours / 6) ^ 1.5)
--        stale_penalty = age_hours > 48 ? 0.35 : 1.0
--   4. Discovery Randomization (Serendipity):
--        discovery_boost = random() * 4.5
--   5. Final Ordering:
--        is_pinned DESC, trending_score DESC, created_at DESC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_trending_feed(
  p_type TEXT DEFAULT 'all',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  title TEXT,
  type TEXT,
  image_url TEXT,
  is_anonymous BOOLEAN,
  likes_count INT,
  comments_count INT,
  reposts_count INT,
  bookmarks_count INT,
  views_count INT,
  is_pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  author_id UUID,
  trending_score FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.content,
    p.title,
    p.type,
    p.image_url,
    p.is_anonymous,
    COALESCE(p.likes_count, 0) AS likes_count,
    COALESCE(p.comments_count, 0) AS comments_count,
    COALESCE(p.reposts_count, 0) AS reposts_count,
    COALESCE(p.bookmarks_count, 0) AS bookmarks_count,
    COALESCE(p.views_count, 0) AS views_count,
    COALESCE(p.is_pinned, false) AS is_pinned,
    p.created_at,
    p.author_id,
    -- Calculate composite algorithmic trending score:
    (
      (
        COALESCE(p.likes_count, 0) * 1.0 +
        COALESCE(p.comments_count, 0) * 3.0 +
        COALESCE(p.reposts_count, 0) * 2.0 +
        10.0
      )
      / POWER(1.0 + (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0) / 6.0, 1.5)
      * (CASE WHEN (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0) > 48.0 THEN 0.35 ELSE 1.0 END)
      + (random() * 4.5)
    )::FLOAT AS trending_score
  FROM posts p
  WHERE
    COALESCE(p.is_hidden, false) = false
    AND (p_type IS NULL OR p_type = 'all' OR p.type = p_type)
  ORDER BY
    COALESCE(p.is_pinned, false) DESC,
    trending_score DESC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant execution permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_trending_feed(TEXT, INT, INT) TO anon, authenticated, service_role;
