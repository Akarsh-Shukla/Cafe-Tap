import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { upload, safe, OPTS, ARTS } from '../../lib/util'
import DesignPreview from '../../components/DesignPreview'

const THEMES = [['roastery', 'Noir: dark, brass, elegant'], ['bakery', 'Blush: soft, rounded, sweet'], ['chai', 'Citrus: bold, loud, street'], ['sage', 'Sage: fresh green, cosy, script touches'], ['mocha', 'Mocha: warm cream and coffee brown']]

export default function Settings({ cafe, uid, reload }) {
  const s = cafe.settings || {}
  const [f, setF] = useState({ name: cafe.name, tagline: cafe.tagline || '', about: cafe.about || '', hours: cafe.hours || '', theme: cafe.theme, logo_url: cafe.logo_url || '', cover_url: cafe.cover_url || '',
    insta: s.insta || '', address: s.address || '', phone: s.phone || '', maps: s.maps || '', review_url: s.review_url || '', wifi_name: s.wifi_name || '', wifi_password: s.wifi_password || '', show_pw: !!s.show_wifi_password, options: s.options || OPTS.map(o => o[0]), accent: s.design?.accent || '', font: s.design?.font || 'classic', radius: s.design?.radius || '', art: s.design?.art || '', calm: !!s.design?.calm, greeting: s.design?.greeting || '' })
  const [msg, setMsg] = useState('')
  const set = (k, v) => setF({ ...f, [k]: v })
  const toggle = k => set('options', f.options.includes(k) ? f.options.filter(x => x !== k) : [...f.options, k])
  const pic = async (k, file) => { if (!file) return; try { set(k, await upload(file, uid)) } catch (e) { setMsg(e.message) } }
  const save = async e => {
    e.preventDefault()
    if ((f.insta && !safe(f.insta)) || (f.review_url && !safe(f.review_url)) || (f.maps && !safe(f.maps))) return setMsg('Links must start with https://')
    const { error } = await supabase.from('cafes').update({
      name: f.name.trim(), tagline: f.tagline, about: f.about, hours: f.hours, theme: f.theme, logo_url: f.logo_url || null, cover_url: f.cover_url || null, updated_at: new Date().toISOString(),
      // The password is only stored when you choose to show it, because this row is readable by anyone who opens your page.
      settings: { insta: f.insta, address: f.address.slice(0, 160), phone: f.phone.slice(0, 20), maps: f.maps, review_url: f.review_url, wifi_name: f.wifi_name, wifi_password: f.show_pw ? f.wifi_password : '', show_wifi_password: f.show_pw, options: f.options, design: { accent: f.accent, font: f.font, radius: f.radius, art: f.art, calm: f.calm, greeting: f.greeting.trim().slice(0, 40) } },
    }).eq('id', cafe.id)
    setMsg(error ? error.message : 'Saved'); reload()
  }
  const T = (k, l, ph) => <><label>{l}</label><input value={f[k]} placeholder={ph} onChange={e => set(k, e.target.value)} /></>
  return (<form onSubmit={save}>
    <details className="panel" open><summary>Design studio</summary>
      <p className="muted">Make the page feel like your café. The preview on the right updates as you choose.</p>
      <div className="studio"><div>
        <label>Style</label><div className="themes">{THEMES.map(([k, l]) => <button type="button" key={k} data-theme={k} className={'tpick' + (f.theme === k ? ' on' : '')} onClick={() => set('theme', k)}><b>{l.split(':')[0]}</b><small>{l.split(': ')[1]}</small></button>)}</div>
        <label>Accent colour</label><div className="row"><input type="color" value={f.accent || '#1f3a27'} onChange={e => set('accent', e.target.value)} style={{ width: 70, padding: 4, height: 46 }} /><button type="button" className="link" onClick={() => set('accent', '')}>Use the design’s own colour</button></div>
        <label>Fonts</label><select value={f.font} onChange={e => set('font', e.target.value)}>{[['classic', 'Match my design'], ['modern', 'Modern (Bricolage and Manrope)'], ['elegant', 'Elegant (Playfair and DM Sans)'], ['editorial', 'Editorial (Fraunces and Hanken)']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <label>Corners</label><select value={f.radius} onChange={e => set('radius', e.target.value)}>{[['', 'Match my design'], ['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Very round']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <label>Main illustration</label><select value={f.art} onChange={e => set('art', e.target.value)}>{ARTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <label>Welcome line (optional)</label><input maxLength={40} value={f.greeting} onChange={e => set('greeting', e.target.value)} placeholder="Good morning, coffee lover" />
        <label className="chk"><input type="checkbox" checked={f.calm} onChange={e => set('calm', e.target.checked)} /> Calm mode: no animations or intro</label></div>
      <DesignPreview name={f.name} tagline={f.tagline} theme={f.theme} design={{ accent: f.accent, font: f.font, radius: f.radius, art: f.art, greeting: f.greeting }} /></div></details>
    <details className="panel"><summary>About your café</summary>{T('name', 'Café name')}{T('tagline', 'Tagline')}
      <label>About</label><textarea rows={4} maxLength={600} value={f.about} onChange={e => set('about', e.target.value)} />{T('hours', 'Opening hours', 'Daily 8am – 10pm')}</details>
    <details className="panel"><summary>Design and photos</summary>
      {[['logo_url', 'Logo'], ['cover_url', 'Cover photo']].map(([k, l]) => <div key={k} className="row">{f[k] && <img className="thumb" src={f[k]} alt="" />}
        <label className="filebtn">{f[k] ? `Change ${l.toLowerCase()}` : `Add ${l.toLowerCase()}`}<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e => pic(k, e.target.files[0])} /></label>
        {f[k] && <button type="button" className="link" onClick={() => set(k, '')}>Remove</button>}</div>)}</details>
    <details className="panel"><summary>Buttons on your home page</summary>
      {OPTS.map(([k, t]) => <label key={k} className="chk"><input type="checkbox" checked={f.options.includes(k)} onChange={() => toggle(k)} /> {t}</label>)}</details>
    <details className="panel"><summary>Links and Wi‑Fi</summary>{T('address', 'Address (shown in the info panel)')}{T('phone', 'Phone', '+91 …')}{T('maps', 'Google Maps link', 'https://maps.app.goo.gl/…')}{T('insta', 'Instagram link', 'https://instagram.com/yourcafe')}{T('review_url', 'Google review link', 'https://…')}
      {T('wifi_name', 'Wi‑Fi name')}{T('wifi_password', 'Wi‑Fi password')}
      <label className="chk"><input type="checkbox" checked={f.show_pw} onChange={e => set('show_pw', e.target.checked)} /> Show the password on my page</label>
      <p className="muted">Anyone who opens your page can see it. If unticked, customers are told to ask staff.</p></details>
    <button>Save changes</button> {msg && <span className={msg === 'Saved' ? 'ok' : 'err'}>{msg}</span>}
  </form>)
}
