const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminOnlyMiddleware = require('../middleware/adminOnly');
const supabaseService = require('../services/supabase');
const emailService = require('../services/email');
const { supabaseAdmin } = require('../config/supabase');

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


// Create society
router.post('/users/society', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { email, password, name, username, college, theme_color } = req.body;
    
    // Check if username already exists
    const { data: existingUser, error: uErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Check if email already exists in profiles
    const { data: existingEmail, error: eErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Create auth user using admin API (bypasses signup limits/triggers optionally, but triggers still run)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'society',
        name,
        username,
        college,
        theme_color
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }
    
    // Ensure profile is fully updated with theme color
    const { error: updateError } = await supabaseAdmin.from('profiles').update({
       role: 'society',
       name,
       username,
       college,
       theme_color
    }).eq('id', authData.user.id);

    if (updateError) {
      // Revert created user if it fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: `Failed to update profile config: ${updateError.message}` });
    }

    // Log action
    await supabaseService.createAuditLog(req.user.id, 'create_society', { societyId: authData.user.id });

    res.json({ message: 'Society created successfully', user: authData.user });
  } catch (error) {
    console.error('Error creating society:', error);
    res.status(500).json({ error: error.message || 'Failed to create society' });
  }
});

// Create Canteen Owner Account + Canteen Shop
router.post('/users/canteen-owner', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { email, password, name, username, college, shop_name } = req.body;

    const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (existingUser) return res.status(400).json({ error: 'Username is already taken' });

    const { data: existingEmail } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle();
    if (existingEmail) return res.status(400).json({ error: 'Email is already registered' });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'canteen_owner', name, username, college }
    });

    if (authError) return res.status(400).json({ error: authError.message });

    const userId = authData.user.id;
    await supabaseAdmin.from('profiles').update({
      role: 'canteen_owner',
      name,
      username,
      college
    }).eq('id', userId);

    const { data: shop, error: shopError } = await supabaseAdmin.from('canteen_shops').insert([{
      owner_id: userId,
      name: shop_name || `${name}'s Canteen`,
      college,
      is_active: true
    }]).select().single();

    if (shopError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: `Failed to create canteen shop: ${shopError.message}` });
    }

    res.json({ message: 'Canteen owner and shop created successfully', user: authData.user, shop });
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

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'print_shop', name, username, college }
    });

    if (authError) return res.status(400).json({ error: authError.message });

    const userId = authData.user.id;
    await supabaseAdmin.from('profiles').update({
      role: 'print_shop',
      name,
      username,
      college
    }).eq('id', userId);

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
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: `Failed to create print shop: ${shopError.message}` });
    }

    res.json({ message: 'Print owner and shop created successfully', user: authData.user, shop });
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
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      
      const prefixes = [
        `campus-blink/avatars/${id}`,
        `campus-blink/covers/${id}`,
        `campus-blink/community/${id}`,
        `campus-blink/marketplace-chat/${id}`
      ];
      
      for (const prefix of prefixes) {
         await cloudinary.api.delete_resources_by_prefix(prefix).catch(() => {});
      }
    } catch(err) {
      console.error('Failed to purge cloudinary for user:', err);
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

module.exports = router;
