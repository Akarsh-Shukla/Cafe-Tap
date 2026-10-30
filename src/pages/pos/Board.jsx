import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { rpc, rupees, ago, clock, newKey, STATUS_LABEL, MSG } from '../../lib/pos'

const NEXT = { received: ['preparing', 'Start preparing'], preparing: ['ready', 'Mark ready'], ready: ['completed', 'Mark completed'] }

// Live table board for owner and staff. It polls every 8 seconds and only ever sees this café's rows (database rules).
export default function Board({ cafe, perms }) {
  const [tables, setTables] = useState([]), [sess, setSess] = useState([]), [bills, setBills] = useState([]), [orders, setOrders] = useState([]), [items, setItems] = useState([]), [pays, setPays] = useState([])
  const [sel, setSel] = useState(null), [msg, setMsg] = useState(''), [loaded, setLoaded] = useState(false)
  const load = useCallback(async () => {
    const t = await supabase.from('cafe_tables').select('id,display_name,is_active').eq('cafe_id', cafe.id).order('created_at')
    const s = await supabase.from('table_sessions').select('id,table_id,opened_at').eq('cafe_id', cafe.id).eq('status', 'open')
    const ids = (s.data || []).map(x => x.id)
    let b = [], o = [], i = [], p = []
    if (ids.length) {
      b = (await supabase.from('bills').select('id,session_id,total_minor,paid_minor').in('session_id', ids)).data || []
      o = (await supabase.from('orders').select('id,session_id,ref,status,source,note,total_minor,created_at').in('session_id', ids).order('created_at')).data || []
      const oids = o.map(x => x.id), bids = b.map(x => x.id)
      if (oids.length) i = (await supabase.from('order_items').select('order_id,name_snapshot,quantity,line_total_minor').in('order_id', oids)).data || []
      if (bids.length) p = (await supabase.from('payment_events').select('id,bill_id,amount_minor,method,event_type,recorded_at,note').in('bill_id', bids).order('recorded_at')).data || []
    }
    setTables(t.data || []); setSess(s.data || []); setBills(b); setOrders(o); setItems(i); setPays(p); setLoaded(true)
  }, [cafe.id])
  useEffect(() => { load(); const id = setInterval(() => { if (!document.hidden) load() }, 8000); return () => clearInterval(id) }, [load])
  const act = async p => { const r = await p; setMsg(r && r.ok === false ? (MSG[r.reason] || MSG.error) + (r.reason === 'unpaid' ? ' Balance: ' + rupees(r.balance_minor) : '') : ''); load(); return r }

  const view = t => {
    const s = sess.find(x => x.table_id === t.id), b = s && bills.find(x => x.session_id === s.id)
    const os = s ? orders.filter(o => o.session_id === s.id) : []
    const live = os.some(o => ['received', 'preparing', 'ready'].includes(o.status)), bal = b ? b.total_minor - b.paid_minor : 0
    const state = !s ? 'Available' : live ? 'Active' : bal > 0 ? 'Payment pending' : b && b.total_minor > 0 ? 'Paid, ready to close' : 'Open, no billable orders'
    return { t, s, b, os, bal, state, live }
  }
  const cur = sel && view(tables.find(x => x.id === sel) || {})
  if (!loaded) return <p className="muted">Loading tables…</p>
  if (cur && cur.t.id) return <Detail key={cur.t.id} cafe={cafe} perms={perms} v={cur} items={items} pays={pays} act={act} msg={msg} back={() => { setSel(null); setMsg('') }} />
  const act8 = tables.filter(t => t.is_active).map(view)
  return (<>
    <p className="muted">Updates every few seconds. Payment is collected at the counter and recorded by staff.</p>
    {!act8.length && <p className="panel">No tables yet. Ask CafeTap to add your tables.</p>}
    <div className="tboard">{act8.map(v => <button key={v.t.id} className={'tcell' + (v.s ? ' on' : '')} onClick={() => setSel(v.t.id)}>
      <b>{v.t.display_name}</b><span className="tstate">{v.state}</span>
      {v.s && <small>{v.os.filter(o => o.status !== 'cancelled').length} orders · {rupees(v.b?.total_minor)} · {ago(v.s.opened_at)}</small>}
      {v.os.some(o => o.status === 'received') && <em className="newtag">New order</em>}</button>)}</div>
  </>)
}

function Detail({ cafe, perms, v, items, pays, act, msg, back }) {
  const { t, s, b, os, bal } = v
  const [amt, setAmt] = useState(''), [method, setMethod] = useState('cash'), [note, setNote] = useState(''), [adding, setAdding] = useState(false)
  useEffect(() => { setAmt(bal > 0 ? String(bal / 100) : '') }, [bal])
  const bp = b ? pays.filter(p => p.bill_id === b.id) : []
  const pay = async () => { const m = Math.round(parseFloat(amt || 0) * 100); await act(rpc('pos_record_payment', { p_bill: b.id, p_amount: m, p_method: method, p_note: note })); setNote('') }
  const close = () => { if (confirm(`Close ${t.display_name}? Make sure the payment has been received. A new group will start a fresh bill.`)) act(rpc('pos_close_session', { p_session: s.id })).then(r => r?.ok && back()) }
  return (<div className="posdetail">
    <button className="link" onClick={back}>← All tables</button>
    <h2>{t.display_name} <span className="tstate">{v.state}</span></h2>
    {s && <p className="muted">Open for {ago(s.opened_at)}</p>}
    {msg && <p className="err" role="alert">{msg}</p>}
    {os.map(o => <div key={o.id} className={'panel oline' + (o.status === 'cancelled' ? ' void' : '')}>
      <div className="row"><b>#{o.ref}</b><span className="muted">{clock(o.created_at)} · {o.source === 'staff' ? 'counter' : 'customer'}</span><span className="tstate">{STATUS_LABEL[o.status]}</span></div>
      {items.filter(i => i.order_id === o.id).map((i, k) => <div key={k} className="row"><span style={{ flex: 1 }}>{i.quantity} × {i.name_snapshot}</span><span>{rupees(i.line_total_minor)}</span></div>)}
      {o.note && <p className="muted">Note: {o.note}</p>}
      {perms.orders && NEXT[o.status] && <div className="row"><button onClick={() => act(rpc('pos_set_order_status', { p_order: o.id, p_status: NEXT[o.status][0] }))}>{NEXT[o.status][1]}</button>
        <button className="link danger" onClick={() => confirm('Cancel order #' + o.ref + '?') && act(rpc('pos_set_order_status', { p_order: o.id, p_status: 'cancelled' }))}>Cancel order</button></div>}
    </div>)}
    {b && <div className="panel"><h3 style={{ margin: 0 }}>Bill</h3>
      <div className="row"><span style={{ flex: 1 }}>Total</span><b>{rupees(b.total_minor)}</b></div>
      <div className="row"><span style={{ flex: 1 }}>Paid</span><b>{rupees(b.paid_minor)}</b></div>
      <div className="row"><span style={{ flex: 1 }}>Balance due</span><b>{rupees(bal)}</b></div>
      {bp.map(p => <div key={p.id} className="row muted"><span style={{ flex: 1 }}>{p.event_type === 'correction' ? 'Correction' : 'Payment'} ({p.method.toUpperCase()}) {clock(p.recorded_at)}{p.note ? ' · ' + p.note : ''}</span><span>{rupees(p.amount_minor)}</span>
        {perms.owner && p.event_type === 'payment' && !bp.some(x => x.corrects === p.id) && <button className="link danger" onClick={() => { const r = prompt('Reason for correcting this payment?'); if (r) act(rpc('pos_correct_payment', { p_event: p.id, p_reason: r })) }}>Correct</button>}</div>)}
      {perms.payments && bal > 0 && <div className="payform"><label>Amount received (₹)</label><input type="number" min="0" step="0.01" value={amt} onChange={e => setAmt(e.target.value)} />
        <label>Method (check the money or your UPI app first)</label><select value={method} onChange={e => setMethod(e.target.value)}><option value="cash">Cash</option><option value="upi">UPI (confirmed in my app)</option></select>
        <input placeholder="Note (optional)" maxLength={140} value={note} onChange={e => setNote(e.target.value)} /><button onClick={pay}>Record payment</button></div>}
      <p className="muted">CafeTap records what your staff confirm. It does not verify UPI or cash itself.</p>
      <div className="row"><button className="ghost" onClick={() => { document.body.classList.add('printing-bill'); window.print(); setTimeout(() => document.body.classList.remove('printing-bill'), 800) }}>Print bill</button>
        {perms.close && <button onClick={close} disabled={bal > 0}>{bal > 0 ? 'Settle balance to close' : 'Close table'}</button>}</div>
    </div>}
    {perms.orders && !adding && <button className="ghost" onClick={() => setAdding(true)}>+ Add counter order</button>}
    {adding && <AddOrder cafe={cafe} table={t} act={act} done={() => setAdding(false)} />}
    {b && <div className="bill-print"><b>{cafe.name}</b><div>{t.display_name} · {new Date(s.opened_at).toLocaleString('en-IN')}</div><hr />
      {os.filter(o => o.status !== 'cancelled').map(o => items.filter(i => i.order_id === o.id).map((i, k) => <div key={o.id + k} className="bl"><span>{i.quantity} x {i.name_snapshot}</span><span>{rupees(i.line_total_minor)}</span></div>))}
      <hr /><div className="bl"><b>Total</b><b>{rupees(b.total_minor)}</b></div><div className="bl"><span>Paid</span><span>{rupees(b.paid_minor)}</span></div><div className="bl"><span>Balance</span><span>{rupees(bal)}</span></div><hr />
      <div>Payment recorded by staff at the counter. This is not a GST tax invoice.</div></div>}
  </div>)
}

function AddOrder({ cafe, table, act, done }) {
  const [cats, setCats] = useState([]), [cart, setCart] = useState({}), [note, setNote] = useState(''), [key] = useState(newKey)
  useEffect(() => { supabase.from('menu_categories').select('id,name,sort_order,menu_items(id,name,price_paise,is_available,sort_order)').eq('cafe_id', cafe.id).order('sort_order').then(({ data }) => setCats(data || [])) }, [cafe.id])
  const all = cats.flatMap(c => c.menu_items), n = Object.values(cart).reduce((a, b) => a + b, 0)
  const total = Object.entries(cart).reduce((s, [id, q]) => s + (all.find(i => i.id === id)?.price_paise || 0) * q, 0)
  const set = (id, d) => setCart(c => { const q = Math.max(0, Math.min(20, (c[id] || 0) + d)); const x = { ...c }; if (q) x[id] = q; else delete x[id]; return x })
  const send = async () => { const r = await act(rpc('pos_staff_add_order', { p_cafe: cafe.id, p_table: table.id, p_idem: key, p_items: Object.entries(cart).map(([id, qty]) => ({ id, qty })), p_note: note })); if (r?.ok) done() }
  return (<div className="panel"><h3 style={{ marginTop: 0 }}>Counter order for {table.display_name}</h3>
    {cats.map(c => <div key={c.id}><b>{c.name}</b>{[...c.menu_items].sort((a, b) => a.sort_order - b.sort_order).filter(i => i.is_available).map(i => <div key={i.id} className="row"><span style={{ flex: 1 }}>{i.name} <span className="muted">{rupees(i.price_paise)}</span></span>
      <button className="ghost" onClick={() => set(i.id, -1)} aria-label={'Remove ' + i.name}>−</button><b>{cart[i.id] || 0}</b><button className="ghost" onClick={() => set(i.id, 1)} aria-label={'Add ' + i.name}>+</button></div>)}</div>)}
    <input placeholder="Note (optional)" maxLength={140} value={note} onChange={e => setNote(e.target.value)} />
    <div className="row"><button disabled={!n} onClick={send}>Add order · {rupees(total)}</button><button className="link" onClick={done}>Cancel</button></div></div>)
}

export { Detail, AddOrder }
