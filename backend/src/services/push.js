const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging: getAdminMessaging } = require('firebase-admin/messaging');
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');

// ─── Firebase Admin Initialisation ────────────────────────────────────────────
// Initialise once. If the app is already initialised (e.g. hot-reload in dev),
// reuse the existing instance instead of throwing.
let firebaseApp;

function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;

  try {
    const existingApps = getApps();
    if (existingApps && existingApps.length > 0) {
      firebaseApp = existingApps[0];
      return firebaseApp;
    }
  } catch {
    // If getApps() throws for any reason, continue to initialization
  }

  // Priority 1: Inline JSON string in env var (preferred for cloud deployments)
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) {
    try {
      const serviceAccount = typeof inlineJson === 'string' ? JSON.parse(inlineJson) : inlineJson;
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('[FCM] Firebase Admin initialised from FIREBASE_SERVICE_ACCOUNT_JSON env var');
      return firebaseApp;
    } catch (err) {
      console.error('[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
      // Fall through to file-based approach
    }
  }

  // Priority 2: Service account file path
  const rawPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  let serviceAccountPath;
  if (rawPath) {
    serviceAccountPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
  } else {
    serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
  }

  try {
    // eslint-disable-next-line import/no-dynamic-require
    const serviceAccount = require(serviceAccountPath);
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('[FCM] Firebase Admin initialised from service account file:', serviceAccountPath);
  } catch (err) {
    console.error(
      '[FCM] FATAL: Could not load Firebase service account.\n' +
      '  Option A: Set FIREBASE_SERVICE_ACCOUNT_JSON env var with the full JSON string\n' +
      '  Option B: Set FIREBASE_SERVICE_ACCOUNT_PATH env var pointing to the JSON file\n' +
      '  Option C: Place the file at backend/firebase-service-account.json\n' +
      '  Error:', err.message
    );
    // Do not crash — push will simply be a no-op until credentials are provided.
    return null;
  }

  return firebaseApp;
}

function getMessaging() {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getAdminMessaging(app);
  } catch (err) {
    console.error('[FCM] getMessaging failed:', err.message);
    return null;
  }
}

// ─── Preference helper ────────────────────────────────────────────────────────

function preferenceDisabled(preferences, notificationType) {
  if (!preferences || !notificationType) return false;

  const keyMap = {
    order_ready: 'order_ready',
    new_order: 'new_order',
    post_liked: 'post_liked',
    post_commented: 'post_commented',
    new_follower: 'new_follower',
    announcement: 'announcement',
    marketplace_message: 'marketplace_message',
    direct_message: 'marketplace_message',
    reputation_earned: 'reputation_earned',
    professor_approved: 'professor_approved',
  };

  const prefKey = keyMap[notificationType];
  if (!prefKey) return false;
  return preferences[prefKey] === false;
}

// ─── Stale token cleanup ──────────────────────────────────────────────────────

/**
 * Removes FCM tokens from push_subscriptions that have been reported as invalid.
 * FCM error codes that indicate a token is permanently invalid:
 *   messaging/registration-token-not-registered
 *   messaging/invalid-registration-token
 */
async function purgeStaleTokens(staleTokens) {
  if (!staleTokens?.length) return;

  for (const token of staleTokens) {
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('fcm_token', token);

    if (error) {
      console.error('[FCM] Failed to purge stale token from DB:', error);
    } else {
      console.log('[FCM] Purged stale FCM token:', token.slice(0, 40) + '…');
    }
  }
}

// ─── Core: send to a batch of tokens ─────────────────────────────────────────

/**
 * Sends a multicast FCM message to up to 500 tokens.
 * Returns the list of stale tokens to be purged.
 *
 * @param {string[]} tokens  - FCM registration tokens (max 500)
 * @param {object}   payload - { title, body, link }
 * @returns {string[]}       - tokens that should be purged
 */
async function sendMulticast(tokens, payload) {
  const messaging = getMessaging();
  if (!messaging || !tokens.length) return [];

  const { title, body, link } = payload;
  const clickAction = link || '/';

  const message = {
    tokens,
    notification: {
      title: title || 'Campus Blink',
      body: body || 'You have a new update.',
    },
    data: {
      url: clickAction,
      click_action: clickAction,
      icon: '/logo2/Blue_transparent.png?v=8',
      badge: '/logo2/Blue_transparent.png?v=8',
    },
    webpush: {
      notification: {
        icon: '/logo2/Blue_transparent.png?v=8',
        badge: '/logo2/Blue_transparent.png?v=8',
        click_action: clickAction,
        requireInteraction: false,
      },
      fcmOptions: {
        link: clickAction,
      },
    },
    // Android PWA (Chrome on Android) uses the webpush config above.
    android: {
      priority: 'high',
      ttl: 86400000, // 24 hours in milliseconds
    },
    // iOS APNs — requires 'alert' object with title+body, otherwise treated as
    // a silent/data push and never shown to the user.
    apns: {
      headers: {
        'apns-priority': '10', // 10 = immediate delivery (vs 5 = conserve power)
      },
      payload: {
        aps: {
          alert: {
            title: title || 'Campus Blink',
            body: body || 'You have a new update.',
          },
          badge: 1,
          sound: 'default',
        },
      },
    },
  };

  let response;
  try {
    response = await messaging.sendEachForMulticast(message);
  } catch (err) {
    console.error('[FCM] sendEachForMulticast threw:', err.message);
    return [];
  }

  const staleTokens = [];

  response.responses.forEach((res, idx) => {
    if (res.success) return;

    const code = res.error?.code;
    console.warn('[FCM] Token send failed:', {
      token: tokens[idx].slice(0, 40) + '…',
      code,
      message: res.error?.message,
    });

    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      staleTokens.push(tokens[idx]);
    }
  });

  console.log('[FCM] Multicast result:', {
    successCount: response.successCount,
    failureCount: response.failureCount,
    staleCount: staleTokens.length,
  });

  return staleTokens;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends a push notification to a single user (all their registered devices).
 *
 * @param {string} userId       - Supabase user ID
 * @param {object} notification - { title, body, link, type, important, ... }
 */
async function sendPushToUser(userId, notification) {
  if (!userId || !notification) return;

  const messaging = getMessaging();
  if (!messaging) {
    console.warn('[FCM] sendPushToUser skipped — Firebase not initialised');
    return;
  }

  const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('fcm_token')
    .eq('user_id', userId)
    .not('fcm_token', 'is', null);

  if (subscriptionError) {
    console.error('[FCM] SUPABASE PUSH SUBSCRIPTION QUERY FAILED', subscriptionError);
    return;
  }

  if (!subscriptions?.length) {
    console.warn('[FCM] NO FCM SUBSCRIPTIONS FOUND FOR USER', { userId });
    return;
  }

  const { data: preferences } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (preferenceDisabled(preferences, notification.type)) return;

  const tokens = subscriptions.map((s) => s.fcm_token).filter(Boolean);
  if (!tokens.length) return;

  const payload = {
    title: notification.title,
    body: notification.body,
    link: notification.url || notification.link || '/',
  };

  const stale = await sendMulticast(tokens, payload);
  await purgeStaleTokens(stale);
}

/**
 * Sends a push notification to an array of user IDs using chunked batching.
 *
 * @param {string[]} userIds      - Array of Supabase user IDs
 * @param {object}   notification - { title, body, link, ... }
 * @param {number}   batchSize    - Tokens per FCM multicast call (max 500)
 * @param {number}   delayMs      - Delay between batches (ms)
 */
async function sendPushBatch(userIds, notification, batchSize = 500, delayMs = 250) {
  if (!Array.isArray(userIds) || !userIds.length) return;

  // Fetch all FCM tokens for the given user IDs in one query
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('fcm_token')
    .in('user_id', userIds)
    .not('fcm_token', 'is', null);

  if (error) {
    console.error('[FCM] sendPushBatch subscription fetch error:', error);
    return;
  }

  if (!subscriptions?.length) {
    console.warn('[FCM] sendPushBatch: no FCM tokens found for target users');
    return;
  }

  const tokens = [...new Set(subscriptions.map((s) => s.fcm_token).filter(Boolean))];
  const payload = {
    title: notification.title,
    body: notification.body,
    link: notification.url || notification.link || '/',
  };

  for (let i = 0; i < tokens.length; i += batchSize) {
    const chunk = tokens.slice(i, i + batchSize);
    const stale = await sendMulticast(chunk, payload);
    await purgeStaleTokens(stale);

    if (i + batchSize < tokens.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Sends a push notification to ALL active users who have FCM tokens.
 *
 * @param {string|object} titleOrNotification - Either a title string (new API) or full notification object (legacy)
 * @param {string} [body]                     - Message body (new API)
 * @param {string} [link]                     - Deep link URL (new API)
 */
async function sendPushToAll(titleOrNotification, body, link) {
  const messaging = getMessaging();
  if (!messaging) {
    console.warn('[FCM] sendPushToAll skipped — Firebase not initialised');
    return;
  }

  // Support both new simple API (title, body, link) and old notification-object API
  let notification;
  if (typeof titleOrNotification === 'string') {
    notification = { title: titleOrNotification, body, link };
  } else {
    notification = titleOrNotification;
  }

  // Fetch all distinct FCM tokens for active users
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('fcm_token, user_id')
    .not('fcm_token', 'is', null);

  if (error) {
    console.error('[FCM] sendPushToAll fetch error:', error);
    return;
  }

  if (!subscriptions?.length) {
    console.warn('[FCM] sendPushToAll: no FCM tokens found');
    return;
  }

  const tokens = [...new Set(subscriptions.map((s) => s.fcm_token).filter(Boolean))];
  console.log('[FCM] sendPushToAll broadcasting to', tokens.length, 'tokens');

  const payload = {
    title: notification.title,
    body: notification.body,
    link: notification.url || notification.link || '/',
  };

  const BATCH_SIZE = 500;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const chunk = tokens.slice(i, i + BATCH_SIZE);
    const stale = await sendMulticast(chunk, payload);
    await purgeStaleTokens(stale);

    if (i + BATCH_SIZE < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

module.exports = {
  sendPushToUser,
  sendPushBatch,
  sendPushToAll,
};