import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cloudinary';
import { getFirstName } from '../lib/user';
import { consumeInviteCodeOnSignup } from './invites';

const ADMIN_OWNER_EMAIL = 'contactus.mayank@gmail.com';
const DEFAULT_BANNER_IMAGE_URL = '/banner-background.png';

function normalizeName(value) {
  return (value || '').trim().replace(/\s+/g, ' ');
}

function normalizeUsername(value) {
  const cleaned = (value || '').trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return cleaned || null;
}

function validateUsernameFormat(value) {
  if (!value) {
    return 'Username is required.';
  }

  if (!/^[a-z0-9._]{3,20}$/.test(value)) {
    return 'Use 3-20 letters, numbers, dots, or underscores.';
  }

  return null;
}

function normalizeCollege(value) {
  const cleaned = (value || '').trim().replace(/\s+/g, ' ');
  return cleaned || null;
}

function isProfilesPolicyRecursion(error) {
  const message = error?.message?.toLowerCase?.() || '';
  return message.includes('infinite recursion detected in policy for relation "profiles"');
}

// During signup with email confirmation enabled, auth.uid() is null so the
// INSERT RLS policy ("auth.uid() = id") rejects the upsert. The DB trigger
// handle_new_user_with_username() (SECURITY DEFINER) creates the row instead,
// so this client-side failure is safe to ignore at signup time.
function isProfilesRLSViolation(error) {
  const message = error?.message?.toLowerCase?.() || '';
  return (
    message.includes('violates row-level security policy') ||
    message.includes('new row violates row-level security')
  );
}

function isProfilesServerFailure(error) {
  const message = error?.message?.toLowerCase?.() || '';
  const details = error?.details?.toLowerCase?.() || '';
  return (
    error?.status === 500 ||
    message.includes('internal server error') ||
    message.includes('failed to fetch') ||
    message.includes('500') ||
    details.includes('infinite recursion')
  );
}

function buildFallbackProfile(user, fallback = {}) {
  const resolvedName = normalizeName(fallback.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student');
  const resolvedUsername = normalizeUsername(fallback.username || user.user_metadata?.username || null);
  const resolvedCollege = normalizeCollege(fallback.college || user.user_metadata?.college || null);

  return {
    id: user.id,
    email: user.email,
    name: resolvedName,
    username: resolvedUsername,
    college: resolvedCollege,
    role: fallback.role || 'student',
    campus_credits: fallback.campus_credits ?? 0,
    cover_url: fallback.cover_url || user.user_metadata?.cover_url || DEFAULT_BANNER_IMAGE_URL,
  };
}

async function ensureProfile(user, fallback = {}) {
  if (!user?.id) return { data: null, error: new Error('Missing user id') };

  const payload = buildFallbackProfile(user, fallback);

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    if (isProfilesPolicyRecursion(error)) {
      return { data: payload, error: null };
    }
    return { data: null, error };
  }

  return { data, error: null };
}

export async function checkUsernameAvailability(username) {
  try {
    const normalizedUsername = normalizeUsername(username);
    const validationError = validateUsernameFormat(normalizedUsername);

    if (validationError) {
      return {
        data: {
          available: false,
          normalizedUsername,
          message: validationError,
        },
        error: null,
      };
    }

    const { data, error } = await supabase.rpc('check_username_availability', {
      candidate_username: normalizedUsername,
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    return {
      data: {
        available: Boolean(result?.available),
        normalizedUsername: result?.normalized_username || normalizedUsername,
        message: result?.message || '',
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function signUp(email, password, name, college, username = '', inviteContext) {
  try {
    const normalizedName = normalizeName(name);
    const normalizedCollege = normalizeCollege(college);
    const normalizedUsername = normalizeUsername(username);
    const firstName = getFirstName(normalizedName);
    const usernameValidationError = validateUsernameFormat(normalizedUsername);

    if (usernameValidationError) {
      throw new Error(usernameValidationError);
    }

    const { data: usernameAvailability, error: usernameError } = await checkUsernameAvailability(normalizedUsername);
    if (usernameError) throw usernameError;

    if (!usernameAvailability?.available) {
      throw new Error(usernameAvailability?.message || 'This username is already taken.');
    }

    // Detect if user is already registered but unverified (avoids burning email rate limit on retry).
    const { data: existingSignIn } = await supabase.auth.signInWithPassword({ email, password });
    if (existingSignIn?.user) {
      // User exists and password matches — account is already created.
      // If not confirmed, sign them back out and tell them to verify.
      if (!existingSignIn.user.email_confirmed_at) {
        await supabase.auth.signOut();
        const pendingError = new Error(
          'You already have an account waiting for email confirmation. ' +
          'Please check your inbox (and spam folder) for the verification link. ' +
          'If the link expired, use \'Resend verification email\' on the login page.'
        );
        pendingError.code = 'ALREADY_REGISTERED_UNVERIFIED';
        throw pendingError;
      }
      // Already confirmed — they should just log in.
      const alreadyError = new Error('An account with this email already exists. Please log in instead.');
      alreadyError.code = 'ALREADY_REGISTERED';
      throw alreadyError;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: normalizedName,
          first_name: firstName,
          college: normalizedCollege,
          username: normalizedUsername,
          pending_invite_code: inviteContext?.code || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    if (authError) {
      const msg = String(authError?.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('email rate')) {
        const rlError = new Error(
          'Email sending limit reached. Please wait a few minutes, then try again. ' +
          'If you already received a verification email earlier, please use that link — it may still be valid.'
        );
        rlError.code = 'EMAIL_RATE_LIMIT';
        throw rlError;
      }
      throw authError;
    }

    if (authData?.user) {
      const { error: profileError } = await ensureProfile(authData.user, {
        name: normalizedName,
        college: normalizedCollege,
        username: normalizedUsername,
        role: 'student',
        campus_credits: 0,
        cover_url: DEFAULT_BANNER_IMAGE_URL,
      });
      if (profileError && !isProfilesPolicyRecursion(profileError) && !isProfilesRLSViolation(profileError)) {
        throw profileError;
      }

      // NOTE:
      // We intentionally do NOT consume invite codes during signup.
      // With email confirmation enabled, signup may not have an authenticated session,
      // which can trigger RLS failures on invite_codes updates. We defer consumption
      // until first successful login when auth.uid() is guaranteed.
    }

    return { data: authData, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function signIn(email, password) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (authError) throw authError;
    
    let { data: profile, error: profileError } = await getProfile(authData.user.id);

    if (profileError && isProfilesPolicyRecursion(profileError)) {
      profile = buildFallbackProfile(authData.user, { role: 'student', campus_credits: 0 });
      profileError = null;
    }

    // Always extract username from auth metadata as the source of truth for first-login recovery.
    const metaUsername = normalizeUsername(
      authData.user?.user_metadata?.username || authData.user?.user_metadata?.name || null
    );

    if (profileError || !profile) {
      const ensured = await ensureProfile(authData.user, {
        role: 'student',
        campus_credits: 0,
        // Explicitly thread username from auth metadata so it is never lost.
        username: metaUsername,
      });
      if (ensured.error) throw ensured.error;
      profile = ensured.data;
      profileError = null;
    }

    // If the DB profile is missing username, patch it from auth metadata directly
    // (targeted UPDATE rather than full upsert to avoid wiping other existing fields).
    if (!profile?.username && metaUsername) {
      const { data: patched } = await supabase
        .from('profiles')
        .update({ username: metaUsername })
        .eq('id', authData.user.id)
        .select('*')
        .single();
      if (patched) profile = patched;
    }

    // Only sync fields that are genuinely missing — never overwrite existing values.
    const missingFields = {};
    if (!profile?.name) missingFields.name = buildFallbackProfile(authData.user, {}).name;
    if (!profile?.college) missingFields.college = buildFallbackProfile(authData.user, {}).college;
    if (!profile?.email) missingFields.email = authData.user.email;
    if (!profile?.cover_url) missingFields.cover_url = DEFAULT_BANNER_IMAGE_URL;

    if (Object.keys(missingFields).length > 0) {
      const { data: patched } = await supabase
        .from('profiles')
        .update(missingFields)
        .eq('id', authData.user.id)
        .select('*')
        .single();
      if (patched) profile = patched;
    }

    let normalizedStatus = String(profile?.status || 'active').toLowerCase();
    const isAdminOwner = String(authData?.user?.email || '').toLowerCase() === ADMIN_OWNER_EMAIL;

    // Recovery path: if owner account was accidentally restricted/banned, restore access.
    if (isAdminOwner && (normalizedStatus === 'restricted' || normalizedStatus === 'banned')) {
      const { data: restoredProfile } = await supabase
        .from('profiles')
        .update({ status: 'active', ban_reason: null, banned_by: null, banned_at: null })
        .eq('id', authData.user.id)
        .select('*')
        .single();

      if (restoredProfile) {
        profile = restoredProfile;
        normalizedStatus = String(restoredProfile.status || 'active').toLowerCase();
      }
    }

    if (normalizedStatus === 'restricted' || normalizedStatus === 'banned') {
      await supabase.auth.signOut();
      const restrictionError = new Error(
        normalizedStatus === 'banned'
          ? 'Your account has been banned by admin.'
          : 'Your account has been restricted by admin. You can browse the website, but you cannot log in until your account is unrestricted.'
      );
      restrictionError.code = 'ACCOUNT_RESTRICTED';
      restrictionError.accountStatus = normalizedStatus;
      restrictionError.reason = profile?.ban_reason || '';
      throw restrictionError;
    }
    
    const profileWithEmail = profile ? { ...profile, email: profile.email || authData.user.email } : profile;

    // Consume invite after authenticated login to avoid burning invite codes on
    // partial/failed signups and to satisfy invite_codes RLS with auth.uid().
    const pendingInviteCode = authData.user?.user_metadata?.pending_invite_code || null;
    if (pendingInviteCode && profileWithEmail && !profileWithEmail.invite_code_used) {
      const consumeInvite = await consumeInviteCodeOnSignup({
        code: pendingInviteCode,
        newUserId: authData.user.id,
        newUserName: profileWithEmail?.name || authData.user?.user_metadata?.name || authData.user?.email,
      });

      if (!consumeInvite.error) {
        await supabase.auth.updateUser({
          data: {
            pending_invite_code: null,
          },
        });

        profileWithEmail.invite_code_used = consumeInvite.data?.inviteCode || pendingInviteCode;
        profileWithEmail.invited_by = consumeInvite.data?.inviterId || profileWithEmail.invited_by || null;
      }
    }

    return { data: { user: authData.user, profile: profileWithEmail }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function resendConfirmationEmail(email, redirectTo) {
  try {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function resetPassword(email, redirectTo) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    if (isProfilesPolicyRecursion(error)) {
      return { data: null, error };
    }
    return { data: null, error };
  }
}

export async function updateProfile(userId, updates) {
  try {
    const normalizedUpdates = {
      ...updates,
      name: updates?.name !== undefined ? normalizeName(updates.name) : updates?.name,
      username: updates?.username !== undefined ? normalizeUsername(updates.username) : updates?.username,
      college: updates?.college !== undefined ? normalizeCollege(updates.college) : updates?.college,
    };

    const authMetadataUpdates = {};
    if (normalizedUpdates.name !== undefined) authMetadataUpdates.name = normalizedUpdates.name;
    if (normalizedUpdates.name !== undefined) authMetadataUpdates.first_name = getFirstName(normalizedUpdates.name);
    if (normalizedUpdates.username !== undefined) authMetadataUpdates.username = normalizedUpdates.username;
    if (normalizedUpdates.college !== undefined) authMetadataUpdates.college = normalizedUpdates.college;

    if (Object.keys(authMetadataUpdates).length > 0) {
      // Keep auth metadata as source of truth fallback when profiles table has policy/runtime issues.
      await supabase.auth.updateUser({ data: authMetadataUpdates });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(normalizedUpdates)
      .eq('id', userId);

    if (updateError) {
      // If update fails because row is missing or RLS read path is flaky, attempt upsert fallback.
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...normalizedUpdates }, { onConflict: 'id' });

      if (upsertError) {
        if (!isProfilesPolicyRecursion(upsertError) && !isProfilesServerFailure(upsertError)) {
          throw upsertError;
        }

        const { data: authResp } = await supabase.auth.getUser();
        const fallback = buildFallbackProfile(authResp?.user || { id: userId, email: null, user_metadata: {} }, normalizedUpdates);
        return { data: { ...fallback, ...normalizedUpdates, id: userId }, error: null };
      }
    }

    const { data, error: readError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (readError) {
      if (isProfilesPolicyRecursion(readError) || isProfilesServerFailure(readError)) {
        const { data: authResp } = await supabase.auth.getUser();
        const fallback = buildFallbackProfile(authResp?.user || { id: userId, email: null, user_metadata: {} }, normalizedUpdates);
        return { data: { ...fallback, ...normalizedUpdates, id: userId }, error: null };
      }
      throw readError;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadAvatar(userId, file) {
  try {
    const { data: uploadData, error: uploadError } = await uploadImage(file, `campus-blink/avatars/${userId}`);
    if (uploadError) throw uploadError;

    // Update profile
    const { error: updateError } = await updateProfile(userId, { avatar_url: uploadData.url });
    if (updateError) throw updateError;
    
    return { data: uploadData.url, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadCover(userId, file) {
  try {
    const { data: uploadData, error: uploadError } = await uploadImage(file, `campus-blink/covers/${userId}`);
    if (uploadError) throw uploadError;

    const { error: updateError } = await updateProfile(userId, { cover_url: uploadData.url });
    if (updateError) throw updateError;
    
    return { data: uploadData.url, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
