import express from 'express'
import { verifyWebhookSignature } from '../services/cashfree.js'
import { supabaseAdmin } from '../services/supabase.js'

const router = express.Router()

router.post('/cashfree', async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature']
    const timestamp = req.headers['x-webhook-timestamp']
    
    const isValid = verifyWebhookSignature(
      req.body,
      signature,
      timestamp,
      process.env.CASHFREE_SECRET_KEY
    )
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' })
    }
    
    const payload = JSON.parse(req.body.toString())
    
    if (payload.type === 'PAYMENT_SUCCESS_WEBHO    if (payload.type === 'PAYMENT_SUCCESS_WEBHO    if (payload.type === 'PAYMENT_SUCCESS_WEBHO    if (payload.type === 'PAYMENT_SUCCESS_WEBHO    if (payload.type === 'PAYMENT_SUCCESS_WEBHO    if (payload.type === 'PAYMENT_SUCCESS_WEBHO    if (payload.type === 'PAYMENT_SUCCESS_WEB .from('canteen_orders')
        .update({
          payment_status: 'paid',
          is_payment_confirmed: true,
          payment_id: payload.data.payment.cf_payment_id,
          paid_at: new Date().toISOString()
        })
        .eq('id', orderId)
      
      if (order?.canteen_id) {
        const { data: canteen } = await supabaseAdmin
          .from('canteens')
          .select('owner_id')
          .eq('id', order.canteen_id)
          .single()
          
        if (canteen?.owner_id) {
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: canteen.owner_id,
              type: 'new_order',
              title: 'New paid order received',
              message: `Order #${orderId} paid`
            })
        }
      }
    }
    
    if (payload.type === 'PAYMENT_FAILED_WEBHOOK') {
      const orderId = payload.data.order.order_id.replace('CB_', '')
      
      await supabaseAdmin
        .from('canteen_orders')
        .update({ payment_status: 'failed' })
        .eq('id', orderId)
    }
    
    res.json({ success: true })
    
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

export default router
