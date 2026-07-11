/**
 * feedControllerPostgres.js — Campus Blink Hybrid Recommendation Feed Controller (Postgres/Supabase)
 *
 * Implements the hybrid recommendation feed algorithm for Campus Blink's Postgres database:
 *   1. Engagement Scoring: (likes * 1) + (comments * 3) + (reposts * 2)
 *   2. Time Decay: 1 / ((1 + ageInHours / 6) ^ 1.5)
 *   3. Stale Penalty: 65% score reduction for posts older than 48 hours
 *   4. Randomization / Serendipity: controlled random boost to surface emerging posts
 *   5. High-Performance Pagination: limit/offset or cursor support
 */

const { supabaseAdmin } = require('../config/supabase');

/**
 * GET /api/feed/recommendations
 * Query Parameters:
 *   - type: 'all' | 'academic' | 'events' | 'housing' | 'lostfound' | ...
 *   - limit: number (default 20, max 50)
 *   - page: number (default 1)
 */
async function getRecommendationFeed(req, res) {
  try {
    const type = req.query.type || 'all';
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Database client not initialized.' });
    }

    // Attempt to call the SQL RPC function first for high performance database-level aggregation
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('get_trending_feed', {
      p_type: type,
      p_limit: limit,
      p_offset: offset
    });

    if (!rpcError && rpcData) {
      // Hydrate author profiles for each post returned
      const authorIds = [...new Set(rpcData.map(post => post.author_id).filter(Boolean))];
      let profilesMap = {};

      if (authorIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, name, username, avatar_url, role, college')
          .in('id', authorIds);

        if (profiles) {
          profiles.forEach(prof => {
            profilesMap[prof.id] = prof;
          });
        }
      }

      const enrichedPosts = rpcData.map(post => ({
        ...post,
        author: profilesMap[post.author_id] || {
          id: post.author_id,
          name: post.is_anonymous ? 'Anonymous' : 'Student',
          username: post.is_anonymous ? 'anonymous' : 'student',
          avatar_url: null
        }
      }));

      return res.status(200).json({
        success: true,
        source: 'postgres_rpc',
        page,
        limit,
        count: enrichedPosts.length,
        data: enrichedPosts
      });
    }

    // Fallback: If RPC is not installed in SQL Editor yet, fetch raw posts and calculate trending score in Node.js
    let query = supabaseAdmin
      .from('posts')
      .select(`
        id,
        content,
        title,
        type,
        image_url,
        is_anonymous,
        likes_count,
        comments_count,
        reposts_count,
        bookmarks_count,
        views_count,
        is_pinned,
        created_at,
        author_id,
        author:profiles!author_id (
          id,
          name,
          username,
          avatar_url,
          role,
          college
        )
      `)
      .eq('is_hidden', false);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data: rawPosts, error: fetchError } = await query
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(0, Math.max(offset + limit * 2, 100)); // Fetch candidate window for in-memory score ranking

    if (fetchError) {
      console.error('[FeedControllerPostgres] Fetch error:', fetchError);
      return res.status(500).json({ error: 'Failed to load feed.' });
    }

    const now = new Date();
    const scoredPosts = (rawPosts || []).map(post => {
      const createdAt = new Date(post.created_at || now);
      const ageHours = Math.max((now.getTime() - createdAt.getTime()) / 3600000, 0);

      const rawEngagement =
        (post.likes_count || 0) * 1 +
        (post.comments_count || 0) * 3 +
        (post.reposts_count || 0) * 2;

      const timeDecay = 1 / Math.pow(1 + ageHours / 6, 1.5);
      const stalePenalty = ageHours > 48 ? 0.35 : 1.0;
      const discoveryBoost = Math.random() * 4.5;

      const trendingScore =
        (rawEngagement + 10) * timeDecay * stalePenalty + discoveryBoost;

      return {
        ...post,
        trending_score: Number(trendingScore.toFixed(3))
      };
    });

    // Sort by pinned first, then trending score descending
    scoredPosts.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
      return b.trending_score - a.trending_score;
    });

    const paginated = scoredPosts.slice(offset, offset + limit);

    return res.status(200).json({
      success: true,
      source: 'node_in_memory_fallback',
      page,
      limit,
      count: paginated.length,
      data: paginated
    });
  } catch (error) {
    console.error('[FeedControllerPostgres] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected server error while building recommendation feed.'
    });
  }
}

module.exports = {
  getRecommendationFeed
};
