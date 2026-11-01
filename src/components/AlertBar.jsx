import { useEffect } from 'react'
import { savePrefs, unlockAudio, chime, speak, notify, keepAwake } from '../lib/alerts'

export default function AlertBar({ prefs, setPrefs, label }) {
  useEffect(() => {   // the screen lock is released by the browser when the tab is hidden, so ask again when it returns
    if (!prefs.on) return
    keepAwake(true)
    const v = () => { if (!document.hidden) keepAwake(true) }
    document.addEventListener('visibilitychange', v); return () => document.removeEventListener('visibilitychange', v)
  }, [prefs.on])
  const toggle = () => {
    const n = { ...prefs, on: !prefs.on }; setPrefs(n); savePrefs(n)
    if (n.on) { unlockAudio(); chime(); speak(label + ' alerts are on'); try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission() } catch {} } else keepAwake(false)
  }
  const mode = e => { const n = { ...prefs, mode: e.target.value }; setPrefs(n); savePrefs(n) }
  return (<div className="panel alertbar">
    <div className="row"><button className={prefs.on ? '' : 'ghost'} onClick={toggle} aria-pressed={prefs.on}>{prefs.on ? 'Sound alerts: ON' : 'Turn on sound alerts'}</button>
      {prefs.on && <><select value={prefs.mode} onChange={mode} aria-label="Alert sound"><option value="both">Chime and voice</option><option value="chime">Chime only</option><option value="voice">Voice only</option></select>
        <button className="link" onClick={() => notify(prefs, 'Test', label + ': new order arrived')}>Test</button></>}</div>
    <p className="muted">Keep this page open on the café tablet or phone with the screen on and the volume up. Alerts cannot ring if the page is closed.</p></div>)
}
