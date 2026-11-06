import { useState } from 'react'
import Art from '../components/Art.jsx'
import { designVars, HERO_ART } from '../lib/util'
import { Ico } from './icons.jsx'

const MOCK = { roastery: ['Ember & Oak', 'Slow mornings, small batches'], bakery: ['Flour & Fig', 'Baked before sunrise'], chai: ['Kulhad Corner', 'Chai. Maska bun. Repeat.'], sage: ['Leaf & Bean', 'Good coffee, better days'], mocha: ['Cocoa & Co.', 'Freshly brewed, always'] }
const MENU = {
  Coffee: [['Cappuccino', '₹180', 'latte'], ['Cold brew', '₹210', 'iced'], ['Masala chai', '₹90', 'chai'], ['Flat white', '₹170', 'latte']],
  Bakes: [['Butter croissant', '₹120', 'croissant'], ['Chocolate cake', '₹160', 'cake'], ['Cheese toastie', '₹150', 'sandwich'], ['Brownie', '₹110', 'cake']],
}
const DOCK = [['menu', 'Menu'], ['offers', 'Offers'], ['wifi', 'Wi‑Fi'], ['review', 'Review'], ['feedback', 'Feedback']]

// A miniature, interactive copy of the real customer page. Colours, fonts and corners come from the same design variables the real page uses.
export default function PhoneMock({ theme = 'sage', design = {} }) {
  const [screen, setScreen] = useState('home'), [cat, setCat] = useState('Coffee')
  const [name, tag] = MOCK[theme] || MOCK.sage
  return (<div className="lx-phone" role="group" aria-label="Interactive preview of a café page">
    <span className="lx-notch" aria-hidden="true" />
    <div className="lx-screen" data-theme={theme} style={designVars(design)}>
      <div className={'lx-view lx-home' + (screen === 'home' ? '' : ' off')}>
        <div className="lx-ph-art" aria-hidden="true"><Art kind={design.art || HERO_ART[theme] || 'latte'} /></div>
        <div className="lx-ph-text"><small>Good morning</small><b>{name}</b><span>{tag}</span>
          <button className="lx-ph-cta" onClick={() => setScreen('menu')} tabIndex={screen === 'home' ? 0 : -1}>Explore the menu <Ico n="arrow" s={14} /></button></div>
      </div>
      <div className={'lx-view lx-menu-view' + (screen === 'menu' ? '' : ' off')}>
        <div className="lx-ph-bar"><button onClick={() => setScreen('home')} aria-label="Back to the café home screen" tabIndex={screen === 'menu' ? 0 : -1}><Ico n="back" s={14} /></button><b>Menu</b></div>
        <div className="lx-ph-chips">{Object.keys(MENU).map(c => <button key={c} className={c === cat ? 'on' : ''} onClick={() => setCat(c)} tabIndex={screen === 'menu' ? 0 : -1}>{c}</button>)}</div>
        <div className="lx-ph-grid">{MENU[cat].map(([n, p, k]) => <div className="lx-ph-card" key={cat + n}><div className="lx-ph-img"><Art kind={k} /></div><b>{n}</b><span>{p}</span></div>)}</div>
      </div>
      <div className="lx-ph-dock" aria-hidden="true">{DOCK.map(([i, l]) => <span key={i} className={i === 'menu' && screen === 'menu' ? 'on' : ''}><Ico n={i} s={15} /><small>{l}</small></span>)}</div>
    </div>
  </div>)
}
