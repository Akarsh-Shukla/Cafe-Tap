import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/auth'
import MenuEditor from './dash/MenuEditor'
import Offers from './dash/Offers'
import Settings from './dash/Settings'
import Tables from './dash/Tables'
import Business from './dash/Business'

export function Overview({ cafe, go, publish, isAdmin }) {
  const [counts, setCounts] = useState({}), [fb, setFb] = useState([]), [items, setItems] = useState(null)
  const kinds = [['visit', 'Page opens'], ['menu', 'Menu views'], ['feedback', 'Feedback'], ['offers', 'Offer views'], ['wifi', 'Wi‑Fi views'], ['review', 'Review clicks']]
  const load = async () => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString()
    const res = await Promise.all(kinds.map(([k]) => supabase.from('page_events').select('*', { count: 'exact', head: true }).eq('cafe_id', cafe.id).eq('kind', k).gte('created_at', since)))
    setCounts(Object.fromEntries(kinds.map(([k], i) => [k, res[i].count || 0])))
    const r = await supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('cafe_id', cafe.id); setItems(r.count || 0)
    const { data } = await supabase.from('feedback').select('*').eq('cafe_id', cafe.id).order('created_at', { ascending: false }).limit(50)
    setFb(data || [])
  }
  useEffect(() => { load() }, [cafe.id])
  const del = async id => { await supabase.from('feedback').delete().eq('id', id); load() }
  const steps = [['Add your menu', items > 0, 'menu'], ['Make the page yours', !!(cafe.about || cafe.cover_url), 'settings'], ['Publish your page', cafe.published, 'publish'], ...(isAdmin ? [['Print your QR code', false, 'tables']] : [])]
  const S = ([k, l]) => <div key={k} className="panel"><b>{counts[k] ?? '–'}</b><span>{l}</span></div>
  return (<>
    {steps.slice(0, 3).some(x => !x[1]) && <div className="panel"><h2 style={{ marginTop: 0 }}>Get your page live</h2>
      <ul className="steps">{steps.map(([l, d, t]) => <li key={l} className={d ? 'd' : ''}><i>{d ? '✓' : ''}</i><span>{l}</span>{!d && <button className="ghost" onClick={() => t === 'publish' ? publish(true) : go(t)}>{t === 'publish' ? 'Publish' : 'Open'}</button>}</li>)}</ul></div>}
    <p className="muted">Your page: <b>{window.location.origin}/{cafe.slug}</b>{cafe.published ? '' : ' (not published yet)'}</p>
    <h2>Last 30 days</h2>
    <div className="stats">{kinds.slice(0, 3).map(S)}</div>
    <details><summary className="muted">More numbers</summary><div className="stats" style={{ marginTop: 10 }}>{kinds.slice(3).map(S)}</div></details>
    <p className="muted">Counts only. We never store who visited.</p>
    <h2>Anonymous feedback</h2>
    {!fb.length && <p className="muted">Nothing yet. Feedback from customers will appear here.</p>}
    {fb.map(f => <div key={f.id} className="panel"><p style={{ margin: '0 0 6px' }}>{f.rating ? '★'.repeat(f.rating) + ' ' : ''}{f.message}</p><span className="muted">{new Date(f.created_at).toLocaleString('en-IN')}</span> <button className="link" onClick={() => del(f.id)}>Delete</button></div>)}
  </>)
}

export function Workspace({ cafe, uid, isAdmin, reload, onBack }) {
  const [tab, setTab] = useState('overview')
  // QR codes, NFC and billing are part of YOUR service, so only the admin sees these tabs.
  const tabs = [['overview', 'Home'], ['menu', 'Menu'], ['offers', 'Offers'], ['settings', 'My page'], ...(isAdmin ? [['tables', 'QR & NFC'], ['business', 'Business']] : [])]
  const publish = async v => { await supabase.from('cafes').update({ published: v }).eq('id', cafe.id); reload() }
  return (<div className="dash">
    <header className="top"><span className="lg">CafeTap{isAdmin && <span className="chip">Admin</span>}</span>
      <span><a href={'/' + cafe.slug} target="_blank" rel="noopener noreferrer">View page</a>{!onBack && <> · <button className="link" onClick={() => supabase.auth.signOut()}>Log out</button></>}</span></header>
    <section className="greet"><div>{onBack && <button className="link" style={{ padding: 0 }} onClick={onBack}>← All cafés</button>}<span className="script">{isAdmin ? 'Managing' : 'Welcome back'}</span><h1>{cafe.name}</h1></div>
      <label className="switch"><input type="checkbox" checked={cafe.published} onChange={e => publish(e.target.checked)} /><span className="tr" /><b>{cafe.published ? 'Live' : 'Hidden'}</b></label></section>
    <div className="tabwrap"><nav className="tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</nav></div>
    <div className="pad">
      {tab === 'overview' && <Overview cafe={cafe} go={setTab} publish={publish} isAdmin={isAdmin} />}
      {tab === 'menu' && <MenuEditor cafe={cafe} uid={uid} />}
      {tab === 'offers' && <Offers cafe={cafe} />}
      {tab === 'settings' && <Settings cafe={cafe} uid={uid} reload={reload} />}
      {isAdmin && tab === 'tables' && <Tables cafe={cafe} />}
      {isAdmin && tab === 'business' && <Business cafe={cafe} reload={reload} onDeleted={onBack} />}
    </div></div>)
}

export default function Dashboard() {
  const session = useSession()
  const [st, setSt] = useState({ loading: true })
  const load = async () => {
    const uid = session.user.id
    const a = await supabase.from('admins').select('user_id').eq('user_id', uid).maybeSingle()
    if (a.data) return setSt({ admin: true })
    const get = () => supabase.from('cafes').select('*').eq('owner_id', uid).maybeSingle()
    let r = await get()
    if (!r.data) { await supabase.rpc('claim_cafe'); r = await get() }
    setSt({ cafe: r.data })
  }
  useEffect(() => { if (session) load() }, [session])
  if (session === undefined || (session && st.loading)) return <p className="dash pad">Loading…</p>
  if (!session) return <Navigate to="/login" replace />
  if (st.admin) return <Navigate to="/admin" replace />
  if (!st.cafe) return (<main className="dash auth"><span className="lg dk">CafeTap</span><h1>Your page isn’t ready yet</h1>
    <p>Make sure you signed up with the exact email address your CafeTap provider registered, and that you confirmed it from your inbox. Then log in again.</p>
    <button onClick={() => supabase.auth.signOut()}>Log out</button></main>)
  return <Workspace cafe={st.cafe} uid={session.user.id} reload={load} />
}
