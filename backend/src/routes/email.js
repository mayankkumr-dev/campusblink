import express from 'express'
import { requireAdmin } from '../middleware/adminOnly.js'
import { sendEmail } from '../services/email.js'
import { supabaseAdmin } from '../services/supabase.js'

const router = express.Router()

router.post('/send', requireAdmin, async (req, res) => {
  try {
    const { to, subject, html, recipientCount } = req.body
    
    await sendEmail({ to, subject, html })
    
    await supabaseAdmin
      .from('email_history')
      .insert({
        subject,
        recipients: Array.isArray(to) ? to : [to],
        recipient_count: recipientCount || 1,
        sent_by: req.user.id,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
    
    res.json({ success: true })
    
  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } cat  } catddleware/adminOnly.js'

const router = express.Router()

// Placeholder for future admin endpoints
router.get('/', requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Admin API' })
})

export default router
