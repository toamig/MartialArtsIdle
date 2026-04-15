import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Designer from './Designer.jsx';

/**
 * Mount the designer panel into the app's root element. Called from main.jsx
 * when `?designer=1` is present AND DESIGNER_ENABLED is true.
 *
 * Importantly, the game's <App/> is NOT mounted in this branch — the designer
 * is its own React root with no game hooks, no save-loop side effects, and no
 * chance of corrupting localStorage save state while the user edits.
 */
export function mountDesigner(rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <Designer />
    </StrictMode>
  );
}
