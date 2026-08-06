const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { sendPushToUser } = require('../services/push');

// ── POST /api/push/subscribe ──────────────────────────────────────────────────
// Saves (upserts) a Web Push subscription for the authenticated user.
// The frontend sends this after Notification.requestPermission() is granted.
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint, p256dh, auth, deviceName } = req.body || {};

    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({
        error: 'Missing required fields: endpoint, p256dh, auth',
      });
    }

    if (
      typeof endpoint !== 'string' ||
      typeof p256dh !== 'string' ||
      typeof auth !== 'string'
    ) {
      return res.status(400).json({ error: 'endpoint, p256dh and auth must be strings' });
    }

    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: req.user.id,
          endpoint: endpoint.trim(),
          p256dh: p256dh.trim(),
          auth: auth.trim(),
          device_name: String(deviceName || 'Unknown').trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' }
      )
      .select()
      .single();

    if (error) {
      console.error('[push/subscribe] Supabase upsert error:', error);
      return res.status(500).json({ error: 'Failed to save subscription' });
    }

    console.log('[push/subscribe] Subscription saved', {
      userId: req.user.id,
      subscriptionId: data?.id,
      endpoint: endpoint.slice(0, 60) + '…',
    });

    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error('[push/subscribe] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/push/unsubscribe ──────────────────────────────────────────────
// Deletes a specific push subscription by endpoint for the authenticated user.
// Called when the user revokes notification permission or signs out.
router.delete('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body || {};

    if (!endpoint) {
      return res.status(400).json({ error: 'Missing required field: endpoint' });
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', req.user.id)
      .eq('endpoint', endpoint.trim());

    if (error) {
      console.error('[push/unsubscribe] Supabase delete error:', error);
      return res.status(500).json({ error: 'Failed to delete subscription' });
    }

    console.log('[push/unsubscribe] Subscription removed', {
      userId: req.user.id,
      endpoint: endpoint.slice(0, 60) + '…',
    });

    return res.status(204).send();
  } catch (err) {
    console.error('[push/unsubscribe] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/push/test ───────────────────────────────────────────────────────
// Sends a test notification to the authenticated user's subscribed devices.
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await sendPushToUser(userId, {
      type: 'announcement',
      title: 'Test notification 🔔',
      body: 'Push notifications are working correctly!',
      url: '/',
      important: false,
    });

    res.json({ message: 'Test push queued' });
  } catch (error) {
    console.error('Error sending test push:', error);
    res.status(500).json({ error: error.message || 'Failed to send test push' });
  }
});

// ── POST /api/push/notify ─────────────────────────────────────────────────────
// Internal trigger endpoint — send an arbitrary push to any userId.
// Requires auth; intended for server-to-server or admin use.
router.post('/notify', authMiddleware, async (req, res) => {
  try {
    const { userId, notification } = req.body || {};

    if (!userId || !notification) {
      return res.status(400).json({ error: 'userId and notification are required' });
    }

    await sendPushToUser(userId, notification);
    res.json({ message: 'Push queued' });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ error: error.message || 'Failed to send push notification' });
  }
});

// ── GET /api/push/preferences ─────────────────────────────────────────────────
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    res.json({ preferences: data || null });
  } catch (error) {
    console.error('Error loading push preferences:', error);
    res.status(500).json({ error: error.message || 'Failed to load preferences' });
  }
});

// ── PUT /api/push/preferences ─────────────────────────────────────────────────
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const payload = {
      user_id: req.user.id,
      order_ready: req.body.order_ready ?? true,
      new_order: req.body.new_order ?? true,
      post_liked: req.body.post_liked ?? true,
      post_commented: req.body.post_commented ?? true,
      new_follower: req.body.new_follower ?? true,
      announcement: req.body.announcement ?? true,
      marketplace_message: req.body.marketplace_message ?? true,
      reputation_earned: req.body.reputation_earned ?? true,
      professor_approved: req.body.professor_approved ?? true,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ preferences: data });
  } catch (error) {
    console.error('Error saving push preferences:', error);
    res.status(500).json({ error: error.message || 'Failed to save preferences' });
  }
});

// ── POST /api/push/broadcast-notice ───────────────────────────────────────────
// Trigger endpoint to broadcast a notice to targeted students.
// Called by the frontend immediately after saving an official notice.
router.post('/broadcast-notice', authMiddleware, async (req, res) => {
  try {
    const { noticeId, title, college, targetYear } = req.body;
    if (!noticeId || !title) {
      return res.status(400).json({ error: 'noticeId and title are required' });
    }

    // Determine target users based on college and targetYear
    let query = supabaseAdmin.from('profiles').select('id').eq('status', 'active');
    
    if (college && college !== 'All') {
      query = query.eq('college', college);
    }
    
    if (targetYear && targetYear !== 'all') {
      if (targetYear === 'faculty') {
        query = query.eq('role', 'faculty');
      } else {
        const yrPrefix = targetYear.split(':')[0].trim();
        query = query.eq('study_year', yrPrefix);
      }
    }

    const { data: users, error } = await query;
    if (error) throw error;

    const targetUserIds = users?.map(u => u.id) || [];
    
    if (targetUserIds.length > 0) {
      const notificationService = require('../services/notifications');
      notificationService.notifyOfficialNotice(targetUserIds, title, noticeId).catch(console.error);
    }

    res.json({ message: 'Notice broadcast queued', targetedUsers: targetUserIds.length });
  } catch (error) {
    console.error('Error broadcasting notice:', error);
    res.status(500).json({ error: error.message || 'Failed to broadcast notice' });
  }
});

module.exports = router;