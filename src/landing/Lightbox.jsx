import { useEffect, useRef } from 'react'
import { Ico } from './icons.jsx'

// Full-screen viewer: Esc closes, arrow keys or a swipe change picture, tapping the dark area closes.
export default function Lightbox({ items, index, onClose, onIndex }) {
  const closeRef = useRef(null), x0 = useRef(null), n = items.length, item = items[index]
  const go = d => onIndex((index + d + n) % n)
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1) }
    addEventListener('keydown', k); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; closeRef.current?.focus()
    return () => { removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [index])
  return (<div className="lx-lb" role="dialog" aria-modal="true" aria-label={item.title} onClick={onClose}
    onTouchStart={e => { x0.current = e.touches[0].clientX }} onTouchEnd={e => { if (x0.current == null) return; const d = e.changedTouches[0].clientX - x0.current; x0.current = null; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1) }}>
    <button ref={closeRef} className="lx-lb-x" onClick={onClose} aria-label="Close"><Ico n="x" s={22} /></button>
    {n > 1 && <button className="lx-lb-nav prev" onClick={e => { e.stopPropagation(); go(-1) }} aria-label="Previous picture"><Ico n="left" s={22} /></button>}
    <figure onClick={e => e.stopPropagation()}><img key={item.src} src={item.src} alt={item.alt || item.title} /><figcaption><b>{item.title}</b>{item.caption && <span>{item.caption}</span>}<small>{index + 1} / {n}</small></figcaption></figure>
    {n > 1 && <button className="lx-lb-nav next" onClick={e => { e.stopPropagation(); go(1) }} aria-label="Next picture"><Ico n="right" s={22} /></button>}
  </div>)
}
