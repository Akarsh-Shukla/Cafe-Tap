import { useEffect, useRef, useState } from 'react'
import { SHOWCASE, ARTWORKS } from '../lib/content.js'
import { contact, DEMO } from './contact.js'
import { useReveal, useGlow, useMagnet, useScrollVars, useActive } from './hooks.js'
import Lightbox from './Lightbox.jsx'
import Nav from './sections/Nav.jsx'
import Hero from './sections/Hero.jsx'
import Marquee from './sections/Marquee.jsx'
import Compare from './sections/Compare.jsx'
import How from './sections/How.jsx'
import Features from './sections/Features.jsx'
import ThemeStudio from './sections/ThemeStudio.jsx'
import Cards from './sections/Cards.jsx'
import Plans from './sections/Plans.jsx'
import ArtGallery from './sections/ArtGallery.jsx'
import Faq from './sections/Faq.jsx'
import { Cta, Footer, FloatingCta } from './sections/Footer.jsx'
import './landing.css'

// The page is just these sections in order. To add, remove or reorder a section, edit the list below.
export default function Landing() {
  const root = useRef(null), [box, setBox] = useState(null)
  const links = [['how', 'How it works'], ['studio', 'Designs'], ...(SHOWCASE.length ? [['cards', 'Table stands']] : []), ['plans', 'Plans'], ...(ARTWORKS.length ? [['art', 'Art']] : []), ['faq', 'Questions']]
  const active = useActive(links.map(l => l[0]))
  useReveal(); useGlow(); useMagnet(); useScrollVars(root)
  useEffect(() => {
    document.title = 'CafeTap: your café menu, one tap away'
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'A personalised menu page for your café, opened by an NFC tap or QR scan. No app needed.')
  }, [])
  return (<div className="lx" id="top" ref={root}>
    <div className="lx-prog" aria-hidden="true" />
    <Nav links={links} active={active} contact={contact} />
    <main>
      <Hero contact={contact} demo={DEMO} />
      <Marquee />
      <Compare />
      <How />
      <Features />
      <ThemeStudio contact={contact} />
      {SHOWCASE.length > 0 && <Cards items={SHOWCASE} onOpen={i => setBox({ items: SHOWCASE, index: i })} />}
      <Plans contact={contact} />
      {ARTWORKS.length > 0 && <ArtGallery items={ARTWORKS} onOpen={i => setBox({ items: ARTWORKS.map(a => ({ src: a.src, title: a.title, caption: a.by, alt: a.title })), index: i })} />}
      <Faq />
      <Cta contact={contact} />
    </main>
    <Footer />
    <FloatingCta contact={contact} />
    {box && <Lightbox items={box.items} index={box.index} onIndex={i => setBox({ ...box, index: i })} onClose={() => setBox(null)} />}
  </div>)
}
