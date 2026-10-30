import { useEffect, useRef, useState } from 'react'
import { rpc, rupees, newKey, getPosition, MSG } from '../lib/pos'

const capKey = id => 'ct_cap_' + id, refsKey = id => 'ct_refs_' + id
const read = k => { try { return JSON.parse(sessionStorage.getItem(k)) } catch { return null } }
const write = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)) } catch {} }

// Tells the menu whether this guest can order (café has the POS plan, ordering is on, and they arrived through a table link).
export function useOrdering(cafe) {
  let table = null; try { table = sessionStorage.getItem('ct_tbl_' + cafe.id) } catch {}
  const [enabled, setEnabled] = useState(false), [cart, setCart] = useState({})
  useEffect(() => { rpc('pos_ordering_state', { p_cafe: cafe.id }).then(r => setEnabled(!!r.enabled)) }, [cafe.id])
  const add = id => setCart(c => ({ ...c, [id]: Math.min((c[id] || 0) + 1, 20) }))
  const sub = id => setCart(c => { const n = { ...c }; if ((n[id] || 0) <= 1) delete n[id]; else n[id]--; return n })
  return { enabled, table, can: enabled && !!table, hint: enabled && !table, cart, setCart, add, sub }
}

export const Stepper = ({ qty, onAdd, onSub, name }) => qty
  ? <div className="step" role="group" aria-label={'Quantity of ' + name}><button onClick={onSub} aria-label={'Remove one ' + name}>−</button><b key={qty} aria-live="polite">{qty}</b><button onClick={onAdd} aria-label={'Add one ' + name}>+</button></div>
  : <button className="step add" onClick={onAdd} aria-label={'Add ' + name}>Add</button>

export function CartBar({ ord, byId, onOpen }) {
  const n = Object.values(ord.cart).reduce((a, b) => a + b, 0)
  const total = Object.entries(ord.cart).reduce((s, [id, q]) => s + (byId[id]?.price_paise || 0) * q, 0)
  if (!ord.can || !n) return null
  return <button className="cartbar" onClick={onOpen}><span>{n} {n === 1 ? 'item' : 'items'}</span><b>View order · {rupees(total)}</b></button>
}

export function CartSheet({ cafe, ord, byId, open, onClose, onRefresh }) {
  const [st, setSt] = useState('idle'), [msg, setMsg] = useState(''), [note, setNote] = useState(''), [done, setDone] = useState(null), [status, setStatus] = useState(null)
  const idem = useRef(null)
  const lines = Object.entries(ord.cart).map(([id, qty]) => ({ id, qty, item: byId[id] })).filter(l => l.item)
  const total = lines.reduce((s, l) => s + l.item.price_paise * l.qty, 0)
  useEffect(() => { idem.current = null }, [JSON.stringify(ord.cart), note])   // a changed order gets a new duplicate-protection key
  useEffect(() => {   // poll the safe status of the order just placed
    if (!done) return
    const t = () => { const cap = read(capKey(cafe.id)); if (cap) rpc('pos_order_status', { p_cap: cap.token, p_ref: done.ref }).then(r => r.status && setStatus(r.status)) }
    t(); const id = setInterval(t, 10000); return () => clearInterval(id)
  }, [done, cafe.id])

  const place = async (retry = false) => {
    setSt('working'); setMsg('')
    let cap = read(capKey(cafe.id))
    if (cap && Date.parse(cap.exp) < Date.now() + 30000) cap = null
    if (!cap) {
      let pos
      try { pos = await getPosition() } catch (e) {
        setSt('error'); setMsg(e && e.code === 1 ? 'Location permission was denied. You can still browse the menu. To order, allow location for this site and try again, or ask our staff to take your order.' : 'We couldn’t get your location. Please check that GPS is on and try again, or ask our staff.'); return
      }
      const r = await rpc('pos_start_session', { p_cafe: cafe.id, p_table: ord.table, p_lat: pos.latitude, p_lng: pos.longitude, p_accuracy: pos.accuracy })
      if (!r.ok) { setSt('error'); setMsg(MSG[r.reason] || MSG.error); return }
      cap = { token: r.capability, exp: r.expires_at }; write(capKey(cafe.id), cap)
    }
    idem.current = idem.current || newKey()
    const r = await rpc('pos_submit_order', { p_cap: cap.token, p_idem: idem.current, p_items: lines.map(l => ({ id: l.id, qty: l.qty })), p_note: note, p_expected: total })
    if (r.ok) {
      const refs = read(refsKey(cafe.id)) || []; write(refsKey(cafe.id), [r.ref, ...refs].slice(0, 10))
      ord.setCart({}); setNote(''); setDone({ ref: r.ref, total: r.total_minor }); setStatus(r.status || 'received'); setSt('done'); idem.current = null; return
    }
    if (r.reason === 'expired' && !retry) { try { sessionStorage.removeItem(capKey(cafe.id)) } catch {}; return place(true) }
    if (r.reason === 'price_changed') { onRefresh(); setSt('error'); setMsg('Prices changed while you were browsing. The new total is ' + rupees(r.total_minor) + '. Please review and place the order again.'); return }
    if (r.reason === 'unavailable') { onRefresh(); setSt('error'); setMsg('Some items just became unavailable' + (r.names?.length ? ': ' + r.names.join(', ') : '') + '. Please remove them and try again.'); return }
    setSt('error'); setMsg(MSG[r.reason] || MSG.error)
  }
  const close = () => { onClose(); if (st === 'done') { setSt('idle'); setDone(null) } }
  const needLoc = !read(capKey(cafe.id))
  return (<>
    <div className={'scrim' + (open ? ' on' : '')} onClick={close} />
    <div className={'sheet' + (open ? ' on' : '')} role="dialog" aria-modal="true" aria-label="Your order" aria-hidden={!open}>
      <div className="sheetbody">
        <button className="x" onClick={close} aria-label="Close">×</button>
        {st === 'done' && done ? <>
          <span className="script">Thank you</span><h3>Order {done.ref}</h3>
          <p className="price big">{rupees(done.total)}</p>
          <p><b>Status:</b> {({ received: 'Received by the café', preparing: 'Being prepared', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' })[status] || 'Received'}</p>
          <p className="badge">Pay at the counter · Payment pending</p>
          <p className="mut small">Keep this reference: {done.ref}. Our staff record your payment when you pay.</p>
        </> : <>
          <span className="script">Table order</span><h3>Your order</h3>
          {!lines.length && <p className="mut">Your order is empty.</p>}
          {lines.map(l => <div key={l.id} className="cl"><span>{l.item.name}<small className="mut"> {rupees(l.item.price_paise)}</small></span><span className="clq"><button onClick={() => ord.sub(l.id)} aria-label={'Remove one ' + l.item.name}>−</button><b>{l.qty}</b><button onClick={() => ord.add(l.id)} aria-label={'Add one ' + l.item.name}>+</button></span></div>)}
          <label className="mut small" htmlFor="ordnote">Note for the kitchen (optional)</label>
          <input id="ordnote" className="search" maxLength={140} value={note} onChange={e => setNote(e.target.value)} placeholder="Less sugar, no onions…" />
          <p className="cl total"><b>Total</b><b>{rupees(total)}</b></p>
          {needLoc && <p className="mut small">To order from your table we check that you’re inside the café. Your location is used once for this check and isn’t stored. You can keep browsing without sharing it.</p>}
          {msg && <p className="ordmsg" role="alert">{msg}</p>}
          <button className="btn" disabled={!lines.length || st === 'working'} onClick={() => place()}>{st === 'working' ? 'Please wait…' : needLoc ? 'Share location and place order' : 'Place order'}</button>
          <p className="mut small">Pay at the counter. The café confirms your payment; nothing is charged online.</p>
        </>}
      </div>
    </div>
  </>)
}
