import { useEffect, useState } from 'react'
export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const canHover = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches

// Fades elements in as they scroll into view. Elements opt in with data-rv (and an optional --d delay).
export function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll('.lx [data-rv]')]
    if (reduced() || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    els.forEach(e => io.observe(e)); return () => io.disconnect()
  }, [])
}
// Soft light that follows the pointer over [data-glow] cards (mouse devices only).
export function useGlow() {
  useEffect(() => {
    if (reduced() || !canHover()) return
    const move = e => { const t = e.target.closest && e.target.closest('[data-glow]'); if (!t) return; const r = t.getBoundingClientRect(); t.style.setProperty('--mx', e.clientX - r.left + 'px'); t.style.setProperty('--my', e.clientY - r.top + 'px') }
    document.addEventListener('pointermove', move, { passive: true }); return () => document.removeEventListener('pointermove', move)
  }, [])
}
// Buttons with data-magnet lean slightly towards the pointer.
export function useMagnet() {
  useEffect(() => {
    if (reduced() || !canHover()) return
    let last = null
    const move = e => {
      const t = e.target.closest && e.target.closest('[data-magnet]')
      if (last && last !== t) last.style.transform = ''
      last = t; if (!t) return
      const r = t.getBoundingClientRect(); t.style.transform = `translate(${((e.clientX - r.left) / r.width - 0.5) * 8}px, ${((e.clientY - r.top) / r.height - 0.5) * 8}px)`
    }
    document.addEventListener('pointermove', move, { passive: true }); return () => document.removeEventListener('pointermove', move)
  }, [])
}
// Publishes the scroll position as CSS variables (--sy in px, --prog from 0 to 1) for the progress bar and gentle parallax.
export function useScrollVars(ref) {
  useEffect(() => {
    const el = ref.current; if (!el || reduced()) return
    let raf = 0
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight; el.style.setProperty('--sy', String(Math.round(y))); el.style.setProperty('--prog', h > 0 ? (y / h).toFixed(4) : '0') }) }
    on(); addEventListener('scroll', on, { passive: true }); return () => { removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [])
}
// Which section is on screen, for highlighting the menu link.
export function useActive(ids) {
  const [a, setA] = useState('')
  useEffect(() => {
    const els = ids.map(i => document.getElementById(i)).filter(Boolean)
    if (!els.length || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setA(e.target.id)), { rootMargin: '-45% 0px -50% 0px' })
    els.forEach(e => io.observe(e)); return () => io.disconnect()
  }, [ids.join()])
  return a
}
