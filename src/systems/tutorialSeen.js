/**
 * tutorialSeen.js — once-per-account "I've already shown this card" tracker.
 *
 * Backs the Tier-A jade tutorial cards that fire at key first-run moments
 * (Welcome / Focus / first producer / first breakthrough / first major gate
 * / first spark / first Saint Realm). The same id never re-fires across
 * lives — once seen, always seen, until `Settings > Wipe save` (which DOES
 * remove the storage key by design — see src/systems/save.js wipeSave).
 *
 * In a future cloud-login pass, this key joins Blood Lotus + cosmetics on
 * the account-bound tier so a wipe-save doesn't lose tutorial completion
 * for paid/legitimate players. Until then it's local-only and survives
 * reincarnation but not factory reset.
 */

const STORAGE_KEY = 'mai_tutorial_seen';

function loadSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter(x => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function saveSet(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch { /* localStorage full or disabled — non-fatal */ }
}

/** True iff this tutorial id has already been shown to the player. */
export function hasSeenTutorial(id) {
  if (!id) return true; // guard — empty id never fires
  return loadSet().has(id);
}

/** Mark this tutorial id as shown. Idempotent. */
export function markTutorialSeen(id) {
  if (!id) return;
  const set = loadSet();
  if (set.has(id)) return;
  set.add(id);
  saveSet(set);
}

/** Wipe every "seen" marker. Exposed for the debug bridge so we can
 *  re-watch the onboarding flow without nuking the rest of the save. */
export function clearAllTutorialsSeen() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
