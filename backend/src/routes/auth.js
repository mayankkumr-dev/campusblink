const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
// Note: Custom /register, /login, and /logout routes have been removed.
// Authentication is handled exclusively by Supabase Auth.

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

// Verify email address with token
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    const { data: record, error: fetchError } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !record) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    if (new Date(record.expires_at) < new Date()) {
      await supabaseAdmin
        .from('email_verification_tokens')
        .delete()
        .eq('token', token);
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Mark user as verified
    await supabaseAdmin.auth.admin.updateUserById(record.user_id, {
      email_confirm: true,
    });

    // Clean up consumed token
    await supabaseAdmin
      .from('email_verification_tokens')
      .delete()
      .eq('token', token);

    res.json({ message: 'Email verified successfully', verified: true });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: error.message || 'Failed to verify email' });
  }
});

module.exports = router;
