import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/pushNotifications';
import { uploadImage } from '../lib/cloudinary';
import { getFirstName } from '../lib/user';
import { consumeInviteCodeOnSignup } from './invites';

const DEFAULT_BANNER_IMAGE_URL = '/banner-background.png';

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  role: string | null;
  college: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  status?: string | null;
  ban_reason?: string | null;
  banned_by?: string | null;
  banned_at?: string | null;
  professor_status?: string | null;
  staff_room_number?: string | null;
  requested_role?: string | null;
  role_request_status?: string | null;
  campus_credits?: number | null;
  invite_code_used?: string | null;
  invited_by?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: any;
}

export interface UsernameAvailabilityResult {
  available: boolean;
  normalizedUsername: string | null;
  message: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: any;
}

function normalizeName(value: string | null | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ');
}

function normalizeUsername(value: string | null | undefined): string | null {
  const cleaned = (value || '').trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return cleaned || null;
}

function validateUsernameFormat(value: string | null | undefined): string | null {
  if (!value) {
    return 'Username is required.';
  }

  if (!/^[a-z0-9._]{3,20}$/.test(value)) {
    return 'Use 3-20 letters, numbers, dots, or underscores.';
  }

  return null;
}

function normalizeCollege(value: string | null | undefined): string | null {
  const cleaned = (value || '').trim().replace(/\s+/g, ' ');
  return cleaned || null;
}

function normalizeRequestedRole(value: string | null | undefined): string {
  if (value === 'teacher' || value === 'professor') return 'teacher';
  return 'student';
}

function isProfilesPolicyRecursion(error: any): boolean {
  const message = error?.message?.toLowerCase?.() || '';
  return message.includes('infinite recursion detected in policy for relation "profiles"');
}

// During signup with email confirmation enabled, auth.uid() is null so the
// INSERT RLS policy ("auth.uid() = id") rejects the upsert. The DB trigger
// handle_new_user_with_username() (SECURITY DEFINER) creates the row instead,
// so this client-side failure is safe to ignore at signup time.
function isProfilesRLSViolation(error: any): boolean {
  const message = error?.message?.toLowerCase?.() || '';
  return (
    message.includes('violates row-level security policy') ||
    message.includes('new row violates row-level security')
  );
}

function isProfilesServerFailure(error: any): boolean {
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

function buildFallbackProfile(user: Partial<User> & { id: string; email?: string | null; user_metadata?: Record<string, any> }, fallback: Partial<Profile> = {}): Profile {
  const resolvedName = normalizeName(
    fallback.name ||
    fallback.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    ''
  );
  const resolvedUsername = normalizeUsername(fallback.username || user.user_metadata?.username || null);
  const resolvedCollege = normalizeCollege(
    fallback.college ||
    fallback.college_name ||
    user.user_metadata?.college_name ||
    user.user_metadata?.college ||
    null
  );

  return {
    id: user.id,
    email: user.email || null,
    name: resolvedName,
    username: resolvedUsername,
    college: resolvedCollege,
    role: fallback.role || 'student',
    campus_credits: fallback.campus_credits ?? 0,
    avatar_url: fallback.avatar_url || user.user_metadata?.avatar_url || null,
    cover_url: fallback.cover_url || user.user_metadata?.cover_url || DEFAULT_BANNER_IMAGE_URL,
  };
}

async function ensureProfile(user: User, fallback: Partial<Profile> = {}): Promise<ApiResponse<Profile>> {
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

export async function checkUsernameAvailability(username: string): Promise<ApiResponse<UsernameAvailabilityResult>> {
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

export async function signUp(
  email: string,
  password: string,
  name: string,
  college: string,
  username: string = '',
  inviteContext?: { code?: string | null } | null,
  requestedRole: string = 'student',
  professorData: { staffRoomNumber?: string | null } = {},
  studyYear: string | number | null = null,
  branch: string | null = null
): Promise<ApiResponse<any>> {
  try {
    const normalizedName = normalizeName(name);
    const normalizedCollege = normalizeCollege(college);
    const normalizedUsername = normalizeUsername(username);
    const normalizedRequestedRole = normalizeRequestedRole(requestedRole);
    const firstName = getFirstName(normalizedName);
    const usernameValidationError = validateUsernameFormat(normalizedUsername);

    if (usernameValidationError) {
      throw new Error(usernameValidationError);
    }

    const { data: usernameAvailability, error: usernameError } = await checkUsernameAvailability(normalizedUsername || '');
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
        ) as any;
        pendingError.code = 'ALREADY_REGISTERED_UNVERIFIED';
        throw pendingError;
      }
      // Already confirmed — they should just log in.
      const alreadyError = new Error('An account with this email already exists. Please log in instead.') as any;
      alreadyError.code = 'ALREADY_REGISTERED';
      throw alreadyError;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: normalizedName,
          name: normalizedName,
          first_name: firstName,
          college_name: normalizedCollege,
          college: normalizedCollege,
          username: normalizedUsername,
          pending_invite_code: inviteContext?.code || null,
          role: normalizedRequestedRole === 'teacher' ? 'professor' : 'student',
          requested_role: normalizedRequestedRole === 'teacher' ? 'teacher' : null,
          role_request_status: normalizedRequestedRole === 'teacher' ? 'pending' : null,
          professor_status: normalizedRequestedRole === 'teacher' ? 'pending' : null,
          staff_room_number: normalizedRequestedRole === 'teacher' ? (professorData?.staffRoomNumber || null) : null,
          study_year: studyYear,
          branch: branch,
        },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      }
    });
    if (authError) {
      const msg = String(authError?.message || '').toLowerCase();

      if (
        msg.includes('error sending confirmation email') ||
        msg.includes('sending confirmation email') ||
        msg.includes('smtp')
      ) {
        const smtpError = new Error(
          'Could not send verification email due to email service configuration. Please try again in a few minutes.'
        ) as any;
        smtpError.code = 'EMAIL_CONFIRMATION_SEND_FAILED';
        throw smtpError;
      }

      if (msg.includes('rate limit') || msg.includes('email rate')) {
        const rlError = new Error(
          'Email sending limit reached. Please wait a few minutes, then try again. ' +
          'If you already received a verification email earlier, please use that link — it may still be valid.'
        ) as any;
        rlError.code = 'EMAIL_RATE_LIMIT';
        throw rlError;
      }

      if (msg.includes('already registered') || msg.includes('user already registered')) {
        const alreadyError = new Error('This email is already registered. Please login instead.') as any;
        alreadyError.code = 'ALREADY_REGISTERED';
        throw alreadyError;
      }

      throw authError;
    }

    if (authData?.user) {
      const isProfessorSignup = normalizedRequestedRole === 'teacher';
      const profilePayload: Partial<Profile> = {
        name: normalizedName,
        college: normalizedCollege,
        username: normalizedUsername,
        role: isProfessorSignup ? 'professor' : 'student',
        campus_credits: isProfessorSignup ? 0 : 0,
        cover_url: DEFAULT_BANNER_IMAGE_URL,
      };

      const { error: profileError } = await ensureProfile(authData.user, profilePayload);
      if (profileError && !isProfilesPolicyRecursion(profileError) && !isProfilesRLSViolation(profileError)) {
        throw profileError;
      }

      // Professor-specific profile fields
      if (isProfessorSignup) {
        const profUpsert = {
          id: authData.user.id,
          email: email,
          name: normalizedName,
          college: normalizedCollege,
          username: normalizedUsername,
          role: 'professor',
          professor_status: 'pending',
          staff_room_number: professorData?.staffRoomNumber || null,
          requested_role: 'teacher',
          role_request_status: 'pending',
          created_at: new Date().toISOString()
        };
        const { error: profError } = await supabase
          .from('profiles')
          .upsert(profUpsert);

        if (profError) {
          const message = String(profError?.message || '').toLowerCase();
          const isMissingColumn = message.includes('column') && message.includes('does not exist');
          if (!isMissingColumn && !isProfilesRLSViolation(profError)) {
            console.warn('Professor profile update skipped:', profError.message || profError);
          }
        } else {
          // Send notification to all admins
          try {
            const { data: admins } = await supabase
              .from('profiles')
              .select('id')
              .eq('role', 'admin');
            
            if (admins && admins.length > 0) {
              const notifications = admins.map(admin => ({
                user_id: admin.id,
                type: 'professor_request',
                title: 'New Professor Request',
                message: `${normalizedName} has applied for a faculty account`,
                link: '/admin/professors/pending',
              }));
              await supabase.from('notifications').insert(notifications);
              await Promise.all(
                admins.map((admin) =>
                  sendPushNotification(admin.id, {
                    type: 'professor_request',
                    title: 'New Professor Request',
                    body: `${normalizedName} has applied for a faculty account`,
                    url: '/admin/professors/pending',
                    important: true,
                  }).catch(() => {})
                )
              );
            }
          } catch (notifErr) {
            console.error('Failed to notify admins of new professor application', notifErr);
          }
        }
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

export async function signIn(
  identifier: string,
  password: string
): Promise<ApiResponse<{ user: User | null; profile: Profile | null }>> {
  try {
    let email = identifier;
    if (!identifier.includes('@')) {
      const { data: profileEmail, error: rpcError } = await supabase
        .rpc('get_email_by_username', { p_username: identifier });
      
      if (rpcError || !profileEmail) {
        throw new Error('Username not found');
      }
      email = profileEmail;
    }

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
    const missingFields: Record<string, any> = {};
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
    const isAdminOwner = profile?.role === 'admin';

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
      ) as any;
      restrictionError.code = 'ACCOUNT_RESTRICTED';
      restrictionError.accountStatus = normalizedStatus;
      restrictionError.reason = profile?.ban_reason || '';
      throw restrictionError;
    }
    
    const profileWithEmail = profile ? { ...profile, email: profile.email || authData.user.email } : profile;

    // Removed: We no longer sign out pending/rejected professors here. 
    // They are successfully authenticated and the UI Router (App.tsx / LandingPage / Layouts)
    // will redirect them to /professor/pending or /professor/rejected menus.
    
    const requestedRole = normalizeRequestedRole(authData.user?.user_metadata?.requested_role || 'student');
    const requestedRoleStatus = String(authData.user?.user_metadata?.role_request_status || '').toLowerCase();

    if (requestedRole === 'teacher' && requestedRoleStatus === 'pending' && profileWithEmail) {
      if (profileWithEmail.role !== 'professor') {
        const { error: requestSyncError } = await supabase
          .from('profiles')
          .update({
            role: 'professor',
            professor_status: 'pending',
            staff_room_number: authData.user?.user_metadata?.staff_room_number || null,
            requested_role: 'teacher',
            role_request_status: 'pending',
          })
          .eq('id', authData.user.id);

        if (!requestSyncError) {
          profileWithEmail.role = 'professor';
          profileWithEmail.professor_status = 'pending';
          profileWithEmail.staff_room_number = authData.user?.user_metadata?.staff_room_number || null;
        }
      } else if (String(profileWithEmail.professor_status || '').toLowerCase() === 'approved') {
        // DB says approved but auth metadata still says pending — clear the stale flag silently.
        supabase.auth.updateUser({
          data: { role_request_status: 'approved', requested_role: null }
        }).catch(() => null);
      }
    }

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

export async function signOut(): Promise<{ error: any }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function resendConfirmationEmail(email: string, redirectTo?: string): Promise<ApiResponse<any>> {
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

export async function resetPassword(email: string, redirectTo?: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getProfile(userId: string): Promise<ApiResponse<Profile>> {
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

export async function updateProfile(
  userId: string,
  updates: Partial<Profile> & Record<string, any>
): Promise<ApiResponse<Profile>> {
  try {
    const normalizedUpdates = {
      ...updates,
      name: updates?.name !== undefined ? normalizeName(updates.name) : updates?.name,
      username: updates?.username !== undefined ? normalizeUsername(updates.username) : updates?.username,
      college: updates?.college !== undefined ? normalizeCollege(updates.college) : updates?.college,
    };

    const authMetadataUpdates: Record<string, any> = {};
    if (normalizedUpdates.name !== undefined) authMetadataUpdates.name = normalizedUpdates.name;
    if (normalizedUpdates.name !== undefined) authMetadataUpdates.full_name = normalizedUpdates.name;
    if (normalizedUpdates.name !== undefined) authMetadataUpdates.first_name = getFirstName(normalizedUpdates.name);
    if (normalizedUpdates.username !== undefined) authMetadataUpdates.username = normalizedUpdates.username;
    if (normalizedUpdates.college !== undefined) authMetadataUpdates.college = normalizedUpdates.college;
    if (normalizedUpdates.college !== undefined) authMetadataUpdates.college_name = normalizedUpdates.college;

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
        const fallback = buildFallbackProfile(
          authResp?.user || { id: userId, email: null, user_metadata: {} },
          normalizedUpdates
        );
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
        const fallback = buildFallbackProfile(
          authResp?.user || { id: userId, email: null, user_metadata: {} },
          normalizedUpdates
        );
        return { data: { ...fallback, ...normalizedUpdates, id: userId }, error: null };
      }
      throw readError;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function uploadAvatar(userId: string, file: File | Blob): Promise<ApiResponse<string>> {
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

export async function uploadCover(userId: string, file: File | Blob): Promise<ApiResponse<string>> {
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
