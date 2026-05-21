/**
 * treeMigration.js — one-shot Eternal Tree V1 migration (2026-05-21).
 *
 * The Plan B V1 tree redesign uses entirely new node ids (`pe_root`,
 * `pe_disciple_res`, etc.). Saves that predate this change have ids from
 * the old tree (`al_1`, `md_k`, `yy_3`, etc.). Loading them as-is would:
 *
 *   1. Show 0 active modifiers (the new hook filters unknown ids out).
 *   2. Lose all karma the player had spent on the old tree.
 *
 * This module runs ONCE at module import (called from App.jsx top-level,
 * before any React state initialises). It:
 *
 *   - Detects an old-style tree purchase set in `mai_reincarnation_tree`.
 *   - Wipes the old purchase list.
 *   - Refunds karma by setting the player's karma balance to their full
 *     `totalKarmaForPeak(maxAwarded)` total. Equivalent to "you have NOT
 *     spent anything yet". Safe even if the balance was already at max.
 *   - Sets a flag (`mai_tree_v2_migrated`) so the migration runs at most
 *     once per save.
 *   - Stashes a flag on `window` so App.jsx can surface a one-time toast
 *     after React mounts.
 *
 * Karma curve is INLINED here as a snapshot rather than imported from
 * `data/reincarnationTree.js` — the values match `karmaForReachingIndex`
 * exactly, and inlining means the migration is self-contained even if
 * the curve is later tuned (V2 karma rework).
 */

const MIGRATION_FLAG_KEY = 'mai_tree_v2_migrated';
const TREE_KEY           = 'mai_reincarnation_tree';
const KARMA_KEY          = 'mai_reincarnation';

/** Inlined snapshot of `karmaForReachingIndex` as of Plan B V1. */
function karmaCurveAt(i) {
  if (i <= 0)  return 0;
  if (i <= 17) return 2;
  if (i <= 23) return 3;
  if (i <= 26) return 1;
  if (i <= 32) return 2;
  if (i <= 38) return 3;
  if (i <= 44) return 4;
  if (i <= 46) return 5;
  return 6;
}

function totalKarmaThrough(maxIndex) {
  let total = 0;
  for (let i = 1; i <= (maxIndex ?? 0); i++) total += karmaCurveAt(i);
  return total;
}

/** Returns true iff the array of purchase ids contains any OLD-style id. */
function hasLegacyPurchases(arr) {
  if (!Array.isArray(arr)) return false;
  for (const id of arr) {
    if (typeof id !== 'string') continue;
    if (!id.startsWith('pe_')) return true;
  }
  return false;
}

/**
 * Idempotent. Safe to call multiple times — the migration flag guarantees
 * only ONE effective run per save. Failures are swallowed (localStorage
 * may be unavailable or quota-exceeded).
 */
export function maybeMigrateTree() {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === '1') return;

    let didMigrate = false;

    const treeRaw = localStorage.getItem(TREE_KEY);
    if (treeRaw) {
      let parsed = null;
      try { parsed = JSON.parse(treeRaw); } catch {}
      if (hasLegacyPurchases(parsed)) {
        // Refund: set karma balance to total earned. This effectively
        // un-spends every old-tree purchase the player made.
        try {
          const karmaRaw = localStorage.getItem(KARMA_KEY);
          if (karmaRaw) {
            const k = JSON.parse(karmaRaw) ?? {};
            const refundedTotal = totalKarmaThrough(k.maxAwarded ?? 0);
            // Use max() so we never DECREASE a player's karma (e.g. if
            // their `karma` field somehow exceeded the formula).
            k.karma = Math.max(Number(k.karma ?? 0), refundedTotal);
            localStorage.setItem(KARMA_KEY, JSON.stringify(k));
          }
        } catch { /* karma refund failed — non-fatal; tree wipe still happens */ }

        // Wipe the legacy purchase set. The new hook will start empty.
        try { localStorage.removeItem(TREE_KEY); } catch {}
        didMigrate = true;
      }
    }

    // Always set the flag so the next boot skips this scan.
    try { localStorage.setItem(MIGRATION_FLAG_KEY, '1'); } catch {}

    // Stash a window flag so App.jsx can fire a one-time toast post-mount.
    if (didMigrate && typeof window !== 'undefined') {
      window.__maiTreeV2MigratedNotice = true;
    }
  } catch { /* outermost guard — never throw from migration */ }
}
