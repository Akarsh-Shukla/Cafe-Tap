// Finds the images you drop into src/content/ automatically (see src/content/README.md). No code changes needed to add a picture.
const urls = import.meta.glob('/src/content/showcase/*.{png,jpg,jpeg,webp,avif}', { eager: true, query: '?url', import: 'default' })
const caps = import.meta.glob('/src/content/showcase/captions.json', { eager: true, import: 'default' })
const artUrls = import.meta.glob('/src/content/art/*.{png,jpg,jpeg,webp,avif}', { eager: true, query: '?url', import: 'default' })
const artMeta = import.meta.glob('/src/content/art/pieces.json', { eager: true, import: 'default' })

const file = p => p.split('/').pop()
const nice = f => f.replace(/\.[^.]+$/, '').replace(/^\d+[-_ ]*/, '').replace(/[-_]+/g, ' ').replace(/^./, c => c.toUpperCase())
const first = o => Object.values(o)[0] || null
const text = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')
const https = u => (/^https:\/\//.test(u || '') ? u : '')

export const SHOWCASE = (() => {
  const c = first(caps) || {}
  return Object.keys(urls).sort().map(p => { const f = file(p), m = c[f] || {}
    return { src: urls[p], title: text(m.title, 80) || nice(f), caption: text(m.caption, 140), alt: text(m.alt, 200) || text(m.title, 80) || nice(f), w: +m.w || 0, h: +m.h || 0 } })
})()

// Only pieces listed in pieces.json AND having an image file are shown. Nothing unapproved can appear by accident.
export const ARTWORKS = (() => {
  const list = first(artMeta); if (!Array.isArray(list)) return []
  const byFile = Object.fromEntries(Object.entries(artUrls).map(([p, u]) => [file(p), u]))
  return list.filter(a => a && byFile[a.file]).map(a => ({
    id: text(a.id, 40) || a.file, src: byFile[a.file], title: text(a.title, 80) || nice(a.file), story: text(a.story, 300), by: text(a.by, 60), seller: text(a.seller, 120),
    size: text(a.size, 60), material: text(a.material, 80), price: text(a.price, 30), available: typeof a.available === 'boolean' ? a.available : null, link: https(a.link), w: +a.w || 0, h: +a.h || 0 }))
})()
