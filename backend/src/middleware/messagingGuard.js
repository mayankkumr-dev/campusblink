const { supabaseAdmin, supabase } = require('../config/supabase');
const sbClient = supabaseAdmin || supabase;

const messagingGuard = async (req, res, next) => {
  try {
    const senderRole = req.profile.role;
    // receiverId is usually passed in the body for POST or in params for GET
    const receiverId = req.body.receiverId || req.params.receiverId;

    if (!receiverId) {
      return next(); // Let the controller handle missing receiverId
    }

    // Fetch receiver profile
    const { data: receiverProfile, error } = await sbClient
      .from('profiles')
      .select('role')
      .eq('id', receiverId)
      .single();

    if (error || !receiverProfile) {
      return res.status(404).json({ error: 'Receiver profile not found' });
    }

    const receiverRole = receiverProfile.role;

    // Strict role-based blocking: Student <-> Professor
    if (
      (senderRole === 'student' && receiverRole === 'professor') ||
      (senderRole === 'professor' && receiverRole === 'student')
    ) {
      return res.status(403).json({ 
        error: 'Messaging between students and professors is not allowed.' 
      });
    }

    // Attach receiver role to request for downstream use if needed
    req.receiverRole = receiverRole;

    next();
  } catch (err) {
    console.error('[messagingGuard] Error:', err);
    res.status(500).json({ error: 'Internal server error checking messaging permissions' });
  }
};

module.exports = messagingGuard;
