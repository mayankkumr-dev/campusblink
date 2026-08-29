/**
 * Firebase Cloud Messaging — Dedicated Background Service Worker
 *
 * Firebase SDK REQUIRES this file to exist at /firebase-messaging-sw.js
 * It is served as a STATIC asset (not bundled by Vite), so:
 *   - No ES module imports — use importScripts only
 *   - Firebase config must be hardcoded (env vars are NOT available here)
 *   - Do NOT import or depend on sw.js (circular dependency / crash)
 *
 * Responsibilities:
 *   1. Initialize Firebase inside the service worker context
 *   2. Handle FCM messages that arrive when the PWA is backgrounded or closed
 *   3. Handle notification clicks and navigate to the correct in-app route
 */

// ── Import Firebase compat SDK (CDN, no bundler needed) ────────────────────────
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Firebase config — hardcoded public client config (safe to expose) ─────────
// These match the VITE_FIREBASE_* values in frontend/.env
// Update these if your Firebase project credentials change.
const firebaseConfig = {
  apiKey: 'AIzaSyDtyKc4upZM994amJTKO37NeF430HkWs9g',
  authDomain: 'campusblink-e2867.firebaseapp.com',
  projectId: 'campusblink-e2867',
  storageBucket: 'campusblink-e2867.firebasestorage.app',
  messagingSenderId: '351318626698',
  appId: '1:351318626698:web:3f33d32b4414f6acea7873',
};

// ── Initialize Firebase (guard against double-init on SW update) ───────────────
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (initErr) {
  console.error('[FCM-SW] Firebase init error:', initErr);
}

// ── Get Firebase Messaging instance ───────────────────────────────────────────
let messaging;
try {
  messaging = firebase.messaging();
} catch (msgErr) {
  console.error('[FCM-SW] firebase.messaging() error:', msgErr);
}

// ── Helper: resolve relative paths to absolute URLs ───────────────────────────
function toAbsoluteUrl(candidate) {
  const fallback = '/';
  const value = String(candidate || fallback).trim() || fallback;
  try {
    return new URL(value, self.location.origin).href;
  } catch {
    return new URL(fallback, self.location.origin).href;
  }
}

// ── Background message handler ────────────────────────────────────────────────
// Fires when the PWA is backgrounded, minimized, or closed and an FCM
// notification arrives. We MUST call showNotification() here — FCM does NOT
// auto-display notifications in background for web push unless this handler runs.
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM-SW] Background message received:', payload);

    const fcmNotification = payload.notification || {};
    const fcmData = payload.data || {};

    const title =
      fcmNotification.title ||
      fcmData.title ||
      'Campus Blink';

    const body =
      fcmNotification.body ||
      fcmData.body ||
      'You have a new update.';

    const targetPath =
      fcmData.url ||
      fcmData.click_action ||
      fcmNotification.click_action ||
      '/';

    const targetUrl = toAbsoluteUrl(targetPath);

    const notificationOptions = {
      body,
      icon: '/logo2/Blue_transparent.png?v=8',
      badge: '/logo2/Blue_transparent.png?v=8',
      data: { url: targetUrl },
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      // Use a stable tag so multiple rapid notifications collapse
      tag: fcmData.tag || 'campus-blink-notification',
      renotify: true,
    };

    return self.registration.showNotification(title, notificationOptions);
  });

  console.log('[FCM-SW] Firebase background messaging handler registered');
}

// ── Notification click handler ─────────────────────────────────────────────────
// When the user taps the notification, open/focus the correct page.
// This also handles iOS Safari PWA where WindowClient.navigate() is unreliable.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = toAbsoluteUrl(
    event.notification?.data?.url || '/'
  );

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        // 1. If an exact URL match is already open, focus it
        const exactMatch = clientList.find((c) => c.url === targetUrl);
        if (exactMatch && 'focus' in exactMatch) {
          return exactMatch.focus();
        }

        // 2. If any window from the same origin is open, focus it and navigate
        // Note: avoid WindowClient.navigate() on iOS (unreliable in Safari SW)
        const sameOriginClient = clientList.find((c) => {
          try {
            return new URL(c.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

        if (sameOriginClient && 'focus' in sameOriginClient) {
          await sameOriginClient.focus();
          // Post a message so the React app can do client-side routing
          sameOriginClient.postMessage({
            type: 'NOTIFICATION_NAVIGATE',
            url: targetUrl,
          });
          return;
        }

        // 3. No open window — open a new one
        return clients.openWindow(targetUrl);
      })
  );
});

// ── Notification dismiss handler ───────────────────────────────────────────────
self.addEventListener('notificationclose', () => {
  // Analytics hook — intentionally empty for now
});
