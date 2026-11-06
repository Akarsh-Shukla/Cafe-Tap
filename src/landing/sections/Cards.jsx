import { useRef, useState } from 'react'
import { Ico } from '../icons.jsx'
import { CARDS } from '../content.js'

// Swipeable, tilting gallery of table stands. Tap a picture to see it large.
export default function Cards({ items, onOpen }) {
  const ref = useRef(null), [i, setI] = useState(0)
  const go = n => { const k = Math.max(0, Math.min(items.length - 1, n)); ref.current?.children[k]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }) }
  const onScroll = () => { const el = ref.current; if (!el) return; const mid = el.scrollLeft + el.clientWidth / 2; let best = 0, dist = 1e9; [...el.children].forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = k } }); setI(best) }
  const tilt = e => { if (e.pointerType === 'touch') return; const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(1) + 'deg'); e.currentTarget.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * 10).toFixed(1) + 'deg') }
  const flat = e => { e.currentTarget.style.setProperty('--ry', '0deg'); e.currentTarget.style.setProperty('--rx', '0deg') }
  const fan = items.length <= 3
  return (<section className="lx-sec cream" id="cards"><div className="lx-wrap">
    <div data-rv><p className="lx-eyebrow">{CARDS.eyebrow}</p><h2 className="lx-h2">{CARDS.title}</h2><p className="lx-lead">{CARDS.lead}</p></div>
    <div className="lx-deckw" role="region" aria-roledescription="carousel" aria-label="Table stand designs" data-rv>
      <div className={'lx-deck' + (fan ? ' fan' : '')} ref={ref} onScroll={onScroll} tabIndex={0} onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1) } if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1) } }}>
        {items.map((c, k) => <button key={c.src} className={'lx-dcard' + (k === i ? ' on' : '')} style={{ '--k': k }} onPointerMove={tilt} onPointerLeave={flat} onClick={() => onOpen(k)} aria-label={'View ' + c.title + ' larger'}>
          <img src={c.src} alt={c.alt} loading="lazy" decoding="async" width={c.w || undefined} height={c.h || undefined} />
          <span className="lx-dcap"><b>{c.title}</b>{c.caption && <small>{c.caption}</small>}</span></button>)}
      </div>
      {items.length > 1 && <div className="lx-deckbar"><button onClick={() => go(i - 1)} aria-label="Previous design" disabled={i === 0}><Ico n="left" s={20} /></button>
        <div className="lx-dots">{items.map((c, k) => <button key={c.src} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={'Show design ' + (k + 1)} />)}</div>
        <button onClick={() => go(i + 1)} aria-label="Next design" disabled={i === items.length - 1}><Ico n="right" s={20} /></button></div>}
    </div>
  </div></section>)
}
