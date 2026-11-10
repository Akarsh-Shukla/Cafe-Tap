import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DigitalBill from '../components/DigitalBill.jsx'

export default function BillPage() {
  const { slug, ref } = useParams()
  const [data, setData] = useState(null)
  const [cafe, setCafe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setErr('')

    const loadBill = async () => {
      // 1. Fetch Cafe Details
      const { data: cData } = await supabase.from('cafes').select('*').eq('slug', slug).maybeSingle()
      if (active && cData) setCafe(cData)

      // 2. Fetch Public Bill Info via secure definer function
      const { data: bData, error } = await supabase.rpc('get_public_bill', { p_slug: slug, p_ref: ref })
      if (!active) return

      if (error || !bData || !bData.ok) {
        setErr('We couldn’t find a receipt matching reference #' + ref + '. Please check the link or ask the café.')
      } else {
        setData(bData)
      }
      setLoading(false)
    }

    loadBill()
    return () => { active = false }
  }, [slug, ref])

  if (loading) {
    return (
      <main className="msg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div className="sk" style={{ height: 180, width: '100%', maxWidth: 440, borderRadius: 16 }} />
        <div className="sk" style={{ height: 260, width: '100%', maxWidth: 440, borderRadius: 16, marginTop: 12 }} />
      </main>
    )
  }

  if (err || !data) {
    return (
      <main className="msg" style={{ minHeight: '100vh', padding: '40px 20px', textAlign: 'center' }}>
        <h2>Receipt Not Found</h2>
        <p className="mut" style={{ margin: '12px 0 24px' }}>{err || 'This receipt could not be loaded.'}</p>
        <Link to={`/${slug}/menu`} className="btn" style={{ display: 'inline-block', width: 'auto', padding: '12px 24px' }}>
          Back to Menu
        </Link>
      </main>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #181716)', padding: '16px 12px 40px' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to={`/${slug}/menu`} className="bill-back-btn" style={{ textDecoration: 'none' }}>
          ← Back to Menu
        </Link>
        <span style={{ fontSize: '13px', color: '#a8a29e', fontWeight: 600 }}>{cafe?.name || 'Cafe'}</span>
      </div>
      <DigitalBill cafe={cafe} data={data} />
    </div>
  )
}
