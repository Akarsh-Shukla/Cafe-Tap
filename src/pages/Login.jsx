import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Logins are created by CafeTap (no public sign-up). Owners and staff sign in here, or use "Forgot password" to set one.
export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState(''), [mode, setMode] = useState('in')
  const go = async e => {
    e.preventDefault(); setMsg('')
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/welcome' })
      if (error) return setMsg('We couldn’t send an email right now. Please ask CafeTap for a temporary password.')
      return setMsg('If that email has a CafeTap login, a link to set your password is on its way.')
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    if (error) return setMsg('That email or password isn’t right.')
    nav('/dashboard')
  }
  return (
    <main className="dash auth"><span className="lg dk">CafeTap</span><span className="script">Welcome back</span><h1>{mode === 'in' ? 'Log in' : 'Set or reset your password'}</h1>
      <form onSubmit={go}>
        <label>Email</label><input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        {mode === 'in' && <><label>Password</label><input type="password" required autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} /></>}
        <button>{mode === 'in' ? 'Log in' : 'Send me a link'}</button>
        {msg && <p className={mode === 'reset' && !/couldn’t/.test(msg) ? 'ok' : 'err'} role="alert">{msg}</p>}
      </form>
      <p><button className="link" onClick={() => { setMode(mode === 'in' ? 'reset' : 'in'); setMsg('') }}>{mode === 'in' ? 'Forgot your password?' : 'Back to log in'}</button></p>
      <p className="muted">Your login is created by CafeTap, who will give you a temporary password. After you log in, use “Change password” in the dashboard.</p>
    </main>
  )
}
