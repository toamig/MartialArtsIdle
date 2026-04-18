/**
 * Cultivation realms based on Martial Peak, with sub-stages.
 * Each entry is one breakthrough step. Costs are in qi.
 *
 * Designer overrides: per-index patches live in src/data/config/realms.override.json.
 * Realm identity is its position in this array (indices are save-file state), so
 * the designer panel only edits existing entries — no insert/remove/reorder.
 */
import { mergeArrayByIndex } from './config/loader';

const REALMS_RAW = [
  // ── Tempered Body (10 Layers) ──────────────────────────────────────────────
  { name: 'Tempered Body',    stage: 'Layer 1',      cost: 100 },
  { name: 'Tempered Body',    stage: 'Layer 2',      cost: 200 },
  { name: 'Tempered Body',    stage: 'Layer 3',      cost: 350 },
  { name: 'Tempered Body',    stage: 'Layer 4',      cost: 600 },
  { name: 'Tempered Body',    stage: 'Layer 5',      cost: 1_000 },
  { name: 'Tempered Body',    stage: 'Layer 6',      cost: 1_700 },
  { name: 'Tempered Body',    stage: 'Layer 7',      cost: 2_800 },
  { name: 'Tempered Body',    stage: 'Layer 8',      cost: 4_700 },
  { name: 'Tempered Body',    stage: 'Layer 9',      cost: 8_000 },
  { name: 'Tempered Body',    stage: 'Layer 10',     cost: 13_000 },

  // ── Qi Transformation (4 Stages) ───────────────────────────────────────────
  { name: 'Qi Transformation', stage: 'Early Stage',  cost: 20_000 },
  { name: 'Qi Transformation', stage: 'Middle Stage', cost: 35_000 },
  { name: 'Qi Transformation', stage: 'Late Stage',   cost: 60_000 },
  { name: 'Qi Transformation', stage: 'Peak Stage',   cost: 100_000 },

  // ── True Element (4 Stages) ────────────────────────────────────────────────
  { name: 'True Element',      stage: 'Early Stage',  cost: 160_000 },
  { name: 'True Element',      stage: 'Middle Stage', cost: 280_000 },
  { name: 'True Element',      stage: 'Late Stage',   cost: 480_000 },
  { name: 'True Element',      stage: 'Peak Stage',   cost: 820_000 },

  // ── Separation & Reunion (3 Stages) ────────────────────────────────────────
  { name: 'Separation & Reunion', stage: '1st Stage', cost: 1_400_000 },
  { name: 'Separation & Reunion', stage: '2nd Stage', cost: 2_400_000 },
  { name: 'Separation & Reunion', stage: '3rd Stage', cost: 4_000_000 },

  // ── Immortal Ascension (3 Stages) ──────────────────────────────────────────
  { name: 'Immortal Ascension', stage: '1st Stage',   cost: 7_000_000 },
  { name: 'Immortal Ascension', stage: '2nd Stage',   cost: 12_000_000 },
  { name: 'Immortal Ascension', stage: '3rd Stage',   cost: 20_000_000 },

  // ── Saint (3 Stages) ───────────────────────────────────────────────────────
  { name: 'Saint',              stage: 'Early Stage',  cost: 35_000_000 },
  { name: 'Saint',              stage: 'Middle Stage', cost: 60_000_000 },
  { name: 'Saint',              stage: 'Late Stage',   cost: 100_000_000 },

  // ── Saint King (3 Stages) ──────────────────────────────────────────────────
  { name: 'Saint King',         stage: '1st Stage',   cost: 170_000_000 },
  { name: 'Saint King',         stage: '2nd Stage',   cost: 290_000_000 },
  { name: 'Saint King',         stage: '3rd Stage',   cost: 500_000_000 },

  // ── Origin Returning (3 Stages) ────────────────────────────────────────────
  { name: 'Origin Returning',   stage: '1st Stage',   cost: 850_000_000 },
  { name: 'Origin Returning',   stage: '2nd Stage',   cost: 1_450_000_000 },
  { name: 'Origin Returning',   stage: '3rd Stage',   cost: 2_500_000_000 },

  // ── Origin King (3 Stages) ─────────────────────────────────────────────────
  { name: 'Origin King',        stage: '1st Stage',   cost: 4_200_000_000 },
  { name: 'Origin King',        stage: '2nd Stage',   cost: 7_000_000_000 },
  { name: 'Origin King',        stage: '3rd Stage',   cost: 12_000_000_000 },

  // ── Void King (3 Stages) ───────────────────────────────────────────────────
  { name: 'Void King',          stage: '1st Stage',   cost: 20_000_000_000 },
  { name: 'Void King',          stage: '2nd Stage',   cost: 35_000_000_000 },
  { name: 'Void King',          stage: '3rd Stage',   cost: 60_000_000_000 },

  // ── Dao Source (3 Stages) ──────────────────────────────────────────────────
  { name: 'Dao Source',         stage: '1st Stage',   cost: 100_000_000_000 },
  { name: 'Dao Source',         stage: '2nd Stage',   cost: 170_000_000_000 },
  { name: 'Dao Source',         stage: '3rd Stage',   cost: 290_000_000_000 },

  // ── Emperor Realm (3 Stages) ───────────────────────────────────────────────
  { name: 'Emperor Realm',      stage: '1st Stage',   cost: 500_000_000_000 },
  { name: 'Emperor Realm',      stage: '2nd Stage',   cost: 850_000_000_000 },
  { name: 'Emperor Realm',      stage: '3rd Stage',   cost: 1_500_000_000_000 },

  // ── Half-Step Open Heaven ──────────────────────────────────────────────────
  { name: 'Half-Step Open Heaven', stage: '',         cost: 2_500_000_000_000 },

  // ── Open Heaven (6 Layers) ─────────────────────────────────────────────────
  { name: 'Open Heaven',        stage: 'Layer 1',     cost: 4_000_000_000_000 },  // Low-Rank
  { name: 'Open Heaven',        stage: 'Layer 2',     cost: 7_000_000_000_000 },  // Low-Rank
  { name: 'Open Heaven',        stage: 'Layer 3',     cost: 12_000_000_000_000 }, // Low-Rank
  { name: 'Open Heaven',        stage: 'Layer 4',     cost: 20_000_000_000_000 }, // Mid-Rank
  { name: 'Open Heaven',        stage: 'Layer 5',     cost: 35_000_000_000_000 }, // Mid-Rank
  { name: 'Open Heaven',        stage: 'Layer 6',     cost: 60_000_000_000_000 }, // High-Rank
];

const REALMS = mergeArrayByIndex(REALMS_RAW, 'realms');

// ── Major breakthrough qi/s gate ─────────────────────────────────────────────
// Ascending between major realms (i.e. `realm.name` changes) requires a
// minimum sustained qi/s. The threshold is expressed as a percentage of the
// NEXT realm's qi cost and decays with each successive major transition — the
// early gates squeeze hardest, late realms soften because the cost is already
// enormous.
export const MAJOR_BREAKTHROUGH_BASE_PCT = 0.01;   // 1% at the first gate
export const MAJOR_BREAKTHROUGH_DECAY    = 0.85;   // multiplicative per major gate

/** Is the transition `fromIndex → fromIndex+1` a major-realm change? */
export function isMajorTransition(fromIndex) {
  const a = REALMS[fromIndex];
  const b = REALMS[fromIndex + 1];
  return !!a && !!b && a.name !== b.name;
}

/**
 * Returns the 0-based ordinal of the major transition starting from `fromIndex`
 * (i.e. how many major transitions precede this one), or -1 if the transition
 * is not a major one.
 */
export function majorTransitionOrdinal(fromIndex) {
  if (!isMajorTransition(fromIndex)) return -1;
  let ord = 0;
  for (let i = 0; i < fromIndex; i++) {
    if (isMajorTransition(i)) ord++;
  }
  return ord;
}

/**
 * Required qi/s to ascend from `fromIndex` to `fromIndex+1`. Returns 0 when
 * the transition is a sub-stage (non-major) — no gating applies.
 */
export function getMajorBreakthroughRate(fromIndex) {
  const ord = majorTransitionOrdinal(fromIndex);
  if (ord < 0) return 0;
  const next = REALMS[fromIndex + 1];
  if (!next) return 0;
  const pct = MAJOR_BREAKTHROUGH_BASE_PCT * Math.pow(MAJOR_BREAKTHROUGH_DECAY, ord);
  return next.cost * pct;
}

export default REALMS;
