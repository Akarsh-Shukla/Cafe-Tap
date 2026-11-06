import { useEffect, useRef, useState } from 'react'
import PhoneMock from '../PhoneMock.jsx'
import { Ico } from '../icons.jsx'
import { reduced } from '../hooks.js'
import { HERO, STUDIO } from '../content.js'

export default function Hero({ contact, demo }) {
  const [w, setW] = useState(0), [theme, setTheme] = useState('sage'), stage = useRef(null)
  useEffect(() => { if (reduced()) return; const id = setInterval(() => setW(x => (x + 1) % HERO.words.length), 2400); return () => clearInterval(id) }, [])
  const move = e => {
    const el = stage.current; if (!el || e.pointerType === 'touch') return
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg'); el.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg'); el.style.setProperty('--px', x.toFixed(3)); el.style.setProperty('--py', y.toFixed(3))
  }
  const leave = () => { const el = stage.current; if (!el) return; ['--rx', '--ry'].forEach(k => el.style.setProperty(k, '0deg')); ['--px', '--py'].forEach(k => el.style.setProperty(k, '0')) }
  return (<section className="lx-hero" aria-labelledby="lx-h1"><div className="lx-wrap lx-hgrid">
    <div className="lx-htext">
      <span className="lx-kick">{HERO.kicker}</span>
      <h1 id="lx-h1"><span className="lx-l1">Tap the table.</span><span className="lx-l2">See the <span className="lx-rot"><span key={w} className="lx-word">{HERO.words[w]}</span></span></span></h1>
      <p className="lx-sub">{HERO.sub}</p>
      <div className="lx-cta"><a className="lx-btn or" href={contact} data-magnet>Try it at my café <Ico n="arrow" s={18} /></a>
        {demo ? <a className="lx-btn ghost" href={'/' + demo}>See a live demo</a> : <a className="lx-btn ghost" href="#how">How it works</a>}</div>
      <ul className="lx-proof">{HERO.proof.map(p => <li key={p}><Ico n="check" s={16} w={2.4} />{p}</li>)}</ul>
    </div>
    <div className="lx-stage" ref={stage} onPointerMove={move} onPointerLeave={leave}>
      <span className="lx-blob" aria-hidden="true" />
      <ul className="lx-chips" aria-hidden="true">{[['menu', 'Menu'], ['offers', 'Offers'], ['wifi', 'Wi‑Fi'], ['review', 'Reviews']].map(([i, l], k) => <li key={i} className={'c' + k}><span><Ico n={i} s={16} />{l}</span></li>)}</ul>
      <div className="lx-tilt"><PhoneMock theme={theme} /></div>
      <div className="lx-swatches" role="group" aria-label="Try a design">{STUDIO.themes.map(([k, n, bg, ac]) =>
        <button key={k} className={theme === k ? 'on' : ''} style={{ background: `linear-gradient(135deg,${bg} 50%,${ac} 50%)` }} onClick={() => setTheme(k)} aria-label={n + ' design'} aria-pressed={theme === k} />)}</div>
      <p className="lx-hint">Tap the phone, and try a colour</p>
    </div>
  </div></section>)
}
