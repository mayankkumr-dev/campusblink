/// <reference lib="webworker" />

// ─── Firebase Cloud Messaging — Background Handler ────────────────────────────
// importScripts loads Firebase compat SDK so we can handle FCM messages that
// arrive while the PWA is in the background or closed.
// These scripts are served by Firebase's CDN and do NOT need bundling.
// IMPORTANT: Keep these importScripts ABOVE all Workbox imports so Firebase
// claims the `push` event before Workbox's event listener does.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

  // Initialize Firebase inside the service worker using the same project config.
  // These values are inlined at build time by Vite's define plugin replacement.
  // If VITE_FIREBASE_* vars are not set, the initialisation is skipped gracefully.
  const firebaseSWConfig = {
    apiKey: self.__FIREBASE_API_KEY__,
    authDomain: self.__FIREBASE_AUTH_DOMAIN__,
    projectId: self.__FIREBASE_PROJECT_ID__,
    storageBucket: self.__FIREBASE_STORAGE_BUCKET__,
    messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__,
    appId: self.__FIREBASE_APP_ID__,
  };

  if (
    firebaseSWConfig.apiKey &&
    firebaseSWConfig.projectId &&
    firebaseSWConfig.messagingSenderId
  ) {
    firebase.initializeApp(firebaseSWConfig);
    const messaging = firebase.messaging();

    /**
     * onBackgroundMessage fires when the PWA is in the background or closed
     * and an FCM data/notification message arrives from the Firebase servers.
     *
     * We construct the notification ourselves so it matches the same format
     * used by the foreground `push` event listener below.
     */
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW FCM] Background message received:', payload);

      const { notification: fcmNotification, data: fcmData } = payload;

      // If Firebase SDK automatically processed a notification payload, 
      // do NOT call showNotification ourselves, otherwise the user gets duplicates!
      if (fcmNotification || payload?.webpush?.notification) {
        console.log('[SW FCM] Notification already handled natively by Firebase.');
        return;
      }

      // Fallback for data-only messages (though iOS drops them, Android/Desktop might receive them)
      const title = fcmData?.title || 'Campus Blink';
      const body = fcmData?.body || 'You have a new update.';
      const targetUrl = fcmData?.url || fcmData?.click_action || '/';

      const options = {
        body,
        icon: fcmData?.icon || '/logo2/Blue_transparent.png?v=8',
        badge: fcmData?.badge || '/logo2/Blue_transparent.png?v=8',
        data: {
          url: new URL(targetUrl, self.location.origin).href,
        },
        vibrate: [200, 100, 200],
        requireInteraction: false,
        silent: false,
        tag: 'campus-blink-fcm',
        renotify: true,
      };

      return self.registration.showNotification(title, options);
    });

    console.log('[SW FCM] Firebase background messaging registered');
  } else {
    console.warn('[SW FCM] Firebase config missing — background messaging disabled');
  }
} catch (err) {
  console.error('[SW FCM] Failed to initialise Firebase in service worker:', err);
}

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache } from 'workbox-precaching';
import { registerRoute, NavigationRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';


clientsClaim();

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

const isApiRequest = ({ url }) => {
  return url.origin.includes('supabase.co') || url.pathname.startsWith('/api/');
};

// Single Background Sync queue for all mutation operations.
const bgSyncPlugin = new BackgroundSyncPlugin('campus-blink-sync-queue', {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('[SW BG-SYNC] Replayed queued request:', entry.request.url);
      } catch (error) {
        console.error('[SW BG-SYNC] Replay failed, re-queueing:', entry.request.url);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'cb-images-v4',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

registerRoute(
  ({ url, request }) =>
    !url.pathname.startsWith('/_vercel/') &&
    (request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker'),
  new StaleWhileRevalidate({
    cacheName: 'cb-app-shell-assets-v4',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'cb-fonts-v4',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// ─── Student Content APIs — Stale-While-Revalidate ──────────────────────────
// Serves cached version instantly while fetching a fresh one in the background.
const isStudentContentApi = ({ url }) =>
  url.href.includes('/rest/v1/menu_items') ||
  url.href.includes('/rest/v1/canteen_orders') ||
  url.href.includes('/rest/v1/print_orders') ||
  url.href.includes('/rest/v1/posts') ||
  url.href.includes('/rest/v1/notices') ||
  url.href.includes('/rest/v1/announcements') ||
  url.href.includes('/api/notes/courses') ||
  url.href.includes('/api/notes/branches') ||
  url.href.includes('/api/notes/subjects');

registerRoute(
  ({ url, request }) => isStudentContentApi({ url }) && request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: 'cb-student-content-v4',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 }),
    ],
  }),
  'GET'
);

// ─── Other API GETs — Network First with 5s timeout ─────────────────────────
registerRoute(
  ({ url, request }) => isApiRequest({ url }) && !isStudentContentApi({ url }) && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'cb-api-v4',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
  'GET'
);

// ─── Mutation Requests — NetworkOnly + Background Sync ──────────────────────
// Each HTTP verb registered separately (required by Workbox router).
// When offline, the request is queued and automatically replayed on reconnect.
const mutationMatcher = ({ url, request }) =>
  isApiRequest({ url }) &&
  ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

const mutationStrategy = new NetworkOnly({
  plugins: [bgSyncPlugin],
  networkTimeoutSeconds: 10,
});

registerRoute(mutationMatcher, mutationStrategy, 'POST');
registerRoute(mutationMatcher, mutationStrategy, 'PUT');
registerRoute(mutationMatcher, mutationStrategy, 'PATCH');
registerRoute(mutationMatcher, mutationStrategy, 'DELETE');

// ─── Navigation Routes — Instant PWA Shell Fallback ──────────────
// Serves the precached index.html instantly without waiting for the network!
// When truly offline (no connection at OS level), serves offline.html instead.
try {
  const shellHandler = createHandlerBoundToURL('/index.html');

  // Custom handler: serve offline.html when the browser is offline at OS level,
  // otherwise fall through to the precached index.html shell.
  const navigationHandler = async (context) => {
    if (!navigator.onLine) {
      const cache = await caches.open(OFFLINE_CACHE);
      const offlineResponse = await cache.match(OFFLINE_URL);
      if (offlineResponse) return offlineResponse;
      const precached = await matchPrecache(OFFLINE_URL);
      if (precached) return precached;
    }
    return shellHandler(context);
  };

  registerRoute(new NavigationRoute(navigationHandler, {
    denylist: [/^\/auth\/callback/],
  }));
} catch (e) {
  // Fallback for dev mode where index.html might not be in the precache manifest
  registerRoute(new NavigationRoute(new NetworkFirst({
    cacheName: 'cb-pages-v4',
    networkTimeoutSeconds: 4,
  }), {
    denylist: [/^\/auth\/callback/],
  }));
}

const OFFLINE_CACHE = 'offline-fallback-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
});

setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    const cache = await caches.open(OFFLINE_CACHE);
    const cachedResponse = await cache.match(OFFLINE_URL);
    if (cachedResponse) {
      return cachedResponse;
    }
    return (await matchPrecache(OFFLINE_URL)) || Response.error();
  }
  return Response.error();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // NOTIFICATION_NAVIGATE is handled by the React app (App.tsx),
  // which listens for this message via navigator.serviceWorker.onmessage.
});

function toAbsoluteUrl(candidate) {
  const fallback = '/';
  const value = String(candidate || fallback).trim() || fallback;

  try {
    return new URL(value, self.location.origin).href;
  } catch {
    return new URL(fallback, self.location.origin).href;
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = toAbsoluteUrl(event.notification?.data?.url || '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // 1. Exact URL match already open — just focus it
      const exactMatch = clientList.find((client) => client.url === targetUrl);
      if (exactMatch && 'focus' in exactMatch) {
        return exactMatch.focus();
      }

      // 2. Any same-origin window — focus it, then signal the React app to
      // navigate. We avoid WindowClient.navigate() because it is unreliable
      // on iOS Safari (throws or is a no-op depending on Safari version).
      const sameOriginClient = clientList.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (sameOriginClient && 'focus' in sameOriginClient) {
        await sameOriginClient.focus();
        // Post to React so it can do client-side routing (works on iOS/Android)
        sameOriginClient.postMessage({
          type: 'NOTIFICATION_NAVIGATE',
          url: targetUrl,
        });
        return;
      }

      // 3. No open window — open a brand-new one
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('notificationclose', () => {});

