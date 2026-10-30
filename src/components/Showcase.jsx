import { useRef, useState } from 'react'

// Swipeable card deck: touch scroll-snap, arrow buttons, keyboard arrows, dots, gentle tilt. No autoplay.
export function Deck({ items }) {
  const ref = useRef(null), [i, setI] = useState(0)
  const go = n => { const k = Math.max(0, Math.min(items.length - 1, n)); ref.current?.children[k]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }) }
  const onScroll = () => {
    const el = ref.current; if (!el) return
    const mid = el.scrollLeft + el.clientWidth / 2; let best = 0, dist = 1e9
    ;[...el.children].forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = k } })
    setI(best)
  }
  const tilt = e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(1) + 'deg'); e.currentTarget.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * 8).toFixed(1) + 'deg') }
  const flat = e => { e.currentTarget.style.setProperty('--ry', '0deg'); e.currentTarget.style.setProperty('--rx', '0deg') }
  return (<div className="deckw" role="region" aria-roledescription="carousel" aria-label="CafeTap cards">
    <div className="deck" ref={ref} onScroll={onScroll} tabIndex={0} onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1) } if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1) } }}>
      {items.map((c, k) => <figure key={k} className={'dcard' + (k === i ? ' on' : '')} onPointerMove={tilt} onPointerLeave={flat}>
        <img src={c.image} alt={c.alt || c.title || ''} loading="lazy" /><figcaption><b>{c.title}</b>{c.caption && <span>{c.caption}</span>}</figcaption></figure>)}
    </div>
    {items.length > 1 && <div className="deckbar"><button onClick={() => go(i - 1)} aria-label="Previous card" disabled={i === 0}>‹</button>
      <div className="dots">{items.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={'Show card ' + (k + 1)} />)}</div>
      <button onClick={() => go(i + 1)} aria-label="Next card" disabled={i === items.length - 1}>›</button></div>}
  </div>)
}

// Real artwork catalogue with an enquiry button (no checkout, stock or payment).
export function ArtShop({ items, hrefFor }) {
  return (<div className="artgrid">{items.map(a => <article key={a.id} className="artcard">
    <img src={a.image} alt={a.title} loading="lazy" />
    <div className="artbody"><h3>{a.title}</h3>{a.story && <p>{a.story}</p>}
      <p className="artmeta">{[a.size, a.material].filter(Boolean).join(' · ')}</p>
      <p className="artmeta"><b>{a.available === false ? 'Currently unavailable' : 'Available'}</b>{a.price ? ' · ' + a.price : ''}</p>
      <p className="artmeta">{a.seller}</p>
      <a className="lbtn" href={hrefFor(`Hi, I’d like to enquire about “${a.title}” (ID: ${a.id}).`)}>Enquire about this piece</a></div></article>)}</div>)
}
