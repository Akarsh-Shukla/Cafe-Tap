import React from 'react'
import { rupees } from '../lib/pos'

export default function DigitalBill({ cafe, data, onClose }) {
  if (!data) return null

  const items = data.items || []
  const rawSubtotal = Number(data.subtotal_minor) || items.reduce((s, i) => s + (i.line_total_minor || ((i.price_minor || i.unit_price_minor || i.price_paise || 0) * (i.qty || 1)) || 0), 0)
  const discountMinor = Number(data.discount_minor || 0)
  const netSubtotal = Math.max(0, rawSubtotal - discountMinor)
  const subtotal = (data.order_total_minor || data.bill_total_minor) ? (data.order_total_minor || data.bill_total_minor) : netSubtotal

  const isPaid = !!data.is_paid
  const taxEnabled = !!data.tax_enabled
  const taxPercent = Number(data.tax_percent || 5)
  const taxName = data.tax_name || 'Tax'

  // If tax is enabled, calculate tax portion based on net amount
  const taxAmount = taxEnabled ? Math.round(netSubtotal * (taxPercent / 100)) : 0
  const grandTotal = taxEnabled ? netSubtotal + taxAmount : netSubtotal
  const paidAmount = isPaid ? (data.paid_minor || grandTotal) : (data.paid_minor || 0)
  const balance = Math.max(0, grandTotal - paidAmount)

  const printReceipt = () => {
    document.body.classList.add('printing-bill')
    window.print()
    setTimeout(() => document.body.classList.remove('printing-bill'), 800)
  }

  const downloadHtmlBill = () => {
    const el = document.querySelector('.printable-receipt')
    if (!el) return
    const content = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receipt #${data.ref || 'bill'}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f5f5f4;margin:0;padding:20px 10px;display:flex;justify-content:center}
  .bill-card{background:#fff;max-width:440px;width:100%;padding:24px 20px;border-radius:18px;box-shadow:0 4px 24px rgba(0,0,0,.1);box-sizing:border-box}
  .bill-header{text-align:center;padding-bottom:12px}
  .bill-badge-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .bill-doc-type{font-size:12px;font-weight:800;letter-spacing:1.5px;color:#78716c;text-transform:uppercase}
  .bill-status-pill{font-size:11px;font-weight:700;letter-spacing:.5px;padding:3px 10px;border-radius:99px}
  .bill-status-pill.paid{background:#dcfce7;color:#166534;border:1px solid #86efac}
  .bill-status-pill.pending{background:#fef3c7;color:#92400e;border:1px solid #fde68a}
  .bill-cafe-name{font-size:24px;margin:4px 0 2px;color:#1c1917}
  .bill-cafe-meta{margin:2px 0;font-size:12px;color:#57534e}
  .bill-meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:#f5f5f4;padding:10px 12px;border-radius:10px;margin:12px 0;font-size:12px}
  .bill-meta-label{display:block;font-size:10px;color:#78716c;text-transform:uppercase}
  .bill-meta-val{font-weight:700;color:#1c1917}
  .bill-div{border:0;border-top:1px dashed #d6d3d1;margin:14px 0}
  .bill-table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0;table-layout:fixed}
  .bill-table th{background:#292524;color:#fafaf9;padding:6px;font-size:11px;text-transform:uppercase;letter-spacing:.6px}
  .bill-table th:first-child{border-radius:6px 0 0 6px}
  .bill-table th:last-child{border-radius:0 6px 6px 0}
  .bill-table td{padding:8px 6px;border-bottom:1px solid #f5f5f4;vertical-align:top;word-break:break-word}
  .bill-totals{margin-left:auto;width:min(240px,100%);padding-top:6px}
  .bill-total-row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px;color:#44403c}
  .bill-total-row.grand{font-size:16px;font-weight:800;color:#1c1917;border-top:1.5px solid #1c1917;padding-top:6px;margin-top:4px}
  .bill-footer{text-align:center;margin-top:18px;padding-top:10px;border-top:1px dashed #e7e5e4}
  .bill-note{font-size:12px;font-style:italic;color:#44403c;margin:0 0 4px}
  .bill-legal{font-size:10px;color:#a8a29e;margin:0}
</style>
</head>
<body>
  <div class="bill-card">${el.innerHTML}</div>
</body>
</html>`
    const blob = new Blob([content], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `receipt-${data.ref || 'bill'}.html`
    a.click()
  }

  const shareWhatsApp = () => {
    const slug = cafe?.slug || ''
    const billUrl = slug ? `${window.location.origin}/${slug}/bill/${data.ref}` : window.location.href
    const cafeName = data.cafe_name || cafe?.name || 'Cafe'
    const msg = `Digital Receipt from ${cafeName}\nOrder #${data.ref}\nTotal: ₹${(grandTotal / 100).toFixed(2)}\nStatus: ${isPaid ? 'PAID' : 'PAYMENT PENDING'}\nView Bill: ${billUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const dateStr = data.created_at ? new Date(data.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : new Date().toLocaleString('en-IN')

  return (
    <div className="digital-bill-overlay" role="dialog" aria-modal="true" aria-label="Digital Receipt" onClick={e => { if (e.target === e.currentTarget && onClose) onClose() }}>
      <div className="digital-bill-container">
        <div className="digital-bill-topbar noprint">
          {onClose ? (
            <button className="bill-back-btn" onClick={onClose} aria-label="Close">
              ← Close
            </button>
          ) : (
            <span />
          )}
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#fafaf9' }}>Digital Receipt</span>
          {data.ref && cafe?.slug && (
            <a
              href={`/${cafe.slug}/bill/${data.ref}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bill-ext-link"
              title="Open standalone bill page"
            >
              Open Tab ↗
            </a>
          )}
        </div>

        <div className="bill-card printable-receipt">
          {/* Decorative Warm Top Header */}
          <div className="bill-header">
            <div className="bill-badge-row">
              <span className="bill-doc-type">RETAIL RECEIPT</span>
              <span className={'bill-status-pill ' + (isPaid ? 'paid' : 'pending')}>
                {isPaid ? `PAID (${(data.payment_method || 'CONFIRMED').toUpperCase()})` : 'PAYMENT PENDING'}
              </span>
            </div>

            <h2 className="bill-cafe-name">{data.cafe_name || cafe?.name || 'Cafe'}</h2>
            {(data.cafe_address || cafe?.settings?.address) && (
              <p className="bill-cafe-meta">{data.cafe_address || cafe?.settings?.address}</p>
            )}
            {(data.cafe_phone || cafe?.settings?.phone) && (
              <p className="bill-cafe-meta">Phone: {data.cafe_phone || cafe?.settings?.phone}</p>
            )}
            {data.business_reg_no && (
              <p className="bill-cafe-meta">Reg / FSSAI: {data.business_reg_no}</p>
            )}
          </div>

          <div className="bill-meta-grid">
            <div>
              <span className="bill-meta-label">Receipt / Ref</span>
              <b className="bill-meta-val">#{data.ref || '0000'}</b>
            </div>
            <div>
              <span className="bill-meta-label">Table</span>
              <b className="bill-meta-val">{data.table_name || 'Dine-In'}</b>
            </div>
            <div>
              <span className="bill-meta-label">Date & Time</span>
              <b className="bill-meta-val">{dateStr}</b>
            </div>
          </div>

          <hr className="bill-div" />

          {/* Itemized Table */}
          <table className="bill-table">
            <thead>
              <tr>
                <th style={{ width: '12%', textAlign: 'left' }}>Qty</th>
                <th style={{ width: '50%', textAlign: 'left' }}>Description</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Price</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td><b>{it.qty}</b></td>
                  <td>{it.name || it.name_snapshot}</td>
                  <td style={{ textAlign: 'right' }}>{rupees(it.price_minor || it.unit_price_minor || (it.price_paise))}</td>
                  <td style={{ textAlign: 'right' }}><b>{rupees(it.line_total_minor || ((it.price_minor || it.price_paise) * it.qty))}</b></td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="bill-div" />

          {/* Totals Section */}
          <div className="bill-totals">
            <div className="bill-total-row">
              <span>Sub Total</span>
              <span>{rupees(rawSubtotal)}</span>
            </div>
            {discountMinor > 0 && (
              <div className="bill-total-row" style={{ color: '#16a34a', fontWeight: 600 }}>
                <span>Offer Discount {data.offer_title ? `(${data.offer_title})` : ''}</span>
                <span>−{rupees(discountMinor)}</span>
              </div>
            )}
            {taxEnabled && (
              <div className="bill-total-row">
                <span>{taxName} ({taxPercent}%)</span>
                <span>{rupees(taxAmount)}</span>
              </div>
            )}
            <div className="bill-total-row grand">
              <b>Grand Total</b>
              <b>{rupees(grandTotal)}</b>
            </div>
            <div className="bill-total-row paid">
              <span>Amount Paid</span>
              <span>{rupees(paidAmount)}</span>
            </div>
            {balance > 0 && (
              <div className="bill-total-row due">
                <span>Balance Due</span>
                <span>{rupees(balance)}</span>
              </div>
            )}
          </div>

          {/* Footer & Disclaimer */}
          <div className="bill-footer">
            <p className="bill-note">{data.receipt_note || 'Thank you for dining with us! Please visit again.'}</p>
            <p className="bill-legal">Retail dining receipt generated digitally by CafeTap. Keep this for your records.</p>
          </div>
        </div>

        <div className="digital-bill-actions noprint">
          <button className="btn print-btn" onClick={printReceipt}>
            🖨️ Print / Save as PDF
          </button>
          <div className="bill-btn-grid">
            <button className="bill-ghost-btn" onClick={downloadHtmlBill}>
              📥 Download Bill
            </button>
            <button className="bill-ghost-btn" onClick={shareWhatsApp}>
              📲 Share WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
