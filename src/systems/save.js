const SAVE_KEY       = 'mai_save';
const TECH_KEY       = 'mai_techniques';
const OWNED_TECH_KEY = 'mai_owned_techniques';

/**
 * Cookie Clicker-style save system.
 * - Auto-saves to localStorage
 * - Export: base64 encoded string the user can copy
 * - Import: paste a base64 string to restore
 */

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      ...state,
      lastSeen: Date.now(),
    }));
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
  localStorage.removeItem(OWNED_TECH_KEY);
  localStorage.removeItem('mai_artefacts');
  localStorage.removeItem('mai_inventory');
  localStorage.removeItem('mai_owned_laws');
  localStorage.removeItem('mai_active_law');
  localStorage.removeItem('mai_pills');
  localStorage.removeItem('mai_active_pills');
  // Discovered pills + pinned recipes are tied to save state — wipe alongside
  // the rest of the pill data. Previously omitted, which made discoveries
  // appear to "leak" across save resets.
  localStorage.removeItem('mai_discovered_pills');
  localStorage.removeItem('mai_pinned_recipes');
  localStorage.removeItem('mai_seen_worlds');
  localStorage.removeItem('mai_pending_selections');
  localStorage.removeItem('mai_active_selections');
  // Qi Sparks — temporary buffs / pending offer / pity counter (Phase 1+).
  // Offline snapshot mirrors Heaven's Bond's offline-qi multiplier so the
  // pre-mount offline calc can pick it up; wipe it alongside.
  localStorage.removeItem('mai_qi_sparks_active');
  localStorage.removeItem('mai_qi_sparks_pending');
  localStorage.removeItem('mai_qi_sparks_pity');
  localStorage.removeItem('mai_qi_sparks_offline_snapshot');
  localStorage.removeItem('mai_cleared_regions');
  localStorage.removeItem('mai_seen_features');
  localStorage.removeItem('mai_auto_farm');
  localStorage.removeItem('mai_qi_crystal');
  localStorage.removeItem('mai_achievements');
  localStorage.removeItem('mai_permanent_pill_stats');
  // mai_blood_lotus is intentionally NOT wiped — paid currency survives a save reset
  // mai_lang is intentionally NOT wiped — language preference survives a save reset
  // mai_reincarnation + mai_reincarnation_tree also survive — karma and
  // Eternal Tree persist through a full wipe.
}

/**
 * Wipe for reincarnation. Preserves karma + tree (those keys are outside
 * the wipeSave list), the **entire** owned-laws library, and the alchemy
 * meta-progression (discovered pill recipes + pinned recipes) — but
 * clears the active law so the reborn character must re-choose which
 * manual to cultivate. The library + recipe codex are permanent identity
 * across lives; the active choice is the fresh start.
 */
export function wipeReincarnation() {
  // Snapshot persistent meta-progression BEFORE the wipe so we can re-seed it.
  let ownedLaws = [];
  let discoveredPills = null;
  let pinnedRecipes = null;
  try {
    const ownedRaw = localStorage.getItem('mai_owned_laws');
    ownedLaws = ownedRaw ? JSON.parse(ownedRaw) : [];
  } catch {}
  try {
    discoveredPills = localStorage.getItem('mai_discovered_pills');
  } catch {}
  try {
    pinnedRecipes = localStorage.getItem('mai_pinned_recipes');
  } catch {}

  wipeSave();

  // Re-seed the law library (no active selection — player picks anew).
  if (ownedLaws.length > 0) {
    try {
      localStorage.setItem('mai_owned_laws', JSON.stringify(ownedLaws));
    } catch {}
  }
  // Re-seed the alchemy codex.
  if (discoveredPills) {
    try { localStorage.setItem('mai_discovered_pills', discoveredPills); } catch {}
  }
  if (pinnedRecipes) {
    try { localStorage.setItem('mai_pinned_recipes', pinnedRecipes); } catch {}
  }
  // mai_active_law was removed by wipeSave; leave it absent so activeLaw
  // derives to null on next load.
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

// ─── Owned (dropped) techniques ───────────────────────────────────────────────

export function saveOwnedTechniques(owned) {
  try { localStorage.setItem(OWNED_TECH_KEY, JSON.stringify(owned)); } catch {}
}

export function loadOwnedTechniques() {
  try {
    const raw = localStorage.getItem(OWNED_TECH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
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
