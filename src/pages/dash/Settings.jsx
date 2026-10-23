import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { upload, safe, OPTS } from '../../lib/util'

const THEMES = [['roastery', 'Noir: dark, brass, elegant'], ['bakery', 'Blush: soft, rounded, sweet'], ['chai', 'Citrus: bold, loud, street'], ['sage', 'Sage: fresh green, cosy, script touches'], ['mocha', 'Mocha: warm cream and coffee brown']]

export default function Settings({ cafe, uid, reload }) {
  const s = cafe.settings || {}
  const [f, setF] = useState({ name: cafe.name, tagline: cafe.tagline || '', about: cafe.about || '', hours: cafe.hours || '', theme: cafe.theme, logo_url: cafe.logo_url || '', cover_url: cafe.cover_url || '',
    insta: s.insta || '', review_url: s.review_url || '', wifi_name: s.wifi_name || '', wifi_password: s.wifi_password || '', show_pw: !!s.show_wifi_password, options: s.options || OPTS.map(o => o[0]) })
  const [msg, setMsg] = useState('')
  const set = (k, v) => setF({ ...f, [k]: v })
  const toggle = k => set('options', f.options.includes(k) ? f.options.filter(x => x !== k) : [...f.options, k])
  const pic = async (k, file) => { if (!file) return; try { set(k, await upload(file, uid)) } catch (e) { setMsg(e.message) } }
  const save = async e => {
    e.preventDefault()
    if ((f.insta && !safe(f.insta)) || (f.review_url && !safe(f.review_url))) return setMsg('Links must start with https://')
    const { error } = await supabase.from('cafes').update({
      name: f.name.trim(), tagline: f.tagline, about: f.about, hours: f.hours, theme: f.theme, logo_url: f.logo_url || null, cover_url: f.cover_url || null, updated_at: new Date().toISOString(),
      // The password is only stored when you choose to show it, because this row is readable by anyone who opens your page.
      settings: { insta: f.insta, review_url: f.review_url, wifi_name: f.wifi_name, wifi_password: f.show_pw ? f.wifi_password : '', show_wifi_password: f.show_pw, options: f.options },
    }).eq('id', cafe.id)
    setMsg(error ? error.message : 'Saved'); reload()
  }
  const T = (k, l, ph) => <><label>{l}</label><input value={f[k]} placeholder={ph} onChange={e => set(k, e.target.value)} /></>
  return (<form onSubmit={save}>
    <details className="panel" open><summary>About your café</summary>{T('name', 'Café name')}{T('tagline', 'Tagline')}
      <label>About</label><textarea rows={4} maxLength={600} value={f.about} onChange={e => set('about', e.target.value)} />{T('hours', 'Opening hours', 'Daily 8am – 10pm')}</details>
    <details className="panel"><summary>Design and photos</summary><label>Design</label>
      <select value={f.theme} onChange={e => set('theme', e.target.value)}>{THEMES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      {[['logo_url', 'Logo'], ['cover_url', 'Cover photo']].map(([k, l]) => <div key={k} className="row">{f[k] && <img className="thumb" src={f[k]} alt="" />}
        <label className="filebtn">{f[k] ? `Change ${l.toLowerCase()}` : `Add ${l.toLowerCase()}`}<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e => pic(k, e.target.files[0])} /></label>
        {f[k] && <button type="button" className="link" onClick={() => set(k, '')}>Remove</button>}</div>)}</details>
    <details className="panel"><summary>Buttons on your home page</summary>
      {OPTS.map(([k, t]) => <label key={k} className="chk"><input type="checkbox" checked={f.options.includes(k)} onChange={() => toggle(k)} /> {t}</label>)}</details>
    <details className="panel"><summary>Links and Wi‑Fi</summary>{T('insta', 'Instagram link', 'https://instagram.com/yourcafe')}{T('review_url', 'Google review link', 'https://…')}
      {T('wifi_name', 'Wi‑Fi name')}{T('wifi_password', 'Wi‑Fi password')}
      <label className="chk"><input type="checkbox" checked={f.show_pw} onChange={e => set('show_pw', e.target.checked)} /> Show the password on my page</label>
      <p className="muted">Anyone who opens your page can see it. If unticked, customers are told to ask staff.</p></details>
    <button>Save changes</button> {msg && <span className={msg === 'Saved' ? 'ok' : 'err'}>{msg}</span>}
  </form>)
}
