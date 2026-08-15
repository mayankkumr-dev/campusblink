import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';

// ─── Firebase Config ──────────────────────────────────────────────────────────
// All values come from VITE_FIREBASE_* environment variables.
// Get these from: Firebase Console → Project Settings → Your Web App → Config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ─── App Singleton ────────────────────────────────────────────────────────────
// Safely reuse the existing Firebase app instance in HMR / dev scenarios
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Messaging ────────────────────────────────────────────────────────────────

let _messaging = null;

/**
 * Lazily returns the Firebase Messaging instance.
 * Returns null if the browser doesn't support FCM (e.g. Safari < 16, Firefox
 * with no service worker, or non-HTTPS contexts).
 */
export async function getMessagingInstance() {
  if (_messaging) return _messaging;

  try {
    const supported = await isSupported();
    if (!supported) return null;
    _messaging = getMessaging(firebaseApp);
    return _messaging;
  } catch (err) {
    console.warn('[firebase] getMessagingInstance error:', err);
    return null;
  }
}

/**
 * Requests (or refreshes) the FCM registration token for this browser/device.
 *
 * The VAPID key links your Firebase project to this client's push subscription.
 * Get it from: Firebase Console → Project Settings → Cloud Messaging →
 *   Web Push certificates → Key pair (the long base64 string).
 *
 * @param {string} vapidKey - Firebase VAPID public key
 * @returns {string|null}   - FCM token string, or null on failure
 */
export async function getFCMToken(vapidKey) {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('[firebase] FCM not supported on this browser');
      return null;
    }

    if (!vapidKey) {
      console.error('[firebase] getFCMToken: vapidKey is required');
      return null;
    }

    // Ensure the service worker is registered before requesting the token
    let swRegistration;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.getRegistration('/');
        if (!swRegistration) {
          swRegistration = await navigator.serviceWorker.ready;
        }
      } catch {
        // Fall through — getToken() will use the default SW if available
      }
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn('[firebase] getFCMToken: no token returned (permission not granted?)');
      return null;
    }

    return token;
  } catch (err) {
    console.error('[firebase] getFCMToken error:', err);
    return null;
  }
}

/**
 * Deletes the current FCM token from the browser, effectively unregistering
 * this device from push notifications.
 *
 * @returns {boolean} - true if the token was deleted, false otherwise
 */
export async function deleteFCMToken() {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return false;
    await deleteToken(messaging);
    return true;
  } catch (err) {
    console.warn('[firebase] deleteFCMToken error:', err);
    return false;
  }
}

export { firebaseApp };
