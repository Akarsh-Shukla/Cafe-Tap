import { useState } from 'react'
import PhoneMock from '../PhoneMock.jsx'
import { STUDIO } from '../content.js'

// A teaser of the real Design studio: every choice here changes the phone straight away.
export default function ThemeStudio({ contact }) {
  const [theme, setTheme] = useState('roastery'), [accent, setAccent] = useState(''), [font, setFont] = useState('classic'), [radius, setRadius] = useState('')
  const chip = (on, onClick, label, extra) => <button key={label} className={'lx-chip' + (on ? ' on' : '')} onClick={onClick} aria-pressed={on}>{extra}{label}</button>
  return (<section className="lx-sec dark" id="studio"><div className="lx-wrap lx-studio">
    <div className="lx-studio-text" data-rv>
      <p className="lx-eyebrow">{STUDIO.eyebrow}</p><h2 className="lx-h2">{STUDIO.title}</h2><p className="lx-lead">{STUDIO.lead}</p>
      <div className="lx-ctl"><b>Style</b><div className="lx-row">{STUDIO.themes.map(([k, n, bg, ac]) => chip(theme === k, () => setTheme(k), n, <i className="lx-dotsw" style={{ background: `linear-gradient(135deg,${bg} 50%,${ac} 50%)` }} />))}</div></div>
      <div className="lx-ctl"><b>Accent colour</b><div className="lx-row">
        <button className={'lx-sw' + (accent === '' ? ' on' : '')} onClick={() => setAccent('')} aria-pressed={accent === ''} aria-label="Use the style’s own colour"><span>Auto</span></button>
        {STUDIO.accents.map(c => <button key={c} className={'lx-sw' + (accent === c ? ' on' : '')} style={{ background: c }} onClick={() => setAccent(c)} aria-pressed={accent === c} aria-label={'Accent ' + c} />)}</div></div>
      <div className="lx-ctl"><b>Fonts</b><div className="lx-row">{STUDIO.fonts.map(([k, l]) => chip(font === k, () => setFont(k), l))}</div></div>
      <div className="lx-ctl"><b>Corners</b><div className="lx-row">{STUDIO.radii.map(([k, l]) => chip(radius === k, () => setRadius(k), l))}</div></div>
      <a className="lx-btn or" href={contact} data-magnet>Design mine</a>
    </div>
    <div className="lx-studio-phone" data-rv style={{ '--d': '.1s' }}><span className="lx-blob2" aria-hidden="true" /><PhoneMock theme={theme} design={{ accent, font, radius }} /></div>
  </div></section>)
}
