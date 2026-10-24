import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { inr, safe, track, OPTS, SHORT, BADGE, DIET, catIcon, artKind, HERO_ART, designVars } from '../lib/util'
import Art from '../components/Art.jsx'

const P = { menu: 'M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2', offers: 'M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01', wifi: 'M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 19.5h.01', review: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z', feedback: 'M4 5h16v11H9l-5 4V5z', back: 'M15 5l-7 7 7 7', x: 'M6 6l12 12M18 6L6 18', arrow: 'M5 12h14M13 6l6 6-6 6', cup: 'M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2', bake: 'M4 18v-5a8 8 0 0 1 16 0v5H4zM9 10l2 3M13 10l2 3', plate: 'M3 10l9-5 9 5-9 5-9-5zM3 14l9 5 9-5', cake: 'M4 20h16v-7H4v7zM4 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2M12 7V4', glass: 'M7 4h10l-1.5 15a2 2 0 0 1-2 1.8h-3a2 2 0 0 1-2-1.8L7 4zM8 9h8', egg: 'M12 4c-4 0-7 5-7 9a7 7 0 0 0 14 0c0-4-3-9-7-9z', dish: 'M3 14h18a9 9 0 0 0-18 0zM2 18h20', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', list: 'M4 6h16M4 12h16M4 18h16', info: 'M12 11v6M12 7.5h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' }
const Ic = ({ n, s = 26 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
const left = d => { if (!d) return ''; const n = Math.ceil((new Date(d + 'T23:59:59') - Date.now()) / 864e5); return n <= 1 ? 'Ends today' : `Ends in ${n} days` }
const calmOS = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Smooth screen-to-screen transitions where the browser supports them, instant navigation elsewhere.
const useGo = () => {
  const nav = useNavigate()
  return to => { const run = () => nav(to); if (document.startViewTransition && !calmOS()) document.startViewTransition(() => flushSync(run)); else run() }
}
const GLink = ({ to, children, ...p }) => {
  const go = useGo()
  return <a href={to} {...p} onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); go(to) }}>{children}</a>
}
const Sub = ({ title, children }) => {
  const { slug } = useOutletContext()
  return (<>
    <div className="top2"><GLink className="backb" to={'/' + slug} aria-label="Back to home"><Ic n="back" s={22} /></GLink><h2>{title}</h2></div>
    <div className="wrap rise">{children}</div></>)
}

function Dock({ cafe, slug }) {
  const loc = useLocation(), go = useGo()
  const on = cafe.settings?.options || OPTS.map(o => o[0])
  const items = OPTS.filter(o => on.includes(o[0])), cur = loc.pathname.split('/')[2] || '', idx = items.findIndex(o => o[0] === cur)
  return (<nav className="dock" aria-label="Café sections"><span className="ind" style={{ '--k': Math.max(idx, 0), '--c': items.length, opacity: idx < 0 ? 0 : 1 }} />
    {items.map(([k]) => <a key={k} href={`/${slug}/${k}`} className={k === cur ? 'on' : ''} aria-current={k === cur ? 'page' : undefined} onClick={e => { e.preventDefault(); go(`/${slug}/${k}`) }}><Ic n={k} s={22} /><small>{SHORT[k]}</small></a>)}
  </nav>)
}

export function GuestLayout() {
  const { slug } = useParams(), loc = useLocation()
  const [cafe, setCafe] = useState(undefined), [failed, setFailed] = useState(false), [intro, setIntro] = useState(false)
  useEffect(() => {
    setCafe(undefined); setFailed(false)
    supabase.from('cafes').select('*').eq('slug', slug).eq('published', true).maybeSingle()
      .then(({ data, error }) => {
        if (error) setFailed(true)
        let seen = false; try { seen = sessionStorage.getItem('ct_' + slug) } catch {}
        const home = /^\/[^/]+(\/t\/[^/]+)?\/?$/.test(location.pathname)
        const doIntro = !!data && home && !seen && !data.settings?.design?.calm && !calmOS()
        if (doIntro) { try { sessionStorage.setItem('ct_' + slug, '1') } catch {} }
        setIntro(doIntro); setCafe(data || null)
        if (data) { document.title = data.name; track(data.id, 'visit') }
      })
  }, [slug])
  useEffect(() => { if (!intro) return; const t = setTimeout(() => setIntro(false), 1400); return () => clearTimeout(t) }, [intro])
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  if (failed) return <main className="msg"><h1>Something went wrong</h1><p>Please check your connection and refresh the page.</p></main>
  if (cafe === undefined) return <main className="msg"><div className="sk" style={{ height: 220 }} /><div className="sk" /><div className="sk" /></main>
  if (!cafe) return <main className="msg"><h1>Page not available</h1><p>This café page doesn’t exist or isn’t published yet. Please ask the café for their QR code.</p></main>
  const d = cafe.settings?.design || {}
  return (<div className={'page app' + (intro ? ' intro' : '') + (d.calm ? ' calm' : '')} data-theme={cafe.theme} style={designVars(d)}>
    <div className="screen"><Outlet context={{ cafe, slug }} /></div>
    <Dock cafe={cafe} slug={slug} />
    {intro && <div className="curtain" aria-hidden="true"><span>{cafe.name}</span></div>}
  </div>)
}

const greetFor = h => h < 5 ? 'Up late? We’ve got you' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Up late? We’ve got you'
const PT = [[8, 18, 16, 0, 7], [78, 8, 12, 1.2, 9], [20, 62, 12, 2, 8], [88, 54, 18, 0.6, 10], [52, 28, 10, 1.8, 11], [10, 40, 9, 2.6, 8]]

export function Home() {
  const { cafe, slug } = useOutletContext(), { table } = useParams()
  const [label, setLabel] = useState(''), [offer, setOffer] = useState(null), [info, setInfo] = useState(false)
  const d = cafe.settings?.design || {}
  useEffect(() => {
    if (table) supabase.from('cafe_tables').select('display_name').eq('cafe_id', cafe.id).eq('token', table).maybeSingle().then(({ data }) => setLabel(data?.display_name || ''))
    const today = new Date().toISOString().slice(0, 10)
    supabase.from('offers').select('title,valid_until').eq('cafe_id', cafe.id).eq('is_active', true).order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setOffer((data || []).find(o => !o.valid_until || o.valid_until >= today) || null))
  }, [table, cafe.id])
  const move = e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)); e.currentTarget.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3)) }
  const insta = safe(cafe.settings?.insta), on = cafe.settings?.options || OPTS.map(o => o[0])
  let n = 0
  const title = cafe.name.split(' ').map((w, wi) => <span className="w" key={wi}>{[...w].map(ch => <span className="l" key={n} style={{ '--n': n++ }}>{ch}</span>)}{' '}</span>)
  return (<>
    <section className={'stage' + (cafe.cover_url ? ' img' : '')} onPointerMove={move} style={cafe.cover_url ? { backgroundImage: `url("${cafe.cover_url}")` } : undefined}>
      {!cafe.cover_url && <><div className="parts" aria-hidden="true">{PT.map(([x, y, s, dl, du], i) => <i key={i} className="pt" style={{ left: x + '%', top: y + '%', '--s': s + 'px', '--dl': dl + 's', '--du': du + 's' }} />)}</div>
        <div className="hart" aria-hidden="true"><div className="hfloat"><span className="blob" /><Art kind={d.art || HERO_ART[cafe.theme] || 'latte'} /></div></div></>}
      <button className="info" onClick={() => setInfo(true)} aria-label="About us, hours and Instagram"><Ic n="info" s={22} /></button>
      <div className="stext">
        {cafe.logo_url && <img className="logo" src={cafe.logo_url} alt="" />}
        {label && <span className="pill">{label}</span>}
        <p className="greet2">{d.greeting || greetFor(new Date().getHours())}</p>
        <h1 aria-label={cafe.name}><span aria-hidden="true">{title}</span></h1>
        {cafe.tagline && <p className="tag">{cafe.tagline}</p>}
        {offer && on.includes('offers') && <GLink className="ann" to={`/${slug}/offers`}><i className="dot" /><span>{offer.title}</span><Ic n="arrow" s={18} /></GLink>}
        {on.includes('menu') && <GLink className="cta2" to={`/${slug}/menu`}>Explore the menu <Ic n="arrow" s={20} /></GLink>}
      </div>
    </section>
    <div className={'scrim' + (info ? ' on' : '')} onClick={() => setInfo(false)} />
    <div className={'sheet' + (info ? ' on' : '')} role="dialog" aria-modal="true" aria-label={'About ' + cafe.name} aria-hidden={!info}>
      <div className="sheetbody"><button className="x" onClick={() => setInfo(false)} aria-label="Close"><Ic n="x" s={20} /></button>
        <span className="script">Our story</span><h3>{cafe.name}</h3>
        <p>{cafe.about || 'Welcome! Tap the menu to see what we’re serving today.'}</p>
        {cafe.hours && <p><b>Open</b> {cafe.hours}</p>}
        {insta && <a className="btn" href={insta} target="_blank" rel="noopener noreferrer">Follow us on Instagram</a>}
        <small className="mut">Powered by CafeTap</small></div>
    </div>
  </>)
}

const Diet = ({ d }) => d ? <i className={'diet ' + d} role="img" aria-label={DIET[d]} title={DIET[d]} /> : null
const Ph = ({ i }) => <div className="ph">{i.image_url ? <img src={i.image_url} alt="" loading="lazy" /> : <Art kind={artKind(i.name, i._cat)} />}
  {i.badge && <em className="bdg">{BADGE[i.badge]}</em>}{!i.is_available && <em className="bdg" style={{ top: 'auto', bottom: 10, background: '#555', color: '#fff' }}>Sold out</em>}</div>
const Card = ({ i, cls, onOpen, fav, toggle }) => <div className={cls + (i.is_available ? '' : ' out')}>
  <button className="cm" onClick={() => onOpen(i)}><Ph i={i} /><div className="cb"><b><Diet d={i.diet} />{i.name}</b>{i.description && <small>{i.description}</small>}<span className="price">{inr(i.price_paise)}</span></div></button>
  <button className={'heart' + (fav ? ' on' : '')} onClick={() => toggle(i.id)} aria-pressed={fav} aria-label={fav ? 'Remove from saved' : 'Save this dish'}><Ic n="heart" s={20} /></button></div>

export function MenuPage() {
  const { cafe, slug } = useOutletContext()
  const [cats, setCats] = useState(null), [failed, setFailed] = useState(false), [q, setQ] = useState(''), [active, setActive] = useState(''), [sel, setSel] = useState(null), [open, setOpen] = useState(false), [view, setView] = useState('grid'), [offer, setOffer] = useState(null), [veg, setVeg] = useState(false), [saved, setSaved] = useState(false)
  const [favs, setFavs] = useState(() => { try { return JSON.parse(localStorage.getItem('ct_fav_' + cafe.id) || '[]') } catch { return [] } })
  const toggle = id => setFavs(f => { const nx = f.includes(id) ? f.filter(x => x !== id) : [...f, id]; try { localStorage.setItem('ct_fav_' + cafe.id, JSON.stringify(nx)) } catch {} return nx })
  useEffect(() => {
    track(cafe.id, 'menu')
    supabase.from('menu_categories').select('id,name,sort_order,menu_items(id,name,description,price_paise,image_url,is_available,sort_order,badge,diet)').eq('cafe_id', cafe.id).order('sort_order')
      .then(({ data, error }) => error ? setFailed(true) : setCats(data))
    const today = new Date().toISOString().slice(0, 10)
    supabase.from('offers').select('title,valid_until').eq('cafe_id', cafe.id).eq('is_active', true).order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setOffer((data || []).find(o => !o.valid_until || o.valid_until >= today) || null))
  }, [cafe.id])
  const ql = q.trim().toLowerCase(), filtering = !!ql || veg || saved
  const hasDiet = (cats || []).some(c => c.menu_items.some(i => i.diet))
  const keep = i => (!veg || i.diet === 'veg') && (!saved || favs.includes(i.id)) && (!ql || (i.name + ' ' + (i.description || '')).toLowerCase().includes(ql))
  const shown = (cats || []).map(c => ({ ...c, items: [...c.menu_items].sort((a, b) => a.sort_order - b.sort_order).map(i => ({ ...i, _cat: c.name })).filter(keep) })).filter(c => c.items.length)
  const picks = filtering ? [] : (cats || []).flatMap(c => c.menu_items.map(i => ({ ...i, _cat: c.name }))).filter(i => i.badge && i.is_available)
  useEffect(() => {
    if (!cats) return
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setActive(e.target.dataset.id)), { rootMargin: '-25% 0px -70% 0px' })
    document.querySelectorAll('.msec').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [cats, q, view, veg, saved])
  useEffect(() => { document.querySelector('.catb.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) }, [active])
  useEffect(() => { const k = e => e.key === 'Escape' && setOpen(false); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  const show = i => { setSel(i); setOpen(true) }
  return (<>
    <Sub title="Menu">
      <input className="search" type="search" placeholder="Search coffee, food and more" aria-label="Search the menu" value={q} onChange={e => setQ(e.target.value)} />
      {offer && <GLink className="ban" to={`/${slug}/offers`}><span><small>Today’s offer</small><b>{offer.title}</b></span><Ic n="arrow" s={22} /></GLink>}
      {picks.length > 0 && <><div className="sech"><span className="script">Guest favourites</span><h3>Popular picks</h3></div><div className="picks">{picks.map(i => <Card key={i.id} i={i} cls="pick" onOpen={show} fav={favs.includes(i.id)} toggle={toggle} />)}</div></>}
      <div className="mbar">{shown.length > 1 && <nav className="cats" aria-label="Menu sections">{shown.map(c =>
        <button key={c.id} className={'catb' + (active === c.id ? ' on' : '')} onClick={() => document.getElementById('c' + c.id)?.scrollIntoView({ behavior: 'smooth' })}><span><Ic n={catIcon(c.name)} s={20} /></span>{c.name}</button>)}</nav>}</div>
      {cats && cats.length > 0 && <div className="tools"><div className="chiprow">
        {hasDiet && <button className={'fchip' + (veg ? ' on' : '')} onClick={() => setVeg(!veg)} aria-pressed={veg}><Diet d="veg" />Veg only</button>}
        <button className={'fchip' + (saved ? ' on' : '')} onClick={() => setSaved(!saved)} aria-pressed={saved}><Ic n="heart" s={16} />Saved{favs.length ? ` (${favs.length})` : ''}</button></div>
        <div className="seg" role="group" aria-label="Layout"><button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="Illustrated cards"><Ic n="grid" s={18} /></button><button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="Compact list"><Ic n="list" s={18} /></button></div></div>}
      {failed && <p>We couldn’t load the menu. Please refresh.</p>}
      {!cats && !failed && <><div className="sk" /><div className="sk" /><div className="sk" /></>}
      {cats && !cats.length && <p className="mut">The menu is coming soon.</p>}
      {cats?.length > 0 && !shown.length && <p className="mut">{saved && !ql && !veg ? 'Tap the heart on any dish to save it here.' : 'Nothing matches your filters.'}</p>}
      {shown.map(c => <section key={c.id} id={'c' + c.id} data-id={c.id} className="msec">
        <div className="chead"><div><h3>{c.name}</h3><small>{c.items.length} {c.items.length === 1 ? 'item' : 'items'}</small></div><span className="chart"><Art kind={artKind(c.name, c.items[0]?.name)} /></span></div>
        {view === 'grid' ? <div className="grid2">{c.items.map((i, k) => <Card key={i.id} i={i} cls={'gcard' + (k === 0 && c.items.length > 1 ? ' wide' : '')} onOpen={show} fav={favs.includes(i.id)} toggle={toggle} />)}</div>
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
          <span className={'badge' + (sel.is_available ? '' : ' no')}>{sel.is_available ? 'Available now' : 'Sold out for now'}</span>
          <button className={'favbtn' + (favs.includes(sel.id) ? ' on' : '')} onClick={() => toggle(sel.id)}><Ic n="heart" s={18} />{favs.includes(sel.id) ? 'Saved' : 'Save for later'}</button></div></>}
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
