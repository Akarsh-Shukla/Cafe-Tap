// Invite and password-reset emails open the site root with a token in the address. Send them to the password screen first.
if (typeof window !== 'undefined' && /[#&]type=(invite|recovery)/.test(window.location.hash) && window.location.pathname !== '/welcome') {
  window.location.replace('/welcome' + window.location.hash)
}
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'missing'
)
