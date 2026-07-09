const webpush = require('web-push');
const { supabaseAdmin } = require('../config/supabase');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL;

if (vapidPublicKey && vapidPrivateKey && vapidEmail) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

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
    reputation_earned: 'reputation_earned',
    professor_approved: 'professor_approved',
  };

  const prefKey = keyMap[notificationType];
  if (!prefKey) return false;
  return preferences[prefKey] === false;
}

async function sendPushToUser(userId, notification) {
  if (!userId || !notification || !vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
    return;
  }

  const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (subscriptionError) {
    console.error('SUPABASE PUSH SUBSCRIPTION QUERY FAILED', subscriptionError);
    return;
  }

  if (!subscriptions?.length) {
    console.warn('NO PUSH SUBSCRIPTIONS FOUND FOR USER', { userId });
    return;
  }

  const { data: preferences } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (preferenceDisabled(preferences, notification.type)) return;

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: '/logo/only_logo.png',
    badge: '/logo/only_logo.png',
    image: notification.image || null,
    url: notification.url || '/',
    tag: notification.tag || `campus-blink-${userId}`,
    notificationId: notification.notificationId || notification.id || null,
    requireInteraction: Boolean(notification.important),
    actions: notification.actions || [],
  });

  for (const subscription of subscriptions) {
    const pushSubscription = {
      endpoint: subscription?.endpoint,
      keys: {
        p256dh: subscription?.p256dh,
        auth: subscription?.auth,
      },
    };

    if (
      !pushSubscription.endpoint ||
      typeof pushSubscription.endpoint !== 'string' ||
      !pushSubscription.endpoint.trim() ||
      !pushSubscription.keys ||
      typeof pushSubscription.keys !== 'object' ||
      typeof pushSubscription.keys.p256dh !== 'string' ||
      !pushSubscription.keys.p256dh.trim() ||
      typeof pushSubscription.keys.auth !== 'string' ||
      !pushSubscription.keys.auth.trim()
    ) {
      console.error('INVALID PUSH SUBSCRIPTION SKIPPED', subscription, pushSubscription);
      continue;
    }

    try {
      const webPushResponse = await webpush.sendNotification(
        pushSubscription,
        payload
      );

      console.log('WEB-PUSH SEND SUCCESS', {
        userId,
        endpoint: pushSubscription.endpoint,
        statusCode: webPushResponse?.statusCode,
      });
    } catch (error) {
      console.error('WEB-PUSH SEND FAILED', error);

      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', pushSubscription.endpoint);
      }
    }
  }
}

async function sendPushToAll(notification) {
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('status', 'active');

  if (!users?.length) return;

  for (const user of users) {
    await sendPushToUser(user.id, notification);
  }
}

module.exports = {
  sendPushToUser,
  sendPushToAll,
};