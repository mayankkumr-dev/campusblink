const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const canteenOwnerOnlyMiddleware = require('../middleware/canteenOwnerOnly');
const notificationService = require('../services/notifications');
const { supabaseAdmin } = require('../config/supabase');

// Place canteen order
router.post('/orders', authMiddleware, async (req, res) => {
  try {
    const { items, total_amount, canteen_id, delivery_type, notes } = req.body;
    const userId = req.user.id;

    if (!items || !total_amount || !canteen_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const isProfessor = req.profile?.role === 'professor';

    const { data: order, error } = await supabaseAdmin
      .from('canteen_orders')
      .insert({
        user_id: userId,
        canteen_id,
        items,
        total_amount,
        delivery_type,
        notes,
        status: 'pending',
        payment_status: isProfessor && req.body.payLater ? 'deferred' : 'prepaid',
        priority: isProfessor ? true : false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Notify canteen owner
    await notificationService.notifyCanteenOwner(canteen_id, order);

    res.json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Update order status (Canteen owner only)
router.patch('/orders/:id/status', authMiddleware, canteenOwnerOnlyMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    // First fetch the order and verify it belongs to the authenticated owner's shop
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('canteen_orders')
      .select('id, canteen_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify that req.user.id is the registered owner of the shop being accessed
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('canteen_shops')
      .select('id, owner_id')
      .eq('id', existingOrder.canteen_id)
      .eq('owner_id', req.user.id)
      .single();

    if (shopError || !shop) {
      return res.status(403).json({ error: 'You do not own this shop' });
    }

    const { data: order, error } = await supabaseAdmin
      .from('canteen_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // --- Notify the student about order status changes ---
    const studentId = order.student_id || order.user_id;
    if (studentId && ['ready', 'preparing', 'completed', 'cancelled'].includes(status)) {
      try {
        const { data: shopData } = await supabaseAdmin
          .from('canteen_shops')
          .select('name')
          .eq('id', order.shop_id || order.canteen_id)
          .maybeSingle();

        const shopName = shopData?.name || 'your canteen';
        const rejectionReason = req.body.rejectionReason
          ? String(req.body.rejectionReason).trim()
          : 'No reason provided by the canteen.';

        const statusMessages = {
          ready: {
            title: 'Your canteen order is ready! 🍔',
            message: `Your order at ${shopName} is ready for pickup.`,
            important: true,
          },
          preparing: {
            title: 'Order accepted',
            message: `Your order at ${shopName} was accepted and is now being prepared.`,
            important: false,
          },
          completed: {
            title: 'Order completed ✅',
            message: `Your canteen order at ${shopName} has been completed. Thank you!`,
            important: false,
          },
          cancelled: {
            title: 'Canteen order rejected',
            message: `Your order at ${shopName} was rejected. Reason: ${rejectionReason}`,
            important: false,
          },
        };

        const msg = statusMessages[status];
        if (msg) {
          await notificationService.createNotification(
            studentId,
            'order_ready',
            msg.title,
            msg.message,
            '/student/canteen'
          );
        }
      } catch (notifyErr) {
        console.error('Failed to send canteen order status notification:', notifyErr);
      }
    }

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Get all orders for a canteen shop (Canteen owner only)
router.get('/orders/shop/:shopId', authMiddleware, canteenOwnerOnlyMiddleware, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    // Verify that req.user.id is the registered owner of the shop being accessed
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('canteen_shops')
      .select('id, owner_id')
      .eq('id', shopId)
      .eq('owner_id', req.user.id)
      .single();

    if (shopError || !shop) {
      return res.status(403).json({ error: 'You do not own this shop' });
    }

    let query = supabaseAdmin
      .from('canteen_orders')
      .select('*')
      .eq('canteen_id', shopId);

    // Prioritize delivery orders
    query = query.order('priority', { ascending: false });
    query = query.order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;
