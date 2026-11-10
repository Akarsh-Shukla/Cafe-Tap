import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rpc, rupees, newKey, getPosition, MSG } from '../lib/pos'
import DigitalBill from '../components/DigitalBill.jsx'

const capKey = id => 'ct_cap_' + id, refsKey = id => 'ct_refs_' + id
const read = k => { try { return JSON.parse(sessionStorage.getItem(k)) } catch { return null } }
const write = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)) } catch {} }

// Tells the menu whether this guest can order (café has the POS plan, ordering is on, and they arrived through a table link).
export function useOrdering(cafe) {
  let table = null; try { table = sessionStorage.getItem('ct_tbl_' + cafe.id) } catch {}
  const [enabled, setEnabled] = useState(false), [cart, setCart] = useState({})
  useEffect(() => { rpc('pos_ordering_state', { p_cafe: cafe.id }).then(r => setEnabled(!!r.enabled)) }, [cafe.id])

  const add = (id, addons = []) => {
    const key = addons && addons.length > 0 ? `${id}::${JSON.stringify([...addons].sort())}` : id
    setCart(c => ({ ...c, [key]: Math.min((c[key] || 0) + 1, 20) }))
  }
  const sub = (id, addons = []) => {
    const key = addons && addons.length > 0 ? `${id}::${JSON.stringify([...addons].sort())}` : id
    setCart(c => { const n = { ...c }; if ((n[key] || 0) <= 1) delete n[key]; else n[key]--; return n })
  }
  const addKey = key => setCart(c => ({ ...c, [key]: Math.min((c[key] || 0) + 1, 20) }))
  const subKey = key => setCart(c => { const n = { ...c }; if ((n[key] || 0) <= 1) delete n[key]; else n[key]--; return n })

  return { enabled, table, can: enabled && !!table, hint: enabled && !table, cart, setCart, add, sub, addKey, subKey }
}

export const Stepper = ({ qty, onAdd, onSub, name }) => qty
  ? <div className="step" role="group" aria-label={'Quantity of ' + name}><button onClick={onSub} aria-label={'Remove one ' + name}>−</button><b key={qty} aria-live="polite">{qty}</b><button onClick={onAdd} aria-label={'Add one ' + name}>+</button></div>
  : <button className="step add" onClick={onAdd} aria-label={'Add ' + name}>Add</button>

export function CartBar({ ord, byId, onOpen }) {
  const n = Object.values(ord.cart).reduce((a, b) => a + b, 0)
  const total = Object.entries(ord.cart).reduce((s, [key, q]) => {
    const [id, addonsRaw] = key.split('::')
    const item = byId[id]
    if (!item) return s
    let addonSum = 0
    if (addonsRaw) {
      try {
        const addons = JSON.parse(addonsRaw)
        addonSum = addons.reduce((sum, aName) => {
          const ao = (item.add_ons || []).find(a => (a.name || '').toLowerCase() === aName.toLowerCase())
          return sum + (ao?.price_paise || 0)
        }, 0)
      } catch {}
    }
    return s + ((item.price_paise || 0) + addonSum) * q
  }, 0)

  if (!ord.can || !n) return null
  return <button className="cartbar" onClick={onOpen}><span>{n} {n === 1 ? 'item' : 'items'}</span><b>View order · {rupees(total)}</b></button>
}

export function CartSheet({ cafe, ord, byId, open, onClose, onRefresh }) {
  const [st, setSt] = useState('idle'), [msg, setMsg] = useState(''), [note, setNote] = useState(''), [done, setDone] = useState(null), [status, setStatus] = useState(null)
  const [orderData, setOrderData] = useState(null), [showBill, setShowBill] = useState(false)
  const [offers, setOffers] = useState([]), [selectedOfferId, setSelectedOfferId] = useState(null)
  const idem = useRef(null)

  // Parse lines with possible addons
  const lines = Object.entries(ord.cart).map(([key, qty]) => {
    const [id, addonsRaw] = key.split('::')
    const item = byId[id]
    if (!item) return null
    let addons = []
    if (addonsRaw) {
      try { addons = JSON.parse(addonsRaw) } catch {}
    }
    const addonPrice = addons.reduce((sum, aName) => {
      const ao = (item.add_ons || []).find(a => (a.name || '').toLowerCase() === aName.toLowerCase())
      return sum + (ao?.price_paise || 0)
    }, 0)
    const unitPrice = (item.price_paise || 0) + addonPrice
    return {
      key,
      id,
      qty,
      item,
      addons,
      unitPrice,
      lineTotal: unitPrice * qty
    }
  }).filter(Boolean)

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const totalCount = lines.reduce((s, l) => s + l.qty, 0)
  const cheapestUnitPrice = lines.length ? Math.min(...lines.map(l => l.unitPrice)) : 0

  useEffect(() => {
    if (!open || !cafe?.id) return
    const today = new Date().toISOString().slice(0, 10)
    supabase.from('offers').select('*').eq('cafe_id', cafe.id).eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => {
        const validOffers = (data || []).filter(o => !o.valid_until || o.valid_until >= today)
        setOffers(validOffers)
      })
  }, [open, cafe?.id])

  const calcDiscount = (o) => {
    if (!o) return 0
    if (subtotal < (o.min_order_paise || 0)) return 0
    if (o.kind === 'bogo') {
      return totalCount >= 2 ? cheapestUnitPrice : 0
    }
    if (o.kind === 'percent' && o.discount_percent) {
      return Math.min(subtotal, Math.round(subtotal * (Number(o.discount_percent) / 100)))
    }
    if (o.kind === 'flat' && o.discount_paise) {
      return Math.min(subtotal, o.discount_paise)
    }
    if (o.kind === 'combo') {
      return Math.min(subtotal, o.discount_paise || Math.round(subtotal * 0.15))
    }
    return 0
  }

  const eligibleOffers = offers.map(o => ({ ...o, discount: calcDiscount(o) })).filter(o => o.discount > 0)
  const activeOffer = eligibleOffers.find(o => o.id === selectedOfferId) || (selectedOfferId === 'NONE' ? null : eligibleOffers[0]) || null
  const discountAmount = activeOffer ? activeOffer.discount : 0
  const finalTotal = Math.max(0, subtotal - discountAmount)

  useEffect(() => { idem.current = null }, [JSON.stringify(ord.cart), note, activeOffer?.id])

  useEffect(() => {
    if (!done) return
    const t = () => {
      const cap = read(capKey(cafe.id))
      if (cap) {
        rpc('pos_order_status', { p_cap: cap.token, p_ref: done.ref }).then(r => {
          if (r && r.status) {
            setStatus(r.status)
            setOrderData(r)
          }
        })
      }
    }
    t(); const id = setInterval(t, 6000); return () => clearInterval(id)
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
    const r = await rpc('pos_submit_order', {
      p_cap: cap.token,
      p_idem: idem.current,
      p_items: lines.map(l => ({ id: l.id, qty: l.qty, ...(l.addons.length ? { addons: l.addons } : {}) })),
      p_note: note,
      p_expected: finalTotal,
      p_offer: activeOffer?.id || null
    })
    if (r.ok) {
      const refs = read(refsKey(cafe.id)) || []; write(refsKey(cafe.id), [r.ref, ...refs].slice(0, 10))
      ord.setCart({}); setNote(''); setDone({ ref: r.ref, total: r.total_minor, discount: discountAmount, offerTitle: activeOffer?.title }); setStatus(r.status || 'pending'); setSt('done'); idem.current = null; return
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
          <span className="script">Thank you</span><h3>Order #{done.ref}</h3>
          <p className="price big">{rupees(orderData?.bill_total_minor || done.total)}</p>
          <p><b>Status:</b> {({ pending: 'Sent. Waiting for café to confirm', received: 'Confirmed by the café', preparing: 'Being prepared', ready: 'Ready to serve', completed: 'Completed', cancelled: 'Not accepted by café' })[status] || 'Sent. Waiting for café to confirm'}</p>
          {orderData?.is_paid ? (
            <div className="pay-done-box">
              <span className="bill-status-pill paid" style={{ display: 'inline-block', fontSize: '13px', padding: '6px 14px' }}>
                ✓ Paid at counter ({(orderData.payment_method || 'CONFIRMED').toUpperCase()})
              </span>
              <p className="mut small" style={{ marginTop: '8px' }}>Your payment has been received and verified by the café team. Thank you!</p>
              <button
                className="btn"
                style={{ width: '100%', marginTop: '14px', background: 'var(--ac, #16a34a)', color: 'var(--on, #ffffff)', fontWeight: '700' }}
                onClick={() => setShowBill(true)}
              >
                🧾 View & Download Paid Receipt
              </button>
              {cafe?.slug && (
                <a
                  href={`/${cafe.slug}/bill/${done.ref}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bill-ghost-btn"
                  style={{ width: '100%', marginTop: '8px', boxSizing: 'border-box' }}
                >
                  Open in Standalone Page ↗
                </a>
              )}
            </div>
          ) : (
            <div className="pay-wait-box">
              <span className="bill-status-pill pending" style={{ display: 'inline-block', fontSize: '13px', padding: '6px 14px' }}>
                Pay at counter · Payment pending
              </span>
              <p className="mut small" style={{ marginTop: '8px' }}>Keep this reference: <b>#{done.ref}</b>. Staff will confirm your order and record your payment at the counter.</p>
              <button
                className="btn"
                style={{ width: '100%', marginTop: '14px', background: 'var(--ac, #aa3300)', color: 'var(--on, #ffffff)', fontWeight: '700' }}
                onClick={() => setShowBill(true)}
              >
                🧾 View & Download Digital Bill
              </button>
              {cafe?.slug && (
                <a
                  href={`/${cafe.slug}/bill/${done.ref}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bill-ghost-btn"
                  style={{ width: '100%', marginTop: '8px', boxSizing: 'border-box' }}
                >
                  Open in Standalone Page ↗
                </a>
              )}
            </div>
          )}
        </> : <>
          <span className="script">Table order</span><h3>Your order</h3>
          {!lines.length && <p className="mut">Your order is empty.</p>}
          {lines.map(l => (
            <div key={l.key} className="cl" style={{ alignItems: 'flex-start' }}>
              <div>
                <b>{l.item.name}</b>
                {l.addons.length > 0 && (
                  <small className="mut" style={{ display: 'block', fontSize: '12px' }}>
                    +{l.addons.join(', ')}
                  </small>
                )}
                <small className="mut"> {rupees(l.unitPrice)} each</small>
              </div>
              <span className="clq">
                <button onClick={() => ord.subKey ? ord.subKey(l.key) : ord.sub(l.id)} aria-label={'Remove one ' + l.item.name}>−</button>
                <b>{l.qty}</b>
                <button onClick={() => ord.addKey ? ord.addKey(l.key) : ord.add(l.id)} aria-label={'Add one ' + l.item.name}>+</button>
              </span>
            </div>
          ))}

          {offers.length > 0 && (
            <div style={{ margin: '14px 0 10px' }}>
              <label className="mut small" style={{ display: 'block', marginBottom: '6px' }}>Offers & Discounts</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {eligibleOffers.map(o => (
                  <button
                    key={o.id}
                    type="button"
                    className={'fchip' + (activeOffer?.id === o.id ? ' on' : '')}
                    style={{ fontSize: '12px', padding: '5px 12px', height: 'auto', borderRadius: '8px' }}
                    onClick={() => setSelectedOfferId(activeOffer?.id === o.id ? 'NONE' : o.id)}
                  >
                    🏷️ {o.title} (−{rupees(o.discount)})
                  </button>
                ))}
                {eligibleOffers.length === 0 && (
                  <span className="mut small" style={{ fontStyle: 'italic' }}>
                    Add {rupees(Math.min(...offers.map(o => Math.max(0, (o.min_order_paise || 0) - subtotal))))} more to unlock offers!
                  </span>
                )}
              </div>
            </div>
          )}

          <label className="mut small" htmlFor="ordnote">Note for the kitchen (optional)</label>
          <input id="ordnote" className="search" maxLength={140} value={note} onChange={e => setNote(e.target.value)} placeholder="Less sugar, no onions…" />

          <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(120,120,120,0.2)', paddingTop: '10px' }}>
            <p className="cl" style={{ margin: '4px 0', border: 0 }}>
              <span className="mut">Subtotal</span>
              <span>{rupees(subtotal)}</span>
            </p>

            {activeOffer && discountAmount > 0 && (
              <p className="cl" style={{ margin: '4px 0', color: '#16a34a', fontWeight: 600, border: 0 }}>
                <span>Offer ({activeOffer.title})</span>
                <span>−{rupees(discountAmount)}</span>
              </p>
            )}

            <p className="cl total" style={{ marginTop: '6px' }}>
              <b>Total</b>
              <b>{rupees(finalTotal)}</b>
            </p>
          </div>

          {needLoc && <p className="mut small">To order from your table we check that you’re inside the café. Your location is used once for this check and isn’t stored. You can keep browsing without sharing it.</p>}
          {msg && <p className="ordmsg" role="alert">{msg}</p>}
          <button className="btn" disabled={!lines.length || st === 'working'} onClick={() => place()}>{st === 'working' ? 'Please wait…' : needLoc ? 'Share location and place order' : 'Place order'}</button>
          <p className="mut small">Pay at the counter. The café confirms your payment; nothing is charged online.</p>
        </>}
      </div>
    </div>
    {showBill && (
      <DigitalBill
        cafe={cafe}
        data={orderData || {
          ref: done?.ref,
          subtotal_minor: subtotal,
          order_total_minor: done?.total || finalTotal,
          bill_total_minor: done?.total || finalTotal,
          discount_minor: done?.discount || discountAmount,
          offer_title: done?.offerTitle || activeOffer?.title,
          table_name: ord.table ? 'Table' : 'Dine-In',
          items: lines.map(l => ({
            name: l.item.name + (l.addons.length ? ` (+${l.addons.join(', ')})` : ''),
            qty: l.qty,
            price_minor: l.unitPrice,
            line_total_minor: l.lineTotal
          })),
          is_paid: false
        }}
        onClose={() => setShowBill(false)}
      />
    )}
  </>)
}
