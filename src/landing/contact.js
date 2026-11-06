// Your contact details come from environment variables (Cloudflare Pages > Settings > Variables). They are public by design.
export const WA = (import.meta.env.VITE_CONTACT_WHATSAPP || '').replace(/\D/g, '')
export const MAIL = import.meta.env.VITE_CONTACT_EMAIL || ''
export const PHONE = import.meta.env.VITE_CONTACT_PHONE || ''
export const DEMO = import.meta.env.VITE_DEMO_SLUG || ''
export const CITY = import.meta.env.VITE_CITY || 'Kanpur'
export const INSTA = /^https:\/\//.test(import.meta.env.VITE_CONTACT_INSTAGRAM || '') ? import.meta.env.VITE_CONTACT_INSTAGRAM : ''
export const enquiry = text => WA ? `https://wa.me/${WA}?text=${encodeURIComponent(text)}` : MAIL ? `mailto:${MAIL}?subject=${encodeURIComponent('Enquiry')}&body=${encodeURIComponent(text)}` : '#contact'
export const contact = enquiry('Hi, I’d like to know more about CafeTap for my café.')
