import { useEffect } from 'react'
import { Link } from 'react-router-dom'
const NAME = import.meta.env.VITE_LEGAL_NAME || 'CafeTap'
const MAIL = import.meta.env.VITE_CONTACT_EMAIL || ''
const H = { fontSize: 24, margin: '30px 0 8px' }

// Plain-language terms for café owners and visitors. Have a lawyer review them before you rely on them.
export default function Terms() {
  useEffect(() => { document.title = 'Terms | CafeTap' }, [])
  return (<main className="lp"><div className="lpw" style={{ maxWidth: 720, padding: '40px 20px 70px' }}>
    <Link className="logo2" to="/">CafeTap</Link>
    <h1 style={{ fontSize: 40, margin: '24px 0 8px' }}>Terms of use</h1>
    <p className="lead2">Last updated 4 November 2026. These terms are between {NAME} (“CafeTap”, “we”) and the café that uses our service (“the café”). Guests who only view a café’s page are covered by our <Link to="/privacy">Privacy</Link> page.</p>

    <h2 style={H}>1. The service</h2>
    <p>CafeTap provides a personalised café page opened by QR code or NFC tap, with a dashboard where the café edits its menu, offers and details. Some cafés also use the optional POS plan for table ordering, staff approval, a kitchen screen and counter payment records. The exact plan, setup and fees are agreed with each café in writing before it starts.</p>

    <h2 style={H}>2. Logins</h2>
    <ul><li>We create the café’s logins. There is no public sign-up.</li>
      <li>Keep passwords private. The café is responsible for what is done with its logins, and must switch off a staff member’s access when they leave.</li>
      <li>Tell us straight away if you think a login has been misused.</li></ul>

    <h2 style={H}>3. What the café is responsible for</h2>
    <ul><li>The accuracy of its menu, prices, photos, offers, opening hours and contact details.</li>
      <li>Allergen and dietary information. We only show what the café enters, and do not check it.</li>
      <li>Its own licences, food-safety rules, taxes and tax invoices. CafeTap bills and records are simple receipts and are not GST tax invoices.</li>
      <li>Honest reviews. The café must not offer rewards for positive reviews or hide negative feedback.</li>
      <li>Telling its guests how it uses their information where it adds features of its own.</li>
      <li>Cash and UPI records. Staff confirm payments themselves; CafeTap does not collect, hold or verify money.</li></ul>

    <h2 style={H}>4. What we do not promise</h2>
    <ul><li>No payment processing: guests pay the café directly, at the counter.</li>
      <li>The table-location check reduces casual fake orders but cannot stop a determined person, and phone GPS can be inaccurate indoors.</li>
      <li>We work to keep the service available but do not guarantee it will never be interrupted, and we may pause it briefly for maintenance.</li></ul>

    <h2 style={H}>5. Fees</h2>
    <p>Fees, trial periods and notice are as agreed with the café in writing. We will not start charging without the café’s agreement, and will give notice before changing a price.</p>

    <h2 style={H}>6. Acceptable use</h2>
    <p>Do not use the service to break the law, upload content you do not have the right to use, send spam, attack or probe the system, or try to see another café’s data.</p>

    <h2 style={H}>7. Content and ownership</h2>
    <p>The café keeps ownership of its menu, photos, logo and records, and allows us to display and store them to run the service. CafeTap keeps ownership of its software, designs and illustrations. Artwork shown on our website belongs to its artists.</p>

    <h2 style={H}>8. Data</h2>
    <p>How we handle information is explained on our <Link to="/privacy">Privacy</Link> page. On request we will give the café a copy of its content and records, and delete its café and data when the service ends, subject to the retention periods stated there.</p>

    <h2 style={H}>9. Suspension and ending</h2>
    <p>Either side may end the service on the notice agreed in writing. We may pause a café’s dashboard if these terms are seriously broken or fees agreed in writing are unpaid. A paused café’s public page can stay online, but editing is switched off.</p>

    <h2 style={H}>10. Liability</h2>
    <p>To the extent the law allows, CafeTap is not responsible for indirect or lost-profit losses, or for losses caused by information the café entered, by third-party services such as hosting providers, or by events beyond our control. Our total responsibility for any claim is limited to the fees the café paid us in the three months before the claim. Nothing here limits liability that cannot be limited by law.</p>

    <h2 style={H}>11. Changes</h2>
    <p>We may update these terms and will show the date above. If a change affects what a café pays or gets, we will tell the café first.</p>

    <h2 style={H}>12. Law and disputes</h2>
    <p>These terms follow Indian law. We will first try to settle any problem by talking. If that fails, the courts at Kanpur, Uttar Pradesh have jurisdiction.</p>

    <h2 style={H}>13. Contact</h2>
    <p>{MAIL ? <>Questions about these terms: <a href={'mailto:' + MAIL}>{MAIL}</a></> : 'Please contact us through the details on our home page.'}</p>
  </div></main>)
}
