import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'

export default function Tables({ cafe }) {
  const [rows, setRows] = useState([]), [name, setName] = useState('')
  const base = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, '')
  const local = /localhost|127\.0\.0\.1|192\.168\./.test(base)
  const load = async () => { const { data } = await supabase.from('cafe_tables').select('*').eq('cafe_id', cafe.id).order('created_at'); setRows(data || []) }
  useEffect(() => { load() }, [cafe.id])
  const add = async e => { e.preventDefault(); if (!name.trim()) return; await supabase.from('cafe_tables').insert({ cafe_id: cafe.id, display_name: name.trim() }); setName(''); load() }
  const arch = async r => { await supabase.from('cafe_tables').update({ is_active: !r.is_active }).eq('id', r.id); load() }
  const dl = (id, n) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([document.getElementById(id).outerHTML], { type: 'image/svg+xml' })); a.download = n + '.svg'; a.click() }
  const items = [{ id: 'main', label: 'Main café QR', url: `${base}/${cafe.slug}`, on: true }, ...rows.map(r => ({ id: 'q' + r.id, label: r.display_name, url: `${base}/${cafe.slug}/t/${r.token}`, on: r.is_active, r }))]
  const card = i => <div key={i.id} className={'panel qr' + (i.on ? '' : ' off')}>
    <QRCodeSVG id={i.id} value={i.url} size={i.id === 'main' ? 200 : 140} marginSize={2} /><b>{i.label}</b><small>{i.url}</small>
    <div className="noprint"><button className="link" onClick={() => dl(i.id, i.label)}>Download</button>{i.row && <button className="link" onClick={() => arch(i.row)}>{i.on ? 'Archive' : 'Restore'}</button>}</div></div>
  return (<>
    {local && <p className="err">These links point to your own computer. Open this page on your live website before downloading or printing any QR code.</p>}
    <p className="muted">One QR code and one NFC tag design works for every table. Everyone lands on the same page.</p>
    <div className="qr main-wrap">{card(items[0])}</div>
    <div className="panel noprint"><b>Put it on an NFC tag</b><p className="muted">Open a free app such as NFC Tools, choose Write, add a URL record with the link above, and tap a blank tag. Write the same link on every tag, and keep the printed QR as a backup.</p></div>
    <details className="panel"><summary>Optional: a separate code for each table</summary>
      <p className="muted">Each table code opens the same page and shows the table’s name at the top. Use it only if you want that.</p>
      <form className="noprint" onSubmit={add}><div className="row"><input value={name} onChange={e => setName(e.target.value)} placeholder="Table 4 or Patio 1" /><button>Add table</button></div></form>
      <div className="qrgrid">{items.slice(1).map(card)}</div></details>
    <button className="ghost noprint" onClick={() => print()}>Print QR sheet</button>
  </>)
}
