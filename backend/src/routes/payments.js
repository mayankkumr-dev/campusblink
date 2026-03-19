import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { 
  createCashfreeOrder,
  verifyCashfreePayment
} from '../services/cashfree.js'

const router = express.Router()

router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { orderId, amount, orderType } = req.body
    
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const paymentOrder = await createCashfreeOrder({
      orderId,
      amount,
      studentId: req.user.id,
      studentName: req.profile.name,
      studentEmail: req.user.email,
      orderType
    })
    
    res.json({ 
      success: true,
                                                                                                                                                                                                                                                                                            sync (req, res) => {
  try {
    const { cashfreeOrderId } = req.body
    const status = await verifyCashfreePayment(cashfreeOrderId)
    res.json({ success: true, status })
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' })
  }
})

export default router
