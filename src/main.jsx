import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Inline gate: Vite replaces import.meta.env.MODE and import.meta.env.DEV
// with string/boolean literals at build time, so this whole expression folds
// to `false` in every ship build (browser / native / steam / demo). Rollup
// then drops the unreachable dynamic import('./designer/mount.jsx') and the
// entire src/designer/* subtree is tree-shaken out of the ship bundle.
//
// Must match the constant exported by src/designer/enabled.js.
const DESIGNER_ENABLED =
  import.meta.env.MODE === 'designer' ||
  (import.meta.env.DEV && import.meta.env.MODE !== 'native')

const rootEl = document.getElementById('root')

function mountApp() {
  import('./App.jsx').then(({ default: App }) => {
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
}

if (DESIGNER_ENABLED && new URLSearchParams(window.location.search).has('designer')) {
  import('./designer/mount.jsx').then(({ mountDesigner }) => {
    mountDesigner(rootEl)
  })
} else {
  mountApp()
}
