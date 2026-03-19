import { supabase } from './supabase'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json'
  }
}

export async function createPaymentOrder(orderId, amount, orderType) {
  const headers = await getAuthHeader()
  const response = await fetch(BACKEND_URL + '/api/payments/create-order', {
    method: 'POST',
    headers,
    body: JSON.stringify({ orderId, amount, orderType })
  })
  if (!response.ok) {
    throw new Error('Payment failed')
  }
  return response.json()
}

export async function sendAdminEmail(to, subject, html) {
  const headers = await getAuthHeader()
  const response = await fetch(BACKEND_URL + '/api/email/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, subject, html })
  })
  if (!response.ok) {
    throw new Error('Email failed')
  }
  return response.json()
}
