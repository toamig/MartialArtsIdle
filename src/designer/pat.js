/**
 * GitHub Personal Access Token storage for the designer panel.
 *
 * PATs are kept in sessionStorage (not localStorage) so they're cleared when
 * the tab closes — smaller exposure window than a persistent credential.
 * The designer only runs in dev / designer mode (see DESIGNER_ENABLED) so
 * the attack surface against the game itself is nil.
 */

const KEY = 'mai_designer_pat';

export function loadPat() {
  try { return sessionStorage.getItem(KEY) || ''; }
  catch { return ''; }
}

export function savePat(pat) {
  try { sessionStorage.setItem(KEY, pat.trim()); }
  catch { /* private mode: silently no-op */ }
}

export function clearPat() {
  try { sessionStorage.removeItem(KEY); } catch {}
}
