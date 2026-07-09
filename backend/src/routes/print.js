const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const printShopOnlyMiddleware = require('../middleware/printShopOnly');
const notificationService = require('../services/notifications');
const { supabaseAdmin } = require('../config/supabase');

// Place print order
router.post('/orders', authMiddleware, async (req, res) => {
  try {
    const { specification, total_amount, print_shop_id, delivery_type, file_url, notes } = req.body;
    const userId = req.user.id;

    if (!specification || !total_amount || !print_shop_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const isProfessor = req.profile?.role === 'professor';

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        print_shop_id,
        specification,
        file_url,
        total_amount,
        delivery_type,
        notes,
        order_type: 'print',
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

    // Notify print shop owner
    await notificationService.notifyPrintShopOwner(print_shop_id, order);

    res.json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Update print order status (Print shop owner only)
router.patch('/orders/:id/status', authMiddleware, printShopOnlyMiddleware, async (req, res) => {
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
      .eq('order_type', 'print')
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

// Get all orders for a print shop (Print shop owner only)
router.get('/orders/shop/:shopId', authMiddleware, printShopOnlyMiddleware, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .eq('print_shop_id', shopId)
      .eq('order_type', 'print');

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
