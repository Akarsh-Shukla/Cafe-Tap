import React from 'react'
import { rupees } from '../lib/pos'

export default function DigitalBill({ cafe, data, onClose }) {
  if (!data) return null

  const items = data.items || []
  const subtotal = data.order_total_minor || data.bill_total_minor || items.reduce((s, i) => s + (i.line_total_minor || (i.price_minor * i.qty) || 0), 0)
  const isPaid = !!data.is_paid
  const taxEnabled = !!data.tax_enabled
  const taxPercent = Number(data.tax_percent || 5)
  const taxName = data.tax_name || 'Tax'

  // If tax is enabled, calculate tax portion
  const taxAmount = taxEnabled ? Math.round(subtotal * (taxPercent / 100)) : 0
  const grandTotal = taxEnabled ? subtotal + taxAmount : subtotal
  const paidAmount = isPaid ? (data.paid_minor || grandTotal) : (data.paid_minor || 0)
  const balance = Math.max(0, grandTotal - paidAmount)

  const printReceipt = () => {
    document.body.classList.add('printing-bill')
    window.print()
    setTimeout(() => document.body.classList.remove('printing-bill'), 800)
  }

  const dateStr = data.created_at ? new Date(data.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : new Date().toLocaleString('en-IN')

  return (
    <>
      <div className="scrim on" onClick={onClose} />
      <div className="sheet on digital-bill-modal" role="dialog" aria-modal="true" aria-label="Digital Receipt">
        <div className="digital-bill-actions noprint">
          <button className="btn print-btn" onClick={printReceipt}>🖨️ Print / Save PDF</button>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
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
              <span className="bill-meta-label">Receipt / Order Ref</span>
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
                <th style={{ width: '45px', textAlign: 'left' }}>Qty</th>
                <th style={{ textAlign: 'left' }}>Description</th>
                <th style={{ width: '75px', textAlign: 'right' }}>Price</th>
                <th style={{ width: '85px', textAlign: 'right' }}>Total</th>
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
              <span>{rupees(subtotal)}</span>
            </div>
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
      </div>
    </>
  )
}
