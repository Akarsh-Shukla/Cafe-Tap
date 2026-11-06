import { ART } from '../content.js'
import { enquiry } from '../contact.js'
import { Ico } from '../icons.jsx'

// Real artworks only. Price and availability are shown ONLY when you have filled them in.
export default function ArtGallery({ items, onOpen }) {
  return (<section className="lx-sec cream" id="art"><div className="lx-wrap">
    <div data-rv><p className="lx-eyebrow">{ART.eyebrow}</p><h2 className="lx-h2">{ART.title}</h2><p className="lx-lead">{ART.lead}</p></div>
    <div className="lx-art">{items.map((a, i) => <article key={a.id} className="lx-piece" data-rv data-glow style={{ '--d': (i % 3) * 0.08 + 's' }}>
      <button className="lx-pimg" onClick={() => onOpen(i)} aria-label={'View ' + a.title + ' larger'}><img src={a.src} alt={a.title} loading="lazy" decoding="async" width={a.w || undefined} height={a.h || undefined} /><span aria-hidden="true">View</span></button>
      <div className="lx-pbody"><h3>{a.title}</h3>{a.story && <p>{a.story}</p>}
        <p className="lx-pmeta">{[a.size, a.material].filter(Boolean).join(' · ')}</p>
        {(a.available !== null || a.price) && <p className="lx-pmeta"><b>{a.available === true ? 'Available' : a.available === false ? 'Sold' : ''}</b>{a.price ? (a.available !== null ? ' · ' : '') + a.price : ''}</p>}
        <p className="lx-pmeta">{a.seller}{a.link && <> · <a href={a.link} target="_blank" rel="noopener noreferrer">More from the artist</a></>}</p>
        <a className="lx-btn sm" href={enquiry(`Hi, I’d like to enquire about “${a.title}” (ID: ${a.id}).`)}>Enquire about this piece <Ico n="arrow" s={16} /></a></div></article>)}</div>
  </div></section>)
}
