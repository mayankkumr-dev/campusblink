const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { sendPushToUser } = require('../services/push');

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

module.exports = router;