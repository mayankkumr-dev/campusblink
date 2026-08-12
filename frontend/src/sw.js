/// <reference lib="webworker" />
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

function parsePushPayload(event) {
  if (!event?.data) return {};

  try {
    const json = event.data.json();
    const nestedNotification = json?.notification || {};
    const nestedData = json?.data || {};

    return {
      title: json?.title || nestedNotification?.title,
      body: json?.body || nestedNotification?.body,
      icon: json?.icon || nestedNotification?.icon,
      badge: json?.badge || nestedNotification?.badge,
      image: json?.image || nestedNotification?.image,
      url: json?.url || nestedData?.url || nestedNotification?.click_action || nestedData?.click_action,
      notificationId: json?.notificationId || nestedData?.notificationId,
      tag: json?.tag,
      actions: json?.actions || nestedNotification?.actions,
      requireInteraction: Boolean(json?.requireInteraction),
      route: nestedData?.route,
      postId: nestedData?.postId,
      noticeId: nestedData?.noticeId,
      chatId: nestedData?.chatId,
    };
  } catch {
    const textBody = event.data.text();
    return {
      title: 'Campus Blink',
      body: textBody,
    };
  }
}

function resolveTargetUrl(payload) {
  if (payload?.url) {
    return toAbsoluteUrl(payload.url);
  }

  if (payload?.route) {
    return toAbsoluteUrl(payload.route);
  }

  // Diary post — route to /diaries/:id (renamed from /community)
  if (payload?.postId) {
    return toAbsoluteUrl(`/diaries/${payload.postId}`);
  }

  // Official notice — route to /notices/:id
  if (payload?.noticeId) {
    return toAbsoluteUrl(`/notices/${payload.noticeId}`);
  }

  // Direct message / chat
  if (payload?.chatId) {
    return toAbsoluteUrl(`/student/campus-exchange/messages/${payload.chatId}`);
  }

  return toAbsoluteUrl('/');
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const title = payload.title || 'Campus Blink';
  const targetUrl = resolveTargetUrl(payload);

  const options = {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/logo2/Blue_transparent.png?v=4',
    badge: payload.badge || '/logo2/Blue_transparent.png?v=4',
    image: payload.image || null,
    data: {
      url: targetUrl,
      notificationId: payload.notificationId || null,
    },
    actions: payload.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: Boolean(payload.requireInteraction),
    silent: false,
    tag: payload.tag || 'campus-blink',
    renotify: true,
  };

  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasVisibleClient = clientList.some((client) => client.visibilityState === 'visible');

    if (hasVisibleClient) {
      await Promise.all(clientList.map((client) => client.postMessage({
        type: 'push-notification',
        payload: { title, body: options.body, url: options.data.url, notificationId: options.data.notificationId },
      })));
    }

    // Always show a system notification for delivery reliability on mobile.
    try {
      await self.registration.showNotification(title, options);
    } catch (error) {
      console.error('[SW] showNotification failed:', error);
      throw error;
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = toAbsoluteUrl(event.notification?.data?.url || '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      const exactMatch = clientList.find((client) => client.url === targetUrl);
      if (exactMatch && 'focus' in exactMatch) {
        return exactMatch.focus();
      }

      const sameOriginClient = clientList.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (sameOriginClient) {
        await sameOriginClient.focus();
        if ('navigate' in sameOriginClient) {
          return sameOriginClient.navigate(targetUrl);
        }
        return undefined;
      }

      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('notificationclose', () => {});

// ─── Automatic Subscription Renewal ──────────────────────────────────────────
// Fires when an OS or browser push subscription expires or is invalidated.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const options = event.oldSubscription?.options || { userVisibleOnly: true };
      const subscription = await self.registration.pushManager.subscribe(options);
      const keys = subscription.toJSON();

      // Notify open client windows so they can post the renewed subscription to the backend
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        client.postMessage({
          type: 'PUSH_SUBSCRIPTION_CHANGE',
          endpoint: subscription.endpoint,
          p256dh: keys.keys?.p256dh,
          auth: keys.keys?.auth,
        });
      }
    } catch (err) {
      console.error('[SW] pushsubscriptionchange renewal failed:', err);
    }
  })());
});
