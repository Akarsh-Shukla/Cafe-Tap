import { useEffect, useRef, useState } from 'react'
import QRCodeStyling from 'qr-code-styling'
import { supabase } from '../../lib/supabase'

function DesignerQRCode({ url, id, color, dotType, cornerSquareType, cornerDotType, size = 180, onQrReady }) {
  const containerRef = useRef(null)
  const qrCodeRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: size,
        height: size,
        type: 'svg',
        data: url,
        image: '/icons/cup-icon.svg',
        dotsOptions: {
          color: color,
          type: dotType || 'extra-rounded'
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 4,
          imageSize: 0.36,
          hideBackgroundDots: true
        },
        cornersSquareOptions: {
          color: color,
          type: cornerSquareType || 'extra-rounded'
        },
        cornersDotOptions: {
          color: color,
          type: cornerDotType || 'dot'
        }
      })

      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        qrCodeRef.current.append(containerRef.current)
      }
    } else {
      qrCodeRef.current.update({
        data: url,
        dotsOptions: { color, type: dotType || 'extra-rounded' },
        cornersSquareOptions: { color, type: cornerSquareType || 'extra-rounded' },
        cornersDotOptions: { color, type: cornerDotType || 'dot' },
        image: '/icons/cup-icon.svg'
      })
    }

    if (onQrReady) {
      onQrReady(id, qrCodeRef.current)
    }
  }, [url, color, dotType, cornerSquareType, cornerDotType, size])

  return (
    <div
      id={id}
      ref={containerRef}
      className="styled-qr-box"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        padding: '10px',
        borderRadius: '18px',
        border: '1.5px solid #e7e5e4',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
      }}
    />
  )
}

export default function Tables({ cafe }) {
  const [rows, setRows] = useState([]), [name, setName] = useState('')
  const [dotType, setDotType] = useState('extra-rounded')
  const [cornerSquareType, setCornerSquareType] = useState('extra-rounded')
  const [cornerDotType, setCornerDotType] = useState('dot')
  const [qrColor, setQrColor] = useState(cafe.settings?.design?.accent || '#1c1917')

  const qrInstances = useRef({})
  const base = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, '')
  const local = /localhost|127\.0\.0\.1|192\.168\./.test(base)

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

  const downloadQR = (id, label, ext = 'png') => {
    const qr = qrInstances.current[id]
    const filename = `${(cafe.name || 'cafe').toLowerCase().replace(/\s+/g, '-')}-${(label || 'qr').toLowerCase().replace(/\s+/g, '-')}`
    if (qr && typeof qr.download === 'function') {
      qr.download({ name: filename, extension: ext })
    }
  }

  const printCards = () => {
    document.body.classList.add('printing-qr')
    window.print()
    setTimeout(() => document.body.classList.remove('printing-qr'), 800)
  }

  const items = [
    { id: 'main', label: 'Main Café Counter', url: `${base}/${cafe.slug}`, on: true },
    ...rows.map(r => ({ id: 'q' + r.id, label: r.display_name, url: `${base}/${cafe.slug}/t/${r.token}`, on: r.is_active, row: r }))
  ]

  const registerQrInstance = (id, instance) => {
    qrInstances.current[id] = instance
  }

  const standCard = (i) => (
    <div key={i.id} className={'table-stand-card' + (i.on ? '' : ' off')}>
      <div className="stand-nfc-header">((( • ))) Tap NFC or Scan QR</div>
      {/* Prominent Cafe Name showing which cafe this QR belongs to */}
      <h3 className="stand-cafe-title">{cafe.name}</h3>
      <span className="stand-table-pill" style={{ background: qrColor }}>{i.label}</span>

      <div style={{ margin: '6px 0 10px' }}>
        <DesignerQRCode
          id={i.id}
          url={i.url}
          size={175}
          color={qrColor}
          dotType={dotType}
          cornerSquareType={cornerSquareType}
          cornerDotType={cornerDotType}
          onQrReady={registerQrInstance}
        />
      </div>

      <div className="stand-instructions">
        <span className="stand-instruction-step">✓ 1. Point camera or tap phone to open menu</span>
        <span className="stand-instruction-step">✓ 2. Explore combos, add-ons & daily offers</span>
        <span className="stand-instruction-step">✓ 3. Order directly to {i.label} · No app needed</span>
      </div>
      <div className="stand-footer">
        Powered by CafeTap · {cafe.name} Table Ordering
      </div>

      <div className="qr-card-actions noprint" style={{ flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
        <button className="link" onClick={() => downloadQR(i.id, i.label, 'png')}>
          📥 PNG (HD)
        </button>
        <button className="link" onClick={() => downloadQR(i.id, i.label, 'svg')}>
          📥 SVG
        </button>
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

      {/* Header and Print Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div>
          <b style={{ fontSize: '18px' }}>Designer QR Table Stands</b>
          <p className="muted" style={{ margin: '2px 0 0' }}>
            Styled with modern dot patterns and the CafeTap coffee cup in the center. Shows your café name <b>{cafe.name}</b> on every table stand.
          </p>
        </div>
        <button className="btn noprint" onClick={printCards}>
          🖨️ Print Stand Cards (Acrylic Sized)
        </button>
      </div>

      {/* Interactive QR Styling Controls */}
      <div className="panel noprint" style={{ marginBottom: '18px', padding: '16px' }}>
        <b style={{ fontSize: '14px', display: 'block', marginBottom: '10px' }}>Customise QR Patterns & Colors</b>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--mu)', display: 'block', marginBottom: '4px' }}>Dot Pattern</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                ['extra-rounded', 'Modern Rounded'],
                ['dots', 'Smooth Dots'],
                ['classy-rounded', 'Classy Elegant'],
                ['rounded', 'Standard Round']
              ].map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  className={'fchip' + (dotType === t ? ' on' : '')}
                  style={{ fontSize: '11px', padding: '4px 10px', height: 'auto' }}
                  onClick={() => setDotType(t)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--mu)', display: 'block', marginBottom: '4px' }}>Corner Eye Style</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                ['extra-rounded', 'Curved Square'],
                ['dot', 'Circular Ring']
              ].map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  className={'fchip' + (cornerSquareType === t ? ' on' : '')}
                  style={{ fontSize: '11px', padding: '4px 10px', height: 'auto' }}
                  onClick={() => setCornerSquareType(t)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--mu)', display: 'block', marginBottom: '4px' }}>Theme Color</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {[
                [cafe.settings?.design?.accent || '#1c1917', 'Café Accent'],
                ['#a86e53', 'Rose Gold'],
                ['#78350f', 'Espresso'],
                ['#1e3a8a', 'Royal Blue'],
                ['#1c1917', 'Deep Black']
              ].map(([col, title]) => (
                <button
                  key={col}
                  type="button"
                  title={title}
                  onClick={() => setQrColor(col)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: col,
                    border: qrColor === col ? '3px solid #ffffff' : '2px solid transparent',
                    boxShadow: qrColor === col ? '0 0 0 2px var(--ac, #1c1917)' : '0 2px 5px rgba(0,0,0,0.2)',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Counter Table Stand Mockup */}
      <div className="main-wrap" style={{ margin: '16px auto 24px', maxWidth: '320px' }}>
        {standCard(items[0])}
      </div>

      {/* NFC / Acrylic Table Instructions */}
      <div className="panel noprint" style={{ marginTop: '16px' }}>
        <b>Put it on an NFC tag or acrylic table stand</b>
        <p className="muted">
          Print the cards to slip into standard 4×6″ or 3×5″ acrylic table stands. For contactless tap, write the link to a blank NFC tag using NFC Tools and stick it underneath the table or stand.
        </p>
      </div>

      {/* Individual Table Cards */}
      <details className="panel" style={{ marginTop: '16px' }} open>
        <summary><b>Individual table cards ({rows.length} created)</b></summary>
        <p className="muted" style={{ margin: '8px 0 12px' }}>
          Each table code displays that specific table’s name automatically when scanned by the customer.
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
