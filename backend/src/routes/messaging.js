const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const messagingGuard = require('../middleware/messagingGuard');
const messagingController = require('../controllers/messagingController');
const { supabaseAdmin, supabase } = require('../config/supabase');
const sbClient = supabaseAdmin || supabase;

router.use(authMiddleware);

// Privacy Preferences
router.get('/preferences', async (req, res) => {
  try {
    const { data, error } = await sbClient
      .from('user_preferences')
      .select('message_privacy')
      .eq('user_id', req.profile.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ messagePrivacy: data?.message_privacy || 'Your Followers' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

router.put('/preferences', async (req, res) => {
  try {
    const { messagePrivacy } = req.body;
    if (!['Everyone', 'Your Followers', 'Nobody'].includes(messagePrivacy)) {
      return res.status(400).json({ error: 'Invalid privacy setting' });
    }
    
    const { data: existing } = await sbClient
      .from('user_preferences')
      .select('id')
      .eq('user_id', req.profile.id)
      .maybeSingle();

    if (existing) {
      await sbClient
        .from('user_preferences')
        .update({ message_privacy: messagePrivacy, updated_at: new Date().toISOString() })
        .eq('user_id', req.profile.id);
    } else {
      await sbClient
        .from('user_preferences')
        .insert({ user_id: req.profile.id, message_privacy: messagePrivacy });
    }
    
    res.json({ messagePrivacy });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Message operations — IMPORTANT: /messages/batch MUST be before /messages/:messageId
router.delete('/messages/batch', messagingController.deleteMessagesBatch);
router.delete('/messages/:messageId', messagingController.deleteMessage);
router.put('/messages/:messageId', messagingController.editMessage);

// Conversations & Messages
router.get('/conversations', messagingController.getConversations);
router.get('/unread-count', messagingController.getUnreadCount);
router.get('/conversations/:conversationId/messages', messagingController.getMessages);
router.post('/send', messagingGuard, messagingController.sendMessage);
router.post('/conversations/:conversationId/accept', messagingController.acceptRequest);
router.delete('/conversations/:conversationId', messagingController.deleteConversation);

module.exports = router;
