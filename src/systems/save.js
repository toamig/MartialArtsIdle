const SAVE_KEY  = 'mai_save';
const TECH_KEY  = 'mai_techniques';

/**
 * Cookie Clicker-style save system.
 * - Auto-saves to localStorage
 * - Export: base64 encoded string the user can copy
 * - Import: paste a base64 string to restore
 */

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {}
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function wipeSave() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(TECH_KEY);
}

// ─── Technique slots ──────────────────────────────────────────────────────────

export function saveTechniques(slots) {
  try {
    localStorage.setItem(TECH_KEY, JSON.stringify(slots));
  } catch {}
}

export function loadTechniques() {
  try {
    const raw = localStorage.getItem(TECH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function exportSave() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  return btoa(raw);
}

export function importSave(encoded) {
  try {
    const json = atob(encoded.trim());
    const data = JSON.parse(json);
    // Basic validation — must have expected keys
    if (typeof data.realmIndex !== 'number' || typeof data.qi !== 'number') {
      return { ok: false, error: 'Invalid save data' };
    }
    localStorage.setItem(SAVE_KEY, json);
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Could not decode save string' };
  }
}
