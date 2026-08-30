const { supabaseAdmin } = require('../config/supabase');
const { sendPushToUser, sendPushBatch, sendPushToAll } = require('./push');

const notificationService = {
  // ── Generic notification creator ─────────────────────────────────────────
  createNotification: async (userId, type, title, message, link = null) => {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link,
        read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create notification: ${error.message}`);

    await sendPushToUser(userId, {
      id: data.id,
      type,
      title,
      body: message,
      url: link || '/',
      tag: `${type}-${data.id}`,
    });

    return data;
  },

  // ── Canteen / Print triggers ──────────────────────────────────────────────

  // Notify canteen owner of new order
  notifyCanteenOwner: async (canteenId, order) => {
    return notificationService.createNotification(
      canteenId,
      'new_order',
      'New Order',
      `New order #${order.id} received. Amount: ₹${order.total_amount}`,
      `/canteen/orders/${order.id}`
    );
  },

  // Notify print shop owner of new order
  notifyPrintShopOwner: async (shopId, order) => {
    return notificationService.createNotification(
      shopId,
      'new_order',
      'New Print Order',
      `New print order #${order.id} received. Pages: ${order.page_count}`,
      `/print/orders/${order.id}`
    );
  },

  // Notify admin
  notifyAdmin: async (adminId, type, message) => {
    return notificationService.createNotification(
      adminId,
      type,
      'Admin Alert',
      message,
      null
    );
  },

  // ── Social triggers ───────────────────────────────────────────────────────

  /**
   * Fires when user A follows user B.
   * @param {string} followedUserId  - The user who was followed (receives the notification)
   * @param {string} followerName    - Display name of the follower
   * @param {string} followerProfileId - Profile ID of the follower (for routing)
   */
  notifyNewFollower: async (followedUserId, followerName, followerProfileId) => {
    const safeFollowerName = String(followerName || 'Someone').trim();
    const url = followerProfileId ? `/profile/${followerProfileId}` : '/';

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: followedUserId,
        type: 'new_follower',
        title: 'New Follower 👤',
        message: `${safeFollowerName} just followed you.`,
        link: url,
        read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[notifyNewFollower] DB insert failed:', error.message);
    }

    await sendPushToUser(followedUserId, {
      id: data?.id,
      type: 'new_follower',
      title: 'New Follower 👤',
      body: `${safeFollowerName} just followed you.`,
      url,
      tag: `new_follower-${followerProfileId}`,
      important: false,
    });

    return data;
  },

  /**
   * Fires when someone likes a diary post.
   * @param {string} authorUserId - The author of the post (receives the notification)
   * @param {string} likerName    - Display name of the person who liked
   * @param {string} postId       - The post that was liked
   */
  notifyPostLiked: async (authorUserId, likerName, postId) => {
    const safeLikerName = String(likerName || 'Someone').trim();
    const url = postId ? `/diaries/${postId}` : '/diaries';

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: authorUserId,
        type: 'post_liked',
        title: 'Campus Diaries ❤️',
        message: `${safeLikerName} liked your diary entry.`,
        link: url,
        read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[notifyPostLiked] DB insert failed:', error.message);
    }

    await sendPushToUser(authorUserId, {
      id: data?.id,
      type: 'post_liked',
      title: 'Campus Diaries ❤️',
      body: `${safeLikerName} liked your diary entry.`,
      url,
      tag: `post_liked-${postId}`,
      important: false,
    });

    return data;
  },

  /**
   * Fires when an official notice/announcement is posted.
   * Sends to an array of target user IDs (e.g. all active students).
   * Uses fire-and-forget batch delivery — failures are logged, not retried.
   *
   * @param {string[]} targetUserIds - Array of user IDs to notify
   * @param {string}   noticeTitle   - Title of the notice
   * @param {string}   noticeId      - DB ID of the notice (for routing)
   */
  notifyOfficialNotice: async (targetUserIds, noticeTitle, noticeId) => {
    if (!targetUserIds?.length) return;

    const safeTitle = String(noticeTitle || 'A new notice').trim();
    // Route to the student notices list — the individual notice ID is not directly
    // routable from a notification tap; the list page is the correct destination.
    const url = '/student/notices';
    const body = `A new official notice has been posted.`;

    // Fan-out: send push to each user using chunked batching (500 users per batch).
    // DB notification rows are not created per-user here to avoid O(N) inserts for campus-wide notices.
    await sendPushBatch(targetUserIds, {
      type: 'announcement',
      title: `${safeTitle} 📢`,
      body,
      url,
      tag: `notice-${noticeId || Date.now()}`,
      important: true,
    });
  },

  /**
   * Fires when a user receives a new message request / chat initiation.
   * @param {string} recipientUserId - The user receiving the request
   * @param {string} senderName      - Display name of the sender
   * @param {string} chatId          - The chat/conversation ID for routing
   */
  notifyMessageRequest: async (recipientUserId, senderName, chatId) => {
    const safeSenderName = String(senderName || 'Someone').trim();
    const url = chatId
      ? `/student/campus-exchange/messages/${chatId}`
      : '/student/campus-exchange/messages';

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: recipientUserId,
        type: 'marketplace_message',
        title: 'Message Request 💬',
        message: `${safeSenderName} wants to connect.`,
        link: url,
        read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[notifyMessageRequest] DB insert failed:', error.message);
    }

    await sendPushToUser(recipientUserId, {
      id: data?.id,
      type: 'marketplace_message',
      title: 'Message Request 💬',
      body: `${safeSenderName} wants to connect.`,
      url,
      tag: `msg_request-${chatId}`,
      important: false,
    });

    return data;
  },

  // ── Utility ───────────────────────────────────────────────────────────────

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw new Error(`Failed to mark notification as read: ${error.message}`);
  },

  // Get user notifications
  getNotifications: async (userId, limit = 50) => {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);
    return data;
  },

  sendPushToAll,
};

module.exports = notificationService;
