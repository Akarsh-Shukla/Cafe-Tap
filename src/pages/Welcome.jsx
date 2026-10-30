import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/auth'

// Landing page for invite and password-reset emails: the link signs you in, then you choose a password.
export default function Welcome() {
  const session = useSession(), nav = useNavigate()
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [msg, setMsg] = useState(''), [late, setLate] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLate(true), 2500); return () => clearTimeout(t) }, [])
  const save = async e => {
    e.preventDefault(); setMsg('')
    if (pw.length < 10) return setMsg('Use at least 10 characters.')
    if (pw !== pw2) return setMsg('The two passwords don’t match.')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) return setMsg('Couldn’t save that password. Try a different one.')
    nav('/dashboard')
  }
  return (<main className="dash auth"><span className="lg dk">CafeTap</span><h1>Choose your password</h1>
    {session ? <form onSubmit={save}>
      <label>New password (10+ characters)</label><input type="password" required minLength={10} autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} />
      <label>Repeat it</label><input type="password" required minLength={10} autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} />
      <button>Save and continue</button>{msg && <p className="err" role="alert">{msg}</p>}</form>
      : <p>{late ? 'This link has expired or was already used. Go to the log in page and choose “Forgot your password” to get a new one.' : 'Checking your link…'}</p>}
  </main>)
}
