const { supabaseAdmin } = require('../config/supabase');

const supabaseService = {
  // Get user profile with role
  getProfile: async (userId) => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*, colleges(*)')
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
      .select()
      .single();

    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return data;
  },

  // Get all users (admin)
  getAllUsers: async (filters = {}) => {
    let query = supabaseAdmin.from('profiles').select('*, colleges(*)');

    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.college_id) {
      query = query.eq('college_id', filters.college_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch users: ${error.message}`);
    return data;
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
      .select('*, colleges(*)')
      .eq('role', 'professor')
      .eq('professor_status', 'pending');

    if (error) throw new Error(`Failed to fetch pending professors: ${error.message}`);
    return data;
  },

  // Update professor status
  updateProfessorStatus: async (userId, status) => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ professor_status: status })
      .eq('id', userId)
      .select()
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
