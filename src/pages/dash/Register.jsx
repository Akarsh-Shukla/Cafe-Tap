import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { rpc, rupees, MSG } from '../../lib/pos'

const ymd = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const toMinor = v => Math.round(parseFloat(v || 0) * 100)
const csv = s => '"' + String(s ?? '').replace(/"/g, '""') + '"'

// Daily sales register for Basic cafés: staff type cash and UPI, the total adds itself. Every change is logged for the owner.
export default function Register({ cafe, owner }) {
  const now = new Date(), [month, setMonth] = useState(ymd(now).slice(0, 7)), [saved, setSaved] = useState({}), [vals, setVals] = useState({}), [msg, setMsg] = useState(''), [log, setLog] = useState(null)
  const [y, m] = month.split('-').map(Number), last = new Date(y, m, 0).getDate(), today = ymd(now)
  const days = Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`).filter(d => d <= today).reverse()
  const load = async () => {
    const { data } = await supabase.from('sales_register').select('day,cash_minor,upi_minor,note,updated_at').eq('cafe_id', cafe.id).gte('day', `${month}-01`).lte('day', `${month}-${last}`)
    const s = {}, v = {}
    ;(data || []).forEach(r => { s[r.day] = r; v[r.day] = { cash: String(r.cash_minor / 100), upi: String(r.upi_minor / 100), note: r.note || '' } })
    setSaved(s); setVals(v)
  }
  useEffect(() => { load() }, [cafe.id, month])
  const get = d => vals[d] || { cash: '', upi: '', note: '' }
  const set = (d, k, x) => setVals(v => ({ ...v, [d]: { ...get(d), [k]: x } }))
  const dirty = d => { const a = get(d), s = saved[d]; return s ? toMinor(a.cash) !== s.cash_minor || toMinor(a.upi) !== s.upi_minor || a.note !== (s.note || '') : (a.cash !== '' || a.upi !== '' || a.note !== '') }
  const save = async d => {
    const a = get(d), r = await rpc('register_save', { p_cafe: cafe.id, p_day: d, p_cash: toMinor(a.cash), p_upi: toMinor(a.upi), p_note: a.note })
    setMsg(r.ok ? '' : MSG[r.reason] || MSG.error); load()
  }
  const sum = k => days.reduce((n, d) => n + toMinor(get(d)[k]), 0)
  const download = () => {
    const rows = [['Date', 'Cash (INR)', 'UPI (INR)', 'Total (INR)', 'Note'], ...days.slice().reverse().map(d => { const a = get(d); return [d, toMinor(a.cash) / 100, toMinor(a.upi) / 100, (toMinor(a.cash) + toMinor(a.upi)) / 100, a.note] })]
    const url = URL.createObjectURL(new Blob([rows.map(r => r.map(csv).join(',')).join('\n')], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = `sales-register-${month}.csv`; a.click()
  }
  const showLog = async () => { const { data } = await supabase.from('sales_register_log').select('day,cash_minor,upi_minor,actor_email,at').eq('cafe_id', cafe.id).order('at', { ascending: false }).limit(40); setLog(data || []) }
  return (<>
    <p className="muted">Type each day’s cash and UPI sales. The total adds itself. This is a manual record that you or your staff enter; it is not checked against any bank.</p>
    <div className="row"><input type="month" value={month} max={today.slice(0, 7)} onChange={e => e.target.value && setMonth(e.target.value)} aria-label="Month" /><button className="ghost" onClick={download}>Download CSV</button>{owner && <button className="ghost" onClick={showLog}>Change history</button>}</div>
    {msg && <p className="err" role="alert">{msg}</p>}
    <div className="stats"><div className="panel"><b>{rupees(sum('cash') * 1)}</b><span>Cash</span></div><div className="panel"><b>{rupees(sum('upi') * 1)}</b><span>UPI</span></div><div className="panel"><b>{rupees(sum('cash') + sum('upi'))}</b><span>Total</span></div></div>
    {days.map(d => { const a = get(d), tot = toMinor(a.cash) + toMinor(a.upi); return <div key={d} className="panel regrow">
      <div className="row"><b style={{ flex: 1 }}>{new Date(d + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</b><span className="regtot">{rupees(tot)}</span></div>
      <div className="row"><label className="regf">Cash (₹)<input type="number" min="0" step="0.01" value={a.cash} onChange={e => set(d, 'cash', e.target.value)} /></label>
        <label className="regf">UPI (₹)<input type="number" min="0" step="0.01" value={a.upi} onChange={e => set(d, 'upi', e.target.value)} /></label></div>
      <div className="row"><input placeholder="Note (optional)" maxLength={140} value={a.note} onChange={e => set(d, 'note', e.target.value)} />{dirty(d) ? <button onClick={() => save(d)}>Save</button> : saved[d] ? <span className="ok">Saved</span> : null}</div></div> })}
    {log && <div className="panel"><h2 style={{ marginTop: 0 }}>Recent changes</h2>{!log.length && <p className="muted">No changes yet.</p>}
      {log.map((l, i) => <div key={i} className="row muted"><span style={{ flex: 1 }}>{l.day}: cash {rupees(l.cash_minor)}, UPI {rupees(l.upi_minor)}</span><span>{l.actor_email} · {new Date(l.at).toLocaleString('en-IN')}</span></div>)}</div>}
  </>)
}
