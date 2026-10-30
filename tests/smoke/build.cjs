// Renders every screen once with sample data (no browser, no database) and reports any crash.
// Run:  npm run smoke
const esbuild = require('esbuild'), path = require('path')
const stubs = path.resolve(__dirname, 'stubs.js')
esbuild.build({
  entryPoints: [path.resolve(__dirname, 'test.jsx')], bundle: true, platform: 'node', format: 'cjs', outfile: path.resolve(__dirname, 'out.cjs'), jsx: 'automatic', loader: { '.js': 'jsx' },
  alias: { 'react-router-dom': stubs, '@supabase/supabase-js': stubs, 'qrcode.react': stubs },
  define: { 'import.meta.env': '{"VITE_SUPABASE_URL":"https://x.supabase.co","VITE_CONTACT_EMAIL":"a@b.c","VITE_CONTACT_WHATSAPP":"919999999999"}' }, logLevel: 'error',
}).then(() => { require('./out.cjs') }).catch(e => { console.log('BUILD ERROR', e.message); process.exit(1) })
