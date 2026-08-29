import { supabase, getStandardClerkToken } from './supabase';
import { getFCMToken, deleteFCMToken, getMessagingInstance } from './firebase';

const FIREBASE_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
// Force relative URLs in production so Vercel rewrites take over and avoid Mixed Content (HTTP) errors
if (import.meta.env.PROD) {
  BACKEND_URL = '';
} else if (!BACKEND_URL && typeof window !== 'undefined' && import.meta.env.DEV) {
  BACKEND_URL = '';
}

// LocalStorage key to remember the token we registered with the backend so
// we can delete it cleanly on unsubscribe.
const FCM_TOKEN_CACHE_KEY = 'cb_fcm_token_v1';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the current Clerk access token for backend API calls. */
async function getAccessToken() {
  // The app uses Clerk for auth — the Clerk JWT is stored in-memory via
  // setClerkToken() in App.tsx. supabase.auth.getSession() always returns null
  // because Supabase's own auth is disabled (persistSession: false).
  return getStandardClerkToken() || null;
}

/** Builds authenticated headers for backend requests. */
async function authHeaders() {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Capability checks
// ─────────────────────────────────────────────────────────────────────────────

export async function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    Boolean(window.isSecureContext)
  );
}

export async function getPushUnavailableReason() {
  if (typeof window === 'undefined') return 'Not available in this environment.';

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || Boolean(navigator.standalone);

  if (isIOS && !isStandalone) {
    return 'On iPhone/iPad, please add Campus Blink to your Home Screen first (Share → Add to Home Screen) to enable push notifications.';
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'Push notifications are not supported on this browser/device.';
  }

  if (!window.isSecureContext) {
    return 'Notifications require a secure connection (HTTPS).';
  }

  if (!FIREBASE_VAPID_KEY) {
    return 'Notifications are not configured yet. Please try again in a bit.';
  }

  if (Notification.permission === 'denied') {
    return 'Notifications are blocked in browser settings for this app.';
  }

  return null;
}

export async function isPushSubscribed() {
  if (!(await isPushSupported())) return false;
  // We consider the user subscribed if we have a cached FCM token
  const cachedToken = localStorage.getItem(FCM_TOKEN_CACHE_KEY);
  if (cachedToken) return true;

  // Secondary check: can we get a token without re-prompting?
  if (Notification.permission === 'granted' && FIREBASE_VAPID_KEY) {
    try {
      const token = await getFCMToken(FIREBASE_VAPID_KEY);
      if (token) {
        localStorage.setItem(FCM_TOKEN_CACHE_KEY, token);
        return true;
      }
    } catch {
      // Ignore — user is not subscribed
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core — subscribe
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Requests notification permission, obtains an FCM registration token,
 * then saves it to the backend (or direct Supabase fallback).
 *
 * @param {string} userId - Supabase user ID
 * @returns {boolean}     - true on success
 */
export async function subscribeToPush(userId) {
  try {
    const unavailableReason = await getPushUnavailableReason();
    if (unavailableReason) {
      console.warn('[push] Subscribe aborted:', unavailableReason);
      return false;
    }

    // 1. Request OS permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[push] Permission not granted:', permission);
      return false;
    }

    // 2. Get FCM registration token
    const fcmToken = await getFCMToken(FIREBASE_VAPID_KEY);
    if (!fcmToken) {
      console.error('[push] Failed to obtain FCM token');
      return false;
    }

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
    const deviceName = isIOS ? 'iOS PWA' : isMobile ? 'Android PWA' : 'Desktop';

    let savedToBackend = false;

    // 3. Save via backend endpoint (server-authoritative, uses service role)
    try {
      const headers = await authHeaders();
      const response = await fetch(`${BACKEND_URL}/api/push/subscribe`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ fcmToken, deviceName }),
      });

      if (response.ok) {
        savedToBackend = true;
      } else {
        const payload = await response.json().catch(() => ({}));
        console.warn('[push] Backend subscribe returned non-200:', payload.error || response.status);
      }
    } catch (fetchErr) {
      console.warn('[push] Backend subscribe fetch error:', fetchErr);
    }

    // 4. Fallback: direct Supabase write if backend was unavailable
    if (!savedToBackend) {
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          fcm_token: fcmToken,
          device_name: deviceName,
          token_updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,fcm_token' }
      );

      if (error) {
        console.error('[push] Supabase fallback subscribe failed:', error.message);
        return false;
      }
    }

    // 5. Cache token locally for clean unsubscribe later
    localStorage.setItem(FCM_TOKEN_CACHE_KEY, fcmToken);

    console.log('[push] FCM subscribed successfully', {
      userId,
      tokenPrefix: fcmToken.slice(0, 40) + '…',
    });
    return true;
  } catch (error) {
    console.error('[push] subscribeToPush error:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core — unsubscribe
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes the FCM token from the browser and removes the record from the backend.
 *
 * @param {string} userId - Supabase user ID (used for fallback only)
 */
export async function unsubscribeFromPush(userId) {
  if (!(await isPushSupported())) return;

  const fcmToken = localStorage.getItem(FCM_TOKEN_CACHE_KEY);

  // Remove from backend first
  if (fcmToken) {
    if (BACKEND_URL !== undefined) {
      const headers = await authHeaders();
      await fetch(`${BACKEND_URL}/api/push/unsubscribe`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({ fcmToken }),
      }).catch((e) => console.warn('[push] Backend unsubscribe error:', e));
    } else {
      // Fallback: direct Supabase delete
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('fcm_token', fcmToken)
        .catch((e) => console.warn('[push] Supabase fallback unsubscribe error:', e));
    }
  }

  // Delete the token from Firebase SDK (revokes the registration on the FCM side)
  await deleteFCMToken();

  // Clear local cache
  localStorage.removeItem(FCM_TOKEN_CACHE_KEY);

  console.log('[push] FCM unsubscribed', { tokenPrefix: fcmToken?.slice(0, 40) + '…' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification preferences
// ─────────────────────────────────────────────────────────────────────────────

export async function getNotificationPreferences(userId) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveNotificationPreferences(userId, preferences) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: userId, ...preferences },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience senders
// ─────────────────────────────────────────────────────────────────────────────

export async function sendTestPush() {
  const headers = await authHeaders();
  const response = await fetch(`${BACKEND_URL}/api/push/test`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Failed to send test notification');
  }

  return response.json();
}

export async function sendPushNotification(userId, notification) {
  const headers = await authHeaders();
  const response = await fetch(`${BACKEND_URL}/api/push/notify`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ userId, notification }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Failed to send push notification');
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt suppression helpers
// ─────────────────────────────────────────────────────────────────────────────

const DISMISS_KEY = 'cb_push_prompt_dismissed_until';

export function shouldSuppressPrompt(storageKey = DISMISS_KEY) {
  const value = localStorage.getItem(storageKey);
  if (!value) return false;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && Date.now() < timestamp;
}

export function dismissPromptForSevenDays(storageKey = DISMISS_KEY) {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  localStorage.setItem(storageKey, String(Date.now() + sevenDays));
}

export function clearPromptDismissal(storageKey = DISMISS_KEY) {
  localStorage.removeItem(storageKey);
}

export function isAppFocused() {
  return typeof document !== 'undefined' ? !document.hidden : true;
}
