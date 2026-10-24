import { supabase } from './supabase'
export const inr = p => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
export const safe = u => { try { return new URL(u).protocol === 'https:' ? u : null } catch { return null } }
export const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
export const RESERVED = ['dashboard', 'login', 'admin', 'api', 't']
// Privacy-safe counter: stores only the café, the kind of action and the time. No names, IPs or device data.
export const track = (cafe_id, kind) => supabase.from('page_events').insert({ cafe_id, kind }).then(() => {})
// Options shown on the customer home page. The owner can switch each on or off.
export const OPTS = [['menu', 'Menu', 'See what we’re serving'], ['offers', 'Offers', 'Today’s specials and deals'], ['wifi', 'Wi‑Fi', 'Get online'], ['review', 'Leave a review', 'Tell others what you think'], ['feedback', 'Private feedback', 'Tell us anonymously']]
export async function upload(file, uid) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Use a JPG, PNG or WebP image under 2 MB.')
  const path = `${uid}/${crypto.randomUUID()}.${file.type.split('/')[1]}`
  const { error } = await supabase.storage.from('cafe-images').upload(path, file)
  if (error) throw error
  return supabase.storage.from('cafe-images').getPublicUrl(path).data.publicUrl
}
export const BADGE = { bestseller: 'Bestseller', chefs: 'Chef’s pick', new: 'New', popular: 'Popular' }
export const DIET = { veg: 'Vegetarian', nonveg: 'Non-vegetarian', egg: 'Contains egg' }
export const catIcon = n => { n = n.toLowerCase(); return /coffee|brew|espresso|latte|chai|tea/.test(n) ? 'cup' : /pastr|bake|bread|croissant|toast/.test(n) ? 'bake' : /sandwich|burger|wrap|roll|pizza|pasta|meal|snack|bite/.test(n) ? 'plate' : /dessert|cake|sweet|ice/.test(n) ? 'cake' : /cold|shake|smoothie|juice|mocktail|drink|soda/.test(n) ? 'glass' : /breakfast|egg/.test(n) ? 'egg' : 'dish' }
const pickArt = t => { t = (t || '').toLowerCase(); const r = [[/cold|iced|shake|smoothie|juice|mocktail|soda|lemonade|frappe|drink/, 'iced'], [/chai|kulhad|\btea\b/, 'chai'], [/sandwich|burger|wrap|roll|panini|toastie|\bsub\b/, 'sandwich'], [/croissant|pastr|bak|danish|puff|\bbun\b|bread|muffin|toast/, 'croissant'], [/cake|brownie|dessert|tart|pie|cookie|donut|doughnut|sweet|ice cream|waffle/, 'cake'], [/egg|omelette|breakfast|pancake/, 'egg'], [/pasta|salad|bowl|rice|soup|noodle|meal|pizza|fries|snack|bite/, 'dish'], [/coffee|latte|cappuc|espresso|mocha|americano|flat white|brew|macchiato|cortado/, 'latte']]; const m = r.find(([re]) => re.test(t)); return m ? m[1] : null }
// Picks an illustration from the item name first, then its category.
export const artKind = (name, cat) => pickArt(name) || pickArt(cat) || 'beans'
export const SHORT = { menu: 'Menu', offers: 'Offers', wifi: 'Wi‑Fi', review: 'Review', feedback: 'Feedback' }
export const HERO_ART = { roastery: 'latte', bakery: 'croissant', chai: 'chai', sage: 'latte', mocha: 'latte' }
export const ARTS = [['', 'Match my design'], ['latte', 'Latte cup'], ['croissant', 'Croissant'], ['chai', 'Kulhad chai'], ['iced', 'Iced drink'], ['cake', 'Cake'], ['sandwich', 'Sandwich'], ['dish', 'Bowl'], ['egg', 'Breakfast plate'], ['beans', 'Coffee beans']]
export const FONTS = { modern: ["'Bricolage Grotesque',sans-serif", 'Manrope,sans-serif'], elegant: ["'Playfair Display',serif", "'DM Sans',sans-serif"], editorial: ['Fraunces,serif', "'Hanken Grotesk',sans-serif"] }
export const RADII = { sharp: '6px', soft: '18px', round: '30px' }
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
// Turns an owner's design choices into CSS variables. Only known, validated values are ever used.
export function designVars(d = {}) {
  const v = {}
  if (/^#[0-9a-f]{6}$/i.test(d.accent || '')) { v['--ac'] = d.accent; v['--a1'] = d.accent; v['--on'] = lum(d.accent) > 0.45 ? '#161616' : '#ffffff' }
  const f = FONTS[d.font]; if (f) { v['--hf'] = f[0]; v['--bf'] = f[1] }
  if (RADII[d.radius]) v['--r'] = RADII[d.radius]
  return v
}
