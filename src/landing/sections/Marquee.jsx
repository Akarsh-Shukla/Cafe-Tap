import { MARQUEE } from '../content.js'
export default function Marquee() {
  const group = hide => <ul className="lx-mq-g" aria-hidden={hide || undefined}>{MARQUEE.map(m => <li key={m}>{m}<i /></li>)}</ul>
  return <div className="lx-marq" role="presentation"><div className="lx-mq-track">{group(false)}{group(true)}</div></div>
}
