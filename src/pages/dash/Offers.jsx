import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Offers({ cafe }) {
  const [rows, setRows] = useState([]), [f, setF] = useState({ title: '', details: '', valid_until: '', kind: 'flat', discount_val: '', min_order: '' }), [msg, setMsg] = useState('')
  const load = async () => { const { data } = await supabase.from('offers').select('*').eq('cafe_id', cafe.id).order('created_at', { ascending: false }); setRows(data || []) }
  useEffect(() => { load() }, [cafe.id])
  const add = async e => {
    e.preventDefault()
    const discPaise = f.kind === 'flat' ? Math.round(parseFloat(f.discount_val || 0) * 100) : null
    const discPct = f.kind === 'percent' ? parseFloat(f.discount_val || 0) : null
    const minPaise = f.min_order ? Math.round(parseFloat(f.min_order || 0) * 100) : 0
    const { error } = await supabase.from('offers').insert({
      cafe_id: cafe.id,
      title: f.title.trim(),
      details: f.details.trim() || null,
      valid_until: f.valid_until || null,
      kind: f.kind || 'flat',
      discount_paise: discPaise,
      discount_percent: discPct,
      min_order_paise: minPaise
    })
    setMsg(error ? error.message : ''); if (!error) setF({ title: '', details: '', valid_until: '', kind: 'flat', discount_val: '', min_order: '' }); load()
  }
  const up = async (id, v) => { await supabase.from('offers').update(v).eq('id', id); load() }
  const del = async id => { if (confirm('Delete this offer?')) { await supabase.from('offers').delete().eq('id', id); load() } }
  return (<>
    <form className="panel" onSubmit={add}><h2>New offer</h2>
      <label>Title</label><input required maxLength={80} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Buy 1 get 1 on cold coffee or 10% off" />
      <div className="row">
        <label style={{ flex: 1 }}>Offer Type
          <select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>
            <option value="flat">Flat ₹ discount (e.g. ₹50 off)</option>
            <option value="percent">Percentage % discount (e.g. 10% off)</option>
            <option value="bogo">Buy 1 Get 1 Free (BOGO)</option>
            <option value="combo">Combo Special Offer</option>
          </select>
        </label>
        {f.kind === 'flat' && <label style={{ flex: 1 }}>Discount amount (₹)<input type="number" min="1" step="1" value={f.discount_val} onChange={e => setF({ ...f, discount_val: e.target.value })} placeholder="50" /></label>}
        {f.kind === 'percent' && <label style={{ flex: 1 }}>Discount percentage (%)<input type="number" min="1" max="100" step="1" value={f.discount_val} onChange={e => setF({ ...f, discount_val: e.target.value })} placeholder="10" /></label>}
      </div>
      <label>Minimum order value (₹, optional)</label><input type="number" min="0" step="1" value={f.min_order} onChange={e => setF({ ...f, min_order: e.target.value })} placeholder="e.g. 299 (leave blank for no minimum)" />
      <label>Details (optional)</label><input maxLength={300} value={f.details} onChange={e => setF({ ...f, details: e.target.value })} placeholder="Terms: valid on all dine-in orders" />
      <label>Valid until (optional)</label><input type="date" value={f.valid_until} onChange={e => setF({ ...f, valid_until: e.target.value })} />
      <button>Add offer</button>{msg && <p className="err">{msg}</p>}</form>
    {rows.map(o => <div key={o.id} className="panel">
      <b>{o.title}</b>
      <p style={{ margin: '4px 0', fontSize: '13px' }}>
        <span className="badge" style={{ marginRight: '6px' }}>{o.kind ? o.kind.toUpperCase() : 'OFFER'}</span>
        {o.kind === 'percent' && o.discount_percent && <span>{o.discount_percent}% OFF</span>}
        {o.kind === 'flat' && o.discount_paise && <span>₹{o.discount_paise / 100} OFF</span>}
        {o.min_order_paise > 0 && <span> · Min order ₹{o.min_order_paise / 100}</span>}
      </p>
      {o.details && <p className="muted">{o.details}</p>}
      {o.valid_until && <p className="muted">Until {o.valid_until}</p>}
      <label className="chk"><input type="checkbox" checked={o.is_active} onChange={e => up(o.id, { is_active: e.target.checked })} /> Showing to customers</label>
      <button className="link danger" onClick={() => del(o.id)}>Delete</button></div>)}
  </>)
}
