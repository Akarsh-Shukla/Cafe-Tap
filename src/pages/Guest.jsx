import { useEffect, useState } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { inr, safe, track, OPTS, BADGE, DIET, catIcon, artKind } from '../lib/util'
import Art from '../components/Art.jsx'

const P = { menu: 'M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2', offers: 'M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01', wifi: 'M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 19.5h.01', review: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z', feedback: 'M4 5h16v11H9l-5 4V5z', back: 'M15 5l-7 7 7 7', x: 'M6 6l12 12M18 6L6 18', arrow: 'M5 12h14M13 6l6 6-6 6', cup: 'M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2', bake: 'M4 18v-5a8 8 0 0 1 16 0v5H4zM9 10l2 3M13 10l2 3', plate: 'M3 10l9-5 9 5-9 5-9-5zM3 14l9 5 9-5', cake: 'M4 20h16v-7H4v7zM4 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2M12 7V4', glass: 'M7 4h10l-1.5 15a2 2 0 0 1-2 1.8h-3a2 2 0 0 1-2-1.8L7 4zM8 9h8', egg: 'M12 4c-4 0-7 5-7 9a7 7 0 0 0 14 0c0-4-3-9-7-9z', dish: 'M3 14h18a9 9 0 0 0-18 0zM2 18h20', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', list: 'M4 6h16M4 12h16M4 18h16' }
const Ic = ({ n, s = 26 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
const left = d => { if (!d) return ''; const n = Math.ceil((new Date(d + 'T23:59:59') - Date.now()) / 864e5); return n <= 1 ? 'Ends today' : `Ends in ${n} days` }

const Sub = ({ title, children }) => {
  const { slug } = useOutletContext()
  return (<>
    <div className="top2"><Link className="backb" to={'/' + slug} aria-label="Back to home"><Ic n="back" s={22} /></Link><h2>{title}</h2></div>
    <div className="wrap rise">{children}</div></>)
}

export function GuestLayout() {
  const { slug } = useParams()
  const [cafe, setCafe] = useState(undefined), [failed, setFailed] = useState(false)
  useEffect(() => {
    setCafe(undefined); setFailed(false)
    supabase.from('cafes').select('*').eq('slug', slug).eq('published', true).maybeSingle()
      .then(({ data, error }) => { if (error) setFailed(true); setCafe(data || null); if (data) { document.title = data.name; track(data.id, 'visit') } })
  }, [slug])
  if (failed) return <main className="msg"><h1>Something went wrong</h1><p>Please check your connection and refresh the page.</p></main>
  if (cafe === undefined) return <main className="msg"><div className="sk" style={{ height: 220 }} /><div className="sk" /><div className="sk" /></main>
  if (!cafe) return <main className="msg"><h1>Page not available</h1><p>This café page doesn’t exist or isn’t published yet. Please ask the café for their QR code.</p></main>
  return <div className="page" data-theme={cafe.theme}><Outlet context={{ cafe, slug }} /></div>
}

const HERO_ART = { roastery: 'latte', bakery: 'croissant', chai: 'chai', sage: 'latte', mocha: 'latte' }
const MENU_ART = { roastery: 'beans', bakery: 'cake', chai: 'sandwich', sage: 'croissant', mocha: 'iced' }

export function Home() {
  const { cafe, slug } = useOutletContext(), { table } = useParams()
  const [label, setLabel] = useState(''), [offer, setOffer] = useState(null)
  const on = cafe.settings?.options || OPTS.map(o => o[0])
  useEffect(() => {
    if (table) supabase.from('cafe_tables').select('display_name').eq('cafe_id', cafe.id).eq('token', table).maybeSingle().then(({ data }) => setLabel(data?.display_name || ''))
    const today = new Date().toISOString().slice(0, 10)
    supabase.from('offers').select('title,valid_until').eq('cafe_id', cafe.id).eq('is_active', true).order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setOffer((data || []).find(o => !o.valid_until || o.valid_until >= today) || null))
  }, [table, cafe.id])
  const insta = safe(cafe.settings?.insta), tiles = OPTS.filter(o => on.includes(o[0])), big = on.includes('menu')
  return (<>
    <header className={'hero' + (cafe.cover_url ? ' img' : '')} style={cafe.cover_url ? { backgroundImage: `url("${cafe.cover_url}")` } : undefined}>
      {!cafe.cover_url && <div className="hart" aria-hidden="true"><span className="blob" /><Art kind={HERO_ART[cafe.theme] || 'latte'} /></div>}
      {cafe.logo_url && <img className="logo" src={cafe.logo_url} alt="" />}
      {label && <span className="pill">{label}</span>}
      <h1>{cafe.name}</h1>
      {cafe.tagline && <p className="tag">{cafe.tagline}</p>}
    </header>
    {cafe.theme === 'chai' && cafe.tagline && <div className="marq" aria-hidden="true"><span>{(cafe.tagline + '  ✦  ').repeat(10)}</span></div>}
    <div className="wrap">
      {offer && <Link className="ann" to={`/${slug}/offers`}><i className="dot" /><span>{offer.title}</span><Ic n="arrow" s={18} /></Link>}
      {cafe.about && <section className="story"><span className="script">Our story</span><p className="about">{cafe.about}</p></section>}
      <div className={'bento' + (big ? ' hasbig' : '')}>
        {tiles.map(([k, t, d], n) => k === 'menu'
          ? <Link key={k} className="bt bt-menu" style={{ '--i': n }} to={`/${slug}/menu`}><span className="bt-txt"><span className="script">Take a look</span><b>Explore the menu</b><i>{d}</i><span className="go"><Ic n="arrow" s={20} /></span></span><span className="bt-art"><Art kind={MENU_ART[cafe.theme] || 'croissant'} /></span></Link>
          : <Link key={k} className={'bt bt-' + k} style={{ '--i': n }} to={`/${slug}/${k}`}><span className="ico"><Ic n={k} s={24} /></span><b>{t}</b><i>{d}</i></Link>)}
      </div>
      <footer className="foot">
        {cafe.hours && <p className="hrs">Open {cafe.hours}</p>}
        {insta && <a href={insta} target="_blank" rel="noopener noreferrer">Follow us on Instagram</a>}
        <small>Powered by CafeTap</small>
      </footer>
    </div></>)
}

const Diet = ({ d }) => d ? <i className={'diet ' + d} role="img" aria-label={DIET[d]} title={DIET[d]} /> : null
const Ph = ({ i }) => <div className="ph">{i.image_url ? <img src={i.image_url} alt="" loading="lazy" /> : <Art kind={artKind(i.name, i._cat)} />}
  {i.badge && <em className="bdg">{BADGE[i.badge]}</em>}{!i.is_available && <em className="bdg" style={{ left: 'auto', right: 10, background: '#555', color: '#fff' }}>Sold out</em>}</div>
const Card = ({ i, cls, onOpen }) => <button className={cls + (i.is_available ? '' : ' out')} onClick={() => onOpen(i)}><Ph i={i} />
  <div className="cb"><b><Diet d={i.diet} />{i.name}</b>{i.description && <small>{i.description}</small>}<span className="price">{inr(i.price_paise)}</span></div></button>

export function MenuPage() {
  const { cafe, slug } = useOutletContext()
  const [cats, setCats] = useState(null), [failed, setFailed] = useState(false), [q, setQ] = useState(''), [active, setActive] = useState(''), [sel, setSel] = useState(null), [open, setOpen] = useState(false), [view, setView] = useState('grid'), [offer, setOffer] = useState(null)
  useEffect(() => {
    track(cafe.id, 'menu')
    supabase.from('menu_categories').select('id,name,sort_order,menu_items(id,name,description,price_paise,image_url,is_available,sort_order,badge,diet)').eq('cafe_id', cafe.id).order('sort_order')
      .then(({ data, error }) => error ? setFailed(true) : setCats(data))
    const today = new Date().toISOString().slice(0, 10)
    supabase.from('offers').select('title,valid_until').eq('cafe_id', cafe.id).eq('is_active', true).order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setOffer((data || []).find(o => !o.valid_until || o.valid_until >= today) || null))
  }, [cafe.id])
  const ql = q.trim().toLowerCase()
  const shown = (cats || []).map(c => ({ ...c, items: [...c.menu_items].sort((a, b) => a.sort_order - b.sort_order).map(i => ({ ...i, _cat: c.name })).filter(i => !ql || (i.name + ' ' + (i.description || '')).toLowerCase().includes(ql)) })).filter(c => c.items.length)
  const picks = ql ? [] : (cats || []).flatMap(c => c.menu_items.map(i => ({ ...i, _cat: c.name }))).filter(i => i.badge && i.is_available)
  useEffect(() => {
    if (!cats) return
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setActive(e.target.dataset.id)), { rootMargin: '-30% 0px -65% 0px' })
    document.querySelectorAll('.msec').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [cats, q, view])
  useEffect(() => { document.querySelector('.catb.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) }, [active])
  useEffect(() => { const k = e => e.key === 'Escape' && setOpen(false); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  const show = i => { setSel(i); setOpen(true) }
  return (<>
    <Sub title="Menu">
      <input className="search" type="search" placeholder="Search coffee, food and more" aria-label="Search the menu" value={q} onChange={e => setQ(e.target.value)} />
      {offer && <Link className="ban" to={`/${slug}/offers`}><span><small>Today’s offer</small><b>{offer.title}</b></span><Ic n="arrow" s={22} /></Link>}
      {picks.length > 0 && <><div className="sech"><span className="script">Guest favourites</span><h3>Popular picks</h3></div><div className="picks">{picks.map(i => <Card key={i.id} i={i} cls="pick" onOpen={show} />)}</div></>}
      <div className="mbar">{shown.length > 1 && <nav className="cats" aria-label="Menu sections">{shown.map(c =>
        <button key={c.id} className={'catb' + (active === c.id ? ' on' : '')} onClick={() => document.getElementById('c' + c.id)?.scrollIntoView({ behavior: 'smooth' })}><span><Ic n={catIcon(c.name)} s={26} /></span>{c.name}</button>)}</nav>}</div>
      {cats && cats.length > 0 && <div className="vt"><span className="mut small">{shown.reduce((n, c) => n + c.items.length, 0)} items</span>
        <div className="seg" role="group" aria-label="Layout"><button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="Illustrated cards"><Ic n="grid" s={18} /></button><button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="Compact list"><Ic n="list" s={18} /></button></div></div>}
      {failed && <p>We couldn’t load the menu. Please refresh.</p>}
      {!cats && !failed && <><div className="sk" /><div className="sk" /><div className="sk" /></>}
      {cats && !cats.length && <p className="mut">The menu is coming soon.</p>}
      {cats?.length > 0 && !shown.length && <p className="mut">Nothing matches “{q}”.</p>}
      {shown.map(c => <section key={c.id} id={'c' + c.id} data-id={c.id} className="msec">
        <div className="chead"><div><h3>{c.name}</h3><small>{c.items.length} {c.items.length === 1 ? 'item' : 'items'}</small></div><span className="chart"><Art kind={artKind(c.name, c.items[0]?.name)} /></span></div>
        {view === 'grid' ? <div className="grid2">{c.items.map((i, n) => <Card key={i.id} i={i} cls={'gcard' + (n === 0 && c.items.length > 1 ? ' wide' : '')} onOpen={show} />)}</div>
          : c.items.map(i => <button key={i.id} className={'mrow' + (i.is_available ? '' : ' out')} onClick={() => show(i)}>
            <span className="t"><b><Diet d={i.diet} />{i.name}{i.badge && <span className="pill2">{BADGE[i.badge]}</span>}</b>{i.description && <p>{i.description}</p>}<span className="price">{inr(i.price_paise)}{!i.is_available && <em> · Sold out</em>}</span></span>
            {i.image_url ? <img src={i.image_url} alt="" loading="lazy" /> : <span className="thumb2"><Art kind={artKind(i.name, i._cat)} /></span>}</button>)}
      </section>)}
      <p className="small mut">Please tell our staff about any allergies.</p>
    </Sub>
    <div className={'scrim' + (open ? ' on' : '')} onClick={() => setOpen(false)} />
    <div className={'sheet' + (open ? ' on' : '')} role="dialog" aria-modal="true" aria-label={sel?.name} aria-hidden={!open}>
      {sel && <>{sel.image_url ? <img className="sheetimg" src={sel.image_url} alt="" /> : <div className="sheetart"><Art kind={artKind(sel.name, sel._cat)} /></div>}
        <div className="sheetbody"><button className="x" onClick={() => setOpen(false)} aria-label="Close"><Ic n="x" s={20} /></button>
          {sel.badge && <span className="badge">{BADGE[sel.badge]}</span>}
          <h3><Diet d={sel.diet} />{sel.name}</h3><p className="price big">{inr(sel.price_paise)}</p>
          {sel.description && <p>{sel.description}</p>}
          <span className={'badge' + (sel.is_available ? '' : ' no')}>{sel.is_available ? 'Available now' : 'Sold out for now'}</span></div></>}
    </div>
  </>)
}

export function Wifi() {
  const { cafe } = useOutletContext(), s = cafe.settings || {}, [done, setDone] = useState('')
  useEffect(() => { track(cafe.id, 'wifi') }, [cafe.id])
  const copy = (k, v) => { navigator.clipboard?.writeText(v); setDone(k); setTimeout(() => setDone(''), 2000) }
  return (<Sub title="Wi‑Fi">
    {s.wifi_name ? <div className="wifi">
      <p className="mut">Network</p><div className="line"><b>{s.wifi_name}</b><button onClick={() => copy('n', s.wifi_name)}>{done === 'n' ? 'Copied ✓' : 'Copy'}</button></div>
      {s.wifi_password ? <><p className="mut">Password</p><div className="line"><b>{s.wifi_password}</b><button onClick={() => copy('p', s.wifi_password)}>{done === 'p' ? 'Copied ✓' : 'Copy'}</button></div></>
        : <p>Please ask our staff for the password.</p>}
    </div> : <p className="mut">Please ask our staff for Wi‑Fi details.</p>}
  </Sub>)
}

const Stars = ({ v, set }) => <div className="stars" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map(n =>
  <button type="button" key={n} role="radio" aria-checked={v === n} aria-label={n + ' out of 5'} className={'st' + (v >= n ? ' on' : '')} onClick={() => set(n)}><Ic n="review" s={40} /></button>)}</div>

export function Review() {
  const { cafe } = useOutletContext(), url = safe(cafe.settings?.review_url)
  return (<Sub title="Leave a review">
    <p className="lead">Enjoyed your visit? An honest review helps other people find us.</p>
    {url ? <a className="btn" href={url} target="_blank" rel="noopener noreferrer" onClick={() => track(cafe.id, 'review')}>Write a Google review</a> : <p className="mut">Reviews aren’t set up yet.</p>}
  </Sub>)
}

export function Feedback() {
  const { cafe } = useOutletContext()
  const [text, setText] = useState(''), [rating, setRating] = useState(0), [st, setSt] = useState('idle')
  const send = async e => {
    e.preventDefault(); setSt('sending')
    const { error } = await supabase.from('feedback').insert({ cafe_id: cafe.id, message: text.trim(), rating: rating || null })
    if (error) return setSt('error')
    track(cafe.id, 'feedback'); setSt('done')
  }
  if (st === 'done') return <Sub title="Thank you"><div className="done"><svg viewBox="0 0 52 52" width="84" height="84"><circle cx="26" cy="26" r="24" /><path d="M15 27l8 8 14-16" /></svg><p className="lead">Your feedback has reached the café team.</p></div></Sub>
  return (<Sub title="Private feedback">
    <p className="lead">Tell us how we did. This is anonymous. We don’t ask for your name or contact details.</p>
    <form onSubmit={send}>
      <Stars v={rating} set={setRating} />
      <textarea required maxLength={1000} rows={5} value={text} onChange={e => setText(e.target.value)} placeholder="What went well? What could be better?" />
      <small className="mut">{text.length}/1000</small>
      <button className="btn" disabled={st === 'sending' || !text.trim()}>{st === 'sending' ? 'Sending…' : 'Send feedback'}</button>
      {st === 'error' && <p className="mut">Couldn’t send. Please try again.</p>}
    </form>
  </Sub>)
}

export function Offers() {
  const { cafe } = useOutletContext(), [rows, setRows] = useState(null)
  useEffect(() => {
    track(cafe.id, 'offers')
    const today = new Date().toISOString().slice(0, 10)
    supabase.from('offers').select('*').eq('cafe_id', cafe.id).eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => setRows((data || []).filter(o => !o.valid_until || o.valid_until >= today)))
  }, [cafe.id])
  return (<Sub title="Offers">
    {!rows && <><div className="sk" /><div className="sk" /></>}
    {rows && !rows.length && <p className="mut">No offers right now. Check back soon.</p>}
    {rows?.map(o => <div key={o.id} className="ticket">{o.valid_until && <span className="badge">{left(o.valid_until)}</span>}<h3>{o.title}</h3>{o.details && <p>{o.details}</p>}<small className="mut">Show this screen to our staff.</small></div>)}
  </Sub>)
}
