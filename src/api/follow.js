import { supabase } from '../lib/supabase';

function isMissingRpc(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('toggle_follow') && message.includes('does not exist');
}

/**
 * Follow a user.
 */
export async function followUser(followerId, followingId) {
  try {
    const { data, error } = await setFollowState(followerId, followingId, true);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Unfollow a user.
 */
export async function unfollowUser(followerId, followingId) {
  try {
    const { data, error } = await setFollowState(followerId, followingId, false);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function toggleFollow(followerId, followingId) {
  try {
    if (!followerId || !followingId) {
      throw new Error('Missing follower or following user id.');
    }

    if (followerId === followingId) {
      throw new Error('You cannot follow yourself.');
    }

    const { data, error } = await supabase.rpc('toggle_follow', {
      follower_user_id: followerId,
      following_user_id: followingId,
    });

    if (error) {
      if (!isMissingRpc(error)) throw error;
      const { isFollowing } = await checkIsFollowing(followerId, followingId);
      return setFollowState(followerId, followingId, !isFollowing);
    }

    const payload = Array.isArray(data) ? data[0] : data;
    return {
      data: {
        is_following: Boolean(payload?.is_following),
        followers_count: Number(payload?.followers_count || 0),
        following_count: Number(payload?.following_count || 0),
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err,
    };
  }
}

async function setFollowState(followerId, followingId, shouldFollow) {
  if (!followerId || !followingId) {
    throw new Error('Missing follower or following user id.');
  }

  if (followerId === followingId) {
    throw new Error('You cannot follow yourself.');
  }

  const existing = await checkIsFollowing(followerId, followingId);
  if (Boolean(existing.isFollowing) === shouldFollow) {
    const { data } = await getFollowStats(followingId);
    return {
      data: {
        is_following: shouldFollow,
        followers_count: Number(data?.followers_count || 0),
        following_count: Number(data?.following_count || 0),
      },
      error: null,
    };
  }

  const mutation = shouldFollow
    ? supabase.from('follows').upsert({ follower_id: followerId, following_id: followingId }, { onConflict: 'follower_id,following_id', ignoreDuplicates: true })
    : supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);

  const { error } = await mutation;
  if (error) throw error;

  const { data } = await getFollowStats(followingId);
  return {
    data: {
      is_following: shouldFollow,
      followers_count: Number(data?.followers_count || 0),
      following_count: Number(data?.following_count || 0),
    },
    error: null,
  };
}

/**
 * Check if follower is following targetId.
 */
export async function checkIsFollowing(followerId, followingId) {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (error) throw error;
    return { isFollowing: Boolean(data), error: null };
  } catch (err) {
    return { isFollowing: false, error: err };
  }
}

/**
 * Get array of user IDs that the given user follows.
 */
export async function getFollowingIds(userId) {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error) throw error;
    return { data: (data || []).map((f) => f.following_id), error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Get posts from users that the given user follows.
 */
export async function getFollowingPosts(userId, page = 1) {
  const limit = 20;

  try {
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (followsError) throw followsError;

    const followingIds = (follows || []).map((f) => f.following_id);
    if (!followingIds.length) {
      return { data: [], error: null, noFollows: true };
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, error } = await supabase
      .from('posts')
      .select(
        '*, author:profiles!author_id(id, name, avatar_url, username, college), post_likes!left(user_id)'
      )
      .in('author_id', followingIds)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw error;
    return { data: data || [], error: null, noFollows: false };
  } catch (err) {
    return { data: [], error: err, noFollows: false };
  }
}

export async function getFollowers(userId, search = '') {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id, follower:profiles!follows_follower_id_fkey(id, name, username, avatar_url, college)')
      .eq('following_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const loweredSearch = String(search || '').trim().toLowerCase();
    const mapped = (data || [])
      .map((entry) => entry.follower)
      .filter(Boolean);

    const filtered = loweredSearch
      ? mapped.filter((item) => {
          const haystack = `${item.name || ''} ${item.username || ''}`.toLowerCase();
          return haystack.includes(loweredSearch);
        })
      : mapped;

    return { data: filtered, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

export async function getFollowing(userId, search = '') {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id, following:profiles!follows_following_id_fkey(id, name, username, avatar_url, college)')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const loweredSearch = String(search || '').trim().toLowerCase();
    const mapped = (data || [])
      .map((entry) => entry.following)
      .filter(Boolean);

    const filtered = loweredSearch
      ? mapped.filter((item) => {
          const haystack = `${item.name || ''} ${item.username || ''}`.toLowerCase();
          return haystack.includes(loweredSearch);
        })
      : mapped;

    return { data: filtered, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

export async function getFollowStats(userId) {
  try {
    const [{ count: followersCount, error: followersError }, { count: followingCount, error: followingError }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);

    if (followersError) throw followersError;
    if (followingError) throw followingError;

    return {
      data: {
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: { followers_count: 0, following_count: 0 },
      error: err,
    };
  }
}
