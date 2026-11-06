import { STEPS } from '../content.js'

// Small looping illustrations, drawn with CSS so they cost almost nothing.
const Art = {
  build: () => <svg viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="10" width="92" height="70" rx="10" className="f1" /><rect x="24" y="22" width="40" height="8" rx="4" className="bar b1" /><rect x="24" y="38" width="64" height="6" rx="3" className="bar b2" /><rect x="24" y="50" width="52" height="6" rx="3" className="bar b3" /><circle cx="86" cy="26" r="9" className="dot" /></svg>,
  edit: () => <svg viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="14" width="92" height="26" rx="13" className="f1" /><text x="30" y="31" className="tx">Sold out</text><rect x="70" y="20" width="26" height="14" rx="7" className="trk" /><circle cx="77" cy="27" r="5.5" className="knob" /><rect x="14" y="52" width="92" height="26" rx="13" className="f1" /><text x="30" y="69" className="tx">₹120 → ₹130</text></svg>,
  tap: () => <svg viewBox="0 0 120 90" aria-hidden="true"><rect x="42" y="14" width="36" height="62" rx="8" className="f1" /><circle cx="60" cy="66" r="3" className="dot" /><circle cx="60" cy="40" r="8" className="ring r1" /><circle cx="60" cy="40" r="8" className="ring r2" /><circle cx="60" cy="40" r="8" className="ring r3" /><circle cx="60" cy="40" r="4" className="dot" /></svg>,
}
export default function How() {
  return (<section className="lx-sec cream" id="how"><div className="lx-wrap">
    <div data-rv><p className="lx-eyebrow">How it works</p><h2 className="lx-h2">We set it up. You stay in control.</h2></div>
    <ol className="lx-steps">{STEPS.map((s, i) => { const A = Art[s.k]; return <li key={s.k} data-rv style={{ '--d': i * 0.1 + 's' }} data-glow>
      <span className="lx-stepn">{i + 1}</span><div className="lx-stepart"><A /></div><h3>{s.t}</h3><p>{s.p}</p></li> })}</ol>
  </div></section>)
}
