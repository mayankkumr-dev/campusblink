import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Returns the current Supabase access token, or null. */
async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
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
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getPushUnavailableReason() {
  if (!(await isPushSupported())) {
    return 'Push notifications are not supported on this device/browser.';
  }

  if (!window.isSecureContext) {
    return 'Notifications require a secure connection (HTTPS).';
  }

  if (!VAPID_PUBLIC_KEY) {
    return 'Notifications are not configured yet. Please try again in a bit.';
  }

  if (Notification.permission === 'denied') {
    return 'Notifications are blocked in browser settings for this app.';
  }

  return null;
}

export async function isPushSubscribed() {
  if (!(await isPushSupported())) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core — subscribe
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Requests notification permission, creates a PushManager subscription,
 * then saves it to the backend (which uses the service-role key).
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

    // 2. Get or create PushManager subscription
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const keys = subscription.toJSON();
    const deviceName = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
      ? 'Mobile'
      : 'Desktop';

    // 3. Save via backend endpoint (server-authoritative, uses service role)
    if (BACKEND_URL) {
      const headers = await authHeaders();
      const response = await fetch(`${BACKEND_URL}/api/push/subscribe`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: keys.keys?.p256dh,
          auth: keys.keys?.auth,
          deviceName,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        console.error('[push] Backend subscribe failed:', payload.error || response.status);
        return false;
      }
    } else {
      // Fallback: direct Supabase write (development without backend)
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: keys.keys?.p256dh,
          auth: keys.keys?.auth,
          device_name: deviceName,
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) {
        console.error('[push] Supabase fallback subscribe failed:', error.message);
        return false;
      }
    }

    console.log('[push] Subscribed successfully', { userId, endpoint: subscription.endpoint.slice(0, 60) + '…' });
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
 * Unsubscribes from the PushManager and removes the record from the backend.
 *
 * @param {string} userId - Supabase user ID (used for fallback only)
 */
export async function unsubscribeFromPush(userId) {
  if (!(await isPushSupported())) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return;

  const endpoint = subscription.endpoint;

  // Unsubscribe from PushManager first
  await subscription.unsubscribe().catch((e) =>
    console.warn('[push] PushManager unsubscribe error:', e)
  );

  // Remove from backend
  if (BACKEND_URL) {
    const headers = await authHeaders();
    await fetch(`${BACKEND_URL}/api/push/unsubscribe`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
      body: JSON.stringify({ endpoint }),
    }).catch((e) => console.warn('[push] Backend unsubscribe error:', e));
  } else {
    // Fallback: direct Supabase delete
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .catch((e) => console.warn('[push] Supabase fallback unsubscribe error:', e));
  }

  console.log('[push] Unsubscribed', { endpoint: endpoint.slice(0, 60) + '…' });
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
  if (!BACKEND_URL) return false;

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
