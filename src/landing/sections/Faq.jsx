import { useState } from 'react'
import { Ico } from '../icons.jsx'
import { FAQ } from '../content.js'
export default function Faq() {
  const [open, setOpen] = useState(0)
  return (<section className="lx-sec" id="faq"><div className="lx-wrap lx-faqw">
    <div data-rv className="lx-faqh"><p className="lx-eyebrow">Questions</p><h2 className="lx-h2">Honest answers.</h2></div>
    <div className="lx-faq" data-rv>{FAQ.map(([q, a], i) => <div key={q} className={'lx-qa' + (open === i ? ' open' : '')}>
      <h3><button id={'q' + i} aria-expanded={open === i} aria-controls={'a' + i} onClick={() => setOpen(open === i ? -1 : i)}>{q}<Ico n="plus" s={20} /></button></h3>
      <div id={'a' + i} role="region" aria-labelledby={'q' + i} className="lx-qa-a"><div><p>{a}</p></div></div></div>)}</div>
  </div></section>)
}
