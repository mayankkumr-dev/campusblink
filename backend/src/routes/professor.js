const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const professorOnlyMiddleware = require('../middleware/professorOnly');
const { supabaseAdmin } = require('../config/supabase');

// Get professor home dashboard statistics
router.get('/home-stats', authMiddleware, professorOnlyMiddleware, async (req, res) => {
  try {
    const professorId = req.user.id;

    // Total orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, status')
      .eq('professor_id', professorId);

    if (ordersError) {
      return res.status(400).json({ error: ordersError.message });
    }

    // Pending payments
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from('professor_pending_payments')
      .select('*')
      .eq('professor_id', professorId)
      .eq('status', 'pending');

    if (pendingError) {
      return res.status(400).json({ error: pendingError.message });
    }

    res.json({
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      completedOrders: orders.filter(o => o.status === 'completed').length,
      pendingPayments: pending.length,
      totalPending: pending.reduce((sum, p) => sum + p.amount, 0),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all orders for professor
router.get('/orders', authMiddleware, professorOnlyMiddleware, async (req, res) => {
  try {
    const professorId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .eq('professor_id', professorId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query
      .order('created_at', { ascending: false })
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
