import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs   from 'node:fs'
import path from 'node:path'

// Dev-only plugin: receives edited NODE_POS / CUSTOM_CP from the in-browser
// tree editor and writes them back into EternalTreeScreen.jsx so Vite
// hot-reloads the changes without manual copy-paste.
function treeEditorPlugin() {
  return {
    name: 'tree-editor-save',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Only handle our own endpoints — pass everything else through.
        if (!req.url.startsWith('/__')) return next();

        // ── Tree editor ──────────────────────────────────────────────────
        if (req.method === 'POST' && req.url === '/__tree-save') {
          let body = '';
          req.on('data', c => { body += c; });
          req.on('end', () => {
            try {
              const { nodePosBlock, customCPBlock } = JSON.parse(body);
              const filePath = path.resolve('src/components/EternalTreeScreen.jsx');
              let src = fs.readFileSync(filePath, 'utf-8');
              src = src.replace(/const NODE_POS = \{[\s\S]*?\n\};/, nodePosBlock);
              src = src.replace(/const CUSTOM_CP = \{[\s\S]*?\n\};/, customCPBlock);
              fs.writeFileSync(filePath, src, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
          return;
        }

        // ── Particle path editor — load current state ────────────────────
        // Reads App.css and HomeScreen.jsx and returns the current paths +
        // tier metadata so the editor initialises from the live file state.
        if (req.method === 'GET' && req.url === '/__particle-load') {
          try {
            const cssPath = path.resolve('src/App.css');
            const jsxPath = path.resolve('src/screens/HomeScreen.jsx');
            const css = fs.readFileSync(cssPath, 'utf-8');
            const jsx = fs.readFileSync(jsxPath, 'utf-8');

            // Parse all .home-qi-particle-pathX rules
            const pathRx = /\.home-qi-particle-path([A-Z]+)\s*\{\s*offset-path:\s*path\('M\s*([-\d.]+)\s+([-\d.]+)\s+C\s*([-\d.]+)\s+([-\d.]+),\s*([-\d.]+)\s+([-\d.]+),\s*([-\d.]+)\s+([-\d.]+)'\)/g;
            const paths = {};
            let m;
            while ((m = pathRx.exec(css)) !== null) {
              paths[m[1]] = [m[2],m[3],m[4],m[5],m[6],m[7],m[8],m[9]].map(Number);
            }

            // Parse tier arrays from HomeScreen.jsx
            const arrRx = name => {
              const r = new RegExp(`const ${name}\\s*=\\s*\\[([^\\]]+)\\]`);
              const hit = jsx.match(r);
              if (!hit) return [];
              return hit[1].match(/'([A-Z]+)'/g)?.map(s => s.replace(/'/g,'')) ?? [];
            };
            const base    = arrRx('BASE_PATHS');
            const wide    = arrRx('WIDE_PATHS');
            const extreme = arrRx('EXTREME_PATHS');

            const meta = {};
            for (const id of Object.keys(paths)) {
              meta[id] = { rung: extreme.includes(id) ? 4 : wide.includes(id) ? 2 : 0 };
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, paths, meta, base, wide, extreme }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
          return;
        }

        // ── Particle path editor — save ───────────────────────────────────
        // Receives { paths, meta } and replaces the sentinel blocks in both
        // App.css and HomeScreen.jsx so Vite hot-reloads both immediately.
        if (req.method === 'POST' && req.url === '/__particle-save') {
          let body = '';
          req.on('data', c => { body += c; });
          req.on('end', () => {
            try {
              const { paths, meta } = JSON.parse(body);
              const pad = (n, w = 4) => String(Math.round(n)).padStart(w);

              // ── App.css: rebuild the sentinel block ─────────────────────
              const cssLines = Object.entries(paths).map(([name, p]) => {
                const [x0,y0,cx1,cy1,cx2,cy2,x1,y1] = p;
                return `.home-qi-particle-path${name} { offset-path: path('M ${pad(x0)} ${pad(y0)} C ${pad(cx1)} ${pad(cy1)}, ${pad(cx2)} ${pad(cy2)}, ${pad(x1)} ${pad(y1)}'); }`;
              });
              const cssBlock =
                `/* qi-particle-paths-start — managed by QiParticleEditor (?particleEdit)  */\n` +
                cssLines.join('\n') + '\n' +
                `/* qi-particle-paths-end */`;

              const cssPath = path.resolve('src/App.css');
              let cssSrc = fs.readFileSync(cssPath, 'utf-8');
              cssSrc = cssSrc.replace(
                /\/\* qi-particle-paths-start[\s\S]*?qi-particle-paths-end \*\//,
                cssBlock
              );
              fs.writeFileSync(cssPath, cssSrc, 'utf-8');

              // ── HomeScreen.jsx: rebuild the sentinel block ──────────────
              const base    = Object.keys(paths).filter(id => (meta[id]?.rung ?? 0) === 0);
              const wide    = Object.keys(paths).filter(id => (meta[id]?.rung ?? 0) === 2);
              const extreme = Object.keys(paths).filter(id => (meta[id]?.rung ?? 0) === 4);
              const fmt     = arr => arr.map(s => `'${s}'`).join(', ');
              const jsxBlock =
                `  // qi-particle-paths-start — managed by QiParticleEditor (?particleEdit)\n` +
                `  const BASE_PATHS    = [${fmt(base)}];\n` +
                `  const WIDE_PATHS    = [${fmt(wide)}];\n` +
                `  const EXTREME_PATHS = [${fmt(extreme)}];\n` +
                `  // qi-particle-paths-end`;

              const jsxPath = path.resolve('src/screens/HomeScreen.jsx');
              let jsxSrc = fs.readFileSync(jsxPath, 'utf-8');
              jsxSrc = jsxSrc.replace(
                /\/\/ qi-particle-paths-start[\s\S]*?\/\/ qi-particle-paths-end/,
                jsxBlock
              );
              fs.writeFileSync(jsxPath, jsxSrc, 'utf-8');

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const isNative   = mode === 'native';
  const isSteam    = mode === 'steam';
  const isDemo     = mode === 'demo';
  const isDesigner = mode === 'designer';
  const isProd     = command === 'build';

  // Capacitor and Steam load from file:// or a local server — base must be '/'.
  // GitHub Pages browser build needs the repo sub-path.
  // Local dev/preview always uses '/' so it works without a prefix.
  // Designer mode: same base as GH Pages in production (the `main` branch
  // ships the designer to the dev Pages URL), '/' in dev server.
  const base = (isNative || isDemo) ? '/'
             : isSteam ? './'
             : isDesigner ? (isProd ? '/MartialArtsIdle/' : '/')
             : (isProd ? '/MartialArtsIdle/' : '/');

  // PWA service worker is only useful in browser/local builds.
  // Inside a Capacitor WebView or Electron/Tauri it can conflict with the native bridge.
  // Designer mode DOES include the PWA — the designer panel is PAT-gated so regular
  // visitors are unaffected, and the SW is required for Android install + iOS cache busting.
  const enablePWA = !isNative && !isSteam;

  // Read package.json version so analytics can tag every event with the
  // build that produced it (lets you split dashboards by version).
  const pkgVersion = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8')).version;

  return {
    base,
    define: {
      __MAI_VERSION__: JSON.stringify(pkgVersion),
    },
    plugins: [
      treeEditorPlugin(),
      react(),
      enablePWA && VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          navigateFallback: 'index.html',
          // Precache SFX (small) but not BGM (4-5 MB each — too large for precache).
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}', 'audio/sfx/*.{ogg,mp3,wav}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB for SFX
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // BGM streams and any audio not in precache — network first, cache on fetch.
              urlPattern: /\/audio\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'audio-cache',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        manifest: {
          name: 'The Long Road to Heaven',
          short_name: 'Long Road',
          description: 'Train. Fight. Ascend.',
          theme_color: '#1a1a2e',
          background_color: '#1a1a2e',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/MartialArtsIdle/',
          scope: '/MartialArtsIdle/',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
      }),
    ].filter(Boolean),
  }
})
