import { useEffect, useState } from 'react'
import { rpc, MSG } from '../../lib/pos'

// Owner chooses what each staff login may do. CafeTap creates the login first (no public sign-up).
export default function StaffAccess({ cafe }) {
  const pos = cafe.plan_tier === 'pos'
  const PERMS = pos ? [['orders', 'Orders: approve, reject and update'], ['kitchen', 'Kitchen screen'], ['payments', 'Record payments'], ['close', 'Close tables'], ['reports', 'Sales reports']] : [['register', 'Sales register']]
  const [staff, setStaff] = useState([]), [msg, setMsg] = useState(''), [email, setEmail] = useState(''), [p, setP] = useState(pos ? { orders: true } : { register: true })
  const load = async () => { const r = await rpc('staff_list', { p_cafe: cafe.id }); setStaff(Array.isArray(r) ? r : []) }
  useEffect(() => { load() }, [cafe.id])
  const add = async () => {
    const r = await rpc('staff_add', { p_cafe: cafe.id, p_email: email, p_orders: !!p.orders, p_payments: !!p.payments, p_close: !!p.close, p_reports: !!p.reports, p_kitchen: !!p.kitchen, p_register: !!p.register })
    setMsg(r.ok ? 'Staff added' : MSG[r.reason] || MSG.error); if (r.ok) { setEmail(''); load() }
  }
  const upd = async (m, k, v) => {
    const a = { p_member: m.id, p_orders: null, p_payments: null, p_close: null, p_reports: null, p_kitchen: null, p_register: null, p_active: null }; a['p_' + k] = v
    await rpc('staff_update', a); load()
  }
  return (<>
    <div className="panel"><h2 style={{ marginTop: 0 }}>Your staff</h2>
      <p className="muted">CafeTap creates each staff login first. Then add their email here and choose what they may do. Turn access off when someone leaves.</p>
      {!staff.length && <p className="muted">No staff yet.</p>}
      {staff.map(m => <div key={m.id} className="sub"><b>{m.email}</b> {!m.active && <span className="muted">(access off)</span>}
        {PERMS.map(([k, l]) => <label key={k} className="chk"><input type="checkbox" checked={!!m[k]} onChange={e => upd(m, k, e.target.checked)} /> {l}</label>)}
        <button className="link" onClick={() => upd(m, 'active', !m.active)}>{m.active ? 'Turn access off' : 'Turn access on'}</button></div>)}</div>
    <div className="panel"><h2 style={{ marginTop: 0 }}>Add staff</h2>
      <input type="email" placeholder="staff@example.com" value={email} onChange={e => setEmail(e.target.value)} />
      {PERMS.map(([k, l]) => <label key={k} className="chk"><input type="checkbox" checked={!!p[k]} onChange={e => setP({ ...p, [k]: e.target.checked })} /> {l}</label>)}
      <button onClick={add} disabled={!email}>Add staff</button> {msg && <span className={msg === 'Staff added' ? 'ok' : 'err'}> {msg}</span>}</div>
  </>)
}
