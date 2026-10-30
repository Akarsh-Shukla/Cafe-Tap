globalThis.window = { location: { origin: 'http://localhost:5173' }, print() {} }
import React from 'react'
import { renderToString } from 'react-dom/server'
import { Home, MenuPage, Wifi, Review, Feedback, Offers, Dock, Card, Ph } from '../../src/pages/Guest.jsx'
import Landing from '../../src/pages/Landing.jsx'
import Privacy from '../../src/pages/Privacy.jsx'
import Login from '../../src/pages/Login.jsx'
import Welcome from '../../src/pages/Welcome.jsx'
import Admin from '../../src/pages/Admin.jsx'
import Dashboard, { Workspace, Overview } from '../../src/pages/Dashboard.jsx'
import Settings from '../../src/pages/dash/Settings.jsx'
import Business from '../../src/pages/dash/Business.jsx'
import MenuEditor from '../../src/pages/dash/MenuEditor.jsx'
import OffersEd from '../../src/pages/dash/Offers.jsx'
import Tables from '../../src/pages/dash/Tables.jsx'
import Board, { Detail, AddOrder } from '../../src/pages/pos/Board.jsx'
import Sales from '../../src/pages/pos/Sales.jsx'
import PosSettings from '../../src/pages/pos/PosSettings.jsx'
import { CartSheet, CartBar, Stepper } from '../../src/pages/Order.jsx'
import DesignPreview from '../../src/components/DesignPreview.jsx'
import { Deck, ArtShop } from '../../src/components/Showcase.jsx'
import Art from '../../src/components/Art.jsx'
import ErrorBoundary from '../../src/components/ErrorBoundary.jsx'

const STORE = 'https://x.supabase.co/storage/v1/object/public/cafe-images/u/a.webp'
const cafe = (over = {}) => ({ id: '11111111-1111-1111-1111-111111111111', slug: 'rsn-foods', name: 'RSN Foods', tagline: 'Chai and more', theme: 'roastery', about: 'Our story', hours: '9am to 9pm', cover_url: null, logo_url: null, published: true, plan_tier: 'pos', suspended: false,
  settings: { options: ['menu', 'offers', 'wifi', 'review', 'feedback'], insta: 'https://instagram.com/x', review_url: 'https://g.page/x', wifi_name: 'W', address: 'Kanpur', phone: '+91 99999 99999', maps: 'https://maps.app.goo.gl/x', design: { accent: '#aa3300', font: 'modern', radius: 'soft', art: 'chai', greeting: 'Hi', calm: false } }, ...over })
const item = (o = {}) => ({ id: 'i1', name: 'Masala Chai', description: 'Hot', price_paise: 3000, image_url: null, is_available: true, sort_order: 0, badge: 'bestseller', diet: 'veg', _cat: 'Chai', ...o })
const results = []
const t = (name, fn) => { try { const out = renderToString(fn()); results.push(['PASS', name, out.length]) } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]) } }
const withCtx = (c, node, params = {}) => { globalThis.__ctx = { cafe: c, slug: c.slug }; globalThis.__params = params; return node }

for (const theme of ['roastery', 'bakery', 'chai', 'sage', 'mocha']) t('Home theme ' + theme, () => withCtx(cafe({ theme }), <Home />))
t('Home with cover+logo', () => withCtx(cafe({ cover_url: STORE, logo_url: STORE }), <Home />))
t('Home table link', () => withCtx(cafe(), <Home />, { table: 'tok' }))
t('Home no settings', () => withCtx(cafe({ settings: null }), <Home />))
t('Home no options', () => withCtx(cafe({ settings: {} }), <Home />))
t('Dock', () => { globalThis.__path = '/rsn-foods/menu'; return <Dock cafe={cafe()} slug="rsn-foods" /> })
t('Menu (initial)', () => withCtx(cafe(), <MenuPage />))
t('Wifi', () => withCtx(cafe(), <Wifi />)); t('Review', () => withCtx(cafe(), <Review />)); t('Feedback', () => withCtx(cafe(), <Feedback />)); t('Offers', () => withCtx(cafe(), <Offers />))
const ord = (can = true) => ({ enabled: true, table: 't', can, hint: false, cart: { i1: 2 }, setCart() {}, add() {}, sub() {} })
t('Card photo', () => <Card i={item({ image_url: STORE })} cls="gcard wide" onOpen={() => {}} fav toggle={() => {}} ord={ord()} />)
t('Card no photo, sold out', () => <Card i={item({ is_available: false })} cls="pick" onOpen={() => {}} fav={false} toggle={() => {}} ord={ord(false)} />)
for (const k of ['latte', 'iced', 'croissant', 'cake', 'sandwich', 'chai', 'dish', 'egg', 'beans']) t('Art ' + k, () => <Art kind={k} />)
t('Stepper', () => <><Stepper qty={0} onAdd={() => {}} onSub={() => {}} name="x" /><Stepper qty={3} onAdd={() => {}} onSub={() => {}} name="x" /></>)
t('CartBar+CartSheet', () => { const byId = { i1: item() }; return <><CartBar ord={ord()} byId={byId} onOpen={() => {}} /><CartSheet cafe={cafe()} ord={ord()} byId={byId} open onClose={() => {}} onRefresh={() => {}} /></> })
t('Landing', () => <Landing />); t('Privacy', () => <Privacy />); t('Login', () => <Login />); t('Welcome', () => <Welcome />); t('Admin', () => <Admin />); t('Dashboard', () => <Dashboard />)
t('Workspace owner POS', () => <Workspace cafe={cafe()} uid="u" reload={() => {}} />)
t('Workspace admin', () => <Workspace cafe={cafe({ cafe_admin: { plan: 'trial' } })} uid="u" isAdmin reload={() => {}} onBack={() => {}} />)
t('Workspace suspended', () => <Workspace cafe={cafe({ suspended: true })} uid="u" reload={() => {}} />)
t('Overview', () => <Overview cafe={cafe()} go={() => {}} publish={() => {}} isAdmin={false} />)
t('Settings', () => <Settings cafe={cafe()} uid="u" reload={() => {}} />); t('Settings empty', () => <Settings cafe={cafe({ settings: {} })} uid="u" reload={() => {}} />)
t('Business', () => <Business cafe={cafe({ cafe_admin: [{ plan: 'trial', owner_email: 'a@b.c' }] })} reload={() => {}} onDeleted={() => {}} />)
t('MenuEditor', () => <MenuEditor cafe={cafe()} uid="u" />); t('Offers editor', () => <OffersEd cafe={cafe()} />); t('Tables', () => <Tables cafe={cafe()} />)
t('Board (initial)', () => <Board cafe={cafe()} perms={{ orders: true, payments: true, close: true, owner: true }} />)
const detailProps = { cafe: cafe(), perms: { orders: true, payments: true, close: true, owner: true }, act: async () => ({}), msg: '', back: () => {},
  items: [{ order_id: 'o1', name_snapshot: 'Chai', quantity: 2, line_total_minor: 6000 }], pays: [{ id: 'p1', bill_id: 'b1', amount_minor: 1000, method: 'cash', event_type: 'payment', recorded_at: new Date().toISOString(), note: 'x' }],
  v: { t: { id: 't1', display_name: 'Table 1' }, s: { id: 's1', opened_at: new Date().toISOString() }, b: { id: 'b1', total_minor: 6000, paid_minor: 1000 }, os: [{ id: 'o1', ref: 'ABC123', status: 'received', source: 'customer', note: 'less sugar', total_minor: 6000, created_at: new Date().toISOString() }], bal: 5000, state: 'Active', live: true } }
t('Board Detail', () => <Detail {...detailProps} />)
t('Board Detail empty table', () => <Detail {...detailProps} v={{ t: { id: 't1', display_name: 'Table 1' }, s: undefined, b: undefined, os: [], bal: 0, state: 'Available', live: false }} />)
t('AddOrder', () => <AddOrder cafe={cafe()} table={{ id: 't1', display_name: 'Table 1' }} act={async () => ({})} done={() => {}} />)
t('Sales', () => <Sales cafe={cafe()} />); t('PosSettings owner', () => <PosSettings cafe={cafe()} isAdmin={false} />); t('PosSettings admin', () => <PosSettings cafe={cafe()} isAdmin />)
t('DesignPreview', () => <DesignPreview name="RSN" tagline="x" theme="sage" design={{ accent: '#123456', font: 'elegant', radius: 'round', art: '', greeting: '' }} />)
t('Deck', () => <Deck items={[{ title: 'A', image: '/a.webp' }, { title: 'B', image: '/b.webp', caption: 'c' }]} />)
t('ArtShop', () => <ArtShop items={[{ id: 'A1', title: 'Piece', image: '/a.webp', seller: 'By the artist', available: true, price: '₹4,500' }]} hrefFor={s => '#' + s} />)
t('ErrorBoundary', () => <ErrorBoundary><Home /></ErrorBoundary>)
let bad = 0; for (const r of results) { if (r[0] === 'FAIL') bad++; console.log(r.join(' | ')) } console.log('\nFAILED:', bad, 'of', results.length)
