import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Offers({ cafe }) {
  const [rows, setRows] = useState([]), [f, setF] = useState({ title: '', details: '', valid_until: '' }), [msg, setMsg] = useState('')
  const load = async () => { const { data } = await supabase.from('offers').select('*').eq('cafe_id', cafe.id).order('created_at', { ascending: false }); setRows(data || []) }
  useEffect(() => { load() }, [cafe.id])
  const add = async e => {
    e.preventDefault()
    const { error } = await supabase.from('offers').insert({ cafe_id: cafe.id, title: f.title.trim(), details: f.details.trim() || null, valid_until: f.valid_until || null })
    setMsg(error ? error.message : ''); if (!error) setF({ title: '', details: '', valid_until: '' }); load()
  }
  const up = async (id, v) => { await supabase.from('offers').update(v).eq('id', id); load() }
  const del = async id => { if (confirm('Delete this offer?')) { await supabase.from('offers').delete().eq('id', id); load() } }
  return (<>
    <form className="panel" onSubmit={add}><h2>New offer</h2>
      <label>Title</label><input required maxLength={80} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Buy 1 get 1 on cold coffee" />
      <label>Details (optional)</label><input maxLength={300} value={f.details} onChange={e => setF({ ...f, details: e.target.value })} />
      <label>Valid until (optional)</label><input type="date" value={f.valid_until} onChange={e => setF({ ...f, valid_until: e.target.value })} />
      <button>Add offer</button>{msg && <p className="err">{msg}</p>}</form>
    {rows.map(o => <div key={o.id} className="panel"><b>{o.title}</b>{o.details && <p>{o.details}</p>}{o.valid_until && <p className="muted">Until {o.valid_until}</p>}
      <label className="chk"><input type="checkbox" checked={o.is_active} onChange={e => up(o.id, { is_active: e.target.checked })} /> Showing to customers</label>
      <button className="link danger" onClick={() => del(o.id)}>Delete</button></div>)}
  </>)
}
