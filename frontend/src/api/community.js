import { supabase } from '../lib/supabase';
import { addCredits } from './credits';
import { uploadImage, extractCloudinaryPublicId } from '../lib/cloudinary';
import { createNotification } from './notifications';

const REQUEST_TIMEOUT_MS = 20000;
const POST_UPLOAD_TIMEOUT_MS = 45000;
const POST_PUBLISH_TIMEOUT_MS = 45000;
const POST_IMAGE_DELIMITER = '|||';

function parsePostImageUrls(value) {
  if (!value || typeof value !== 'string') return [];

  if (value.includes(POST_IMAGE_DELIMITER)) {
    return value
      .split(POST_IMAGE_DELIMITER)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [value];
}

export function normalizePostRecord(post) {
  return {
    ...post,
    user_has_liked: post?.user_has_liked?.length > 0 || (Array.isArray(post?.post_likes) && post.post_likes.length > 0),
    user_has_bookmarked: post?.user_has_bookmarked?.length > 0 || (Array.isArray(post?.bookmarks) && post.bookmarks.length > 0),
    user_has_reposted: Array.isArray(post?.reposts) && post.reposts.length > 0,
    author_name: post.is_anonymous ? 'Anonymous' : post.author?.name,
    author_username: post.is_anonymous ? 'anonymous' : post.author?.username,
    author_avatar: post.is_anonymous ? null : post.author?.avatar_url,
    college: post.author?.college?.short_name || post.author?.college,
    likes_count: post?.likes_count ?? 0,
    bookmarks_count: post?.bookmarks_count ?? 0,
    reposts_count: post?.reposts_count ?? 0,
    views_count: post?.views_count ?? 0,
    comments_count: post?.comments_count ?? 0
  };
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out. Please check your connection and try again.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function isSupabaseServerFailure(error) {
  const message = error?.message?.toLowerCase?.() || '';
  const details = error?.details?.toLowerCase?.() || '';
  const hint = error?.hint?.toLowerCase?.() || '';

  return (
    error?.status === 500 ||
    message.includes('internal server error') ||
    message.includes('infinite recursion') ||
    details.includes('infinite recursion') ||
    hint.includes('policy')
  );
}

function normalizeCommunityError(error, fallbackMessage) {
  if (isSupabaseServerFailure(error)) {
    return new Error('Supabase policies are misconfigured (500). Run fix_core_rls.sql and fix_profiles_rls.sql in SQL Editor, then retry.');
  }

  if (error instanceof Error) return error;
  return new Error(fallbackMessage);
}

export async function getPosts(type, page = 1) {
  try {
    const limit = 20;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // First attempt: Algorithmic Recommendation Feed RPC (engagement + time decay + serendipity)
    try {
      const { data: rpcPosts, error: rpcError } = await supabase.rpc('get_trending_feed', {
        p_type: type || 'all',
        p_limit: limit,
        p_offset: start
      });

      if (!rpcError && Array.isArray(rpcPosts)) {
        const authorIds = [...new Set(rpcPosts.map((p) => p.author_id).filter(Boolean))];
        let authorMap = {};

        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, username, avatar_url, role, college')
            .in('id', authorIds);

          (profiles || []).forEach((prof) => {
            authorMap[prof.id] = prof;
          });
        }

        // Fetch user likes and bookmarks to enrich the feed
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        const postIds = rpcPosts.map(p => p.id);
        const likedPostIds = new Set();
        const bookmarkedPostIds = new Set();

        if (currentUserId && postIds.length > 0) {
          const [likesResult, bookmarksResult] = await Promise.all([
            supabase
              .from('post_likes')
              .select('post_id')
              .eq('user_id', currentUserId)
              .in('post_id', postIds),
            supabase
              .from('bookmarks')
              .select('post_id')
              .eq('user_id', currentUserId)
              .in('post_id', postIds)
          ]);

          if (likesResult.data) {
            likesResult.data.forEach(like => likedPostIds.add(like.post_id));
          }
          if (bookmarksResult.data) {
            bookmarksResult.data.forEach(bm => bookmarkedPostIds.add(bm.post_id));
          }
        }

        const enriched = rpcPosts.map((p) => ({
          ...p,
          user_has_liked: likedPostIds.has(p.id) ? [{ id: true }] : [],
          user_has_bookmarked: bookmarkedPostIds.has(p.id) ? [{ id: true }] : [],
          author: authorMap[p.author_id] || {
            id: p.author_id,
            name: p.is_anonymous ? 'Anonymous' : 'Student',
            username: p.is_anonymous ? 'anonymous' : 'student',
            avatar_url: null,
            college: null
          }
        }));

        const normalized = enriched.map((post) => normalizePostRecord(post));
        return { data: normalized, error: null };
      }
    } catch (_rpcErr) {
      // Graceful fallback if RPC is not yet installed
    }

    let query = supabase
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
    author:profiles!author_id (
      id,
      name,
      username,
      avatar_url,
      role,
      college
    ),
    user_has_liked:post_likes (
      id
    ),
    user_has_bookmarked:bookmarks (
      id
    ),
    reposts (
      id
    )
  `)
      .eq('is_hidden', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(start, end);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    const { data, error } = await withTimeout(query, REQUEST_TIMEOUT_MS, 'Loading posts');
    if (error) throw error;
    const normalized = (data || []).map((post) => normalizePostRecord(post));
    return { data: normalized, error: null };
  } catch (error) {
    return { data: null, error: normalizeCommunityError(error, 'Failed to load posts') };
  }
}

export async function getPostById(id) {
  try {
    const { data, error } = await supabase
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
    author:profiles!author_id (
      id,
      name,
      username,
      avatar_url,
      role,
      college
    ),
    user_has_liked:post_likes (
      id
    ),
    user_has_bookmarked:bookmarks (
      id
    ),
    reposts (
      id
    )
  `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data: normalizePostRecord(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPostDetail(postId, viewerId = null) {
  try {
    let query = supabase
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
    author:profiles!author_id (
      id,
      name,
      username,
      avatar_url,
      role,
      college
    ),
    user_has_liked:post_likes (
      id
    ),
    user_has_bookmarked:bookmarks (
      id
    ),
    reposts (
      id
    )
  `)
      .eq('id', postId)
      .single();

    const { data, error } = await withTimeout(query, REQUEST_TIMEOUT_MS, 'Loading post');
    if (error) throw error;

    const normalized = normalizePostRecord(data);
    const userHasLiked = Boolean(viewerId && normalized.liked_by?.includes(viewerId));

    return {
      data: {
        ...normalized,
        user_has_liked: userHasLiked,
        user_has_bookmarked: normalized.user_has_bookmarked,
        author_name: normalized.author?.name || 'Campus Student',
        college: normalized.author?.college || null,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: normalizeCommunityError(error, 'Failed to load post') };
  }
}

export async function createPost(postData, imageFiles) {
  try {
    const files = Array.isArray(imageFiles) ? imageFiles : imageFiles ? [imageFiles] : [];
    const limitedFiles = files.slice(0, 4);

    const imageUrls = [];
    if (limitedFiles.length > 0) {
      const uploads = await Promise.all(
        limitedFiles.map((file) =>
          withTimeout(
            uploadImage(file, `campus-blink/community/${postData.author_id}`),
            POST_UPLOAD_TIMEOUT_MS,
            'Uploading image'
          )
        )
      );

      uploads.forEach(({ data: uploadData, error: uploadError }) => {
        if (uploadError) throw uploadError;
        if (uploadData?.url) imageUrls.push(uploadData.url);
      });
    }

    const serializedImageUrls = imageUrls.length > 0 ? imageUrls.join(POST_IMAGE_DELIMITER) : null;

    const { data, error } = await withTimeout(
      supabase
        .from('posts')
        .insert([{ ...postData, image_url: serializedImageUrls }])
        .select()
        .single(),
      POST_PUBLISH_TIMEOUT_MS,
      'Publishing post'
    );
      
    if (error) throw error;
    
    // Award credits if not anonymous
    if (!postData.is_anonymous && postData.author_id) {
      await addCredits(postData.author_id, 2, 'earned_post', data.id, 'Created a community post');
    }
    
    return { data: normalizePostRecord(data), error: null };
  } catch (error) {
    return { data: null, error: normalizeCommunityError(error, 'Failed to create post') };
  }
}

export async function updatePost(id, updates) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deletePost(id) {
  try {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('image_url')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);
    if (error) throw error;

    if (post && post.image_url) {
      const urls = post.image_url.split('|||');
      for (const url of urls) {
        const publicId = extractCloudinaryPublicId(url);
        if (publicId && import.meta.env.VITE_BACKEND_URL) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/uploads/file`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ publicId })
            }).catch(err => console.error('Cloudinary cleanup error', err));
          }
        }
      }
    }

    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function togglePostLike(postId, userId) {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      const { error: deleteError } = await supabase.from('post_likes').delete().eq('id', existing.id);
      if (deleteError) throw deleteError;

      const { error: rpcError } = await supabase.rpc('decrement_post_likes', { p_id: postId });
      if (rpcError) throw rpcError;

      return { data: { liked: false }, error: null };
    } else {
      const { error: insertError } = await supabase.from('post_likes').insert([{ post_id: postId, user_id: userId }]);
      if (insertError) throw insertError;

      const { error: rpcError } = await supabase.rpc('increment_post_likes', { p_id: postId });
      if (rpcError) throw rpcError;

      const [{ data: postMeta }, { data: actor }] = await Promise.all([
        supabase.from('posts').select('author_id').eq('id', postId).maybeSingle(),
        supabase.from('profiles').select('user  name').eq('id', userId).maybeSingle(),
      ]);

      const handle = actor?.username ? `@${actor.username}` : `@${String(actor?.name || 'user').replace(/\s+/g, '').toLowerCase()}`;
      if (postMeta?.author_id && postMeta.author_id !== userId) {
        createNotification(
          postMeta.author_id,
          'post_like',
          'New like',
          `${handle} liked on your post`,
          `/community/${postId}`
        ).catch(() => {});
      }

      return { data: { liked: true }, error: null };
    }
  } catch (error) {
    return { data: null, error: normalizeCommunityError(error, 'Failed to update like') };
  }
}

export async function getLikedPosts(userId) {
  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('post:posts(*, author:profiles!author_id(name, avatar_url, username, college), post_likes!left(user_id), post_bookmarks!left(user_id))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const posts = (data || [])
      .map((entry) => entry.post)
      .filter(Boolean)
      .map((post) => normalizePostRecord(post));

    return { data: posts, error: null };
  } catch (error) {
    return { data: null, error: normalizeCommunityError(error, 'Failed to load liked posts') };
  }
}

export async function getComments(postId) {
  try {
    const { data, error } = await supabase
      .from('comments')
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
    author:profiles!author_id (
      id,
      name,
      username,
      avatar_url,
      role,
      college
    ),
    user_has_liked:post_likes (
      id
    ),
    user_has_bookmarked:bookmarks (
      id
    ),
    reposts (
      id
    )
  `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const normalized = (data || []).map((c) => ({
      ...c,
      liked_by: Array.isArray(c.comment_likes) ? c.comment_likes.map((e) => e.user_id) : [],
    }));
    return { data: normalized, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * @param {string} postId
 * @param {string} authorId
 * @param {string} content
 * @param {string | null} [parentCommentId=null]
 */
export async function addComment(postId, authorId, content, parentCommentId = null) {
  try {
    const insertPayload = {
      post_id: postId,
      author_id: authorId,
      content,
      is_anonymous: false,
      ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
    };

    const { data, error } = await supabase
      .from('comments')
      .insert([insertPayload])
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
    author:profiles!author_id (
      id,
      name,
      username,
      avatar_url,
      role,
      college
    ),
    user_has_liked:post_likes (
      id
    ),
    user_has_bookmarked:bookmarks (
      id
    ),
    reposts (
      id
    )
  `)
      .single();
      
    if (error) throw error;

    // Increment post comments_count
    supabase.rpc('increment_post_comments_count', { p_id: postId }).catch(() => {});

    // If it's a reply, increment parent comment replies_count
    if (parentCommentId) {
      supabase.rpc('increment_comment_replies_count', { c_id: parentCommentId }).catch(() => {});
    }

    const { data: postMeta } = await supabase
      .from('posts')
      .select('author_id, title')
      .eq('id', postId)
      .single();

    const { data: replier } = await supabase
      .from('profiles')
      .select('name, username, college')
      .eq('id', authorId)
      .maybeSingle();

    const replierName = replier?.name || 'Someone';
    const replierCollege = replier?.college || 'Unknown College';
    const replierHandle = replier?.username ? `@${replier.username}` : `@${String(replierName).replace(/\s+/g, '').toLowerCase()}`;

    if (postMeta?.author_id && postMeta.author_id !== authorId) {
      supabase.functions.invoke('notify-community-reply', {
        body: {
          userId: postMeta.author_id,
          postId,
          title: 'New reply to your post',
          body: `${replierName} from ${replierCollege} replied to your post`,
          url: `/community/${postId}`,
        },
      }).catch(() => {});

      createNotification(
        postMeta.author_id,
        'post_comment',
        'New comment',
        `${replierHandle} commented on your post`,
        `/community/${postId}`
      ).catch(() => {});
    }
    
    return { data: { ...data, liked_by: [] }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * @param {string} commentId
 * @param {string | null | undefined} postId
 * @param {string | null} [parentCommentId=null]
 */
export async function deleteComment(commentId, postId, parentCommentId = null) {
  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    if (error) throw error;

    // Decrement post comments_count
    if (postId) {
      supabase.rpc('decrement_post_comments_count', { p_id: postId }).catch(() => {});
    }

    // If it was a reply, decrement parent replies_count
    if (parentCommentId) {
      supabase.rpc('decrement_comment_replies_count', { c_id: parentCommentId }).catch(() => {});
    }

    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function toggleCommentLike(commentId, userId) {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      const { error: deleteError } = await supabase.from('comment_likes').delete().eq('id', existing.id);
      if (deleteError) throw deleteError;
      supabase.rpc('decrement_comment_likes', { c_id: commentId }).catch(() => {});
      return { data: { liked: false }, error: null };
    } else {
      const { error: insertError } = await supabase.from('comment_likes').insert([{ comment_id: commentId, user_id: userId }]);
      if (insertError) throw insertError;
      supabase.rpc('increment_comment_likes', { c_id: commentId }).catch(() => {});
      return { data: { liked: true }, error: null };
    }
  } catch (error) {
    return { data: null, error };
  }
}

export async function reportContent(targetType, targetId, reporterId, reason, description) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert([{ 
        target_type: targetType, 
        target_id: targetId, 
        reporter_id: reporterId, 
        reason, 
        description 
      }])
      .select()
      .single();
      
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}


export async function getSocieties() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url, college, theme_color')
      .eq('role', 'society')
      .order('name');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getSocietyPosts(page = 1) {
  try {
    const limit = 20;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Get all society IDs first (since we can't easily filter by nested relation role without a view/inner join that limits fields)
    const { data: societies, error: socError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'society');
      
    if (socError) throw socError;
    
    if (!societies || societies.length === 0) return { data: [], error: null };

    const societyIds = societies.map(s => s.id);

    const query = supabase
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
    author:profiles!author_id (
      id,
      name,
      username,
      avatar_url,
      role,
      college
    ),
    user_has_liked:post_likes (
      id
    ),
    user_has_bookmarked:bookmarks (
      id
    ),
    reposts (
      id
    )
  `)
      .eq('is_hidden', false)
      .in('author_id', societyIds)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(start, end);

    const { data, error } = await (typeof withTimeout !== 'undefined' ? withTimeout(query, 20000, 'Loading posts') : query);
    
    if (error) throw error;
    const normalized = (data || []).map((post) => normalizePostRecord(post));
    return { data: normalized, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function togglePostBookmark(postId, userId) {
  if (!postId || !userId) return { error: { message: "Invalid parameters" } };
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error("togglePostBookmark fetchError:", fetchError);
      throw fetchError;
    }

    if (existing) {
      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      if (deleteError) {
        console.error("togglePostBookmark deleteError:", deleteError);
        throw deleteError;
      }

      // Decrement stored count (SECURITY DEFINER RPC bypasses posts RLS)
      supabase.rpc('decrement_post_bookmarks', { p_id: postId })
        .then(({ error }) => { if (error) console.error("decrement_post_bookmarks RPC error:", error); })
        .catch(err => console.error("decrement_post_bookmarks RPC catch:", err));

      return { data: { bookmarked: false }, error: null };
    } else {
      const { error: insertError } = await supabase
        .from('bookmarks')
        .insert([{ post_id: postId, user_id: userId }]);
      if (insertError) {
        console.error("togglePostBookmark insertError:", insertError);
        throw insertError;
      }

      // Increment stored count
      supabase.rpc('increment_post_bookmarks', { p_id: postId })
        .then(({ error }) => { if (error) console.error("increment_post_bookmarks RPC error:", error); })
        .catch(err => console.error("increment_post_bookmarks RPC catch:", err));

      return { data: { bookmarked: true }, error: null };
    }
  } catch (error) {
    console.error("togglePostBookmark caught error inside try-catch:", error);
    return { data: null, error: normalizeCommunityError(error, 'Failed to update bookmark') };
  }
}

export async function getBookmarkedPosts(userId, page = 1) {
  try {
    const limit = 20;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        post_id,
        created_at,
        posts (
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
          ),
          user_has_liked:post_likes (
            id
          ),
          user_has_bookmarked:bookmarks (
            id
          ),
          reposts (
            id
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw error;

    const posts = (data || [])
      .filter(b => b.posts)
      .map(b => normalizePostRecord(b.posts));

    return { data: posts, hasMore: posts.length === limit, error: null };
  } catch (error) {
    return { data: [], hasMore: false, error: normalizeCommunityError(error, 'Failed to load bookmarks') };
  }
}

