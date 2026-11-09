import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { rpc, MSG } from '../../lib/pos'

export default function PosSettings({ cafe }) {
  const [f, setF] = useState({
    dine: false, acc: false, lat: '', lng: '', radius: 100,
    tax_enabled: false, tax_name: 'Tax', tax_percent: '5', business_reg_no: '', receipt_note: ''
  }), [msg, setMsg] = useState('')
  useEffect(() => {
    supabase.from('cafe_pos_settings').select('*').eq('cafe_id', cafe.id).maybeSingle().then(({ data }) => {
      if (data) {
        setF({
          dine: data.dine_in_enabled,
          acc: data.accepting_orders,
          lat: data.lat ?? '',
          lng: data.lng ?? '',
          radius: data.radius_m,
          tax_enabled: !!data.tax_enabled,
          tax_name: data.tax_name || 'Tax',
          tax_percent: String(data.tax_percent ?? '5'),
          business_reg_no: data.business_reg_no || '',
          receipt_note: data.receipt_note || ''
        })
      }
    })
  }, [cafe.id])
  const here = () => navigator.geolocation?.getCurrentPosition(p => setF(x => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })), () => setMsg('Couldn’t read your location. Allow location for this site, or type the numbers from Google Maps.'), { enableHighAccuracy: true, timeout: 15000 })
  const save = async () => {
    const lat = f.lat === '' ? null : parseFloat(f.lat), lng = f.lng === '' ? null : parseFloat(f.lng)
    const r = await rpc('pos_save_settings', {
      p_cafe: cafe.id,
      p_dine_in: f.dine,
      p_accepting: f.acc,
      p_lat: lat,
      p_lng: lng,
      p_radius: parseInt(f.radius, 10),
      p_tax_enabled: f.tax_enabled,
      p_tax_name: f.tax_name.trim() || 'Tax',
      p_tax_percent: parseFloat(f.tax_percent || 0),
      p_reg_no: f.business_reg_no.trim() || null,
      p_receipt_note: f.receipt_note.trim() || null
    })
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

    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--bd)' }}>
      <h3 style={{ marginTop: 0 }}>Digital Bill & Tax Details</h3>
      <label className="chk"><input type="checkbox" checked={f.tax_enabled} onChange={e => setF({ ...f, tax_enabled: e.target.checked })} /> Show tax breakdown on bills & receipts</label>
      {f.tax_enabled && (
        <div className="row">
          <label style={{ flex: 2 }}>Tax label<input value={f.tax_name} onChange={e => setF({ ...f, tax_name: e.target.value })} placeholder="e.g. VAT, GST, or Service Tax" maxLength={30} /></label>
          <label style={{ flex: 1 }}>Tax rate (%)<input type="number" min="0" max="100" step="0.1" value={f.tax_percent} onChange={e => setF({ ...f, tax_percent: e.target.value })} /></label>
        </div>
      )}
      <label>Business / FSSAI Registration No. (optional)</label>
      <input value={f.business_reg_no} onChange={e => setF({ ...f, business_reg_no: e.target.value })} placeholder="e.g. FSSAI 12345678901234 or Reg No." maxLength={40} />
      <label>Thank you message on bill (optional)</label>
      <input value={f.receipt_note} onChange={e => setF({ ...f, receipt_note: e.target.value })} placeholder="Thank you for dining with us! Visit again." maxLength={140} />
      <p className="muted">Receipts are issued as Retail Dining Receipts / Cash Memos. Avoids statutory GST registration liabilities for unregistered or composition cafés.</p>
    </div>

    <button onClick={save}>Save</button> {msg && <span className={msg === 'Saved' ? 'ok' : 'err'}> {msg}</span>}</div>)
}
