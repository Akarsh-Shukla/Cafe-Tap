import { useEffect, useState } from 'react'
import { supabase } from './supabase'
export function useSession() {
  const [s, setS] = useState(undefined) // undefined = loading, null = signed out
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setS(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setS(sess))
    return () => sub.subscription.unsubscribe()
  }, [])
  return s
}
