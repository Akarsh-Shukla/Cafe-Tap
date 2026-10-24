import Art from './Art.jsx'
import { designVars, HERO_ART } from '../lib/util'

// A tiny live copy of the customer home screen, so owners see every design choice instantly.
export default function DesignPreview({ name, tagline, theme, design }) {
  return (<div className="pvwrap"><div className="pv-phone"><div className="page pvpage" data-theme={theme} style={designVars(design)}>
    <div className="pv-stage"><div className="hart"><div className="hfloat"><span className="blob" /><Art kind={design.art || HERO_ART[theme] || 'latte'} /></div></div>
      <div className="pv-text"><small>{design.greeting || 'Good morning'}</small><b className="pv-name">{name || 'Your café'}</b><span className="pv-tag">{tagline}</span><span className="pv-cta">Explore the menu</span></div></div>
    <div className="pv-dock"><i /><i /><i /><i /></div></div></div><p className="muted" style={{ textAlign: 'center' }}>Live preview</p></div>)
}
