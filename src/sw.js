/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

const isApiRequest = ({ url }) => {
  return url.origin.includes('supabase.co') || url.pathname.startsWith('/api/');
};

const postQueue = new BackgroundSyncPlugin('campus-blink-sync-queue', {
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'cb-images-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

registerRoute(
  ({ request }) => request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'cb-fonts-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

registerRoute(
  isApiRequest,
  new NetworkFirst({
    cacheName: 'cb-api-v1',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 7 })],
  }),
  'GET'
);

registerRoute(
  ({ url }) =>
    url.href.includes('/rest/v1/menu_items') ||
    url.href.includes('/rest/v1/canteen_orders') ||
    url.href.includes('/rest/v1/print_orders') ||
    url.href.includes('/rest/v1/posts'),
  new NetworkFirst({
    cacheName: 'cb-student-content-v1',
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 })],
  }),
  'GET'
);

registerRoute(
  ({ request }) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && isApiRequest({ url: new URL(request.url) }),
  new NetworkFirst({
    cacheName: 'cb-write-requests-v1',
    plugins: [postQueue],
    networkTimeoutSeconds: 8,
  }),
  'POST'
);
registerRoute(
  ({ request }) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && isApiRequest({ url: new URL(request.url) }),
  new NetworkFirst({
    cacheName: 'cb-write-requests-v1',
    plugins: [postQueue],
    networkTimeoutSeconds: 8,
  }),
  'PUT'
);
registerRoute(
  ({ request }) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && isApiRequest({ url: new URL(request.url) }),
  new NetworkFirst({
    cacheName: 'cb-write-requests-v1',
    plugins: [postQueue],
    networkTimeoutSeconds: 8,
  }),
  'PATCH'
);
registerRoute(
  ({ request }) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && isApiRequest({ url: new URL(request.url) }),
  new NetworkFirst({
    cacheName: 'cb-write-requests-v1',
    plugins: [postQueue],
    networkTimeoutSeconds: 8,
  }),
  'DELETE'
);

const navigationHandler = new NetworkFirst({
  cacheName: 'cb-pages-v1',
  networkTimeoutSeconds: 5,
  plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 })],
});

registerRoute(new NavigationRoute(navigationHandler));

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Campus Blink', body: event.data.text() };
  }

  const title = payload.title || 'Campus Blink';
  const options = {
    body: payload.body || 'You have a new update.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => 'focus' in client);
      if (existing) {
        existing.focus();
        if ('navigate' in existing) {
          return existing.navigate(targetUrl);
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
