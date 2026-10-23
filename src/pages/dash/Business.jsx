import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { slugify, RESERVED } from '../../lib/util'

export default function Business({ cafe, reload, onDeleted }) {
  const a = (Array.isArray(cafe.cafe_admin) ? cafe.cafe_admin[0] : cafe.cafe_admin) || {}
  const [f, setF] = useState({ plan: a.plan || 'trial', trial_end: a.trial_end || '', price: a.monthly_price_inr ?? '', notes: a.notes || '', email: cafe.owner_email || '', slug: cafe.slug })
  const [msg, setMsg] = useState('')
  const set = (k, v) => setF({ ...f, [k]: v })
  const save = async e => {
    e.preventDefault()
    const s = slugify(f.slug)
    if (s.length < 3 || RESERVED.includes(s)) return setMsg('Choose a different web address.')
    const r1 = await supabase.from('cafe_admin').upsert({ cafe_id: cafe.id, plan: f.plan, trial_end: f.trial_end || null, monthly_price_inr: f.price === '' ? null : parseInt(f.price, 10), notes: f.notes })
    const r2 = await supabase.from('cafes').update({ owner_email: f.email.trim().toLowerCase() || null, slug: s }).eq('id', cafe.id)
    const er = r1.error || r2.error; setMsg(er ? er.message : 'Saved'); reload()
  }
  const unlink = async () => { if (confirm('Disconnect the current owner login? They will lose access.')) { await supabase.from('cafes').update({ owner_id: null }).eq('id', cafe.id); reload() } }
  const del = async () => { if (prompt('This deletes the café and all its data. Type its web address to confirm: ' + cafe.slug) === cafe.slug) { await supabase.from('cafes').delete().eq('id', cafe.id); reload(); onDeleted() } }
  return (<form onSubmit={save}>
    <p className="muted">Only you can see this tab. Owners never see billing, notes or QR codes.</p>
    <div className="panel"><h2 style={{ marginTop: 0 }}>Plan</h2>
      <label>Status</label><select value={f.plan} onChange={e => set('plan', e.target.value)}>{['trial', 'active', 'paused', 'ended'].map(p => <option key={p}>{p}</option>)}</select>
      <label>Trial ends</label><input type="date" value={f.trial_end} onChange={e => set('trial_end', e.target.value)} />
      <label>Monthly price (₹)</label><input type="number" min="0" value={f.price} onChange={e => set('price', e.target.value)} />
      <label>Private notes</label><textarea rows={4} value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Agreed setup fee, NFC tags given, next follow-up…" /></div>
    <div className="panel"><h2 style={{ marginTop: 0 }}>Owner login</h2>
      <label>Owner’s email (they must sign up and confirm this exact email)</label><input type="email" value={f.email} onChange={e => set('email', e.target.value)} />
      <p className="muted">{cafe.owner_id ? 'Owner login is connected.' : 'Waiting for the owner to sign up.'}</p>
      {cafe.owner_id && <button type="button" className="ghost" onClick={unlink}>Disconnect owner</button>}
      <label>Web address</label><input value={f.slug} onChange={e => set('slug', slugify(e.target.value))} />
      <p className="muted">Changing this breaks every printed QR and NFC tag for this café.</p></div>
    <button>Save</button> {msg && <span className={msg === 'Saved' ? 'ok' : 'err'}>{msg}</span>}
    <p><button type="button" className="link danger" onClick={del}>Delete this café</button></p>
  </form>)
}
