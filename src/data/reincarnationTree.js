/**
 * Reincarnation Karma + Tree definitions.
 *
 * Karma is awarded the first time a realm is reached. Reaching peak
 * (Open Heaven Layer 6, realm index 50) grants exactly TREE_TOTAL_COST
 * karma, so one full life of peak-reaching == one full tree unlocked.
 *
 * The tree is a 3×3 grid. Most powerful buffs sit on the top row and
 * require at least one node from the row below (branching: each top
 * node has multiple reachable paths, so the player can pivot).
 */

// Per-realm-index karma reward for REACHING that realm (the breakthrough
// that lands you there). Index 0 is the starting state — no karma.
// Tiered per major realm; gentle scaling so early realms feel cheap.
export function karmaForReachingIndex(i) {
  if (i <= 0) return 0;
  if (i <= 9)  return 1;   // Tempered Body layers 2-10
  if (i <= 13) return 1;   // Qi Transformation
  if (i <= 17) return 1;   // True Element
  if (i <= 20) return 2;   // Separation & Reunion
  if (i <= 23) return 2;   // Immortal Ascension
  if (i <= 26) return 2;   // Saint
  if (i <= 29) return 3;   // Saint King
  if (i <= 32) return 3;   // Origin Returning
  if (i <= 35) return 4;   // Origin King
  if (i <= 38) return 4;   // Void King
  if (i <= 41) return 5;   // Dao Source
  if (i <= 44) return 5;   // Emperor Realm
  return 6;                // Open Heaven (45-50)
}

/** Cumulative karma earned by reaching `maxIndex` (never awarded twice). */
export function totalKarmaForPeak(maxIndex) {
  let total = 0;
  for (let i = 1; i <= maxIndex; i++) total += karmaForReachingIndex(i);
  return total;
}

export const SAINT_UNLOCK_INDEX = 24;   // Saint Early Stage — tab becomes visible
export const PEAK_INDEX         = 50;   // Open Heaven Layer 6

// ── Tree nodes ──────────────────────────────────────────────────────────────
// row 2 = top (most expensive / most broken)
// row 0 = bottom (cheap entry points, no prereqs)
// col 0-2 = left to right
// prereqs: ids where ANY ONE satisfies the gate (OR logic)
export const NODES = [
  // Bottom row — no prereqs
  { id: 'pills2x',    label: 'Double Pill Effects',     cost: 6, row: 0, col: 0, prereqs: [] },
  { id: 'mining2x',   label: 'Double Mining Speed',     cost: 4, row: 0, col: 1, prereqs: [] },
  { id: 'gather2x',   label: 'Double Gathering Speed',  cost: 4, row: 0, col: 2, prereqs: [] },

  // Middle row — each needs any adjacent/diagonal bottom node
  { id: 'focus3x',    label: 'Triple Focused QI Multiplier', cost: 19, row: 1, col: 0, prereqs: ['pills2x', 'mining2x'] },
  { id: 'heaven2x',   label: 'Double Heavenly QI Bonus',     cost: 13, row: 1, col: 1, prereqs: ['pills2x', 'mining2x', 'gather2x'] },
  { id: 'stones3x',   label: 'Triple QI-Stones Effects',     cost: 13, row: 1, col: 2, prereqs: ['mining2x', 'gather2x'] },

  // Top row — each needs any adjacent/diagonal middle node
  { id: 'damage3x',   label: 'Triple All Damage',                  cost: 30, row: 2, col: 0, prereqs: ['focus3x', 'heaven2x'] },
  { id: 'stats1000',  label: '+1000 Soul, Body & Essence',         cost: 26, row: 2, col: 1, prereqs: ['focus3x', 'heaven2x', 'stones3x'] },
  { id: 'qis2x',      label: 'Double QI/s',                        cost: 28, row: 2, col: 2, prereqs: ['heaven2x', 'stones3x'] },
];

export const NODES_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));

export const TREE_TOTAL_COST = NODES.reduce((s, n) => s + n.cost, 0);
// Sanity: TREE_TOTAL_COST should equal totalKarmaForPeak(PEAK_INDEX) === 335.

/** Short description rendered in node tooltips. */
export const NODE_DESCRIPTIONS = {
  pills2x:   'All permanent pill stat bonuses are doubled.',
  mining2x:  'Mining speed is doubled.',
  gather2x:  'Gathering (harvest) speed is doubled.',
  focus3x:   'Focused cultivation (hold-to-boost) multiplier is tripled.',
  heaven2x:  'Heavenly QI (rewarded-ad) boost is doubled — turns ×2 into ×4.',
  stones3x:  'QI-Stones crystal flat qi/s bonus is tripled.',
  damage3x:  'All final damage dealt in combat is tripled.',
  stats1000: 'Permanent +1000 to Soul, Body and Essence.',
  qis2x:     'Base QI/s generation is doubled.',
};
