import { useEffect, useState } from 'react'
import { rpc, rupees, MSG } from '../../lib/pos'

const ymd = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
export default function Sales({ cafe }) {
  const today = new Date(), [from, setFrom] = useState(ymd(today)), [to, setTo] = useState(ymd(today)), [r, setR] = useState(null), [err, setErr] = useState('')
  const load = async () => { setErr(''); const x = await rpc('pos_sales_summary', { p_cafe: cafe.id, p_from: from, p_to: to }); if (x.ok) setR(x); else { setR(null); setErr(MSG[x.reason] || MSG.error) } }
  useEffect(() => { load() }, [from, to])
  const preset = days => { const a = new Date(); a.setDate(a.getDate() - days); setFrom(ymd(a)); setTo(ymd(new Date())) }
  return (<>
    <div className="row"><button className="ghost" onClick={() => preset(0)}>Today</button><button className="ghost" onClick={() => preset(6)}>Last 7 days</button><button className="ghost" onClick={() => preset(29)}>Last 30 days</button></div>
    <div className="row"><input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="From" /><input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="To" /></div>
    {err && <p className="err">{err}</p>}
    {r && <><div className="stats"><div className="panel"><b>{r.orders}</b><span>Orders</span></div><div className="panel"><b>{rupees(r.billed_minor)}</b><span>Billed</span></div><div className="panel"><b>{rupees(r.cash_minor + r.upi_minor)}</b><span>Paid</span></div></div>
      <div className="panel"><div className="row"><span style={{ flex: 1 }}>Cash recorded by staff</span><b>{rupees(r.cash_minor)}</b></div><div className="row"><span style={{ flex: 1 }}>UPI recorded by staff</span><b>{rupees(r.upi_minor)}</b></div>
        <p className="muted">Cancelled orders are excluded. Paid amounts are what staff recorded at the counter; CafeTap doesn’t verify them with a bank.</p></div>
      <h2>Best sellers</h2>{!r.top_items.length && <p className="muted">No orders in this range.</p>}
      {r.top_items.map(i => <div key={i.name} className="panel row"><span style={{ flex: 1 }}>{i.name}</span><b>{i.qty}</b></div>)}</>}
  </>)
}
