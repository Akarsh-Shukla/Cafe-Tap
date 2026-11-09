// Sound and voice alerts for the order screens. Browsers only allow sound after a tap, so staff switch alerts on once per device.
const KEY = 'ct_alerts'
export const readPrefs = () => { try { return { on: false, mode: 'both', ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { on: false, mode: 'both' } } }
export const savePrefs = p => { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch {} }

let ctx = null
export function unlockAudio() { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume() } catch {} }
// a pleasant three-note chime made with the Web Audio API (no sound file needed)
export function chime() {
  try {
    unlockAudio(); const t = ctx.currentTime
    ;[[880, 0], [1175, 0.18], [1568, 0.36]].forEach(([f, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.35, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.5)
      o.connect(g); g.connect(ctx.destination); o.start(t + d); o.stop(t + d + 0.55)
    })
  } catch {}
}
export function speak(text) {
  try { if (!('speechSynthesis' in window)) return; const u = new SpeechSynthesisUtterance(text); u.lang = 'en-IN'; u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch {}
}
export function notify(prefs, title, text) {
  if (!prefs.on) return
  if (prefs.mode !== 'voice') chime()
  if (prefs.mode !== 'chime') setTimeout(() => speak(text), prefs.mode === 'both' ? 800 : 0)
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, {
          body: text,
          icon: '/icons/icon.svg',
          badge: '/icons/icon.svg',
          vibrate: [200, 100, 200],
          tag: 'cafetap-order-notification',
          renotify: true
        })).catch(() => new Notification(title, { body: text, icon: '/icons/icon.svg' }))
      } else {
        new Notification(title, { body: text, icon: '/icons/icon.svg' })
      }
    }
  } catch {}
}
let lock = null
export async function keepAwake(on) {
  try { if (on && navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); else if (lock) { await lock.release(); lock = null } } catch {}
}
