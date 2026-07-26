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

  /**
   * promoteBatch — Batch-promote 1st-year students to 2nd year.
   *
   * For each row in `rows`:
   *  - Look up the active profile matching (branch, section, fromYear, rollNumber)
   *  - Validate enrollmentNumber / collegeEmail aren't already used elsewhere
   *  - On match: update profile, close roll_number_history row
   *  - On no-match or conflict: push to unmatchedRows for manual review
   *
   * Writes a batch_promotions audit record and an admin_audit_log entry.
   *
   * @returns {{ matchedCount, unmatchedCount, unmatchedRows }}
   */
  promoteBatch: async ({ adminId, branch, section, fromYear, toYear, rows }) => {
    if (!adminId || !branch || !section || !fromYear || !toYear || !Array.isArray(rows)) {
      throw new Error('Missing required fields for batch promotion');
    }

    const matchedProfiles = [];
    const unmatchedRows   = [];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    for (const row of rows) {
      const { rollNumber, enrollmentNumber, collegeEmail } = row;

      if (!rollNumber || !enrollmentNumber || !collegeEmail) {
        unmatchedRows.push({ ...row, reason: 'missing_fields' });
        continue;
      }

      // 1. Find the active profile matching this roll-slot
      const { data: profile, error: lookupErr } = await supabaseAdmin
        .from('profiles')
        .select('id, roll_number, enrollment_number, college_email, academic_year')
        .eq('branch',            branch)
        .eq('section',           section)
        .eq('academic_year',     fromYear)
        .eq('roll_number',       rollNumber)
        .eq('enrollment_status', 'active')
        .maybeSingle();

      if (lookupErr) {
        unmatchedRows.push({ ...row, reason: 'lookup_error', detail: lookupErr.message });
        continue;
      }

      if (!profile) {
        unmatchedRows.push({ ...row, reason: 'no_match' });
        continue;
      }

      // 2. Check enrollment_number isn't already used by a DIFFERENT profile
      if (enrollmentNumber) {
        const { data: enConflict } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('enrollment_number', enrollmentNumber)
          .neq('id', profile.id)
          .maybeSingle();

        if (enConflict) {
          unmatchedRows.push({ ...row, reason: 'enrollment_number_conflict' });
          continue;
        }
      }

      // 3. Check college_email isn't already used by a DIFFERENT profile
      if (collegeEmail) {
        const { data: emailConflict } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('college_email', collegeEmail)
          .neq('id', profile.id)
          .maybeSingle();

        if (emailConflict) {
          unmatchedRows.push({ ...row, reason: 'college_email_conflict' });
          continue;
        }
      }

      // 4. Update the profile: set enrollment_number, college_email, academic_year
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          enrollment_number: enrollmentNumber,
          college_email:     collegeEmail,
          academic_year:     toYear,
        })
        .eq('id', profile.id);

      if (updateErr) {
        unmatchedRows.push({ ...row, reason: 'update_failed', detail: updateErr.message });
        continue;
      }

      // 5. Close the active roll_number_history row for this profile
      await supabaseAdmin
        .from('roll_number_history')
        .update({ valid_to: today })
        .eq('profile_id', profile.id)
        .is('valid_to', null); // Only close the currently-open row

      matchedProfiles.push({ profileId: profile.id, rollNumber, enrollmentNumber, collegeEmail });
    }

    // 6. Write the batch_promotions audit record
    const { error: bpErr } = await supabaseAdmin
      .from('batch_promotions')
      .insert({
        run_by:          adminId,
        branch,
        section,
        from_year:       fromYear,
        to_year:         toYear,
        total_rows:      rows.length,
        matched_count:   matchedProfiles.length,
        unmatched_count: unmatchedRows.length,
        unmatched_rows:  unmatchedRows.length > 0 ? unmatchedRows : null,
      });

    if (bpErr) {
      console.error('[supabaseService.promoteBatch] batch_promotions insert failed:', bpErr.message);
      // Non-fatal: don't abort — data is already updated. Just warn.
    }

    // 7. Write admin_audit_log entry (consistent with all other admin actions)
    const { error } = await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        action:   'batch_promotion',
        details: {
          branch,
          section,
          from_year:       fromYear,
          to_year:         toYear,
          total_rows:      rows.length,
          matched_count:   matchedProfiles.length,
          unmatched_count: unmatchedRows.length,
        },
      });

    if (error) {
      console.error('[supabaseService.promoteBatch] admin_audit_log insert failed:', error.message);
    }

    return {
      matchedCount:   matchedProfiles.length,
      unmatchedCount: unmatchedRows.length,
      unmatchedRows,
    };
  },
};

module.exports = supabaseService;
