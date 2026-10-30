import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { rpc, MSG } from '../../lib/pos'

export default function PosSettings({ cafe, isAdmin }) {
  const [f, setF] = useState({ dine: false, acc: false, lat: '', lng: '', radius: 100 }), [msg, setMsg] = useState(''), [staff, setStaff] = useState([]), [ns, setNs] = useState({ email: '', orders: true, payments: false, close: false, reports: false })
  useEffect(() => {
    supabase.from('cafe_pos_settings').select('*').eq('cafe_id', cafe.id).maybeSingle().then(({ data }) => data && setF({ dine: data.dine_in_enabled, acc: data.accepting_orders, lat: data.lat ?? '', lng: data.lng ?? '', radius: data.radius_m }))
    if (!isAdmin) loadStaff()
  }, [cafe.id])
  const loadStaff = async () => { const r = await rpc('pos_list_staff', { p_cafe: cafe.id }); setStaff(Array.isArray(r) ? r : []) }
  const here = () => navigator.geolocation?.getCurrentPosition(p => setF(x => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })), () => setMsg('Couldn’t read your location. Allow location for this site, or type the numbers from Google Maps.'), { enableHighAccuracy: true, timeout: 15000 })
  const save = async () => {
    const lat = f.lat === '' ? null : parseFloat(f.lat), lng = f.lng === '' ? null : parseFloat(f.lng)
    const r = await rpc('pos_save_settings', { p_cafe: cafe.id, p_dine_in: f.dine, p_accepting: f.acc, p_lat: lat, p_lng: lng, p_radius: parseInt(f.radius, 10) })
    setMsg(r.ok ? 'Saved' : r.reason === 'location' ? 'Set the café location before turning on dine-in ordering.' : MSG[r.reason] || MSG.error)
  }
  const add = async () => { const r = await rpc('pos_add_staff', { p_cafe: cafe.id, p_email: ns.email, p_orders: ns.orders, p_payments: ns.payments, p_close: ns.close, p_reports: ns.reports }); setMsg(r.ok ? 'Staff added' : MSG[r.reason] || MSG.error); if (r.ok) { setNs({ ...ns, email: '' }); loadStaff() } }
  const upd = async (m, k, v) => { await rpc('pos_update_staff', { p_member: m.id, p_orders: k === 'orders' ? v : null, p_payments: k === 'payments' ? v : null, p_close: k === 'close' ? v : null, p_reports: k === 'reports' ? v : null, p_active: k === 'active' ? v : null }); loadStaff() }
  return (<>
    <div className="panel"><h2 style={{ marginTop: 0 }}>Dine-in ordering</h2>
      <label className="chk"><input type="checkbox" checked={f.dine} onChange={e => setF({ ...f, dine: e.target.checked })} /> Let guests order from their table</label>
      <label className="chk"><input type="checkbox" checked={f.acc} onChange={e => setF({ ...f, acc: e.target.checked })} /> Accepting orders right now (switch off to pause)</label>
      <label>Café location (latitude, longitude)</label>
      <div className="row"><input value={f.lat} onChange={e => setF({ ...f, lat: e.target.value })} placeholder="26.4499" inputMode="decimal" /><input value={f.lng} onChange={e => setF({ ...f, lng: e.target.value })} placeholder="80.3319" inputMode="decimal" /></div>
      <button className="ghost" onClick={here}>Use my current location (stand inside the café)</button>
      <label>Allowed distance from this point (metres, 20 to 1000)</label><input type="number" min="20" max="1000" value={f.radius} onChange={e => setF({ ...f, radius: e.target.value })} />
      <p className="muted">Phone GPS is less accurate indoors. Test on two or three phones before going live and avoid a very small distance, or genuine guests get blocked. The location check discourages casual fake orders; it can’t stop a determined person.</p>
      <button onClick={save}>Save</button> {msg && <span className={/^(Saved|Staff added)/.test(msg) ? 'ok' : 'err'}> {msg}</span>}</div>
    {!isAdmin && <div className="panel"><h2 style={{ marginTop: 0 }}>Staff</h2>
      <p className="muted">CafeTap creates each staff login first. Then add their email here and choose what they may do.</p>
      {staff.map(m => <div key={m.id} className="sub"><b>{m.email}</b> {!m.active && <span className="muted">(off)</span>}
        {[['orders', 'Orders'], ['payments', 'Record payments'], ['close', 'Close tables'], ['reports', 'Sales']].map(([k, l]) => <label key={k} className="chk"><input type="checkbox" checked={m[k]} onChange={e => upd(m, k, e.target.checked)} /> {l}</label>)}
        <button className="link" onClick={() => upd(m, 'active', !m.active)}>{m.active ? 'Turn access off' : 'Turn access on'}</button></div>)}
      <h3>Add staff</h3><input type="email" placeholder="staff@example.com" value={ns.email} onChange={e => setNs({ ...ns, email: e.target.value })} />
      {[['orders', 'Orders'], ['payments', 'Record payments'], ['close', 'Close tables'], ['reports', 'Sales']].map(([k, l]) => <label key={k} className="chk"><input type="checkbox" checked={ns[k]} onChange={e => setNs({ ...ns, [k]: e.target.checked })} /> {l}</label>)}
      <button onClick={add} disabled={!ns.email}>Add staff</button></div>}
  </>)
}
