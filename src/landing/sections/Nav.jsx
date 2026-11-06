import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ico } from '../icons.jsx'

export default function Nav({ links, active, contact }) {
  const [open, setOpen] = useState(false), [solid, setSolid] = useState(false)
  useEffect(() => { const f = () => setSolid(window.scrollY > 12); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f) }, [])
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = open ? 'hidden' : prev
    const k = e => e.key === 'Escape' && setOpen(false); addEventListener('keydown', k)
    return () => { document.body.style.overflow = prev; removeEventListener('keydown', k) }
  }, [open])
  const close = () => setOpen(false)
  return (<>
    <header className={'lx-nav' + (solid || open ? ' solid' : '')}>
      <div className="lx-wrap lx-navin">
        <a className="lx-logo" href="#top" onClick={close}>CafeTap</a>
        <nav className="lx-links" aria-label="Main">{links.map(([id, l]) => <a key={id} href={'#' + id} className={active === id ? 'on' : ''}>{l}</a>)}</nav>
        <div className="lx-navr">
          <Link className="lx-ghostlink" to="/login">Owner login</Link>
          <a className="lx-btn sm" href={contact} data-magnet>Talk to us</a>
          <button className={'lx-burger' + (open ? ' open' : '')} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="lx-menu" onClick={() => setOpen(!open)}><i /><i /></button>
        </div>
      </div>
    </header>
    <div id="lx-menu" className={'lx-menu' + (open ? ' open' : '')}>
      <nav aria-label="Mobile">{links.map(([id, l], i) => <a key={id} href={'#' + id} onClick={close} style={{ '--i': i }}>{l}<Ico n="arrow" s={22} /></a>)}</nav>
      <div className="lx-menu-foot"><a className="lx-btn" href={contact} onClick={close}>Talk to us</a><Link to="/login" onClick={close}>Owner login</Link></div>
    </div>
  </>)
}
