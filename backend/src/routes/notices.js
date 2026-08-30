const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { notifyOfficialNotice } = require('../services/notifications');

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

    // --- Send Push Notifications & In-App Notifications ---
    try {
      let query = supabaseAdmin.from('profiles').select('id');
      
      // Filter by college
      if (payload.college && payload.college !== 'All') {
        query = query.eq('college', payload.college);
      }

      // Filter by target year or role
      const isFaculty = payload.target_year === 'faculty';
      if (isFaculty) {
        query = query.in('role', ['professor', 'admin', 'faculty']);
      } else {
        query = query.eq('role', 'student');
        if (payload.target_year && payload.target_year !== 'all') {
          const yrDigit = String(payload.target_year).match(/\d/)?.[0];
          if (yrDigit) {
            // Assume the DB uses academic_year as a number
            query = query.eq('academic_year', parseInt(yrDigit, 10));
          }
        }
      }

      const { data: users, error: usersError } = await query;
      
      if (!usersError && users && users.length > 0) {
        const userIds = users.map(u => u.id);
        // Fire and forget
        notifyOfficialNotice(userIds, payload.title, data.id, payload.content, isFaculty).catch(err => {
          console.error('[notices/publish] notifyOfficialNotice error:', err);
        });
      }
    } catch (notifyErr) {
      console.error('[notices/publish] Error resolving users for push:', notifyErr);
    }
    // --------------------------------------------------------

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[notices/publish] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
