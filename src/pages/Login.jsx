import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const nav = useNavigate()
  const [mode, setMode] = useState('in'), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState('')
  const go = async e => {
    e.preventDefault(); setMsg('')
    const { data, error } = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password: pw }) : await supabase.auth.signUp({ email, password: pw })
    if (error) return setMsg(error.message)
    if (data.session) nav('/dashboard')
    else setMsg('Check your email and click the confirmation link, then log in.')
  }
  return (
    <main className="dash auth"><span className="lg dk">CafeTap</span><span className="script">{mode === 'in' ? 'Welcome back' : 'Let’s get started'}</span><h1>{mode === 'in' ? 'Owner login' : 'Create your account'}</h1>
      <form onSubmit={go}>
        <label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <label>Password (8+ characters)</label><input type="password" required minLength={8} value={pw} onChange={e => setPw(e.target.value)} />
        <button>{mode === 'in' ? 'Log in' : 'Sign up'}</button>
        {mode === 'up' && <p className="muted">Use the exact email your CafeTap provider registered for your café.</p>}
        {msg && <p className="err">{msg}</p>}
      </form>
      <p><button className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'New here? Create an account' : 'Already have an account? Log in'}</button></p>
    </main>
  )
}
