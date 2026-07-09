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
      .from('orders')
      .insert({
        user_id: userId,
        canteen_id,
        items,
        total_amount,
        delivery_type,
        notes,
        order_type: 'canteen',
        status: 'pending',
        payment_status: isProfessor && req.body.payLater ? 'pending' : 'pending',
        priority: isProfessor && delivery_type === 'delivery',
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

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('order_type', 'canteen')
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
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

    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .eq('canteen_id', shopId)
      .eq('order_type', 'canteen');

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
