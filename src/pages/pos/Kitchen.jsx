import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { rpc, ago, clock, STATUS_LABEL, MSG } from '../../lib/pos'
import { readPrefs, notify } from '../../lib/alerts'
import AlertBar from '../../components/AlertBar'

// Kitchen screen: only approved orders appear here. Big text, two buttons, and an alert when a new order arrives.
export default function Kitchen({ cafe }) {
  const [tables, setTables] = useState([]), [sess, setSess] = useState([]), [orders, setOrders] = useState([]), [items, setItems] = useState([]), [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState(''), [prefs, setPrefs] = useState(readPrefs), seen = useRef(null)
  const load = useCallback(async () => {
    const t = await supabase.from('cafe_tables').select('id,display_name').eq('cafe_id', cafe.id)
    const s = await supabase.from('table_sessions').select('id,table_id').eq('cafe_id', cafe.id).eq('status', 'open')
    const ids = (s.data || []).map(x => x.id)
    let o = [], i = []
    if (ids.length) {
      o = (await supabase.from('orders').select('id,session_id,ref,status,note,created_at').in('session_id', ids).in('status', ['received', 'preparing', 'ready']).order('created_at')).data || []
      if (o.length) i = (await supabase.from('order_items').select('order_id,name_snapshot,quantity').in('order_id', o.map(x => x.id))).data || []
    }
    setTables(t.data || []); setSess(s.data || []); setOrders(o); setItems(i); setLoaded(true)
  }, [cafe.id])
  useEffect(() => { load(); const id = setInterval(() => { if (prefs.on || !document.hidden) load() }, prefs.on ? 5000 : 8000); return () => clearInterval(id) }, [load, prefs.on])
  const tname = o => tables.find(t => t.id === sess.find(s => s.id === o.session_id)?.table_id)?.display_name || 'a table'
  const fresh = orders.filter(o => o.status === 'received')
  useEffect(() => {
    if (!loaded) return
    if (seen.current === null) { seen.current = new Set(fresh.map(o => o.id)); return }
    const nw = fresh.filter(o => !seen.current.has(o.id)); nw.forEach(o => seen.current.add(o.id))
    if (nw.length) notify(prefs, 'Kitchen', nw.length === 1 ? `New order for the kitchen. ${tname(nw[0])}.` : `${nw.length} new orders for the kitchen.`)
  }, [orders, loaded])
  useEffect(() => { document.title = fresh.length ? `(${fresh.length}) Kitchen` : 'Kitchen'; return () => { document.title = 'CafeTap' } }, [fresh.length])
  const go = async (o, status) => { const r = await rpc('pos_set_order_status', { p_order: o.id, p_status: status }); setMsg(r.ok === false ? MSG[r.reason] || MSG.error : ''); load() }
  if (!loaded) return <p className="muted">Loading…</p>
  return (<>
    <AlertBar prefs={prefs} setPrefs={setPrefs} label="Kitchen" />
    {msg && <p className="err" role="alert">{msg}</p>}
    {!orders.length && <p className="panel">No orders to cook right now.</p>}
    <div className="kgrid">{orders.map(o => <div key={o.id} className={'panel kcard k-' + o.status}>
      <div className="row"><b className="ktable">{tname(o)}</b><span className="tstate">{STATUS_LABEL[o.status]}</span><span className="muted">#{o.ref} · {clock(o.created_at)} · {ago(o.created_at)}</span></div>
      {items.filter(i => i.order_id === o.id).map((i, k) => <div key={k} className="kline">{i.quantity} × {i.name_snapshot}</div>)}
      {o.note && <p className="knote">Note: {o.note}</p>}
      {o.status === 'received' && <button onClick={() => go(o, 'preparing')}>Start cooking</button>}
      {o.status === 'preparing' && <button onClick={() => go(o, 'ready')}>Mark ready</button>}
      {o.status === 'ready' && <p className="muted">Ready. Waiting for service.</p>}
    </div>)}</div>
  </>)
}
