import { supabase } from '../lib/supabase';

/**
 * Search students by name or username.
 * Optionally enriches each result with is_following for the current user.
 */
export async function searchStudents(query, { limit = 5, currentUserId = null } = {}) {
  const safeTerm = String(query || '').trim();
  if (!safeTerm) return { data: [], error: null };

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url, bio, campus_credits, college')
      .or(`name.ilike.%${safeTerm}%,username.ilike.%${safeTerm}%`)
      .limit(limit);

    if (error) throw error;

    let followingIds = new Set();
    if (currentUserId && data && data.length > 0) {
      const ids = data.map((p) => p.id).filter((id) => id !== currentUserId);
      if (ids.length > 0) {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .in('following_id', ids);
        if (follows) followingIds = new Set(follows.map((f) => f.following_id));
      }
    }

    const enriched = (data || [])
      .filter((p) => p.id !== currentUserId)
      .map((profile) => ({
        ...profile,
        is_following: followingIds.has(profile.id),
      }));

    return { data: enriched, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Search posts by title or content.
 */
export async function searchPosts(query, { limit = 20 } = {}) {
  const safeTerm = String(query || '').trim();
  if (!safeTerm) return { data: [], error: null };

  try {
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, title, content, created_at, type, likes_count, comments_count, author:profiles!author_id(id, name, avatar_url, username)'
      )
      .eq('is_hidden', false)
      .eq('is_anonymous', false)
      .or(`title.ilike.%${safeTerm}%,content.ilike.%${safeTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Search marketplace listings by title or description.
 */
export async function searchListings(query, { limit = 20 } = {}) {
  const safeTerm = String(query || '').trim();
  if (!safeTerm) return { data: [], error: null };

  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, description, price, images, category, seller_id, created_at, seller:profiles!seller_id(id, name)')
      .eq('is_sold', false)
      .eq('is_admin_disabled', false)
      .or(`title.ilike.%${safeTerm}%,description.ilike.%${safeTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}
