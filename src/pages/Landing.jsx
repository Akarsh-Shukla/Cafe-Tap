import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Deck, ArtShop } from '../components/Showcase.jsx'
import { SHOWCASE } from '../data/showcase.js'
import { ARTWORKS } from '../data/artworks.js'

const WA = (import.meta.env.VITE_CONTACT_WHATSAPP || '').replace(/\D/g, '')
const MAIL = import.meta.env.VITE_CONTACT_EMAIL || ''
const DEMO = import.meta.env.VITE_DEMO_SLUG || ''
const PHONE = import.meta.env.VITE_CONTACT_PHONE || ''
const INSTA = /^https:\/\//.test(import.meta.env.VITE_CONTACT_INSTAGRAM || '') ? import.meta.env.VITE_CONTACT_INSTAGRAM : ''
const CITY = import.meta.env.VITE_CITY || 'Kanpur'
const enquiry = text => WA ? `https://wa.me/${WA}?text=${encodeURIComponent(text)}` : MAIL ? `mailto:${MAIL}?subject=${encodeURIComponent('Enquiry')}&body=${encodeURIComponent(text)}` : '#contact'
const contact = WA ? `https://wa.me/${WA}?text=${encodeURIComponent('Hi, I’d like to know more about CafeTap for my café.')}` : MAIL ? `mailto:${MAIL}` : '#contact'

// What we offer. No prices are shown on the page, you talk them through with each café personally.
const PLANS = [
  { name: 'Basic', tag: 'Available now', desc: 'A beautiful, personalised café page that guests open with a QR scan or an NFC tap.',
    pts: ['Your own look: colours, fonts, illustrations', 'Menu with photos, veg marks and sold-out switch', 'Offers, guest Wi‑Fi, review link and private feedback', 'You edit prices and availability yourself', 'QR and NFC links, hosting and support'] },
  { name: 'POS', tag: 'New · early access', hot: true, desc: 'Everything in Basic, plus optional table ordering and a simple counter workflow for your team.',
    pts: ['Guests can order from their table (you switch it on)', 'Live order queue and a running bill for every table', 'Staff logins with permissions you choose', 'Cash and UPI recorded by your staff at the counter', 'Printable bills and daily sales summaries'],
    note: 'Payment is collected at the counter. There is no online payment gateway, and CafeTap records what your staff confirm.' },
]
const THEMES = [['roastery', 'Noir', 'Dark, brass, elegant', '#14100d', '#d9a752'], ['bakery', 'Blush', 'Soft, rounded, sweet', '#ffc7d4', '#e5557f'], ['chai', 'Citrus', 'Bold, loud, street', '#ffd23f', '#ff4d2e'], ['sage', 'Sage', 'Fresh green, cosy', '#cdd5bb', '#24402a'], ['mocha', 'Mocha', 'Warm cream and brown', '#3a1d0f', '#d9a752']]
const MOCK = { roastery: ['Ember & Oak', 'Slow mornings, small batches'], bakery: ['Flour & Fig', 'Baked before sunrise'], chai: ['Kulhad Corner', 'Chai. Maska bun. Repeat.'], sage: ['Leaf & Bean', 'Good coffee, better days'], mocha: ['Cocoa & Co.', 'Freshly brewed, always'] }
const MENU = { Coffee: [['Cappuccino', 'Silky milk, double shot', '₹180'], ['Cold brew', 'Steeped for 18 hours', '₹210']], Bakes: [['Butter croissant', 'Baked every morning', '₹120'], ['Cheese toastie', 'Sourdough, three cheeses', '₹150']] }
const I = { menu: 'M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2', offers: 'M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01', wifi: 'M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 19.5h.01', review: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z', feedback: 'M4 5h16v11H9l-5 4V5z', edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4' }
const Ic = ({ n }) => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={I[n]} /></svg>
const FEATS = [['menu', 'A menu guests enjoy', 'Photos, search, veg and non-veg marks, and sold-out items shown clearly.'], ['offers', 'Today’s offers', 'Post a special in seconds. It appears on the home page.'], ['wifi', 'Wi‑Fi in one tap', 'Guests copy the network and password. No more asking staff.'], ['review', 'Honest reviews', 'A friendly link to your Google reviews page.'], ['feedback', 'Private feedback', 'Anonymous notes reach you, not the internet.'], ['edit', 'Edit it yourself', 'Change prices, photos and availability from your phone.']]

function Phone({ t }) {
  const [cat, setCat] = useState('Coffee')
  const [name, tag] = MOCK[t]
  return (<div className="phone"><span className="notch" /><div className="mk" data-theme={t}>
    <div className="mk-hero"><b>{name}</b><small>{tag}</small></div>
    <div className="mk-tiles"><span>Offers</span><span>Wi‑Fi</span><span>Review</span></div>
    <div className="mk-cats">{Object.keys(MENU).map(c => <button key={c} className={c === cat ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
    {MENU[cat].map(i => <div key={i[0]} className="mk-row"><span><b>{i[0]}</b><small>{i[1]}</small></span><em>{i[2]}</em></div>)}
  </div></div>)
}

export default function Landing() {
  const [t, setT] = useState('sage')
  useEffect(() => {
    document.title = 'CafeTap: your café menu, one tap away'
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.12 })
    document.querySelectorAll('.rv').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
  return (<div className="lp">
    <div className="lpw"><header className="lpnav"><a className="logo2" href="/">CafeTap</a>
      <nav><a className="hide" href="#how">How it works</a><a className="hide" href="#themes">Designs</a><a className="hide" href="#plans">Plans</a><Link className="hide" to="/login">Owner login</Link><a className="lbtn" href={contact}>Talk to us</a></nav></header>
      <section className="lhero">
        <div><span className="kick">Digital menu, NFC and QR for cafés</span>
          <h1>Tap the table.<span className="script">See the menu.</span></h1>
          <p className="sub">One beautiful page for your café: menu, offers, Wi‑Fi, reviews and private feedback. Guests tap an NFC card or scan a QR. No app. No reprinting when a price changes.</p>
          <div className="cta"><a className="lbtn o" href={contact}>Try it at my café</a>{DEMO ? <a className="lbtn gh" href={'/' + DEMO}>See a live demo</a> : <a className="lbtn gh" href="#how">How it works</a>}</div>
          <div className="proof"><span>No app to install</span><span>Update in seconds</span><span>NFC and QR</span><span>Your own look</span></div></div>
        <div className="stage"><Phone t={t} />
          <div className="swatches" role="group" aria-label="Try a design">{THEMES.map(([k, n, , bg, ac]) => <button key={k} className={'sw' + (t === k ? ' on' : '')} style={{ background: `linear-gradient(135deg,${bg} 50%,${ac} 50%)` }} onClick={() => setT(k)} aria-label={n} aria-pressed={t === k} />)}</div>
          <p className="swl">Tap a colour to try a design</p></div>
      </section></div>

    {SHOWCASE.length > 0 && <section className="sec" id="cards"><div className="lpw rv"><p className="eyebrow">The cards</p><h2>Tap or scan. Made for your tables.</h2><Deck items={SHOWCASE} /></div></section>}
    <section className="sec"><div className="lpw rv"><p className="eyebrow">Why cafés switch</p><h2>One page instead of five loose ends.</h2>
      <div className="cmp"><div className="cbox"><h3>Today</h3><ul><li>A PDF menu that is always out of date</li><li>Paper menus reprinted for every price change</li><li>“What’s the Wi‑Fi password?” fifty times a day</li><li>Reviews and feedback scattered everywhere</li></ul></div>
        <div className="cbox dark"><h3>With CafeTap</h3><ul><li>One live menu you edit from your phone</li><li>The same QR and NFC card, forever</li><li>Wi‑Fi, offers and reviews one tap away</li><li>Private feedback that reaches only you</li></ul></div></div></div></section>

    <section className="sec" id="how"><div className="lpw rv"><p className="eyebrow">How it works</p><h2>We set it up. You stay in control.</h2>
      <div className="steps3"><div className="st3"><span className="n">1</span><h3>We build your page</h3><p>Your menu, photos, colours and tone, set up to match your café.</p></div>
        <div className="st3"><span className="n">2</span><h3>You keep it fresh</h3><p>Log in to change prices, mark items sold out and post offers.</p></div>
        <div className="st3"><span className="n">3</span><h3>Guests tap or scan</h3><p>An NFC card or QR on every table opens your page instantly.</p></div></div></div></section>

    <section className="sec"><div className="lpw rv"><p className="eyebrow">What guests get</p><h2>Everything a guest looks for, in one place.</h2>
      <div className="fgrid">{FEATS.map(([k, h, p]) => <div key={k} className="fc"><Ic n={k} /><h3>{h}</h3><p>{p}</p></div>)}</div></div></section>

    <section className="sec" id="themes"><div className="lpw rv"><p className="eyebrow">Designs</p><h2>A look that feels like your café.</h2>
      <p className="lead2">Pick a starting design, then we tune the colours, photos and wording. Need something fully custom? We can build it.</p>
      <div className="tgrid">{THEMES.map(([k, n, v]) => <button key={k} className="tcard" data-theme={k} onClick={() => { setT(k); scrollTo({ top: 0, behavior: 'smooth' }) }}><b>{n}</b><small>{v}</small></button>)}</div></div></section>

    <section className="sec" id="plans"><div className="lpw rv"><p className="eyebrow">Two plans</p><h2>Start simple. Add ordering when you’re ready.</h2>
      <p className="lead2">Both plans use the same page and the same QR or NFC card. You can move up later without reprinting anything.</p>
      <div className="pgrid two">{PLANS.map(p => <div key={p.name} className={'pc' + (p.hot ? ' hot' : '')}><span className="per">{p.tag}</span><h3>{p.name}</h3><p className="pd">{p.desc}</p><ul>{p.pts.map(x => <li key={x}>{x}</li>)}</ul>{p.note && <p className="pnote">{p.note}</p>}<a className={'lbtn' + (p.hot ? ' o' : '')} style={{ marginTop: 22 }} href={contact}>Talk to us</a></div>)}</div>
      <p className="note2">We agree setup and monthly details with you personally. We don’t offer unavailable features: ordering and staff tools are only in the POS plan.</p></div></section>

    {ARTWORKS.length > 0 && <section className="sec" id="art"><div className="lpw rv"><p className="eyebrow">Art for your café</p><h2>Paintings and artefacts for your walls.</h2><p className="lead2">Original pieces by independent artists. Each listing says who sells it. Ask us about any piece.</p><ArtShop items={ARTWORKS} hrefFor={enquiry} /></div></section>}
    <section className="sec"><div className="lpw rv faq"><p className="eyebrow">Questions</p><h2>Honest answers.</h2>
      <div style={{ marginTop: 28 }}>
        <details><summary>Do my guests need an app?</summary><p>No. The page opens in their phone’s browser when they tap the NFC card or scan the QR.</p></details>
        <details><summary>What happens when I change my menu?</summary><p>You edit it in your dashboard and the live page updates. The cards on your tables never need replacing.</p></details>
        <details><summary>What if a phone doesn’t support NFC?</summary><p>Every card also carries a QR code, so everyone can still open the page.</p></details>
        <details><summary>Do you take orders or payments?</summary><p>No. CafeTap is your menu and information page, not a POS.</p></details>
        <details><summary>What is the difference between QR and NFC?</summary><p>A QR code opens your page when a guest scans it with the camera. An NFC card opens the same page when a guest taps their phone on it. Every card carries both, so every phone works.</p></details>
        <details><summary>What is the difference between Basic and POS?</summary><p>Basic is your personalised page: menu, offers, Wi‑Fi, reviews and feedback. POS adds optional table ordering, a live order queue, running table bills, staff logins and counter payment records.</p></details>
        <details><summary>Is POS compulsory?</summary><p>No. Ordering is optional and you decide whether to switch it on. Guests can always browse the menu without ordering.</p></details>
        <details><summary>Do guests pay online?</summary><p>No. Payment is collected at the counter and your staff record cash or UPI after checking it themselves.</p></details>
        <details><summary>How much does it cost?</summary><p>It depends on the setup you choose, so we talk it through personally and agree everything before you start.</p></details></div></div></section>

    <section className="lcta" id="contact"><div className="lpw rv"><h2>Try it at your café<span className="script">this week.</span></h2>
      <p>Tell us about your café and we’ll show you a page with your own menu on it.</p>
      <div className="cta"><a className="lbtn o" href={contact}>{WA ? 'Message us on WhatsApp' : 'Talk to us'}</a>{MAIL && <a className="lbtn gh" href={'mailto:' + MAIL}>Email us</a>}</div></div></section>
    <a className="stickycta" href={contact}>{WA ? 'Message us on WhatsApp' : 'Talk to us'}</a>
    <footer className="lfoot"><div className="lpw"><p>Made in {CITY}</p>
      <p>{PHONE && <><a href={'tel:' + PHONE.replace(/[^+\d]/g, '')}>{PHONE}</a> · </>}{MAIL && <><a href={'mailto:' + MAIL}>{MAIL}</a> · </>}{INSTA && <><a href={INSTA} target="_blank" rel="noopener noreferrer">Instagram</a> · </>}<Link to="/privacy">Privacy</Link> · <Link to="/login">Owner login</Link></p>
      <p>CafeTap</p></div></footer>
  </div>)
}
