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
    // 1. Free up the username by renaming it
    await supabaseAdmin
      .from('profiles')
      .update({ username: `deleted-${userId}-${Date.now()}` })
      .eq('id', userId);

    // 2. Fetch the clerk_user_id from the profile before deleting it
    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('clerk_user_id')
      .eq('id', userId)
      .maybeSingle();

    // 3. Manually cascade delete all related data to satisfy foreign keys
    
    // Posts and their relations
    const { data: userPosts } = await supabaseAdmin.from('posts').select('id').eq('author_id', userId);
    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map(p => p.id);
      await Promise.all([
        supabaseAdmin.from('comments').delete().in('post_id', postIds),
        supabaseAdmin.from('post_likes').delete().in('post_id', postIds),
        supabaseAdmin.from('bookmarks').delete().in('post_id', postIds),
        supabaseAdmin.from('official_notices').delete().in('post_id', postIds)
      ]);
      await supabaseAdmin.from('posts').delete().eq('author_id', userId);
    }

    // Comments and their relations
    const { data: userComments } = await supabaseAdmin.from('comments').select('id').eq('author_id', userId);
    if (userComments && userComments.length > 0) {
      const commentIds = userComments.map(c => c.id);
      await supabaseAdmin.from('comment_likes').delete().in('comment_id', commentIds);
      await supabaseAdmin.from('comments').delete().eq('author_id', userId);
    }

    // Diaries and their relations
    const { data: userDiaries } = await supabaseAdmin.from('diaries').select('id').eq('author_id', userId);
    if (userDiaries && userDiaries.length > 0) {
      const diaryIds = userDiaries.map(d => d.id);
      await Promise.all([
        supabaseAdmin.from('diary_entries').delete().in('diary_id', diaryIds),
        supabaseAdmin.from('diary_bookmarks').delete().in('diary_id', diaryIds)
      ]);
      await supabaseAdmin.from('diaries').delete().eq('author_id', userId);
    }
    
    // Remaining diary entries (if any)
    await supabaseAdmin.from('diary_entries').delete().eq('author_id', userId);

    // Listings and their relations
    const { data: userListings } = await supabaseAdmin.from('listings').select('id').eq('seller_id', userId);
    if (userListings && userListings.length > 0) {
      const listingIds = userListings.map(l => l.id);
      await supabaseAdmin.from('listing_messages').delete().in('listing_id', listingIds);
      await supabaseAdmin.from('wishlists').delete().in('listing_id', listingIds);
      await supabaseAdmin.from('listings').delete().eq('seller_id', userId);
    }

    // Conversations and DMs
    const { data: userConversations } = await supabaseAdmin.from('conversations').select('id').or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
    if (userConversations && userConversations.length > 0) {
      const convIds = userConversations.map(c => c.id);
      await supabaseAdmin.from('direct_messages').delete().in('conversation_id', convIds);
      await supabaseAdmin.from('conversations').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
    }
    
    // Stray DMs (e.g. from listing messages if they use sender_id)
    await supabaseAdmin.from('direct_messages').delete().eq('sender_id', userId);
    await supabaseAdmin.from('direct_messages').delete().eq('receiver_id', userId);
    await supabaseAdmin.from('listing_messages').delete().eq('sender_id', userId);

    // Delete standalone direct dependencies
    const dependencies = [
      { table: 'post_likes', col: 'user_id' },
      { table: 'comment_likes', col: 'user_id' },
      { table: 'notifications', col: 'user_id' },
      { table: 'notifications', col: 'actor_id' },
      { table: 'notification_preferences', col: 'user_id' },
      { table: 'follows', col: 'follower_id' },
      { table: 'follows', col: 'following_id' },
      { table: 'bookmarks', col: 'user_id' },
      { table: 'wishlists', col: 'user_id' },
      { table: 'canteen_orders', col: 'user_id' },
      { table: 'print_orders', col: 'user_id' },
      { table: 'community_reports', col: 'reporter_id' },
      { table: 'community_reports', col: 'reported_user_id' },
      { table: 'marketplace_reports', col: 'reporter_id' },
      { table: 'marketplace_reports', col: 'reported_user_id' },
      { table: 'reports', col: 'reporter_id' },
      { table: 'reports', col: 'reported_user_id' },
      { table: 'diary_bookmarks', col: 'user_id' },
      { table: 'profile_social_links', col: 'profile_id' },
      { table: 'push_subscriptions', col: 'user_id' },
      { table: 'user_restrictions', col: 'user_id' },
      { table: 'professor_requests', col: 'user_id' },
      { table: 'professor_pending_payments', col: 'user_id' },
      { table: 'admin_audit_log', col: 'admin_id' },
      { table: 'admin_email_log', col: 'admin_id' },
      { table: 'app_feedback', col: 'user_id' },
      { table: 'feedback', col: 'user_id' },
      { table: 'contact_issues', col: 'user_id' }
    ];

    const deletePromises = dependencies.map(({ table, col }) => 
      supabaseAdmin.from(table).delete().eq(col, userId)
    );
    await Promise.all(deletePromises);

    // 4. Delete the user from Clerk (if they have a Clerk account)
    if (profileRow?.clerk_user_id) {
      const clerkRes = await fetch(
        `https://api.clerk.com/v1/users/${profileRow.clerk_user_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
          },
        }
      );
      if (!clerkRes.ok) {
        const errBody = await clerkRes.json().catch(() => ({}));
        // 404 means already deleted — that's fine
        if (clerkRes.status !== 404) {
          throw new Error(`Failed to delete Clerk user: ${errBody?.errors?.[0]?.message || clerkRes.status}`);
        }
      }
    }

    // 5. Delete the profile row from Supabase
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
      
    if (profileDeleteError) {
      throw new Error(`Failed to delete profile: ${profileDeleteError.message}`);
    }
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
