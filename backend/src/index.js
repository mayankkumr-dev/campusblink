import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { rateLimit } from 'express-rate-limit'

dotenPORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_servicORSUPABASE aSUPABASE_SERVICE_ROLE_.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.sCASHFREE_SECRET_KEY=your_cashfree_meCASHFREE_ENVIRONMENT=PRODUCTION
RESEND_'DRESEND_API_KEY=your_resend_keycoJWT_SECRET=your_jwt_secret
FRinFRONTEND_URL=https://camp 1ALLOWED_ORIGINS=https://campusblinstEOF

cat << 'EOF' > .env
PORT=3000
SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUor SUPABASE_URL=your_supabadySUo', SUPABASE_URL=your_supaba'/api/webhooks', webhooksRouter)
app.use('/api/email', emailRouter)
app.use('/api/admin', adminRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Backend running on ${PORT}`)
})
