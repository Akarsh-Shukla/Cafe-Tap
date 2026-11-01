import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { rpc, MSG } from '../../lib/pos'

export default function PosSettings({ cafe }) {
  const [f, setF] = useState({ dine: false, acc: false, lat: '', lng: '', radius: 100 }), [msg, setMsg] = useState('')
  useEffect(() => { supabase.from('cafe_pos_settings').select('*').eq('cafe_id', cafe.id).maybeSingle().then(({ data }) => data && setF({ dine: data.dine_in_enabled, acc: data.accepting_orders, lat: data.lat ?? '', lng: data.lng ?? '', radius: data.radius_m })) }, [cafe.id])
  const here = () => navigator.geolocation?.getCurrentPosition(p => setF(x => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })), () => setMsg('Couldn’t read your location. Allow location for this site, or type the numbers from Google Maps.'), { enableHighAccuracy: true, timeout: 15000 })
  const save = async () => {
    const lat = f.lat === '' ? null : parseFloat(f.lat), lng = f.lng === '' ? null : parseFloat(f.lng)
    const r = await rpc('pos_save_settings', { p_cafe: cafe.id, p_dine_in: f.dine, p_accepting: f.acc, p_lat: lat, p_lng: lng, p_radius: parseInt(f.radius, 10) })
    setMsg(r.ok ? 'Saved' : r.reason === 'location' ? 'Set the café location before turning on dine-in ordering.' : MSG[r.reason] || MSG.error)
  }
  return (<div className="panel"><h2 style={{ marginTop: 0 }}>Dine-in ordering</h2>
    <label className="chk"><input type="checkbox" checked={f.dine} onChange={e => setF({ ...f, dine: e.target.checked })} /> Let guests order from their table</label>
    <label className="chk"><input type="checkbox" checked={f.acc} onChange={e => setF({ ...f, acc: e.target.checked })} /> Accepting orders right now (switch off to pause)</label>
    <label>Café location (latitude, longitude)</label>
    <div className="row"><input value={f.lat} onChange={e => setF({ ...f, lat: e.target.value })} placeholder="26.4499" inputMode="decimal" /><input value={f.lng} onChange={e => setF({ ...f, lng: e.target.value })} placeholder="80.3319" inputMode="decimal" /></div>
    <button className="ghost" onClick={here}>Use my current location (stand inside the café)</button>
    <label>Allowed distance from this point (metres, 20 to 1000)</label><input type="number" min="20" max="1000" value={f.radius} onChange={e => setF({ ...f, radius: e.target.value })} />
    <p className="muted">Every guest order waits for your staff to approve it before it reaches the kitchen or the bill. Phone GPS is less accurate indoors: test on two or three phones, and avoid a very small distance. The location check discourages casual fake orders; it can’t stop a determined person.</p>
    <button onClick={save}>Save</button> {msg && <span className={msg === 'Saved' ? 'ok' : 'err'}> {msg}</span>}</div>)
}
