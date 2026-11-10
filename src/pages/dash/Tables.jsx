import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'

export default function Tables({ cafe }) {
  const [rows, setRows] = useState([]), [name, setName] = useState('')
  const base = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, '')
  const local = /localhost|127\.0\.0\.1|192\.168\./.test(base)
  const accent = cafe.settings?.design?.accent || '#1c1917'
  const logoSrc = cafe.logo_url || '/icons/logo.png'

  const load = async () => {
    const { data } = await supabase.from('cafe_tables').select('*').eq('cafe_id', cafe.id).order('created_at')
    setRows(data || [])
  }
  useEffect(() => { load() }, [cafe.id])

  const add = async e => {
    e.preventDefault()
    if (!name.trim()) return
    await supabase.from('cafe_tables').insert({ cafe_id: cafe.id, display_name: name.trim() })
    setName('')
    load()
  }

  const arch = async r => {
    await supabase.from('cafe_tables').update({ is_active: !r.is_active }).eq('id', r.id)
    load()
  }

  const dl = (id, n) => {
    const el = document.getElementById(id)
    if (!el) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([el.outerHTML], { type: 'image/svg+xml' }))
    a.download = (n || 'table-qr').toLowerCase().replace(/\s+/g, '-') + '.svg'
    a.click()
  }

  const printCards = () => {
    document.body.classList.add('printing-qr')
    window.print()
    setTimeout(() => document.body.classList.remove('printing-qr'), 800)
  }

  const items = [
    { id: 'main', label: 'Main Café Menu', url: `${base}/${cafe.slug}`, on: true },
    ...rows.map(r => ({ id: 'q' + r.id, label: r.display_name, url: `${base}/${cafe.slug}/t/${r.token}`, on: r.is_active, row: r }))
  ]

  const standCard = (i) => (
    <div key={i.id} className={'table-stand-card' + (i.on ? '' : ' off')}>
      <div className="stand-nfc-header">((( • ))) Tap NFC or Scan</div>
      <h3 className="stand-cafe-title">{cafe.name}</h3>
      <span className="stand-table-pill" style={{ background: accent }}>{i.label}</span>
      <div className="stand-qr-box">
        <QRCodeSVG
          id={i.id}
          value={i.url}
          size={160}
          level="H"
          fgColor={accent}
          bgColor="#ffffff"
          marginSize={1}
          imageSettings={{
            src: logoSrc,
            height: 38,
            width: 38,
            excavate: true
          }}
        />
      </div>
      <div className="stand-instructions">
        <span className="stand-instruction-step">✓ 1. Point camera or tap phone to open</span>
        <span className="stand-instruction-step">✓ 2. Explore menu, combos & offers</span>
        <span className="stand-instruction-step">✓ 3. Order directly to your table</span>
      </div>
      <div className="stand-footer">CafeTap · No App Download Required</div>
      <div className="qr-card-actions noprint">
        <button className="link" onClick={() => dl(i.id, i.label)}>Download SVG</button>
        {i.row && (
          <button className="link" onClick={() => arch(i.row)}>
            {i.on ? 'Archive' : 'Restore'}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {local && (
        <p className="err">
          These links point to your own computer. Open this page on your live website before downloading or printing any QR code.
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div>
          <b>Designer Table Stand Cards</b>
          <p className="muted" style={{ margin: '2px 0 0' }}>
            High-error correction QR code with your logo embedded in the center, customized to your brand accent color.
          </p>
        </div>
        <button className="btn noprint" onClick={printCards}>
          🖨️ Print Stand Cards (Acrylic Sized)
        </button>
      </div>

      <div className="main-wrap" style={{ margin: '16px auto', maxWidth: '320px' }}>
        {standCard(items[0])}
      </div>

      <div className="panel noprint" style={{ marginTop: '20px' }}>
        <b>Put it on an NFC tag or acrylic table stand</b>
        <p className="muted">
          Print the card to slip into standard 4×6″ or 3×5″ acrylic table stands. For contactless tap, write the link to a blank NFC tag using NFC Tools and stick it underneath the table or stand.
        </p>
      </div>

      <details className="panel" style={{ marginTop: '16px' }} open>
        <summary><b>Individual table cards ({rows.length} created)</b></summary>
        <p className="muted" style={{ margin: '8px 0 12px' }}>
          Each table code shows that specific table’s name automatically when the customer scans it.
        </p>
        <form className="noprint" onSubmit={add} style={{ marginBottom: '16px' }}>
          <div className="row">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Table 4, Balcony 2, Patio 1" />
            <button>Add table</button>
          </div>
        </form>
        <div className="printable-stand-grid">
          {items.slice(1).map(standCard)}
        </div>
      </details>
    </>
  )
}
