import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/auth'
import { slugify, RESERVED } from '../lib/util'
import { Workspace } from './Dashboard'

const plan = r => (Array.isArray(r.cafe_admin) ? r.cafe_admin[0] : r.cafe_admin) || {}
const days = d => d ? Math.ceil((new Date(d + 'T23:59:59') - Date.now()) / 864e5) : null

export default function Admin() {
  const session = useSession(), nav = useNavigate(), { id } = useParams()
  const [isAdmin, setIsAdmin] = useState(undefined), [rows, setRows] = useState([]), [loaded, setLoaded] = useState(false)
  const [f, setF] = useState({ name: '', slug: '', email: '' }), [err, setErr] = useState('')
  const load = async () => {
    const { data } = await supabase.from('cafes').select('*, cafe_admin(*)').order('created_at', { ascending: false })
    setRows(data || []); setLoaded(true)
  }
  useEffect(() => {
    if (!session) return
    supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle().then(({ data }) => { setIsAdmin(!!data); if (data) load() })
  }, [session])
  if (session === undefined || (session && isAdmin === undefined)) return <p className="dash pad">Loading…</p>
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  if (id) {
    if (!loaded) return <p className="dash pad">Loading…</p>
    const cafe = rows.find(r => r.id === id)
    return cafe ? <Workspace cafe={cafe} uid={session.user.id} isAdmin reload={load} onBack={() => nav('/admin')} /> : <p className="dash pad">Café not found.</p>
  }
  const create = async e => {
    e.preventDefault(); setErr('')
    const slug = slugify(f.slug || f.name)
    if (slug.length < 3 || RESERVED.includes(slug)) return setErr('Choose a different web address (3+ letters or numbers).')
    const { data, error } = await supabase.from('cafes').insert({ name: f.name.trim(), slug }).select('id').single()
    if (error) return setErr(error.code === '23505' ? 'That address is taken.' : error.message)
    await supabase.from('cafe_admin').insert({ cafe_id: data.id, owner_email: f.email.trim().toLowerCase() || null })
    setF({ name: '', slug: '', email: '' }); await load(); nav('/admin/' + data.id)
  }
  const active = rows.filter(r => plan(r).plan === 'active'), income = active.reduce((s, r) => s + (plan(r).monthly_price_inr || 0), 0)
  return (<div className="dash">
    <header className="top"><span className="lg">CafeTap<span className="chip">Admin</span></span><button className="link" onClick={() => supabase.auth.signOut()}>Log out</button></header>
    <section className="greet"><div><span className="script">Welcome back</span><h1>Your cafés</h1></div></section>
    <div className="pad">
      <div className="stats"><div className="panel"><b>{rows.length}</b><span>Cafés</span></div><div className="panel"><b>{active.length}</b><span>Paying</span></div><div className="panel"><b>₹{income.toLocaleString('en-IN')}</b><span>Per month</span></div></div>
            {loaded && !rows.length && <p className="muted">No cafés yet. Add your first client below.</p>}
      {rows.map(r => { const p = plan(r), d = days(p.trial_end); return <button key={r.id} className="panel clist" onClick={() => nav('/admin/' + r.id)}>
        <b>{r.name}</b><span className="muted">/{r.slug} · {r.owner_id ? 'owner connected' : p.owner_email ? 'waiting for owner' : 'no owner email'}</span>
        <span className="muted">{p.plan || 'trial'}{p.plan === 'trial' && d !== null ? (d >= 0 ? ` · ${d} days left` : ' · trial over') : ''} · {r.published ? 'live' : 'not published'} · {r.plan_tier === 'pos' ? 'POS plan' : 'Basic plan'}{r.suspended ? ' · paused' : ''}</span></button> })}
      <form className="panel" onSubmit={create}><h2 style={{ marginTop: 0 }}>Add a café</h2>
        <label>Café name</label><input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <label>Web address</label><input value={f.slug} placeholder={slugify(f.name)} onChange={e => setF({ ...f, slug: slugify(e.target.value) })} />
        <label>Owner’s email (next, create their login in Supabase)</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <button>Create café</button>{err && <p className="err">{err}</p>}</form>
    </div></div>)
}
