import React from 'react'
const chain = new Proxy(function () {}, { get: (t, k) => k === 'then' ? (res) => res({ data: [], error: null }) : () => chain, apply: () => chain })
export const supabase = { from: () => chain, rpc: async () => ({ data: null, error: null }), auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut() {}, signInWithPassword() {}, resetPasswordForEmail() {}, updateUser() {} }, storage: { from: () => ({ upload() {}, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) } }
export const createClient = () => supabase
export const useParams = () => globalThis.__params || {}
export const useOutletContext = () => globalThis.__ctx
export const useNavigate = () => () => {}
export const useLocation = () => ({ pathname: globalThis.__path || '/rsn-foods' })
export const Outlet = () => null
export const Link = ({ to, children, ...p }) => React.createElement('a', { href: to, ...p }, children)
export const Navigate = () => null
export const BrowserRouter = ({ children }) => children
export const Routes = ({ children }) => children
export const Route = () => null
export const QRCodeSVG = () => React.createElement('svg')
