const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// Verify token and return profile
router.post('/verify-token', authMiddleware, (req, res) => {
  try {
    res.json({
      user: req.user,
      profile: req.profile,
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Complete profile after OAuth signup
router.post('/complete-profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, avatar_url, bio, college_id } = req.body;
    const userId = req.user.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        avatar_url,
        bio,
        college_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error) {
    console.error('Error completing profile:', error);
    res.status(500).json({ error: 'Failed to complete profile' });
  }
});

// Get current session
router.get('/session', authMiddleware, (req, res) => {
  try {
    res.json({
      user: req.user,
      profile: req.profile,
      authenticated: true,
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

module.exports = router;
