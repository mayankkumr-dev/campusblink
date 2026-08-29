const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { sendPushToUser } = require('../services/push');

// ── POST /api/push/subscribe ──────────────────────────────────────────────────
// Saves (upserts) an FCM registration token for the authenticated user.
// The frontend sends this after Notification.requestPermission() is granted
// and a Firebase FCM token is obtained via getToken().
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { fcmToken, deviceName } = req.body || {};

    if (!fcmToken) {
      return res.status(400).json({
        error: 'Missing required field: fcmToken',
      });
    }

    if (typeof fcmToken !== 'string' || !fcmToken.trim()) {
      return res.status(400).json({ error: 'fcmToken must be a non-empty string' });
    }

    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: req.user.id,
          fcm_token: fcmToken.trim(),
          device_name: String(deviceName || 'Unknown').trim(),
          token_updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,fcm_token' }
      )
      .select()
      .single();

    if (error) {
      console.error('[push/subscribe] Supabase upsert error:', error);
      return res.status(500).json({ error: 'Failed to save FCM token' });
    }

    console.log('[push/subscribe] FCM token saved', {
      userId: req.user.id,
      subscriptionId: data?.id,
      tokenPrefix: fcmToken.slice(0, 40) + '…',
    });

    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error('[push/subscribe] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/push/unsubscribe ──────────────────────────────────────────────
// Deletes a specific FCM token subscription for the authenticated user.
// Called when the user revokes notification permission or signs out.
router.delete('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { fcmToken } = req.body || {};

    if (!fcmToken) {
      return res.status(400).json({ error: 'Missing required field: fcmToken' });
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', req.user.id)
      .eq('fcm_token', fcmToken.trim());

    if (error) {
      console.error('[push/unsubscribe] Supabase delete error:', error);
      return res.status(500).json({ error: 'Failed to delete FCM token' });
    }

    console.log('[push/unsubscribe] FCM token removed', {
      userId: req.user.id,
      tokenPrefix: fcmToken.slice(0, 40) + '…',
    });

    return res.status(204).send();
  } catch (err) {
    console.error('[push/unsubscribe] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/push/test ───────────────────────────────────────────────────────
// Sends a test FCM notification to the authenticated user's registered devices.
// Returns diagnostic info: token count found, whether send was attempted.
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check how many tokens are registered for this user
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('fcm_token, device_name, token_updated_at')
      .eq('user_id', userId)
      .not('fcm_token', 'is', null);

    if (subError) {
      console.error('[push/test] Supabase query error:', subError);
      return res.status(500).json({ error: 'Failed to query push subscriptions', detail: subError.message });
    }

    const tokenCount = subscriptions?.length || 0;

    if (tokenCount === 0) {
      return res.status(404).json({
        error: 'No push subscriptions found for this user. Please enable notifications first.',
        tokenCount: 0,
        userId,
      });
    }

    await sendPushToUser(userId, {
      type: 'announcement',
      title: '🔔 Test Notification',
      body: 'Push notifications are working! Tap to open notices.',
      url: '/student/notices',
      important: false,
    });

    res.json({
      message: 'Test push sent',
      tokenCount,
      userId,
      devices: subscriptions.map((s) => ({
        deviceName: s.device_name,
        tokenPrefix: s.fcm_token?.slice(0, 20) + '…',
        lastUpdated: s.token_updated_at,
      })),
    });
  } catch (error) {
    console.error('Error sending test push:', error);
    res.status(500).json({ error: error.message || 'Failed to send test push' });
  }
});

// ── GET /api/push/status ──────────────────────────────────────────────────────
// Diagnostic: returns all registered FCM tokens for the current user.
// Use this to verify that a subscription was saved to the DB after enabling notifications.
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, device_name, token_updated_at, fcm_token')
      .eq('user_id', userId)
      .not('fcm_token', 'is', null)
      .order('token_updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      userId,
      subscriptionCount: subscriptions?.length || 0,
      subscriptions: (subscriptions || []).map((s) => ({
        id: s.id,
        deviceName: s.device_name,
        tokenPrefix: s.fcm_token?.slice(0, 30) + '…',
        lastUpdated: s.token_updated_at,
      })),
    });
  } catch (err) {
    console.error('[push/status] error:', err);
    res.status(500).json({ error: err.message });
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
// Trigger endpoint to broadcast a notice push to targeted students.
// Called by the frontend immediately after saving an official notice.
router.post('/broadcast-notice', authMiddleware, async (req, res) => {
  try {
    const { noticeId, title, college, targetYear } = req.body;
    if (!noticeId) {
      return res.status(400).json({ error: 'noticeId is required' });
    }

    // Fetch the notice content to include in the push notification body
    const { data: noticeData } = await supabaseAdmin
      .from('official_notices')
      .select('content')
      .eq('id', noticeId)
      .single();
    
    const noticeContent = noticeData?.content || '';

    // Determine target users based on college and targetYear
    let query = supabaseAdmin.from('profiles').select('id').eq('status', 'active');

    if (college && college !== 'All') {
      query = query.eq('college', college);
    }

    if (targetYear && targetYear !== 'all') {
      if (targetYear === 'faculty') {
        // 'faculty' maps to the 'professor' role in the profiles table
        query = query.eq('role', 'professor');
      } else {
        // Extract the numeric year (e.g., '1st Year' -> '1', '2' -> '2')
        const yrDigit = targetYear.match(/\d/)?.[0] || targetYear.split(':')[0].trim();
        
        // Match users where study_year or academic_year is either '1' or '1st Year', etc.
        // Profiles might have it in `academic_year` (int) or `study_year` (string)
        query = query.or(`study_year.eq.${yrDigit},study_year.eq.${yrDigit}st Year,study_year.eq.${yrDigit}nd Year,study_year.eq.${yrDigit}rd Year,study_year.eq.${yrDigit}th Year,academic_year.eq.${yrDigit}`);
      }
    }

    const { data: users, error } = await query;
    if (error) throw error;

    const targetUserIds = users?.map((u) => u.id) || [];

    if (targetUserIds.length > 0) {
      const notificationService = require('../services/notifications');
      notificationService
        .notifyOfficialNotice(targetUserIds, title, noticeId, noticeContent)
        .catch(console.error);
    }

    res.json({ message: 'Notice broadcast queued', targetedUsers: targetUserIds.length });
  } catch (error) {
    console.error('Error broadcasting notice:', error);
    res.status(500).json({ error: error.message || 'Failed to broadcast notice' });
  }
});

// ── POST /api/push/preferences ───────────────────────────────────────────────
// Saves notification preferences bypassing RLS
router.post('/preferences', authMiddleware, async (req, res) => {
  try {
    const preferences = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert(
        { user_id: req.user.id, ...preferences },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[push/preferences] Supabase upsert error:', error);
      return res.status(500).json({ error: 'Failed to save preferences' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[push/preferences] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
