const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminOnlyMiddleware = require('../middleware/adminOnly');
const emailService = require('../services/email');
const { supabaseAdmin } = require('../config/supabase');

// Send custom email (admin only)
router.post('/send', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    await emailService.sendEmail(to, subject, html);

    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

// Send professor approval email
router.post('/professor/approve', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { professorId } = req.body;

    if (!professorId) {
      return res.status(400).json({ error: 'Missing professorId' });
    }

    // Get professor details
    const { data: professor, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', professorId)
      .eq('role', 'professor')
      .single();

    if (error || !professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    await emailService.sendProfessorApproval(professor);

    res.json({ message: 'Approval email sent' });
  } catch (error) {
    console.error('Error sending approval email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

// Send professor rejection email
router.post('/professor/reject', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { professorId, reason } = req.body;

    if (!professorId || !reason) {
      return res.status(400).json({ error: 'Missing required fields: professorId, reason' });
    }

    // Get professor details
    const { data: professor, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', professorId)
      .eq('role', 'professor')
      .single();

    if (error || !professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    await emailService.sendProfessorRejection(professor, reason);

    res.json({ message: 'Rejection email sent' });
  } catch (error) {
    console.error('Error sending rejection email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

// Resend verification email
router.post('/verification', authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    // Generate verification link
    const verificationLink = `${process.env.FRONTEND_URL}/auth/verify?token=${user.id}`;

    await emailService.sendVerificationEmail(user.email, verificationLink);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

module.exports = router;
