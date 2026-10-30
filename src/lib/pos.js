import { supabase } from './supabase'

export const rupees = m => '₹' + (Number(m || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
export const newKey = () => (crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')).slice(0, 40)
export const ago = t => { const m = Math.max(0, Math.round((Date.now() - new Date(t)) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min' }
export const clock = t => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
export const STATUS_LABEL = { received: 'Received', preparing: 'Preparing', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' }

// Calls a database function and always returns { ok, reason, ... } so screens never crash on a network error.
export async function rpc(name, args) {
  try {
    const { data, error } = await supabase.rpc(name, args)
    if (error) return { ok: false, reason: error.code === '42501' ? 'denied' : 'error' }
    return data ?? { ok: true }
  } catch { return { ok: false, reason: 'network' } }
}

// One-time location reading. We never watch the position or keep it.
export const getPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject({ code: 0 })
  navigator.geolocation.getCurrentPosition(p => resolve(p.coords), e => reject(e), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
})

// Friendly messages for every reason the server can give
export const MSG = {
  unavailable: 'Ordering from the table isn’t available right now. Please ask our staff.',
  rate: 'Too many requests from this table. Please wait a few minutes or ask our staff.',
  location: 'We couldn’t read a valid location. Please try again or ask our staff.',
  accuracy: 'Your phone’s location isn’t precise enough. Move near a window, turn on GPS and try again, or ask our staff.',
  outside: 'Dine-in orders can only be placed from inside the café. Please come in, or ask our staff.',
  expired: 'Your table session has expired. Please try again.',
  invalid: 'Something in the order looks wrong. Please check it and try again.',
  busy: 'The table is busy for a moment. Please try again.',
  network: 'Network problem. Your order may not have been sent. Press the button again to retry safely.',
  error: 'Something went wrong. Please try again.',
  denied: 'You don’t have permission for that.',
  closed: 'This table or bill is already closed.',
  transition: 'That status change isn’t allowed.',
  paid_exceeds: 'Payments already recorded are higher than the new total. Correct the payment first.',
  amount: 'Enter an amount above zero and not more than the balance due.',
  unpaid: 'There is still a balance to pay. Record the payment first.',
  open_orders: 'Some orders aren’t completed or cancelled yet.',
  plan: 'This feature isn’t part of the café’s current plan.',
  no_account: 'No confirmed login exists for that email. Ask CafeTap to create the login first.',
  other_cafe: 'That person already works for another café.',
  limit: 'Staff limit reached.',
  range: 'Choose a range of up to 92 days.',
}
