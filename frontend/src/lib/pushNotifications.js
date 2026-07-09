import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

function urlBase64ToUint8Array(base64String) {
  console.log('VAPID KEY CONVERSION START', { hasKey: Boolean(base64String), keyLength: base64String?.length || 0 });
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  console.log('VAPID KEY CONVERSION COMPLETE', { byteLength: outputArray.length });
  return outputArray;
}

export async function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
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

export async function subscribeToPush(userId) {
  try {
    console.log('SUBSCRIBE TO PUSH START', { userId });
    const unavailableReason = await getPushUnavailableReason();
    if (unavailableReason) {
      console.warn('PUSH SUBSCRIPTION ABORTED: UNAVAILABLE', unavailableReason);
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log('NOTIFICATION PERMISSION RESULT', permission);
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('NO EXISTING PUSH SUBSCRIPTION FOUND, CREATING NEW SUBSCRIPTION');
      console.log('VAPID KEY CONVERSION ABOUT TO START');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      console.log('VAPID KEY CONVERSION RETURNED UINT8ARRAY', applicationServerKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    console.log('PUSH SUBSCRIPTION OBJECT', subscription);

    const keys = subscription.toJSON();
    const deviceName = navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';

    const supabaseResult = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: keys.keys?.p256dh,
      auth: keys.keys?.auth,
      device_name: deviceName,
    }, {
      onConflict: 'user_id,endpoint',
    });

    console.log('PUSH SUBSCRIPTION SUPABASE RESULT', supabaseResult);

    const { error } = supabaseResult;

    if (error) {
      console.error('PUSH SUBSCRIPTION SUPABASE ERROR', error?.message || error);
      throw error;
    }

    console.log('SUBSCRIBE TO PUSH COMPLETE', { userId, endpoint: subscription.endpoint });
    return true;
  } catch (error) {
    console.error('Push subscribe error:', error);
    return false;
  }
}

export async function unsubscribeFromPush(userId) {
  if (!(await isPushSupported())) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint);
  }
}

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
    .upsert({
      user_id: userId,
      ...preferences,
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function sendTestPush() {
  const { data: sessionData } = await supabase.auth.getSession();
  const response = await fetch(`${BACKEND_URL}/api/push/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData?.session?.access_token || ''}`,
    },
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

  const { data: sessionData } = await supabase.auth.getSession();

  const response = await fetch(`${BACKEND_URL}/api/push/notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData?.session?.access_token || ''}`,
    },
    credentials: 'include',
    body: JSON.stringify({ userId, notification }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Failed to send push notification');
  }

  return true;
}

export function shouldSuppressPrompt(storageKey = 'cb_push_prompt_dismissed_until') {
  const value = localStorage.getItem(storageKey);
  if (!value) return false;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && Date.now() < timestamp;
}

export function dismissPromptForSevenDays(storageKey = 'cb_push_prompt_dismissed_until') {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  localStorage.setItem(storageKey, String(Date.now() + sevenDays));
}

export function isAppFocused() {
  return typeof document !== 'undefined' ? !document.hidden : true;
}
