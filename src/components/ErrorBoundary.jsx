import { Component } from 'react'

// If a screen ever crashes, show a calm message instead of a blank page. The real error goes to the browser console for debugging.
export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error('CafeTap screen error:', err) }
  render() {
    if (!this.state.failed) return this.props.children
    return (<main style={{ maxWidth: 480, margin: '0 auto', padding: '64px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Something went wrong</h1><p>Please refresh the page. If it keeps happening, tell the café or CafeTap.</p>
      <button onClick={() => location.reload()} style={{ padding: '12px 20px', borderRadius: 99, border: 0, background: '#1f3a27', color: '#fff', fontSize: 16 }}>Refresh</button></main>)
  }
}
