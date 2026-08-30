const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

// ── POST /api/notices/publish ───────────────────────────────────────────────
// Publishes a notice bypassing RLS
router.post('/publish', authMiddleware, async (req, res) => {
  try {
    const payload = req.body;
    
    let { data, error } = await supabaseAdmin
      .from('official_notices')
      .insert({ ...payload, author_id: req.user.id })
      .select()
      .single();

    if (error && (error.message?.includes('schema cache') || error.message?.includes('column'))) {
      const basePayload = {
        author_id: req.user.id,
        college: payload.college,
        title: payload.title,
        content: payload.content,
        target_year: payload.target_year,
        attachments: payload.attachments,
        is_pinned: payload.is_pinned,
      };
      const resFallback = await supabaseAdmin
        .from('official_notices')
        .insert(basePayload)
        .select()
        .single();
      data = resFallback.data;
      error = resFallback.error;
    }

    if (error) {
      console.error('[notices/publish] Supabase insert error:', error);
      return res.status(500).json({ error: error.message || 'Failed to publish notice' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[notices/publish] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
