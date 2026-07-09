import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/pushNotifications';

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const OWNER_EMAILS = ['contactus.mayank@gmail.com', 'itsmayank@gmail.com'];

function randomGroup() {
  return Array.from({ length: 4 }, () => INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)]).join('');
}

export function generateInviteCode() {
  return `CB-${randomGroup()}-${randomGroup()}`;
}

export function formatInviteCodeInput(value) {
  const cleaned = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const withoutPrefix = cleaned.startsWith('CB') ? cleaned.slice(2) : cleaned;
  const first = withoutPrefix.slice(0, 4);
  const second = withoutPrefix.slice(4, 8);

  if (second) return `CB-${first}-${second}`;
  if (first) return `CB-${first}`;
  if (cleaned.startsWith('CB')) return 'CB-';
  return '';
}

export function normalizeInviteCode(value) {
  const formatted = formatInviteCodeInput(value);
  if (!formatted) return '';

  const pieces = formatted.split('-').filter(Boolean);
  if (pieces.length !== 3) return formatted;
  return `CB-${pieces[1]}-${pieces[2]}`;
}

function normalizeSupabaseError(error) {
  if (!error) return null;
  return error?.message || error?.error_description || String(error);
}

async function getProfileById(id) {
  if (!id) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, name, username, email, avatar_url, created_at')
    .eq('id', id)
    .maybeSingle();
  return data || null;
}

async function insertInviteCodeRow(row) {
  const { data, error } = await supabase
    .from('invite_codes')
    .insert([row])
    .select('*')
    .single();

  return { data, error };
}

async function createCodesWithRetry(rows, maxAttempts = 8) {
  let attempts = 0;
  const created = [];

  while (attempts < maxAttempts && created.length < rows.length) {
    const target = rows[created.length];
    const nextRow = {
      ...target,
      code: generateInviteCode(),
    };

    const { data, error } = await insertInviteCodeRow(nextRow);
    if (!error && data) {
      created.push(data);
      continue;
    }

    const isDuplicate = String(error?.message || '').toLowerCase().includes('duplicate key');
    attempts += 1;
    if (!isDuplicate) {
      throw error;
    }
  }

  if (created.length !== rows.length) {
    throw new Error('Could not generate unique invite code. Please retry.');
  }

  return created;
}

export async function validateInviteCode(inputCode) {
  try {
    const code = normalizeInviteCode(inputCode);
    if (!/^CB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return { data: null, error: 'Invalid invite code format.' };
    }

    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code)
      .eq('is_used', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { data: null, error: 'Invalid or expired invite code.' };

    const inviter = await getProfileById(data.created_by);

    return {
      data: {
        ...data,
        inviter,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not validate invite code.' };
  }
}

export async function ensureInitialInviteCodes(userId) {
  try {
    if (!userId) return { data: [], error: 'Missing user id.' };

    const [{ count }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from('invite_codes').select('id', { count: 'exact', head: true }).eq('created_by', userId),
      supabase.from('profiles').select('id, invites_available').eq('id', userId).single(),
    ]);

    if (profileError) throw profileError;
    if ((count || 0) > 0) return { data: [], error: null };

    const available = Number(profile?.invites_available ?? 2);
    if (available <= 0) return { data: [], error: null };

    const codes = await createCodesWithRetry([
      { created_by: userId, is_admin_generated: false },
      { created_by: userId, is_admin_generated: false },
    ]);

    await supabase
      .from('profiles')
      .update({ invites_available: 2, next_invite_refresh_at: null })
      .eq('id', userId);

    return { data: codes, error: null };
  } catch (error) {
    return { data: [], error: normalizeSupabaseError(error) || 'Could not generate initial invite codes.' };
  }
}

export async function getMyInviteOverview(userId) {
  try {
    if (!userId) return { data: null, error: 'Missing user id.' };

    await ensureInitialInviteCodes(userId);

    const [{ data: profile, error: profileError }, { data: codes, error: codeError }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, invites_given, invites_available, next_invite_refresh_at')
        .eq('id', userId)
        .single(),
      supabase
        .from('invite_codes')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false }),
    ]);

    if (profileError) throw profileError;
    if (codeError) throw codeError;

    const usedIds = Array.from(new Set((codes || []).map((item) => item.used_by).filter(Boolean)));
    const usedProfiles = usedIds.length
      ? (await supabase.from('profiles').select('id, name, avatar_url').in('id', usedIds)).data || []
      : [];

    const usedMap = new Map(usedProfiles.map((item) => [item.id, item]));
    const nowTs = Date.now();

    const allCodes = (codes || []).map((item) => {
      const usedByProfile = item.used_by ? usedMap.get(item.used_by) || null : null;
      const expiresTs = item.expires_at ? new Date(item.expires_at).getTime() : null;
      const isExpired = Boolean(expiresTs && expiresTs <= nowTs);
      return {
        ...item,
        isExpired,
        usedByProfile,
      };
    });

    const availableCodes = allCodes.filter((item) => !item.is_used && !item.isExpired).slice(0, 2);
    const usedCodes = allCodes.filter((item) => item.is_used);

    return {
      data: {
        profile,
        availableCodes,
        usedCodes,
        allCodes,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not load invite data.' };
  }
}

export async function consumeInviteCodeOnSignup({ code, newUserId, newUserName }) {
  try {
    const normalizedCode = normalizeInviteCode(code);
    if (!normalizedCode || !newUserId) {
      return { data: null, error: 'Missing invite details.' };
    }

    const { data: inviteRow, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!inviteRow) return { data: null, error: 'Invite code does not exist.' };
    if (inviteRow.is_used) {
      // Idempotency: if this user already consumed the code earlier, treat as success.
      if (inviteRow.used_by && inviteRow.used_by === newUserId) {
        return {
          data: {
            inviteCode: normalizedCode,
            inviterId: inviteRow.created_by || null,
          },
          error: null,
        };
      }
      return { data: null, error: 'Invite code is already used.' };
    }
    if (inviteRow.expires_at && new Date(inviteRow.expires_at).getTime() <= Date.now()) {
      return { data: null, error: 'Invite code has expired.' };
    }

    const { error: markUsedError } = await supabase
      .from('invite_codes')
      .update({
        is_used: true,
        used_by: newUserId,
        used_at: new Date().toISOString(),
      })
      .eq('id', inviteRow.id)
      .eq('is_used', false);

    if (markUsedError) throw markUsedError;

    if (inviteRow.created_by) {
      await supabase
        .from('profiles')
        .update({
          invited_by: inviteRow.created_by,
          invite_code_used: normalizedCode,
        })
        .eq('id', newUserId);

      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('invites_given')
        .eq('id', inviteRow.created_by)
        .maybeSingle();

      const nextGiven = Number(inviterProfile?.invites_given || 0) + 1;

      const { count: remainingCount } = await supabase
        .from('invite_codes')
        .select('id', { head: true, count: 'exact' })
        .eq('created_by', inviteRow.created_by)
        .eq('is_used', false)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      const hasRemaining = Number(remainingCount || 0) > 0;

      await supabase
        .from('profiles')
        .update({
          invites_given: nextGiven,
          invites_available: hasRemaining ? Number(remainingCount || 0) : 0,
          next_invite_refresh_at: hasRemaining ? null : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', inviteRow.created_by);

      const notificationTitle = 'Invite used successfully';
      const joinedName = String(newUserName || 'A new user').trim() || 'A new user';

      await supabase.from('notifications').insert([
        {
          user_id: inviteRow.created_by,
          type: 'invite_joined',
          title: '⭐ +20 Reputation! Your friend joined.',
          message: `⭐ ${joinedName} joined Campus Blink using your invite code. +20 Reputation added!`,
          link: '/student/profile',
        },
      ]);

      await sendPushNotification(inviteRow.created_by, {
        type: 'reputation_earned',
        title: '⭐ +20 Reputation! Your friend joined.',
        body: `⭐ ${joinedName} joined Campus Blink using your invite code. +20 Reputation added!`,
        url: '/student/profile',
        important: false,
      }).catch(() => {});
    }

    return {
      data: {
        inviteCode: normalizedCode,
        inviterId: inviteRow.created_by || null,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not consume invite code.' };
  }
}

export async function requestInviteRefresh(userId) {
  try {
    if (!userId) return { data: null, error: 'Missing user id.' };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, invites_available, next_invite_refresh_at')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const existingAvailable = Number(profile?.invites_available || 0);
    if (existingAvailable > 0) {
      return { data: { alreadyAvailable: true }, error: null };
    }

    const refreshAt = profile?.next_invite_refresh_at ? new Date(profile.next_invite_refresh_at).getTime() : null;
    if (refreshAt && refreshAt > Date.now()) {
      return { data: { lockedUntil: profile.next_invite_refresh_at }, error: 'Invites are still cooling down.' };
    }

    const codes = await createCodesWithRetry([
      { created_by: userId, is_admin_generated: false },
      { created_by: userId, is_admin_generated: false },
    ]);

    await supabase
      .from('profiles')
      .update({ invites_available: 2, next_invite_refresh_at: null })
      .eq('id', userId);

    return { data: { codes }, error: null };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not refresh invite codes.' };
  }
}

export async function getInviteTree(profileId) {
  try {
    if (!profileId) return { data: null, error: 'Missing profile id.' };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, invited_by')
      .eq('id', profileId)
      .single();

    if (profileError) throw profileError;

    const inviter = profile?.invited_by ? await getProfileById(profile.invited_by) : null;

    const { data: invitees, error: inviteesError } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url, created_at, invite_code_used')
      .eq('invited_by', profileId)
      .order('created_at', { ascending: false });

    if (inviteesError) throw inviteesError;

    return {
      data: {
        inviter,
        invitees: invitees || [],
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not load invite tree.' };
  }
}

export async function getLandingSocialProof() {
  try {
    const { count, error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' });
    if (error) throw error;
    return { data: { totalStudents: count || 0 }, error: null };
  } catch (error) {
    return { data: { totalStudents: 0 }, error: normalizeSupabaseError(error) || 'Could not load student count.' };
  }
}

export async function joinWaitlist(payload) {
  try {
    const { name, email, college } = payload || {};
    if (!name || !email) {
      return { data: null, error: 'Name and email are required.' };
    }

    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        {
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          college: String(college || '').trim() || null,
        },
      ])
      .select('*')
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not join waitlist.' };
  }
}

function isAdminProfile(profile) {
  const email = String(profile?.email || '').toLowerCase();
  return profile?.role === 'admin' || OWNER_EMAILS.includes(email);
}

function getExpiryValue(expiryOption) {
  if (!expiryOption || expiryOption === 'none') return null;
  const now = Date.now();
  if (expiryOption === '24h') return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  if (expiryOption === '7d') return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (expiryOption === '30d') return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
  const parsed = new Date(expiryOption);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function getAdminInviteStats(adminProfile) {
  try {
    if (!isAdminProfile(adminProfile)) return { data: null, error: 'Admin access required.' };

    const [totalCodes, usedCodes, pendingCodes, invitedUsers] = await Promise.all([
      supabase.from('invite_codes').select('id', { head: true, count: 'exact' }),
      supabase.from('invite_codes').select('id', { head: true, count: 'exact' }).eq('is_used', true),
      supabase.from('invite_codes').select('id', { head: true, count: 'exact' }).eq('is_used', false),
      supabase.from('profiles').select('id', { head: true, count: 'exact' }).not('invited_by', 'is', null),
    ]);

    return {
      data: {
        totalCodes: totalCodes.count || 0,
        usedCodes: usedCodes.count || 0,
        pendingCodes: pendingCodes.count || 0,
        invitedUsers: invitedUsers.count || 0,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not load invite stats.' };
  }
}

export async function getAdminInviteCodes(adminProfile, options = {}) {
  try {
    if (!isAdminProfile(adminProfile)) return { data: [], error: 'Admin access required.' };

    const { filter = 'all', search = '' } = options;

    let query = supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filter === 'used') query = query.eq('is_used', true);
    if (filter === 'available') query = query.eq('is_used', false);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const userIds = Array.from(new Set(rows.flatMap((item) => [item.created_by, item.used_by]).filter(Boolean)));
    const users = userIds.length
      ? (await supabase.from('profiles').select('id, name, email, avatar_url').in('id', userIds)).data || []
      : [];

    const userMap = new Map(users.map((item) => [item.id, item]));
    const now = Date.now();

    const merged = rows
      .map((item) => ({
        ...item,
        createdByUser: item.created_by ? userMap.get(item.created_by) || null : null,
        usedByUser: item.used_by ? userMap.get(item.used_by) || null : null,
        isExpired: Boolean(item.expires_at && new Date(item.expires_at).getTime() <= now),
      }))
      .filter((item) => {
        if (!search.trim()) return true;
        const term = search.trim().toLowerCase();
        return (
          String(item.code || '').toLowerCase().includes(term) ||
          String(item.createdByUser?.name || '').toLowerCase().includes(term) ||
          String(item.createdByUser?.email || '').toLowerCase().includes(term) ||
          String(item.usedByUser?.name || '').toLowerCase().includes(term) ||
          String(item.usedByUser?.email || '').toLowerCase().includes(term)
        );
      })
      .filter((item) => {
        if (filter === 'expired') return item.isExpired;
        return true;
      });

    return { data: merged, error: null };
  } catch (error) {
    return { data: [], error: normalizeSupabaseError(error) || 'Could not load invite codes.' };
  }
}

export async function adminGenerateInvitesForUser(adminProfile, params) {
  try {
    if (!isAdminProfile(adminProfile)) return { data: null, error: 'Admin access required.' };

    const targetUserId = params?.targetUserId;
    const count = Math.max(1, Math.min(100, Number(params?.count || 1)));
    const expiresAt = getExpiryValue(params?.expiry);

    if (!targetUserId) return { data: null, error: 'Target user is required.' };

    const rows = Array.from({ length: count }, () => ({
      created_by: targetUserId,
      is_admin_generated: true,
      expires_at: expiresAt,
      note: params?.note || null,
    }));

    const created = await createCodesWithRetry(rows, count * 10);

    const { data: profile } = await supabase
      .from('profiles')
      .select('invites_available')
      .eq('id', targetUserId)
      .maybeSingle();

    const nextAvailable = Number(profile?.invites_available || 0) + count;

    await supabase
      .from('profiles')
      .update({
        invites_available: nextAvailable,
        next_invite_refresh_at: null,
      })
      .eq('id', targetUserId);

    return { data: created, error: null };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not generate codes.' };
  }
}

export async function adminGenerateBulkInvites(adminProfile, params) {
  try {
    if (!isAdminProfile(adminProfile)) return { data: null, error: 'Admin access required.' };

    const count = Math.max(1, Math.min(100, Number(params?.count || 1)));
    const expiresAt = getExpiryValue(params?.expiry);

    const rows = Array.from({ length: count }, () => ({
      created_by: null,
      is_admin_generated: true,
      expires_at: expiresAt,
      note: params?.note || null,
    }));

    const created = await createCodesWithRetry(rows, count * 10);
    return { data: created, error: null };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not generate bulk codes.' };
  }
}

export async function revokeInviteCode(adminProfile, inviteId) {
  try {
    if (!isAdminProfile(adminProfile)) return { data: null, error: 'Admin access required.' };

    const { data, error } = await supabase
      .from('invite_codes')
      .update({
        expires_at: new Date().toISOString(),
      })
      .eq('id', inviteId)
      .select('*')
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not revoke invite code.' };
  }
}

export async function getWaitlist(adminProfile) {
  try {
    if (!isAdminProfile(adminProfile)) return { data: [], error: 'Admin access required.' };

    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: normalizeSupabaseError(error) || 'Could not load waitlist.' };
  }
}

export async function sendInviteToWaitlist(adminProfile, waitlistId, params = {}) {
  try {
    if (!isAdminProfile(adminProfile)) return { data: null, error: 'Admin access required.' };

    const { data: row, error: rowError } = await supabase
      .from('waitlist')
      .select('*')
      .eq('id', waitlistId)
      .single();

    if (rowError) throw rowError;

    const expiresAt = getExpiryValue(params?.expiry || '7d');

    const created = await createCodesWithRetry([
      {
        created_by: null,
        is_admin_generated: true,
        expires_at: expiresAt,
        note: params?.note || `Waitlist invite for ${row.email}`,
      },
    ]);

    await supabase
      .from('waitlist')
      .update({
        is_invited: true,
        invited_at: new Date().toISOString(),
      })
      .eq('id', waitlistId);

    return { data: { code: created[0]?.code, waitlist: row }, error: null };
  } catch (error) {
    return { data: null, error: normalizeSupabaseError(error) || 'Could not generate waitlist invite.' };
  }
}
