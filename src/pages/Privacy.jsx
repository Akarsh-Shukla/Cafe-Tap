import { useEffect } from 'react'
import { Link } from 'react-router-dom'
const MAIL = import.meta.env.VITE_CONTACT_EMAIL || ''

export default function Privacy() {
  useEffect(() => { document.title = 'Privacy | CafeTap' }, [])
  return (<main className="lp"><div className="lpw" style={{ maxWidth: 720, padding: '40px 20px 60px' }}>
    <Link className="logo2" to="/">CafeTap</Link>
    <h1 style={{ fontSize: 40, margin: '24px 0 8px' }}>Privacy</h1>
    <p className="lead2">Plain words about what CafeTap does and doesn’t collect.</p>
    <h2 style={{ fontSize: 24, margin: '28px 0 8px' }}>For guests</h2>
    <ul><li>No account, no sign-in and no ad trackers.</li>
      <li>We count visits in a simple way (for example “the menu was opened”). The count has no name, phone number or device details attached.</li>
      <li>Feedback is anonymous. Please don’t put personal details in it. We don’t ask for any.</li>
      <li>Dishes you save with the heart are stored only on your own phone.</li>
      <li>Our hosting and database providers handle normal technical logs (such as IP addresses) to keep the service running.</li></ul>
    <h2 style={{ fontSize: 24, margin: '28px 0 8px' }}>For café owners</h2>
    <ul><li>We store your email address, your café’s page content, menu, photos and settings.</li>
      <li>You can unpublish your page at any time, and ask us to export or delete your café and its data.</li>
      <li>We never sell your data.</li></ul>
    <h2 style={{ fontSize: 24, margin: '28px 0 8px' }}>Contact</h2>
    <p>{MAIL ? <>Questions or deletion requests: <a href={'mailto:' + MAIL}>{MAIL}</a></> : 'Please contact us through the details on our home page.'}</p>
  </div></main>)
}
