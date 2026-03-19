import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const token = authHeader.split(' ')[1]
    
    const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     const {     connly.js
import { requireAuth } from './auth.js'

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    if (req.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  })
}
