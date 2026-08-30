import { supabase, getStandardClerkToken } from '../lib/supabase';
import { uploadAttachment, deleteFile } from '../lib/s3';

const NOTICES_LAST_SEEN_KEY = 'campus_blink_notices_last_seen';

// ─── Read Helpers ─────────────────────────────────────────────────────────────

/**
 * Fetch notices visible to the current student.
 * RLS: only notices for their college + study_year (or 'all').
 * Soft-deleted notices are included but shown as placeholders.
 * Fully-removed notices are hidden by RLS.
 */
export async function getNoticesForStudent({ college, studyYear, limit = 15, beforeTimestamp = null } = {}) {
  try {
    let query = supabase
      .from('official_notices')
      .select(`
        id,
        title,
        content,
        target_year,
        attachments,
        is_pinned,
        pin_expires_at,
        is_deleted,
        created_at
      `)
      .or('is_fully_removed.is.null,is_fully_removed.eq.false')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (beforeTimestamp) {
      query = query.lt('created_at', beforeTimestamp);
    }

    if (college) {
      query = query.in('college', [college, 'All']);
    } else {
      query = query.eq('college', 'All');
    }

    if (studyYear) {
      // Extract the numeric year (e.g., '1st Year' -> '1', '2' -> '2')
      const yrStr = String(studyYear);
      const yrDigit = yrStr.match(/\d/)?.[0] || yrStr.split(':')[0].trim();
      
      // Fetch 'all' notices, plus any formats of the specific year ('1', '1st Year')
      const targetYearFormats = [
        'all', 
        yrDigit,
        `${yrDigit}st Year`,
        `${yrDigit}nd Year`,
        `${yrDigit}rd Year`,
        `${yrDigit}th Year`
      ];
      query = query.in('target_year', targetYearFormats);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Reverse the data so it's in chronological order (newest at the end)
    const reversedData = data ? [...data].reverse() : [];
    return { data: reversedData, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

/**
 * Fetch notices visible to the faculty/professors (target_year = 'faculty').
 */
export async function getNoticesForFaculty({ college, limit = 50, offset = 0 } = {}) {
  try {
    let query = supabase
      .from('official_notices')
      .select(`
        id,
        title,
        content,
        target_year,
        attachments,
        is_pinned,
        pin_expires_at,
        is_deleted,
        created_at,
        author:profiles!official_notices_author_id_fkey(name, email, role)
      `)
      .eq('target_year', 'faculty')
      .or('is_fully_removed.is.null,is_fully_removed.eq.false')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (college) {
      query = query.in('college', [college, 'All']);
    } else {
      query = query.eq('college', 'All');
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

/**
 * Fetch campus notices visible to professors (target_year = 'all').
 */
export async function getCampusNoticesForProfessor({ college, limit = 50, offset = 0 } = {}) {
  try {
    let query = supabase
      .from('official_notices')
      .select(`
        id,
        title,
        content,
        target_year,
        attachments,
        is_pinned,
        pin_expires_at,
        is_deleted,
        created_at
      `)
      .eq('target_year', 'all')
      .or('is_fully_removed.is.null,is_fully_removed.eq.false')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (college) {
      query = query.in('college', [college, 'All']);
    } else {
      query = query.eq('college', 'All');
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

/**
 * Count unread notices (created after last-seen timestamp) for badge display.
 * Returns a number capped at 99.
 */
export async function getUnreadNoticeCount() {
  try {
    const lastSeen = localStorage.getItem(NOTICES_LAST_SEEN_KEY);
    if (!lastSeen) {
      // No baseline: mark now as last seen so badge only shows future notices
      localStorage.setItem(NOTICES_LAST_SEEN_KEY, new Date().toISOString());
      return 0;
    }

    const { count, error } = await supabase
      .from('official_notices')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .or('is_fully_removed.is.null,is_fully_removed.eq.false')
      .gt('created_at', lastSeen);

    if (error) throw error;
    return Math.min(count || 0, 99);
  } catch {
    return 0;
  }
}

/**
 * Mark notices as seen (reset unread badge to 0).
 */
export function markNoticesAsSeen() {
  localStorage.setItem(NOTICES_LAST_SEEN_KEY, new Date().toISOString());
}

/**
 * Fetch all notices for the notice admin's college (admin list view).
 */
export async function getNoticesForAdmin(college = null) {
  try {
    let query = supabase
      .from('official_notices')
      .select(`
        id,
        title,
        content,
        target_year,
        attachments,
        is_pinned,
        pin_expires_at,
        is_deleted,
        created_at,
        author:profiles!official_notices_author_id_fkey(name, email, role),
        deleted_by:profiles!official_notices_deleted_by_id_fkey(name, email, role)
      `)
      .or('is_fully_removed.is.null,is_fully_removed.eq.false')
      .order('created_at', { ascending: false });

    if (college && college !== 'All') {
      query = query.eq('college', college);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('getNoticesForAdmin error:', error);
    return { data: [], error };
  }
}

// ─── Write Helpers ────────────────────────────────────────────────────────────

export async function createNotice({ authorId, college, title, content, targetYear, attachments, isPinned = false, pinExpiresAt = null }) {
  const fullPayload = {
    author_id: authorId,
    college,
    title,
    content,
    target_year: targetYear,
    attachments,
    is_pinned: isPinned,
    pin_expires_at: pinExpiresAt,
  };

  try {
    const _clerkToken = getStandardClerkToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(_clerkToken ? { Authorization: `Bearer ${_clerkToken}` } : {})
    };
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

    const response = await fetch(`${backendUrl}/api/notices/publish`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(fullPayload),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Failed to publish notice');
    }

    const result = await response.json();
    return { data: result.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Soft-delete a notice (shows "This message has been deleted" to students).
 * Available to notice admins.
 */
export async function softDeleteNotice(noticeId, deletedById = null) {
  try {
    const updatePayload = { is_deleted: true };
    if (deletedById) {
      updatePayload.deleted_by_id = deletedById;
    }

    const { data, error } = await supabase
      .from('official_notices')
      .update(updatePayload)
      .eq('id', noticeId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("RLS blocked the update or notice not found.");
    }
    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * Completely delete a notice and its S3 attachments from the database.
 */
export async function deleteNoticeAndAttachments(notice) {
  try {
    // 1. Delete all attachments from S3
    if (notice.attachments && Array.isArray(notice.attachments)) {
      for (const att of notice.attachments) {
        if (att.url) {
          // deleteFile automatically extracts the S3 key from the URL
          const { error: s3Error } = await deleteFile(att.url);
          if (s3Error) {
            console.warn(`Failed to delete S3 attachment ${att.url}:`, s3Error);
          }
        }
      }
    }

    // 2. Hard delete from Supabase
    const { error: dbError } = await supabase
      .from('official_notices')
      .delete()
      .eq('id', notice.id);

    if (dbError) throw dbError;

    return { error: null };
  } catch (error) {
    console.error("Hard delete notice failed:", error);
    return { error };
  }
}

/**
 * Hard-remove a notice completely — only platform admins.
 * Sets is_fully_removed = true, which RLS hides from all students.
 */
export async function hardRemoveNotice(noticeId) {
  try {
    const { data, error } = await supabase
      .from('official_notices')
      .update({ is_fully_removed: true })
      .eq('id', noticeId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Action blocked by database rules (RLS). Please run the SQL schema file in Supabase.");
    }
    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * Restore a soft-deleted notice (notice admin can un-delete).
 */
export async function restoreNotice(noticeId) {
  try {
    const { error } = await supabase
      .from('official_notices')
      .update({ is_deleted: false, deleted_by_id: null })
      .eq('id', noticeId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * Pin a notice with an expiry duration.
 * @param {string} noticeId
 * @param {boolean} isPinned
 * @param {Date|null} pinExpiresAt - null means pin indefinitely (or unpin)
 */
export async function togglePinNotice(noticeId, isPinned, pinExpiresAt = null) {
  try {
    const { error } = await supabase
      .from('official_notices')
      .update({
        is_pinned: isPinned,
        pin_expires_at: isPinned ? pinExpiresAt?.toISOString() ?? null : null,
      })
      .eq('id', noticeId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * Upload a notice attachment to AWS S3.
 *
 * Previously used Supabase Storage ('notice-attachments' bucket).
 * Now uses S3 pre-signed URL direct upload for speed and consistency.
 *
 * Supports images, PDFs, Word, Excel, and other document types.
 * Images are automatically compressed before upload.
 *
 * @param {File} file - The file to upload
 * @param {string} authorId - The uploader's user ID (used for S3 folder path)
 * @param {{ onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<{ data: { name: string, url: string, type: string, size: number } | null, error: Error | null }>}
 */
export async function uploadNoticeAttachment(file, authorId, options = {}) {
  return uploadAttachment(file, `notices/${authorId}`, options);
}

/**
 * Grant or revoke notice admin permission for a user.
 */
export async function setNoticeAdminPermission(userId, isNoticeAdmin) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_notice_admin: isNoticeAdmin })
      .eq('id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}
