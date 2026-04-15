/**
 * Designer panel build gate — single source of truth.
 *
 * DESIGNER_ENABLED is true in:
 *   - Local dev server (`npm run dev`), except in native mode
 *   - Explicit designer mode (`npm run dev:designer` / `build:designer`)
 *
 * It is FALSE in all shipping modes: `browser` (GH Pages), `native` (Capacitor
 * iOS/Android), `steam` (Electron desktop exe), `demo`. Because this resolves
 * to a literal `false` at build time in those modes, Rollup tree-shakes every
 * transitive import from `src/designer/*` out of the shipping bundle.
 *
 * Verify by grepping the built `dist/assets/*.js` files for any string from
 * `src/designer/` — there should be zero matches in ship builds.
 */
export const DESIGNER_ENABLED =
  import.meta.env.MODE === 'designer' ||
  (import.meta.env.DEV && import.meta.env.MODE !== 'native');
