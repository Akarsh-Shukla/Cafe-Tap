import { Ico } from '../icons.jsx'
import { FEATURES } from '../content.js'
export default function Features() {
  return (<section className="lx-sec" id="features"><div className="lx-wrap">
    <div data-rv><p className="lx-eyebrow">What guests get</p><h2 className="lx-h2">Everything a guest looks for, in one place.</h2></div>
    <div className="lx-bento">{FEATURES.map((f, i) => <article key={f.t} className="lx-feat" data-rv data-glow style={{ '--d': (i % 3) * 0.08 + 's' }}>
      <span className="lx-ficon"><Ico n={f.i} s={26} /></span><h3>{f.t}</h3><p>{f.p}</p></article>)}</div>
  </div></section>)
}
