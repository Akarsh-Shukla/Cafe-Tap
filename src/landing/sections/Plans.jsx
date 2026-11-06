import { useState } from 'react'
import { Ico } from '../icons.jsx'
import { PLANS, MATRIX } from '../content.js'

const cell = v => v === true ? <span className="yes" aria-label="Included"><Ico n="check" s={16} w={2.6} /></span> : v === false ? <span className="no" aria-label="Not included">–</span> : <span className="txt">{v}</span>
export default function Plans({ contact }) {
  const [open, setOpen] = useState(false)
  return (<section className="lx-sec" id="plans"><div className="lx-wrap">
    <div data-rv><p className="lx-eyebrow">Two plans</p><h2 className="lx-h2">Start simple. Add ordering when you’re ready.</h2>
      <p className="lx-lead">Both plans use the same page and the same QR or NFC card. You can move up later without reprinting anything.</p></div>
    <div className="lx-plans">{PLANS.map((p, i) => <article key={p.name} className={'lx-plan' + (p.hot ? ' hot' : '')} data-rv data-glow style={{ '--d': i * 0.1 + 's' }}>
      <span className="lx-ptag">{p.tag}</span><h3>{p.name}</h3><p className="lx-pdesc">{p.desc}</p>
      <ul>{p.pts.map(x => <li key={x}><Ico n="check" s={16} w={2.6} />{x}</li>)}</ul>
      {p.note && <p className="lx-pnote">{p.note}</p>}
      <a className={'lx-btn' + (p.hot ? ' or' : '')} href={contact} data-magnet>Talk to us</a></article>)}</div>
    <div className="lx-matrixw" data-rv>
      <button className="lx-matrixbtn" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="lx-matrix">Compare the plans in detail<Ico n="plus" s={18} /></button>
      <div id="lx-matrix" className={'lx-matrix' + (open ? ' open' : '')}><div><table><thead><tr><th scope="col">What you get</th><th scope="col">Basic</th><th scope="col">POS</th></tr></thead>
        <tbody>{MATRIX.map(([l, a, b]) => <tr key={l}><th scope="row">{l}</th><td>{cell(a)}</td><td>{cell(b)}</td></tr>)}</tbody></table></div></div>
    </div>
    <p className="lx-note" data-rv>We agree setup and monthly details with you personally. Ordering and staff tools are only in the POS plan.</p>
  </div></section>)
}
