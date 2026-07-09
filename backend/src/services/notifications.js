const { supabaseAdmin } = require('../config/supabase');
const { sendPushToUser, sendPushToAll } = require('./push');

const notificationService = {
  // Create notification
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
