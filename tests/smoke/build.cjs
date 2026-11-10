// Renders every screen once with sample data (no browser, no database) and reports any crash.
// Run:  npm run smoke

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const stubs = path.resolve(__dirname, 'stubs.js');

const viteGlobSmokePlugin = {
  name: 'vite-glob-smoke-plugin',

  setup(build) {
    build.onLoad(
      { filter: /[\\/]src[\\/]lib[\\/]content\.js$/ },
      async (args) => {
        let source = await fs.promises.readFile(args.path, 'utf8');

        // Vite-specific image discovery is not needed
        // for server-side smoke rendering.
        source = source.replace(
          /import\.meta\.glob\s*\([\s\S]*?\)/g,
          '({})'
        );

        return {
          contents: source,
          loader: 'jsx',
          resolveDir: path.dirname(args.path),
        };
      }
    );
  },
};

esbuild.build({
  entryPoints: [path.resolve(__dirname, 'test.jsx')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.resolve(__dirname, 'out.cjs'),
  jsx: 'automatic',
  loader: {
    '.js': 'jsx',
  },

  alias: {
    'react-router-dom': stubs,
    '@supabase/supabase-js': stubs,
    'qrcode.react': stubs,
    'qr-code-styling': stubs,
  },

  plugins: [viteGlobSmokePlugin],

  define: {
    'import.meta.env': JSON.stringify({
      VITE_SUPABASE_URL: 'https://x.supabase.co',
      VITE_CONTACT_EMAIL: 'a@b.c',
      VITE_CONTACT_WHATSAPP: '919999999999',
    }),
  },

  logLevel: 'error',
})
  .then(() => {
    require('./out.cjs');
  })
  .catch((e) => {
    console.log('BUILD ERROR', e.message);
    process.exit(1);
  });
