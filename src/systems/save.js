const SAVE_KEY       = 'mai_save';
const TECH_KEY       = 'mai_techniques';
const OWNED_TECH_KEY = 'mai_owned_techniques';

/**
 * Save schema version. Bump when the on-disk shape changes in a way that
 * requires migration. Each version below documents what changed; do NOT
 * reuse old numbers.
 *
 *   1 — pre-versioning (implicit).
 *   2 — v1 Cookie-Clicker pivot. NO migration required:
 *         • Adds `mai_producers`, `mai_upgrades`, `mai_producers_rate_snapshot`.
 *         • Combat-tied keys (`mai_inventory`, `mai_owned_laws`, `mai_pills`,
 *           `mai_blood_lotus`, `mai_artefacts`, `mai_techniques`, etc.) are
 *           PRESERVED on disk. Their UI is gated behind FEATURES.combat in
 *           src/data/featureFlags.js — when combat ships in v2, flipping
 *           that flag rehydrates everything without a data migration.
 */
export const SAVE_VERSION = 2;
export const SAVE_VERSION_KEY = 'mai_save_version';

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
  localStorage.removeItem('mai_artefact_offline_snapshot');
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
  // Master's Patience focus-seconds counter (Dial-9).
  localStorage.removeItem('mai_qi_sparks_focus_seconds_run');
  localStorage.removeItem('mai_cleared_regions');
  localStorage.removeItem('mai_seen_features');
  localStorage.removeItem('mai_auto_farm');
  localStorage.removeItem('mai_qi_crystal');
  localStorage.removeItem('mai_crystal_reservoir');
  localStorage.removeItem('mai_crystal_click_snapshot');
  // Cookie-Clicker pivot (v1) — producers + upgrades. Producer counts may be
  // partially restored AFTER wipeReincarnation by App.jsx's handleReincarnate
  // when the Eternal Tree keepProducerLevelsFrac modifier is non-zero. The
  // one-time upgrade set always wipes (no carryover by design).
  localStorage.removeItem('mai_producers');
  localStorage.removeItem('mai_producers_rate_snapshot');
  localStorage.removeItem('mai_upgrades');
  localStorage.removeItem('mai_achievements');
  localStorage.removeItem('mai_permanent_pill_stats');
  // Per-pill consumption counter that drives diminishing returns. Lives
  // alongside permanentStats — both are per-incarnation, both wipe together.
  localStorage.removeItem('mai_pills_consumed');
  // 2026-05-21 — Settings > "Wipe save" is a true factory reset. Karma +
  // Eternal Tree are part of the player's progression and DO get wiped here.
  // `wipeReincarnation()` below is the prestige-only path that preserves
  // them — it snapshots karma + tree BEFORE calling wipeSave() and restores
  // them after, so the prestige loop still works as designed.
  localStorage.removeItem('mai_reincarnation');
  localStorage.removeItem('mai_reincarnation_tree');
  // Rebirth-carryover state — also part of the prestige loop and gets
  // wiped here for parity with karma + tree. wipeReincarnation snapshots
  // and restores these separately when they belong to the new life.
  localStorage.removeItem('mai_banked_rerolls');
  localStorage.removeItem('mai_rebirth_cult_buff_until');
  // mai_blood_lotus is intentionally NOT wiped — paid currency survives a save reset
  // mai_lang is intentionally NOT wiped — language preference survives a save reset
  // mai_save_version is intentionally NOT wiped — version marker survives
  //   so we don't re-trigger one-shot migrations on the fresh save
}

/**
 * Wipe for reincarnation. Preserves karma + Eternal Tree purchases (the
 * prestige progression), the **entire** owned-laws library, the alchemy
 * meta-progression (discovered pill recipes + pinned recipes), and the
 * banked-reroll / rebirth-cult-buff carryovers driven by tree nodes —
 * but clears the active law so the reborn character must re-choose
 * which manual to cultivate. The library + recipe codex are permanent
 * identity across lives; the active choice is the fresh start.
 *
 * 2026-05-21 — refactored to snapshot-then-restore for every prestige
 * key. Previously these keys were simply omitted from `wipeSave`'s
 * removal list, which made "Settings > Wipe save" leave the player on
 * a non-zero `treeQiMult` (the karma + tree carried over silently).
 * Now wipeSave is a true factory reset; this function explicitly
 * preserves what should survive a reincarnation.
 */
export function wipeReincarnation() {
  // Snapshot every key that survives a reincarnation BEFORE wipeSave
  // blows it away. Each snapshot is restored after wipeSave returns.
  const snapshot = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const restore  = (key, val) => { if (val != null) { try { localStorage.setItem(key, val); } catch {} } };

  const karma                 = snapshot('mai_reincarnation');
  const tree                  = snapshot('mai_reincarnation_tree');
  const ownedLawsRaw          = snapshot('mai_owned_laws');
  const discoveredPills       = snapshot('mai_discovered_pills');
  const pinnedRecipes         = snapshot('mai_pinned_recipes');
  const bankedRerolls         = snapshot('mai_banked_rerolls');
  const rebirthCultBuffUntil  = snapshot('mai_rebirth_cult_buff_until');

  wipeSave();

  // Re-seed prestige progression — karma, tree, and tree-driven carryovers.
  restore('mai_reincarnation',          karma);
  restore('mai_reincarnation_tree',     tree);
  restore('mai_banked_rerolls',         bankedRerolls);
  restore('mai_rebirth_cult_buff_until', rebirthCultBuffUntil);

  // Re-seed the law library (no active selection — player picks anew).
  if (ownedLawsRaw) {
    try {
      const parsed = JSON.parse(ownedLawsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem('mai_owned_laws', ownedLawsRaw);
      }
    } catch {}
  }
  // Re-seed the alchemy codex.
  restore('mai_discovered_pills', discoveredPills);
  restore('mai_pinned_recipes',   pinnedRecipes);
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
