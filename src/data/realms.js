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
  // Costs halved vs. the original curve AND progressively compressed at the
  // upper end so the late-realm slog isn't a brick wall. Early layers remain
  // brisk; endgame shrinks roughly ~11× overall.
  // ── Tempered Body (10 Layers) ──────────────────────────────────────────────
  { name: 'Tempered Body',    stage: 'Layer 1',      cost: 50 },
  { name: 'Tempered Body',    stage: 'Layer 2',      cost: 100 },
  { name: 'Tempered Body',    stage: 'Layer 3',      cost: 175 },
  { name: 'Tempered Body',    stage: 'Layer 4',      cost: 300 },
  { name: 'Tempered Body',    stage: 'Layer 5',      cost: 500 },
  { name: 'Tempered Body',    stage: 'Layer 6',      cost: 850 },
  { name: 'Tempered Body',    stage: 'Layer 7',      cost: 1_400 },
  { name: 'Tempered Body',    stage: 'Layer 8',      cost: 2_400 },
  { name: 'Tempered Body',    stage: 'Layer 9',      cost: 4_000 },
  { name: 'Tempered Body',    stage: 'Layer 10',     cost: 6_500 },

  // ── Qi Transformation (4 Stages) ───────────────────────────────────────────
  { name: 'Qi Transformation', stage: 'Early Stage',  cost: 10_000 },
  { name: 'Qi Transformation', stage: 'Middle Stage', cost: 17_500 },
  { name: 'Qi Transformation', stage: 'Late Stage',   cost: 30_000 },
  { name: 'Qi Transformation', stage: 'Peak Stage',   cost: 50_000 },

  // ── True Element (4 Stages) ────────────────────────────────────────────────
  { name: 'True Element',      stage: 'Early Stage',  cost: 75_000 },
  { name: 'True Element',      stage: 'Middle Stage', cost: 130_000 },
  { name: 'True Element',      stage: 'Late Stage',   cost: 225_000 },
  { name: 'True Element',      stage: 'Peak Stage',   cost: 380_000 },

  // ── Separation & Reunion (3 Stages) ────────────────────────────────────────
  { name: 'Separation & Reunion', stage: '1st Stage', cost: 625_000 },
  { name: 'Separation & Reunion', stage: '2nd Stage', cost: 1_000_000 },
  { name: 'Separation & Reunion', stage: '3rd Stage', cost: 1_700_000 },

  // ── Immortal Ascension (3 Stages) ──────────────────────────────────────────
  { name: 'Immortal Ascension', stage: '1st Stage',   cost: 2_800_000 },
  { name: 'Immortal Ascension', stage: '2nd Stage',   cost: 4_700_000 },
  { name: 'Immortal Ascension', stage: '3rd Stage',   cost: 8_000_000 },

  // ── Saint (3 Stages) ───────────────────────────────────────────────────────
  { name: 'Saint',              stage: 'Early Stage',  cost: 13_000_000 },
  { name: 'Saint',              stage: 'Middle Stage', cost: 22_000_000 },
  { name: 'Saint',              stage: 'Late Stage',   cost: 35_000_000 },

  // ── Saint King (3 Stages) ──────────────────────────────────────────────────
  { name: 'Saint King',         stage: '1st Stage',   cost: 58_000_000 },
  { name: 'Saint King',         stage: '2nd Stage',   cost: 95_000_000 },
  { name: 'Saint King',         stage: '3rd Stage',   cost: 160_000_000 },

  // ── Origin Returning (3 Stages) ────────────────────────────────────────────
  { name: 'Origin Returning',   stage: '1st Stage',   cost: 260_000_000 },
  { name: 'Origin Returning',   stage: '2nd Stage',   cost: 430_000_000 },
  { name: 'Origin Returning',   stage: '3rd Stage',   cost: 700_000_000 },

  // ── Origin King (3 Stages) ─────────────────────────────────────────────────
  { name: 'Origin King',        stage: '1st Stage',   cost: 1_150_000_000 },
  { name: 'Origin King',        stage: '2nd Stage',   cost: 1_900_000_000 },
  { name: 'Origin King',        stage: '3rd Stage',   cost: 3_200_000_000 },

  // ── Void King (3 Stages) ───────────────────────────────────────────────────
  { name: 'Void King',          stage: '1st Stage',   cost: 5_200_000_000 },
  { name: 'Void King',          stage: '2nd Stage',   cost: 8_500_000_000 },
  { name: 'Void King',          stage: '3rd Stage',   cost: 14_000_000_000 },

  // ── Dao Source (3 Stages) ──────────────────────────────────────────────────
  { name: 'Dao Source',         stage: '1st Stage',   cost: 23_000_000_000 },
  { name: 'Dao Source',         stage: '2nd Stage',   cost: 38_000_000_000 },
  { name: 'Dao Source',         stage: '3rd Stage',   cost: 62_000_000_000 },

  // ── Emperor Realm (3 Stages) ───────────────────────────────────────────────
  { name: 'Emperor Realm',      stage: '1st Stage',   cost: 100_000_000_000 },
  { name: 'Emperor Realm',      stage: '2nd Stage',   cost: 170_000_000_000 },
  { name: 'Emperor Realm',      stage: '3rd Stage',   cost: 280_000_000_000 },

  // ── Open Heaven (6 Layers) ─────────────────────────────────────────────────
  { name: 'Open Heaven',        stage: 'Layer 1',     cost: 460_000_000_000 },    // Low-Rank
  { name: 'Open Heaven',        stage: 'Layer 2',     cost: 750_000_000_000 },    // Low-Rank
  { name: 'Open Heaven',        stage: 'Layer 3',     cost: 1_200_000_000_000 },  // Low-Rank
  { name: 'Open Heaven',        stage: 'Layer 4',     cost: 2_000_000_000_000 },  // Mid-Rank
  { name: 'Open Heaven',        stage: 'Layer 5',     cost: 3_300_000_000_000 },  // Mid-Rank
  { name: 'Open Heaven',        stage: 'Layer 6',     cost: 5_500_000_000_000 },  // High-Rank
];

const REALMS = mergeArrayByIndex(REALMS_RAW, 'realms');

// ── Major breakthrough qi/s gate ─────────────────────────────────────────────
// Ascending between major realms (i.e. `realm.name` changes) requires a
// minimum sustained qi/s. The threshold is expressed as a percentage of the
// NEXT realm's qi cost and decays with each successive major transition — the
// early gates squeeze hardest, late realms soften because the cost is already
// enormous.
export const MAJOR_BREAKTHROUGH_BASE_PCT = 0.0025; // 0.25% at the first gate
export const MAJOR_BREAKTHROUGH_DECAY    = 0.5;    // multiplicative per major gate

/** Is the transition `fromIndex → fromIndex+1` a major-realm change? */
export function isMajorTransition(fromIndex) {
  const a = REALMS[fromIndex];
  const b = REALMS[fromIndex + 1];
  return !!a && !!b && a.name !== b.name;
}

/**
 * Is the transition `fromIndex → fromIndex+1` a "peak" event?
 * Two cases:
 *   1. Entering a Peak Stage within the same realm (name unchanged).
 *   2. Entering the absolute last realm in the array (no entry after it) —
 *      that layer is the endgame pinnacle before the final ascension.
 */
export function isPeakTransition(fromIndex) {
  const a = REALMS[fromIndex];
  const b = REALMS[fromIndex + 1];
  if (!a || !b) return false;
  if (a.name === b.name && (b.stage?.includes('Peak') ?? false)) return true;
  if (!REALMS[fromIndex + 2]) return true; // entering the very last realm
  return false;
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
 * Required qi/s to pass a Peak transition at `fromIndex → fromIndex+1`.
 * Uses the same exponential-decay formula as major breakthroughs, ordinal
 * based on how many major transitions have already occurred before fromIndex.
 * Returns 0 if this is not a peak transition.
 */
export function getPeakBreakthroughRate(fromIndex) {
  if (!isPeakTransition(fromIndex)) return 0;
  const next = REALMS[fromIndex + 1];
  if (!next) return 0;
  let ord = 0;
  for (let i = 0; i <= fromIndex; i++) {
    if (isMajorTransition(i)) ord++;
  }
  const pct = MAJOR_BREAKTHROUGH_BASE_PCT * Math.pow(MAJOR_BREAKTHROUGH_DECAY, ord);
  return next.cost * pct;
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

// ── Major-realm → law-offer rarity band ──────────────────────────────────────
// Each major realm name maps to the 2-rarity pool used when a breakthrough
// offers law choices. Iron stops appearing once the player enters the
// Silver band (Separation & Reunion); Transcendent first appears in the
// Gold/Transcendent band (Origin King onwards).
const MAJOR_TO_RARITY_BAND = {
  'Tempered Body':        ['Iron'],
  'Qi Transformation':    ['Iron', 'Bronze'],
  'True Element':         ['Iron', 'Bronze'],
  'Separation & Reunion': ['Bronze', 'Silver'],
  'Immortal Ascension':   ['Bronze', 'Silver'],
  'Saint':                ['Silver', 'Gold'],
  'Saint King':           ['Silver', 'Gold'],
  'Origin Returning':     ['Silver', 'Gold'],
  'Origin King':          ['Gold', 'Transcendent'],
  'Void King':            ['Gold', 'Transcendent'],
  'Dao Source':           ['Gold', 'Transcendent'],
  'Emperor Realm':        ['Gold', 'Transcendent'],
  'Open Heaven':          ['Gold', 'Transcendent'],
};

/**
 * Offer rarity pool for a law choice triggered by a major-realm
 * breakthrough that lands the player on `realmIndex`.
 */
export function lawOfferRaritiesForRealm(realmIndex) {
  const realm = REALMS[realmIndex];
  return MAJOR_TO_RARITY_BAND[realm?.name] ?? ['Iron'];
}

export default REALMS;
