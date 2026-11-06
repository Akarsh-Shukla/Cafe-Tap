import { useState } from 'react'
import { Ico } from '../icons.jsx'
import { COMPARE } from '../content.js'

export default function Compare() {
  const [tab, setTab] = useState('now')
  const col = (k, c, good) => <div className={'lx-col ' + k + (tab === k ? ' active' : '')} data-glow>
    <h3>{c.name}</h3><ul>{c.items.map((t, i) => <li key={t} style={{ '--i': i }}><span className={good ? 'ok' : 'no'}><Ico n={good ? 'check' : 'x'} s={14} w={2.6} /></span>{t}</li>)}</ul></div>
  return (<section className="lx-sec" id="why"><div className="lx-wrap">
    <div data-rv><p className="lx-eyebrow">Why cafés switch</p><h2 className="lx-h2">{COMPARE.title}</h2></div>
    <div className="lx-seg" role="tablist" aria-label="Compare" data-rv>
      <button role="tab" aria-selected={tab === 'old'} className={tab === 'old' ? 'on' : ''} onClick={() => setTab('old')}>Today</button>
      <button role="tab" aria-selected={tab === 'now'} className={tab === 'now' ? 'on' : ''} onClick={() => setTab('now')}>With CafeTap</button></div>
    <div className="lx-cmp" data-rv>{col('old', COMPARE.old, false)}{col('now', COMPARE.now, true)}</div>
  </div></section>)
}
