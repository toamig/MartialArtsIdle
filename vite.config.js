import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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

  return {
    base,
    plugins: [
      react(),
      enablePWA && VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          navigateFallback: 'index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
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
