const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
// Note: Custom /register, /login, and /logout routes have been removed.
// Authentication is handled exclusively by Supabase Auth.

// ---------------------------------------------------------------------------
// POST /api/auth/complete-signup
// ---------------------------------------------------------------------------
// Called from the frontend after Clerk OTP verification is complete.
// Uses the Supabase service-role key (bypasses RLS) to:
//   1. Insert the profiles row for the new user
//   2. Mark the invite code as used
//
// Why not do this directly from the client?
//   When a brand new user's Clerk JWT is used with Supabase RLS, auth.uid()
//   must map the Clerk `sub` (e.g. "user_2xyz...") to a profiles UUID. But
//   the profile row doesn't exist yet — so auth.uid() returns NULL and the
//   RLS INSERT policy rejects the request (403). The backend service-role
//   client bypasses RLS completely, breaking the chicken-and-egg cycle.
// ---------------------------------------------------------------------------
router.post('/complete-signup', async (req, res) => {
  try {
    const {
      clerkUserId,
      email,
      name,
      username,
      college,
      study_year,
      branch,
      section,
      role,
      inviteCode,
    } = req.body;

    if (!clerkUserId || !email) {
      return res.status(400).json({ error: 'clerkUserId and email are required.' });
    }

    // ── 1. Upsert the profile row ──────────────────────────────────────────
    // Use upsert so that if the Clerk webhook already created a stub row,
    // we simply fill in the missing fields.
    const profileId = require('crypto').randomUUID();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id:            profileId,
          clerk_user_id: clerkUserId,
          clerk_id:      clerkUserId,
          email,
          name:          name || email.split('@')[0],
          username:      username || null,
          college:       college || null,
          study_year:    study_year || null,
          branch:        branch || null,
          section:       section || null,
          role:          role || 'student',
        },
        {
          // If a row with this clerk_user_id already exists (e.g. from the webhook),
          // update only the fields that are missing/null.
          onConflict: 'clerk_user_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (profileError) {
      // If onConflict upsert failed, try a plain insert (some Supabase versions need this)
      const { data: insertedProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          clerk_user_id: clerkUserId,
          clerk_id:      clerkUserId,
          email,
          name:          name || email.split('@')[0],
          username:      username || null,
          college:       college || null,
          study_year:    study_year || null,
          branch:        branch || null,
          section:       section || null,
          role:          role || 'student',
        })
        .select('id')
        .single();

      if (insertError) {
        // Last resort: maybe the row exists already from the Clerk webhook — fetch it
        const { data: existingProfile, error: fetchError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('clerk_user_id', clerkUserId)
          .maybeSingle();

        if (fetchError || !existingProfile) {
          console.error('[complete-signup] Profile insert failed:', insertError, profileError);
          return res.status(500).json({
            error: 'Failed to create profile.',
            details: profileError?.message || insertError?.message,
          });
        }

        // Row already exists — update it with the signup data
        await supabaseAdmin
          .from('profiles')
          .update({
            email,
            name:       name || email.split('@')[0],
            username:   username || null,
            college:    college || null,
            study_year: study_year || null,
            branch:     branch || null,
            section:    section || null,
            role:       role || 'student',
          })
          .eq('clerk_user_id', clerkUserId);

        var resolvedProfileId = existingProfile.id;
      } else {
        var resolvedProfileId = insertedProfile.id;
      }
    } else {
      var resolvedProfileId = profile?.id || profileId;
    }

    // ── 2. Consume the invite code ─────────────────────────────────────────
    if (inviteCode) {
      try {
        const normalizedCode = String(inviteCode).trim().toUpperCase();

        // Fetch the invite row (anon-accessible due to RLS select policy)
        const { data: inviteRow } = await supabaseAdmin
          .from('invite_codes')
          .select('*')
          .eq('code', normalizedCode)
          .maybeSingle();

        if (inviteRow && !inviteRow.is_used) {
          // Mark as used — service role bypasses RLS
          await supabaseAdmin
            .from('invite_codes')
            .update({
              is_used:  true,
              used_by:  resolvedProfileId,
              used_at:  new Date().toISOString(),
            })
            .eq('id', inviteRow.id)
            .eq('is_used', false);

          // Update the new user's profile with invited_by / invite_code_used
          if (inviteRow.created_by) {
            await supabaseAdmin
              .from('profiles')
              .update({
                invited_by:       inviteRow.created_by,
                invite_code_used: normalizedCode,
              })
              .eq('id', resolvedProfileId);

            // Increment inviter's invites_given counter
            const { data: inviterProfile } = await supabaseAdmin
              .from('profiles')
              .select('invites_given')
              .eq('id', inviteRow.created_by)
              .maybeSingle();

            const nextGiven = Number(inviterProfile?.invites_given || 0) + 1;

            // Count remaining unused codes for the inviter
            const { count: remainingCount } = await supabaseAdmin
              .from('invite_codes')
              .select('id', { head: true, count: 'exact' })
              .eq('created_by', inviteRow.created_by)
              .eq('is_used', false);

            await supabaseAdmin
              .from('profiles')
              .update({
                invites_given:     nextGiven,
                invites_available: Number(remainingCount || 0),
                next_invite_refresh_at:
                  Number(remainingCount || 0) > 0
                    ? null
                    : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
              })
              .eq('id', inviteRow.created_by);

            // Insert notification for the inviter
            await supabaseAdmin.from('notifications').insert([
              {
                user_id: inviteRow.created_by,
                type:    'invite_joined',
                title:   '⭐ +20 Reputation! Your friend joined.',
                message: `⭐ ${name || 'A new user'} joined Campus Blink using your invite code. +20 Reputation added!`,
                link:    '/student/profile',
              },
            ]);
          }
        }
      } catch (inviteErr) {
        // Invite consumption is non-critical — log but don't fail the signup
        console.error('[complete-signup] Invite consumption error (non-fatal):', inviteErr);
      }
    }

    return res.json({
      ok:        true,
      profileId: resolvedProfileId,
    });
  } catch (error) {
    console.error('[complete-signup] Unexpected error:', error);
    return res.status(500).json({ error: 'Signup completion failed.' });
  }
});

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

// Heal ghost account
router.post('/heal-ghost', authMiddleware, async (req, res) => {
  try {
    const clerkUserId = req.user.id;
    // Confirm profile doesn't exist (ghost account check)
    const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('clerk_user_id', clerkUserId).maybeSingle();
    
    if (!profile) {
      // Proceed to delete the Clerk account
      const clerkRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`
        }
      });
      
      if (!clerkRes.ok) {
        console.error('Failed to delete clerk ghost account:', await clerkRes.text());
        return res.status(500).json({ error: 'Failed to delete ghost account from Clerk' });
      }
      
      return res.json({ message: 'Ghost account deleted successfully' });
    }
    
    return res.status(400).json({ error: 'Not a ghost account, profile exists' });
  } catch (error) {
    console.error('Error healing ghost account:', error);
    res.status(500).json({ error: 'Failed to heal ghost account' });
  }
});

module.exports = router;
