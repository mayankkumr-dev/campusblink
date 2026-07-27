/**
 * diaryController.js — Campus Diary CRUD operations & Moderated Photo Upload
 *
 * Uses Supabase service-role client and AWS Rekognition / Text Moderation engine.
 * Diary entries are stored in the `diary_entries` table.
 */

const { createClient } = require('@supabase/supabase-js');
const { processDiarySubmission } = require('../services/moderation');
const { supabaseAdmin } = require('../config/supabase');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

const PAGE_SIZE = 20;

/**
 * GET /api/diary — Global paginated diary feed
 */
async function getDiaryFeed(req, res) {
  try {
    const supabase = getSupabase();
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('diary_entries')
      .select(`
        id, content, font_family, text_color, bg_color, gradient, scale, likes_count, liked_by, image_url, created_at, status,
        author:profiles!author_id(id, name, username, avatar_url, college)
      `)
      .or('status.eq.active,status.is.null')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return res.json({ data: data || [], page });
  } catch (err) {
    console.error('[DiaryController] getDiaryFeed error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch diary feed' });
  }
}

/**
 * GET /api/diary/user/:userId — Entries by a specific user
 */
async function getUserDiaryEntries(req, res) {
  try {
    const supabase = getSupabase();
    const { userId } = req.params;

    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const { data, error } = await supabase
      .from('diary_entries')
      .select(`
        id, content, font_family, text_color, bg_color, gradient, scale, likes_count, liked_by, image_url, created_at, status,
        author:profiles!author_id(id, name, username, avatar_url, college)
      `)
      .eq('author_id', userId)
      .or('status.eq.active,status.is.null')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ data: data || [] });
  } catch (err) {
    console.error('[DiaryController] getUserDiaryEntries error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch user diary entries' });
  }
}

/**
 * POST /api/diary/quarantine — Upload image directly to Supabase 'quarantine' bucket before submission
 */
async function uploadToQuarantine(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided for quarantine upload' });
    }

    const userId = req.user ? req.user.id : req.body.author_id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to upload photo to quarantine' });
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF allowed' });
    }

    // Max size 10MB
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size exceeds 10MB limit' });
    }

    const filename = String(req.file.originalname || 'photo.jpg').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const quarantinePath = `${userId}/${Date.now()}-${filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('quarantine')
      .upload(quarantinePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Quarantine upload failed: ${uploadError.message}`);
    }

    return res.status(201).json({
      success: true,
      quarantine_path: quarantinePath,
      message: 'Image uploaded to quarantine bucket safely. Ready for moderation.',
    });
  } catch (err) {
    console.error('[DiaryController] uploadToQuarantine error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to upload photo to quarantine' });
  }
}

/**
 * POST /api/diary — Create a new diary entry with automated Text & Image moderation
 */
async function createDiaryEntry(req, res) {
  try {
    const { content, font_family, text_color, bg_color, gradient, scale, author_id, quarantine_path } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Diary content is required' });
    }

    const userId = req.user ? req.user.id : author_id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to post diary entry' });
    }

    if (req.user && req.user.id !== author_id && req.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to post on behalf of another user' });
    }

    // If file uploaded directly in this POST via multer, put into quarantine first
    let activeQuarantinePath = quarantine_path || null;
    if (req.file) {
      const filename = String(req.file.originalname || 'photo.jpg').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      activeQuarantinePath = `${userId}/${Date.now()}-${filename}`;

      const { error: qError } = await supabaseAdmin.storage
        .from('quarantine')
        .upload(activeQuarantinePath, req.file.buffer, {
          contentType: req.file.mimetype || 'image/jpeg',
          upsert: true,
        });

      if (qError) {
        return res.status(500).json({ error: `Failed to stage image in quarantine: ${qError.message}` });
      }
    }

    // Execute Moderation & Decision Engine
    const submissionResult = await processDiarySubmission({
      author_id: userId,
      content,
      font_family,
      text_color,
      bg_color,
      gradient,
      scale,
      quarantine_path: activeQuarantinePath,
    });

    if (!submissionResult.success) {
      return res.status(submissionResult.status || 403).json({
        error: submissionResult.error,
        moderated: true,
      });
    }

    return res.status(submissionResult.status || 201).json({ data: submissionResult.data });
  } catch (err) {
    console.error('[DiaryController] createDiaryEntry error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to process and create diary entry' });
  }
}

/**
 * DELETE /api/diary/:id — Delete own diary entry
 */
async function deleteDiaryEntry(req, res) {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const author_id = req.user ? req.user.id : req.body.author_id;

    if (!id) return res.status(400).json({ error: 'id is required' });
    if (!author_id) return res.status(401).json({ error: 'Authentication required to delete diary entry' });

    // Verify ownership before deleting
    const { data: existing } = await supabase
      .from('diary_entries')
      .select('id, author_id, image_url')
      .eq('id', id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    if (existing.author_id !== author_id && req.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this entry' });
    }

    // If entry had a photo in 'diaries' bucket, remove it from storage when deleting entry
    if (existing.image_url) {
      try {
        const destKey = existing.image_url.split('/diaries/')[1];
        if (destKey) await supabaseAdmin.storage.from('diaries').remove([destKey]);
      } catch (_) {}
    }

    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.json({ success: true, message: 'Diary entry and attached photo deleted successfully' });
  } catch (err) {
    console.error('[DiaryController] deleteDiaryEntry error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to delete diary entry' });
  }
}

/**
 * GET /api/diary/admin/flagged — Fetch all flagged diary entries for Superadmin panel
 */
async function getFlaggedDiaries(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('diary_entries')
      .select(`
        id, content, font_family, text_color, bg_color, gradient, scale, likes_count, liked_by, image_url, created_at, status, flagged_reason, moderation_labels,
        author:profiles!author_id(id, name, username, avatar_url, college, email)
      `)
      .eq('status', 'flagged')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (err) {
    console.error('[DiaryController] getFlaggedDiaries error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch flagged diaries' });
  }
}

/**
 * DELETE /api/diary/admin/:id — Superadmin permanently deletes a flagged entry & its photo
 */
async function deleteAdminDiaryEntry(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const { data: existing } = await supabaseAdmin
      .from('diary_entries')
      .select('id, image_url')
      .eq('id', id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    if (existing.image_url) {
      try {
        const destKey = existing.image_url.split('/diaries/')[1];
        if (destKey) await supabaseAdmin.storage.from('diaries').remove([destKey]);
      } catch (_) {}
    }

    const { error } = await supabaseAdmin
      .from('diary_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.json({ success: true, message: 'Permanently deleted diary entry and attached photo' });
  } catch (err) {
    console.error('[DiaryController] deleteAdminDiaryEntry error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to permanently delete diary entry' });
  }
}

/**
 * POST /api/diary/admin/:id/restore — Superadmin restores a flagged entry back to active feed
 */
async function restoreFlaggedDiary(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const { data, error } = await supabaseAdmin
      .from('diary_entries')
      .update({ status: 'active', flagged_reason: null, moderation_labels: [] })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, data, message: 'Diary entry restored to active campus feed' });
  } catch (err) {
    console.error('[DiaryController] restoreFlaggedDiary error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to restore diary entry' });
  }
}

/**
 * GET /api/diary/daily-prompt — Fetch today's writing prompt
 */
async function getDailyPrompt(req, res) {
  try {
    const prompts = [
      { id: '1', title: 'My imaginary assistant', emoji: '🦜', category: 'Creative' },
      { id: '2', title: 'Campus life in 3 words', emoji: '🎓', category: 'Campus' },
      { id: '3', title: 'Late night library thoughts', emoji: '🌙', category: 'Reflection' },
      { id: '4', title: 'Best cup of coffee today', emoji: '☕', category: 'Daily' },
      { id: '5', title: 'Unfiltered moment of the day', emoji: '✨', category: 'Mood' },
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const prompt = prompts[dayOfYear % prompts.length];
    return res.json({ success: true, prompt });
  } catch (err) {
    console.error('[DiaryController] getDailyPrompt error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch daily prompt' });
  }
}

module.exports = {
  getDiaryFeed,
  getUserDiaryEntries,
  uploadToQuarantine,
  createDiaryEntry,
  deleteDiaryEntry,
  getFlaggedDiaries,
  deleteAdminDiaryEntry,
  restoreFlaggedDiary,
  getDailyPrompt,
};
