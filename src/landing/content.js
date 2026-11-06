// ALL landing-page wording lives here. Change text, plans, FAQ or the comparison without touching any component.
export const HERO = {
  kicker: 'Digital menu, NFC and QR for cafés',
  words: ['menu', 'offers', 'Wi‑Fi', 'feedback'],
  sub: 'One beautiful page for your café: menu, offers, Wi‑Fi, reviews and private feedback. Guests tap an NFC card or scan a QR. No app. No reprinting when a price changes.',
  proof: ['No app to install', 'Update in seconds', 'NFC and QR', 'Your own look'],
}
export const MARQUEE = ['Menu', 'Offers', 'Guest Wi‑Fi', 'Honest reviews', 'Private feedback', 'NFC and QR', 'Your own look', 'No app to install', 'Edit in seconds']
export const COMPARE = {
  title: 'One page instead of five loose ends.',
  old: { name: 'Paper and PDF menus', items: ['A PDF menu that is always out of date', 'Paper menus reprinted for every price change', '“What’s the Wi‑Fi password?” fifty times a day', 'Reviews and feedback scattered everywhere'] },
  now: { name: 'With CafeTap', items: ['One live menu you edit from your phone', 'The same QR and NFC card, forever', 'Wi‑Fi, offers and reviews one tap away', 'Private feedback that reaches only you'] },
}
export const STEPS = [
  { k: 'build', t: 'We build your page', p: 'Your menu, photos, colours and tone, set up to match your café.' },
  { k: 'edit', t: 'You keep it fresh', p: 'Log in to change prices, mark items sold out and post offers.' },
  { k: 'tap', t: 'Guests tap or scan', p: 'An NFC card or QR on every table opens your page instantly.' },
]
export const FEATURES = [
  { i: 'menu', t: 'A menu guests enjoy', p: 'Photos, search, veg and non-veg marks, and clear sold-out items.' },
  { i: 'offers', t: 'Today’s offers', p: 'Post a special in seconds. It shows on the home screen.' },
  { i: 'wifi', t: 'Wi‑Fi in one tap', p: 'Guests copy the network and password. No more asking staff.' },
  { i: 'review', t: 'Honest reviews', p: 'A friendly link to your Google reviews page.' },
  { i: 'feedback', t: 'Private feedback', p: 'Anonymous notes reach you, not the internet.' },
  { i: 'edit', t: 'Edit it yourself', p: 'Change prices, photos and availability from your phone.' },
]
export const STUDIO = {
  eyebrow: 'Designs', title: 'A look that feels like your café.',
  lead: 'Pick a style, then tune the colour, fonts and corners. Try it on the phone. Every café gets its own look, and you can change it any time.',
  themes: [['roastery', 'Noir', '#17100C', '#DDAA4E'], ['bakery', 'Blush', '#ffc7d4', '#e5557f'], ['chai', 'Citrus', '#ffd23f', '#ff4d2e'], ['sage', 'Sage', '#cdd5bb', '#24402a'], ['mocha', 'Mocha', '#3a1d0f', '#c58b5a']],
  accents: ['#c2602a', '#1f7a6d', '#7a2e5d', '#3a4fa8', '#c93f6b', '#2f6b3a'],
  fonts: [['classic', 'Match style'], ['modern', 'Modern'], ['elegant', 'Elegant'], ['editorial', 'Editorial']],
  radii: [['', 'Match style'], ['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']],
}
export const CARDS = {
  eyebrow: 'Table stands', title: 'Tap or scan. Made for your tables.', lead: 'Acrylic stands in your café’s style, each carrying both a QR code and an NFC tag. These are design previews, so the QR codes shown are samples and will not scan.',
}
export const ART = {
  eyebrow: 'Art for your café', title: 'Paintings for your walls.', lead: 'Original pieces by independent artists. Ask us about any piece and we’ll pass your enquiry on. Availability and prices are shared when you ask.',
}
export const PLANS = [
  { name: 'Basic', tag: 'Available now', desc: 'A beautiful, personalised café page that guests open with a QR scan or an NFC tap.',
    pts: ['Your own look: colours, fonts, illustrations', 'Menu with photos, veg marks and sold-out switch', 'Offers, guest Wi‑Fi, review link and private feedback', 'You edit prices and availability yourself', 'A simple daily sales register for you and your staff (cash and UPI)', 'QR and NFC links, hosting and support'] },
  { name: 'POS', tag: 'New · early access', hot: true, desc: 'Everything in Basic, plus optional table ordering and a simple counter and kitchen workflow for your team (sales are recorded automatically instead of by hand).',
    pts: ['Guests can order from their table (you switch it on)', 'Your staff approve every order before it reaches the kitchen', 'A kitchen screen with a chime and voice alert for new orders', 'A running bill for every table and staff logins with permissions you choose', 'Cash and UPI recorded by your staff at the counter, printable bills and sales summaries'],
    note: 'Payment is collected at the counter. There is no online payment gateway, and CafeTap records what your staff confirm.' },
]
export const MATRIX = [
  ['Personalised café page and menu', true, true], ['QR and NFC access', true, true], ['Offers, guest Wi‑Fi, review link, private feedback', true, true],
  ['Edit menu, prices and availability yourself', true, true], ['Daily sales register (cash and UPI)', true, false], ['Staff logins', 'Register only', 'With permissions'],
  ['Guests order from their table (optional)', false, true], ['Staff approve orders, kitchen screen with sound alert', false, true],
  ['Running bill per table, counter payment records', false, true], ['Printable bills and sales summaries', false, true],
]
export const FAQ = [
  ['Do my guests need an app?', 'No. The page opens in their phone’s browser when they tap the NFC card or scan the QR.'],
  ['What happens when I change my menu?', 'You edit it in your dashboard and the live page updates. The cards on your tables never need replacing.'],
  ['What is the difference between QR and NFC?', 'A QR code opens your page when a guest scans it with the camera. An NFC card opens the same page when a guest taps their phone on it. Every card carries both, so every phone works.'],
  ['What is the difference between Basic and POS?', 'Basic is your personalised page: menu, offers, Wi‑Fi, reviews and feedback, plus a simple sales register. POS adds optional table ordering, staff approval, a kitchen screen, running table bills and counter payment records.'],
  ['Is POS compulsory?', 'No. Ordering is optional and you decide whether to switch it on. Guests can always browse the menu without ordering.'],
  ['Do guests pay online?', 'No. Payment is collected at the counter and your staff record cash or UPI after checking it themselves.'],
  ['Are CafeTap bills GST tax invoices?', 'No. They are simple receipts. Your café stays responsible for its own tax invoices and registrations.'],
  ['How much does it cost?', 'It depends on the setup you choose, so we talk it through personally and agree everything before you start.'],
  ['Who owns my data?', 'Your menu, photos and records are yours. You can ask us for a copy, or to delete your café. See our Privacy page for how long things are kept.'],
]
export const CTA = { title: 'Try it at your café', script: 'this week.', sub: 'Tell us about your café and we’ll show you a page with your own menu on it.' }
