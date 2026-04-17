import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'

// Inline gate: Vite replaces import.meta.env.MODE and import.meta.env.DEV
// with string/boolean literals at build time, so this whole expression folds
// to `false` in every ship build (browser / native / steam / demo). Rollup
// then drops the unreachable dynamic imports and the entire dev-tool subtrees
// are tree-shaken out of the ship bundle.
//
// Must match the constants exported by src/designer/enabled.js and
// src/localizer/enabled.js.
const DESIGNER_ENABLED =
  import.meta.env.MODE === 'designer' ||
  (import.meta.env.DEV && import.meta.env.MODE !== 'native')

const LOCALIZER_ENABLED =
  import.meta.env.MODE === 'localizer' ||
  (import.meta.env.DEV && import.meta.env.MODE !== 'native')

const rootEl = document.getElementById('root')

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('[ErrorBoundary]', e, info); }
  render() {
    if (this.state.error) {
      return <div style={{color:'red',padding:20,fontSize:14}}>
        <b>Render error:</b><br/>{String(this.state.error)}
      </div>;
    }
    return this.props.children;
  }
}

function mountApp() {
  import('./App.jsx')
    .then(({ default: App }) => {
      createRoot(rootEl).render(
        <StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </StrictMode>
      )
    })
    .catch(e => {
      console.error('[mountApp] dynamic import failed:', e);
      rootEl.innerHTML = `<div style="color:red;padding:20px;font-size:14px"><b>Failed to load App:</b><br>${e}</div>`;
    });
}

const params = new URLSearchParams(window.location.search)

if (DESIGNER_ENABLED && params.has('designer')) {
  import('./designer/mount.jsx').then(({ mountDesigner }) => {
    mountDesigner(rootEl)
  })
} else if (LOCALIZER_ENABLED && params.has('locale')) {
  import('./localizer/mount.jsx').then(({ mountLocalizer }) => {
    mountLocalizer(rootEl)
  })
} else {
  mountApp()
}
