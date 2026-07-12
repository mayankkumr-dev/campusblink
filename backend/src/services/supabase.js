const { supabaseAdmin } = require('../config/supabase');

const supabaseService = {
  // Get user profile with role
  getProfile: async (userId) => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      // Explicit column list for auth/session profile query:
      // id: Unique user identifier
      // email: User email address for authentication and notifications
      // name: User display name
      // username: Unique handle for the user
      // role: Authorization role determining permissions
      // professor_status: Verification status for professor accounts
      // status: Account activity status (active, suspended, etc.)
      // campus_credits: Available campus credits balance
      // cover_url: URL for profile cover banner image
      // avatar_url: URL for profile avatar image
      // college: Affiliated college or institution
      .select('id, email, name, username, role, professor_status, status, campus_credits, cover_url, avatar_url, college')
      .eq('id', userId)
      .single();

    if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
    return data;
  },

  // Update user profile
  updateProfile: async (userId, updates) => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      // Explicit column list for auth/session profile update result:
      // id: Unique user identifier
      // email: User email address
      // name: User display name
      // username: Unique handle for the user
      // role: Authorization role
      // professor_status: Professor account verification status
      // status: Account activity status
      // campus_credits: Available campus credits balance
      // cover_url: URL for profile cover banner image
      // avatar_url: URL for profile avatar image
      // college: Affiliated college or institution
      .select('id, email, name, username, role, professor_status, status, campus_credits, cover_url, avatar_url, college')
      .single();

    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return data;
  },

  // Get all users (admin)
  getAllUsers: async ({ filters = {}, page = 1, limit = 50 } = {}) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum - 1;

    let query = supabaseAdmin
      .from('profiles')
      // Explicit column list for admin user lists:
      // id: Unique user identifier for management actions
      // name: User display name for listing
      // email: User contact email address
      // username: Unique handle
      // role: Authorization role for filtering and administration
      // status: Account status (active, suspended, etc.)
      // professor_status: Verification status for professor accounts
      // campus_credits: User campus credit balance
      // created_at: Account registration timestamp for ordering/auditing
      // college: Affiliated institution name
      .select('id, name, email, username, role, status, professor_status, campus_credits, created_at, college', { count: 'exact' });

    if (filters.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }
    if (filters.college_id) {
      query = query.eq('college_id', filters.college_id);
    }
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.searchTerm) {
      query = query.or(`name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%,username.ilike.%${filters.searchTerm}%`);
    }

    const { data, error, count } = await query.range(start, end);
    if (error) throw new Error(`Failed to fetch users: ${error.message}`);

    return {
      data: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
    };
  },

  // Delete user
  deleteUser: async (userId) => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Failed to delete user: ${error.message}`);
  },

  // Get pending professor requests
  getPendingProfessors: async () => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      // Explicit column list for admin professor lists:
      // id: Unique identifier for approval/rejection actions
      // name: Professor display name
      // email: Contact email address for status notification emails
      // username: Professor unique handle
      // role: Authorization role (professor)
      // status: Account activity status
      // professor_status: Current verification status (pending)
      // campus_credits: Campus credit balance
      // created_at: Registration timestamp
      // college: Affiliated institution
      .select('id, name, email, username, role, status, professor_status, campus_credits, created_at, college')
      .eq('role', 'professor')
      .eq('professor_status', 'pending');

    if (error) throw new Error(`Failed to fetch pending professors: ${error.message}`);
    return data;
  },

  // Update professor status
  updateProfessorStatus: async (userId, status, reason) => {
    const updates = {
      professor_status: status,
      role_request_status: status,
    };
    if (status === 'rejected') {
      if (reason) updates.professor_rejection_reason = reason;
    } else if (status === 'approved') {
      updates.role = 'professor';
      updates.professor_rejection_reason = null;
      updates.professor_verified_at = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      // Explicit column list for admin professor status update result:
      // id: Unique user identifier
      // name: Professor display name
      // email: Contact email address for approval/rejection emails
      // username: Professor handle
      // role: Authorization role
      // status: Account activity status
      // professor_status: Updated verification status (approved/rejected)\n      // campus_credits: Campus credit balance
      // created_at: Registration timestamp
      // college: Affiliated institution
      .select('id, name, email, username, role, status, professor_status, campus_credits, created_at, college')
      .single();

    if (error) throw new Error(`Failed to update professor status: ${error.message}`);
    return data;
  },


  // Create audit log
  createAuditLog: async (adminId, action, details) => {
    const { error } = await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        action,
        details,
      });

    if (error) throw new Error(`Failed to create audit log: ${error.message}`);
  },
};

module.exports = supabaseService;
