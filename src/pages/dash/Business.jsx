import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { slugify, RESERVED } from '../../lib/util'

export default function Business({ cafe, reload, onDeleted }) {
  const a = (Array.isArray(cafe.cafe_admin) ? cafe.cafe_admin[0] : cafe.cafe_admin) || {}
  const [f, setF] = useState({ plan: a.plan || 'trial', trial_end: a.trial_end || '', price: a.monthly_price_inr ?? '', notes: a.notes || '', email: a.owner_email || '', tier: cafe.plan_tier || 'basic', suspended: !!cafe.suspended, slug: cafe.slug })
  const [msg, setMsg] = useState(''), [login, setLogin] = useState('')
  useEffect(() => { supabase.rpc('admin_owner_login_status', { p_cafe: cafe.id }).then(({ data, error }) => setLogin(error ? 'error' : data || '')) }, [cafe.id, cafe.owner_id])
  const LOGIN_MSG = { no_email: 'Type the owner’s email below and save it first.', no_login: 'No login exists yet. In Supabase open Authentication > Users > Add user, use exactly this email, set a temporary password and tick Auto Confirm User.', unconfirmed: 'A login exists but its email is not confirmed. Open the user in Supabase and confirm it, or recreate it with Auto Confirm User ticked.', login_ready: 'Login created. The café connects automatically the first time the owner logs in.', connected: 'The owner is connected.', error: 'Couldn’t check this. Run migration-7.sql in the Supabase SQL Editor.' }
  const set = (k, v) => setF({ ...f, [k]: v })
  const save = async e => {
    e.preventDefault()
    const s = slugify(f.slug)
    if (s.length < 3 || RESERVED.includes(s)) return setMsg('Choose a different web address.')
    const r1 = await supabase.from('cafe_admin').upsert({ cafe_id: cafe.id, plan: f.plan, trial_end: f.trial_end || null, monthly_price_inr: f.price === '' ? null : parseInt(f.price, 10), notes: f.notes, owner_email: f.email.trim().toLowerCase() || null })
    const r2 = await supabase.from('cafes').update({ slug: s, plan_tier: f.tier, suspended: f.suspended }).eq('id', cafe.id)
    const er = r1.error || r2.error; setMsg(er ? er.message : 'Saved'); reload()
  }
  const unlink = async () => { if (confirm('Disconnect the current owner login? They will lose access.')) { await supabase.from('cafes').update({ owner_id: null }).eq('id', cafe.id); reload() } }
  const del = async () => { if (prompt('This deletes the café and all its data. Type its web address to confirm: ' + cafe.slug) === cafe.slug) { await supabase.from('cafes').delete().eq('id', cafe.id); reload(); onDeleted() } }
  return (<form onSubmit={save}>
    <p className="muted">Only you can see this tab. Owners never see billing, notes or QR codes.</p>
    <div className="panel"><h2 style={{ marginTop: 0 }}>Product plan</h2>
      <label>Plan</label><select value={f.tier} onChange={e => set('tier', e.target.value)}><option value="basic">Basic (digital page)</option><option value="pos">POS (ordering, staff, bills)</option></select>
      <label className="chk"><input type="checkbox" checked={f.suspended} onChange={e => set('suspended', e.target.checked)} /> Pause this café’s dashboard (public page stays live)</label>
      <p className="muted">Switching plan hides or shows the POS module. It never deletes history. Only you can change this.</p></div>
    <div className="panel"><h2 style={{ marginTop: 0 }}>Billing</h2>
      <label>Status</label><select value={f.plan} onChange={e => set('plan', e.target.value)}>{['trial', 'active', 'paused', 'ended'].map(p => <option key={p}>{p}</option>)}</select>
      <label>Trial ends</label><input type="date" value={f.trial_end} onChange={e => set('trial_end', e.target.value)} />
      <label>Monthly price (₹)</label><input type="number" min="0" value={f.price} onChange={e => set('price', e.target.value)} />
      <label>Private notes</label><textarea rows={4} value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Agreed setup fee, NFC tags given, next follow-up…" /></div>
    <div className="panel"><h2 style={{ marginTop: 0 }}>Owner login</h2>
      <label>Owner’s email (their login must use exactly this email)</label><input type="email" value={f.email} onChange={e => set('email', e.target.value)} />
      <p className={login === 'connected' || login === 'login_ready' ? 'ok' : 'err'}>{LOGIN_MSG[login] || 'Checking…'}</p>
      {cafe.owner_id && <button type="button" className="ghost" onClick={unlink}>Disconnect owner</button>}
      <label>Web address</label><input value={f.slug} onChange={e => set('slug', slugify(e.target.value))} />
      <p className="muted">Changing this breaks every printed QR and NFC tag for this café.</p></div>
    <button>Save</button> {msg && <span className={msg === 'Saved' ? 'ok' : 'err'}>{msg}</span>}
    <p><button type="button" className="link danger" onClick={del}>Delete this café</button></p>
  </form>)
}
