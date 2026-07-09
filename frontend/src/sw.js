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
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
  new CacheFirst({
    cacheName: 'cb-app-shell-assets-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 30 })],
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

const navigationHandler = new CacheFirst({
  cacheName: 'cb-pages-v1',
  plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 })],
});

registerRoute(new NavigationRoute(navigationHandler));

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

  if (payload?.postId) {
    return toAbsoluteUrl(`/community/${payload.postId}`);
  }

  if (payload?.chatId) {
    return toAbsoluteUrl(`/student/campus-exchange/messages/${payload.chatId}`);
  }

  return toAbsoluteUrl('/');
}

self.addEventListener('push', (event) => {
  try {
    console.log('PUSH EVENT RECEIVED', event.data.text());
  } catch (error) {
    console.error('PUSH EVENT PAYLOAD READ FAILED', error);
  }
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
      console.log('SHOW NOTIFICATION START', { title, options });
      await self.registration.showNotification(title, options);
      console.log('SHOW NOTIFICATION SUCCESS', { title });
    } catch (error) {
      console.error('SHOW NOTIFICATION FAILED', error);
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
