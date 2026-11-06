import { Link } from 'react-router-dom'
import { Ico } from '../icons.jsx'
import { CTA } from '../content.js'
import { MAIL, PHONE, INSTA, CITY, WA } from '../contact.js'

export function Cta({ contact }) {
  return (<section className="lx-cta-sec" id="contact"><span className="lx-cb c1" aria-hidden="true" /><span className="lx-cb c2" aria-hidden="true" />
    <div className="lx-wrap" data-rv><h2>{CTA.title}<span className="lx-script">{CTA.script}</span></h2><p>{CTA.sub}</p>
      <div className="lx-cta c"><a className="lx-btn or" href={contact} data-magnet>{WA ? 'Message us on WhatsApp' : 'Talk to us'} <Ico n="arrow" s={18} /></a>{MAIL && <a className="lx-btn ghost light" href={'mailto:' + MAIL}>Email us</a>}</div></div></section>)
}
export function Footer() {
  return (<footer className="lx-foot"><div className="lx-wrap lx-footg">
    <div><a className="lx-logo" href="#top">CafeTap</a><p>Personalised café pages with QR and NFC. Made in {CITY}.</p></div>
    <div><b>Company</b><a href="#how">How it works</a><a href="#plans">Plans</a><Link to="/login">Owner login</Link></div>
    <div><b>Legal</b><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div>
    <div><b>Contact</b>{PHONE && <a href={'tel:' + PHONE.replace(/[^+\d]/g, '')}>{PHONE}</a>}{MAIL && <a href={'mailto:' + MAIL}>{MAIL}</a>}{INSTA && <a href={INSTA} target="_blank" rel="noopener noreferrer">Instagram</a>}{!PHONE && !MAIL && !INSTA && <a href="#contact">Talk to us</a>}</div>
  </div><p className="lx-fine lx-wrap">© {new Date().getFullYear()} CafeTap. Plans, prices and setup are agreed with each café personally.</p></footer>)
}
export function FloatingCta({ contact }) { return <a className="lx-float" href={contact}><Ico n="whatsapp" s={20} /><span>{WA ? 'Chat on WhatsApp' : 'Talk to us'}</span></a> }
