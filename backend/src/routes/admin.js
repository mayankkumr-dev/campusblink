const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminOnlyMiddleware = require('../middleware/adminOnly');
const supabaseService = require('../services/supabase');
const emailService = require('../services/email');
const { supabaseAdmin } = require('../config/supabase');
const s3Service = require('../services/s3');

// Get platform statistics
router.get('/stats', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { data: stats, error } = await supabaseAdmin.rpc('get_platform_stats');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});




// Create Canteen Owner Account + Canteen Shop
async function createClerkUser({ email, password, name, username, role, college }) {
  const res = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email_address: [email],
      password: password,
      first_name: name || '',
      username: username,
      skip_password_checks: true,
      skip_password_requirement: true,
      public_metadata: { role, college }
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.errors?.[0]?.message || 'Failed to create Clerk user');
  }
  return data;
}

router.post('/users/canteen-owner', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { email, password, name, username, college, shop_name } = req.body;

    const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (existingUser) return res.status(400).json({ error: 'Username is already taken' });

    const { data: existingEmail } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle();
    if (existingEmail) return res.status(400).json({ error: 'Email is already registered' });

    let clerkUser;
    try {
      clerkUser = await createClerkUser({ email, password, name, username, role: 'canteen_owner', college });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const { data: newProfile, error: profileError } = await supabaseAdmin.from('profiles').insert([{
      clerk_user_id: clerkUser.id,
      email,
      name,
      username,
      college,
      role: 'canteen_owner'
    }]).select('id').single();

    if (profileError) {
      await fetch(`https://api.clerk.com/v1/users/${clerkUser.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}` } });
      return res.status(400).json({ error: profileError.message });
    }

    const userId = newProfile.id;

    const { data: shop, error: shopError } = await supabaseAdmin.from('canteen_shops').insert([{
      owner_id: userId,
      name: shop_name || `${name}'s Canteen`,
      college,
      is_active: true
    }]).select().single();

    if (shopError) {
      await fetch(`https://api.clerk.com/v1/users/${clerkUser.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}` } });
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      return res.status(400).json({ error: `Failed to create canteen shop: ${shopError.message}` });
    }

    res.json({ message: 'Canteen owner and shop created successfully', user: { id: userId }, shop });
  } catch (error) {
    console.error('Error creating canteen owner:', error);
    res.status(500).json({ error: error.message || 'Failed to create canteen owner' });
  }
});

// Create Print Owner Account + Print Shop
router.post('/users/print-owner', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { email, password, name, username, college, shop_name } = req.body;

    const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (existingUser) return res.status(400).json({ error: 'Username is already taken' });

    const { data: existingEmail } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle();
    if (existingEmail) return res.status(400).json({ error: 'Email is already registered' });

    let clerkUser;
    try {
      clerkUser = await createClerkUser({ email, password, name, username, role: 'print_shop', college });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const { data: newProfile, error: profileError } = await supabaseAdmin.from('profiles').insert([{
      clerk_user_id: clerkUser.id,
      email,
      name,
      username,
      college,
      role: 'print_shop'
    }]).select('id').single();

    if (profileError) {
      await fetch(`https://api.clerk.com/v1/users/${clerkUser.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}` } });
      return res.status(400).json({ error: profileError.message });
    }

    const userId = newProfile.id;

    const { data: shop, error: shopError } = await supabaseAdmin.from('print_shops').insert([{
      owner_id: userId,
      name: shop_name || `${name}'s Print Shop`,
      college,
      bw_price_per_page: 2,
      color_price_per_page: 10,
      binding_charge: 20,
      is_active: true
    }]).select().single();

    if (shopError) {
      await fetch(`https://api.clerk.com/v1/users/${clerkUser.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}` } });
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      return res.status(400).json({ error: `Failed to create print shop: ${shopError.message}` });
    }

    res.json({ message: 'Print owner and shop created successfully', user: { id: userId }, shop });
  } catch (error) {
    console.error('Error creating print owner:', error);
    res.status(500).json({ error: error.message || 'Failed to create print owner' });
  }
});


// Get all users with filters
router.get('/users', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { role, college_id, status, searchTerm, page = 1, limit = 50 } = req.query;

    const filters = {};
    if (role && role !== 'all') filters.role = role;
    if (college_id) filters.college_id = college_id;
    if (status && status !== 'all') filters.status = status;
    if (searchTerm) filters.searchTerm = searchTerm;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);

    const result = await supabaseService.getAllUsers({
      filters,
      page: pageNum,
      limit: limitNum,
    });

    res.json({
      data: result.data,
      users: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Update user status or role
router.patch('/users/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, role, restrictions, ban_reason } = req.body;

    const updates = {};
    if (status) {
      updates.status = status;
      if (status === 'banned') {
        updates.ban_reason = ban_reason || '';
        updates.banned_by = req.user.id;
        updates.banned_at = new Date().toISOString();
      } else {
        updates.ban_reason = null;
        updates.banned_by = null;
        updates.banned_at = null;
      }
    }
    if (role) updates.role = role;
    if (restrictions !== undefined) updates.restrictions = restrictions;

    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      // Explicit column list for admin user update result:
      // id: Unique user identifier
      // name: User display name
      // email: User contact email address
      // username: Unique handle
      // role: User authorization role
      // status: Account activity status
      // professor_status: Verification status for professor accounts
      // campus_credits: Campus credit balance
      // created_at: Account registration timestamp
      // college: Affiliated institution name
      .select('id, name, email, username, role, status, professor_status, campus_credits, created_at, college')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log action
    await supabaseService.createAuditLog(req.user.id, 'update_user', {
      userId: id,
      updates,
    });

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    try {
      const prefixes = [
        `campus-blink/avatars/${id}`,
        `campus-blink/covers/${id}`,
        `campus-blink/community/${id}`,
        `campus-blink/marketplace-chat/${id}`,
      ];

      const s3Promises = prefixes.map(prefix => s3Service.deleteByPrefix(prefix));
      await Promise.all(s3Promises);
    } catch (err) {
      console.error('Failed to purge S3 resources for user:', err);
    }
    
    await supabaseService.deleteUser(id);

    // Log action
    await supabaseService.createAuditLog(req.user.id, 'delete_user', { userId: id });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// Get all pending professor requests
router.get('/professors/pending', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const professors = await supabaseService.getPendingProfessors();
    res.json({ professors });
  } catch (error) {
    console.error('Error fetching pending professors:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch professors' });
  }
});

// Approve professor
router.post('/professors/:id/approve', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const professor = await supabaseService.updateProfessorStatus(id, 'approved');

    // Send approval email
    await emailService.sendProfessorApproval(professor);

    // Log action
    await supabaseService.createAuditLog(req.user.id, 'approve_professor', {
      professorId: id,
    });

    res.json({ message: 'Professor approved successfully', professor });
  } catch (error) {
    console.error('Error approving professor:', error);
    res.status(500).json({ error: error.message || 'Failed to approve professor' });
  }
});

// Reject professor
router.post('/professors/:id/reject', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Professor ID required' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason required' });
    }

    const professor = await supabaseService.updateProfessorStatus(id, 'rejected', reason);

    // Send rejection email
    await emailService.sendProfessorRejection(professor, reason);

    // Log action
    await supabaseService.createAuditLog(req.user.id, 'reject_professor', {
      professorId: id,
      reason,
    });

    res.json({ message: 'Professor rejected', professor });
  } catch (error) {
    console.error('Error rejecting professor:', error);
    res.status(500).json({ error: error.message || 'Failed to reject professor' });
  }
});

// Get all audit logs
router.get('/audit-log', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const { data: logs, error } = await supabaseAdmin
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Enable/disable feature access
router.post('/feature-access', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { userId, feature, enabled } = req.body;

    if (!userId || !feature || enabled === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabaseAdmin
      .from('feature_access')
      .upsert({
        user_id: userId,
        feature,
        enabled,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log action
    await supabaseService.createAuditLog(req.user.id, 'update_feature_access', {
      userId,
      feature,
      enabled,
    });

    res.json({ message: 'Feature access updated', data });
  } catch (error) {
    console.error('Error updating feature access:', error);
    res.status(500).json({ error: 'Failed to update feature access' });
  }
});

/**
 * POST /api/admin/promote-batch
 *
 * Batch-promote students from one academic year to the next.
 * Runs through supabaseAdmin (service-role) — never exposes the key to the client.
 *
 * Body: {
 *   branch:   string,
 *   section:  string,
 *   fromYear: number,
 *   toYear:   number,
 *   rows: [{ rollNumber, enrollmentNumber, collegeEmail }]
 * }
 *
 * Returns: { matchedCount, unmatchedCount, unmatchedRows }
 */
router.post('/promote-batch', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { branch, section, fromYear, toYear, rows } = req.body;

    if (!branch || !section || !fromYear || !toYear) {
      return res.status(400).json({ error: 'branch, section, fromYear, and toYear are required' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows must be a non-empty array' });
    }

    if (rows.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 rows per promotion run' });
    }

    const result = await supabaseService.promoteBatch({
      adminId: req.user.id,
      branch,
      section,
      fromYear: Number(fromYear),
      toYear:   Number(toYear),
      rows,
    });

    res.json({
      message:        `Promotion complete: ${result.matchedCount} matched, ${result.unmatchedCount} unmatched`,
      matchedCount:   result.matchedCount,
      unmatchedCount: result.unmatchedCount,
      unmatchedRows:  result.unmatchedRows,
    });
  } catch (error) {
    console.error('Error running batch promotion:', error);
    res.status(500).json({ error: error.message || 'Failed to run batch promotion' });
  }
});

// ── POST /api/admin/push ──────────────────────────────────────────────────────
// Super-admin only: broadcast a custom FCM push notification to ALL devices.
// Body: { title: string, body: string, link: string }
// Returns: { success: true, message: string }
router.post('/push', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { title, body, link } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    // Import lazily to avoid circular dependency issues at module load time
    const { sendPushToAll } = require('../services/push');

    // Run async — do not await so the HTTP response is immediate
    sendPushToAll(title, body, link || '/').catch((err) => {
      console.error('[admin/push] sendPushToAll error:', err);
    });

    // Log action
    await supabaseService.createAuditLog(req.user.id, 'broadcast_push', {
      title,
      body,
      link: link || '/',
    });

    return res.json({
      success: true,
      message: 'Broadcast queued — all subscribed devices will receive the notification.',
    });
  } catch (error) {
    console.error('Error broadcasting push:', error);
    res.status(500).json({ error: error.message || 'Failed to broadcast push' });
  }
});

module.exports = router;

