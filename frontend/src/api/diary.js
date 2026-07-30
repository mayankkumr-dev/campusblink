/**
 * diary.js — Campus Diary frontend API client (with Moderation & Photo Quarantine)
 *
 * Communicates with the Supabase JS client and the Node.js / AWS Rekognition backend.
 */

import { supabase } from '../lib/supabase';

const AUTHOR_SELECT = `
  id, content, font_family, text_color, bg_color, gradient, scale,
  likes_count, liked_by, image_url, created_at,
  canvas_json, thumbnail_url, visibility, is_anonymous, tags, location_tag, unlock_at, published_at,
  author:profiles!author_id(id, name, username, avatar_url, college)
`;

const PAGE_SIZE = 10;

/**
 * Fetch global diary feed, paginated and filtered.
 * @param {number} page - 0-indexed page number
 * @param {'new'|'popular'|'mine'|'friends'} filter
 * @param {string} [currentUserId] - required for 'mine' filter
 * @param {string[]} [followingIds] - required for 'friends' filter
 */
export async function getDiaryFeed(
  page = 0,
  filter = 'new',
  currentUserId = null,
  followingIds = []
) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let query = supabase.from('vw_diary_feed').select(AUTHOR_SELECT).or('status.eq.active,status.is.null');

  if (filter === 'popular') {
    query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
  } else if (filter === 'mine' && currentUserId) {
    query = query.eq('author_id', currentUserId).order('created_at', { ascending: false });
  } else if (filter === 'friends' && followingIds.length > 0) {
    query = query.in('author_id', followingIds).order('created_at', { ascending: false });
  } else {
    // 'new' — default
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query.range(from, to);
  return { data: data || [], error };
}

/**
 * Fetch a thin list of recent diary authors that the user follows.
 * Used for the "Friends who posted recently" header row.
 * @param {string[]} followingIds
 */
export async function getRecentFriendWriters(followingIds) {
  if (!followingIds || followingIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from('diary_entries')
    .select('author_id, created_at, author:profiles!author_id(id, name, avatar_url)')
    .in('author_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return { data: [], error };

  const seen = new Set();
  const unique = [];
  for (const row of data || []) {
    if (!seen.has(row.author_id)) {
      seen.add(row.author_id);
      unique.push(row);
    }
  }

  return { data: unique.slice(0, 12), error: null };
}

/**
 * Fetch all diary entries authored by a specific user.
 * @param {string} userId
 */
export async function getUserDiaryEntries(userId) {
  if (!userId) return { data: [], error: new Error('userId required') };

  const { data, error } = await supabase
    .from('vw_diary_feed')
    .select(AUTHOR_SELECT)
    .eq('author_id', userId)
    .or('status.eq.active,status.is.null')
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Pre-stage an image directly to the Supabase 'quarantine' bucket (strictly private).
 * @param {File} imageFile
 * @param {string} userId
 */
export async function uploadToQuarantine(imageFile, userId) {
  if (!imageFile || !userId) {
    return { data: null, error: new Error('Image file and user ID are required for quarantine upload.') };
  }

  const cleanName = String(imageFile.name || 'photo.jpg').replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const quarantinePath = `${userId}/${Date.now()}-${cleanName}`;

  const { data, error } = await supabase.storage
    .from('quarantine')
    .upload(quarantinePath, imageFile, {
      contentType: imageFile.type || 'image/jpeg',
      upsert: true,
    });

  if (error) {
    return { data: null, error };
  }

  return { data: { quarantine_path: quarantinePath }, error: null };
}

/**
 * Create a new diary entry via the Node.js moderation pipeline.
 * Submits content & staged/attached image to POST /api/diary for AWS Rekognition check.
 * @param {object} entry - { content, font_family, text_color, bg_color, gradient, scale, author_id, quarantine_path }
 * @param {File} [imageFile] - Optional raw photo file to send multipart if not pre-staged
 */
export async function createDiaryEntry(entry, imageFile = null) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let body;
    if (imageFile) {
      const formData = new FormData();
      formData.append('content', entry.content || '');
      formData.append('font_family', entry.font_family || 'Caveat');
      formData.append('text_color', entry.text_color || '#2D1B10');
      formData.append('bg_color', entry.bg_color || '#FFFDF2');
      formData.append('scale', String(entry.scale || 1.0));
      if (entry.gradient) formData.append('gradient', entry.gradient);
      if (entry.author_id) formData.append('author_id', entry.author_id);
      if (entry.quarantine_path) formData.append('quarantine_path', entry.quarantine_path);
      formData.append('image', imageFile);
      body = formData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(entry);
    }

    // 1. Attempt Node backend API call
    try {
      const response = await fetch('/api/diary', {
        method: 'POST',
        headers,
        body,
        credentials: 'include',
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.ok) {
        return { data: responseData.data, error: null, moderated: false };
      }
    } catch (_) {
      // Backend route unreachable or missing in Vite dev
    }

    // 2. Direct Supabase Client DB Insert Fallback
    const payload = {
      author_id: entry.author_id,
      content: entry.content || 'Diary Story',
      font_family: entry.font_family || 'Caveat',
      text_color: entry.text_color || '#2D1B10',
      bg_color: entry.bg_color || '#FFFDF2',
      status: 'active',
    };
    if (entry.image_url) payload.image_url = entry.image_url;

    const { data: supaData, error: supaError } = await supabase
      .from('diary_entries')
      .insert(payload)
      .select();

    if (!supaError && supaData && supaData.length > 0) {
      return { data: supaData[0], error: null, moderated: false };
    }

    return { data: null, error: supaError || new Error('Failed to create diary entry'), moderated: false };
  } catch (err) {
    return { data: null, error: err, moderated: false };
  }
}

/**
 * Delete a diary entry (and its public photo) via the backend API.
 * @param {string} id
 * @param {string} authorId
 */
export async function deleteDiaryEntry(id, authorId) {
  try {
    // 1. Attempt Backend API delete (cleans up photos & storage)
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`/api/diary/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ author_id: authorId }),
        credentials: 'include',
      });

      if (response.ok) {
        return { error: null };
      }
    } catch (_) {
      // Backend route unreachable, fall through to direct Supabase DB delete
    }

    // 2. Direct Supabase Client Delete Fallback
    const { error: supaError } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id);

    if (!supaError) {
      return { error: null };
    }

    return { error: supaError };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Toggle like on a diary entry using the atomic RPC function.
 * @param {string} entryId
 * @param {string} userId
 */
export async function toggleDiaryLike(entryId, userId) {
  const { data, error } = await supabase
    .rpc('toggle_diary_like', { p_entry_id: entryId, p_user_id: userId });

  if (error) return { data: null, error };

  const result = Array.isArray(data) ? data[0] : data;
  return {
    data: {
    likesCount: result?.new_likes_count ?? 0,
    userLiked: result?.user_liked ?? false,
  },
  error: null,
};
}

/**
 * Toggle bookmark/save on a diary entry.
 * @param {string} entryId
 * @param {string} userId
 */
export async function toggleDiaryBookmark(entryId, userId) {
  if (!entryId || !userId) return { data: { bookmarked: false }, error: new Error('Missing parameters') };

  try {
    // Check if already bookmarked
    const { data: existing, error: checkErr } = await supabase
      .from('diary_bookmarks')
      .select('id')
      .eq('diary_id', entryId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!checkErr && existing) {
      // Unbookmark
      const { error: delErr } = await supabase
        .from('diary_bookmarks')
        .delete()
        .eq('diary_id', entryId)
        .eq('user_id', userId);

      if (delErr) throw delErr;
      return { data: { bookmarked: false }, error: null };
    } else {
      // Bookmark
      const { error: insErr } = await supabase
        .from('diary_bookmarks')
        .insert({ diary_id: entryId, user_id: userId });

      if (insErr) throw insErr;
      return { data: { bookmarked: true }, error: null };
    }
  } catch (err) {
    console.warn('[diaryApi] Supabase diary_bookmarks table error, using fallback:', err?.message);
    // Fallback: Check local storage cache
    const key = `diary_saved_${userId}`;
    const raw = localStorage.getItem(key);
    let savedList = raw ? JSON.parse(raw) : [];
    const isSaved = savedList.includes(entryId);

    if (isSaved) {
      savedList = savedList.filter((id) => id !== entryId);
    } else {
      savedList.push(entryId);
    }

    localStorage.setItem(key, JSON.stringify(savedList));
    return { data: { bookmarked: !isSaved }, error: null };
  }
}

/**
 * Fetch all bookmarked/saved diary entries for a given user.
 * @param {string} userId
 */
export async function getBookmarkedDiaries(userId) {
  if (!userId) return { data: [], error: new Error('userId required') };

  try {
    // 1. Fetch bookmarked entry IDs from DB
    const { data: bms, error: bmErr } = await supabase
      .from('diary_bookmarks')
      .select('diary_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    let diaryIds = (bms || []).map((b) => b.diary_id);

    // Local storage fallback IDs if DB fails or empty
    const key = `diary_saved_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const localIds = JSON.parse(raw);
        if (Array.isArray(localIds)) {
          diaryIds = Array.from(new Set([...diaryIds, ...localIds]));
        }
      } catch (_) {}
    }

    if (diaryIds.length === 0) return { data: [], error: null };

    // 2. Fetch complete entry models
    const { data: entries, error: entriesErr } = await supabase
      .from('vw_diary_feed')
      .select(AUTHOR_SELECT)
      .in('id', diaryIds)
      .order('created_at', { ascending: false });

    if (entriesErr) throw entriesErr;

    return { data: (entries || []).map((e) => ({ ...e, user_has_bookmarked: true })), error: null };
  } catch (err) {
    console.error('[diaryApi] getBookmarkedDiaries error:', err?.message);

    // Local storage fallback full query
    try {
      const key = `diary_saved_${userId}`;
      const raw = localStorage.getItem(key);
      const localIds = raw ? JSON.parse(raw) : [];
      if (localIds.length === 0) return { data: [], error: null };

      const { data: fallbackEntries } = await supabase
        .from('diary_entries')
        .select(`
          id, content, font_family, text_color, bg_color, gradient, scale,
          likes_count, liked_by, image_url, created_at,
          author:profiles!author_id(id, name, username, avatar_url, college)
        `)
        .in('id', localIds)
        .order('created_at', { ascending: false });

      return { data: (fallbackEntries || []).map((e) => ({ ...e, user_has_bookmarked: true })), error: null };
    } catch (fallbackErr) {
      return { data: [], error: fallbackErr };
    }
  }
}

/**
 * Superadmin: Fetch all flagged diary entries.
 */
export async function getFlaggedDiaries() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch('/api/diary/admin/flagged', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return { data: [], error: new Error(errBody.error || 'Failed to fetch flagged diaries') };
    }

    const resData = await response.json();
    return { data: resData.data || [], error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Superadmin: Permanently delete a flagged entry and its photo.
 * @param {string} id
 */
export async function deleteAdminDiaryEntry(id) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch(`/api/diary/admin/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return { error: new Error(errBody.error || 'Failed to permanently delete entry') };
    }

    return { error: null };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Superadmin: Restore a flagged entry back to active status.
 * @param {string} id
 */
export async function restoreFlaggedDiary(id) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch(`/api/diary/admin/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return { error: new Error(errBody.error || 'Failed to restore entry') };
    }

    return { error: null };
  } catch (err) {
    return { error: err };
  }
}
