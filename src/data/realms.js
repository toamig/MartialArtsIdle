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
  // 2026-05-21 rebalance — Dial-3 v4 progressive steepening from Saint Early
  // (realm 24) onward. Designed to create natural rebirth-loop walls every
  // ~7 realms so players cycle through 4-5 reincarnations before entering
  // Open Heaven. Past realm 35 the curve deliberately FLATTENS so the
  // accumulated Eternal Tree mult pulls the player through into the OH
  // plateau, which is the "infinite endgame" zone where future content
  // (sprite-tier bonuses, click mini-games, OH L7+) lands.
  //
  // 2026-05-18 prior rebalance — crystal multiplier bumped to +1%/lvl (was
  // +0.3%). Every cost from Qi Transformation onwards is scaled ×4 from the
  // prior table. Tempered Body untouched — early game stays brisk.
  // Audit: `scripts/sim-multilife.mjs` should land at 4-5 rebirths reaching
  // Emperor 1st / OH L1 at hardcore pacing.
  // ── Tempered Body (10 Layers) — 2026-05-21 Dial-8 ──────────────────────────
  //    Costs bumped ×2 from the original onboarding values. Playtest showed
  //    the player hitting first major BT in ~5 min with crystal still at L5
  //    — they didn't have enough breathing room in TB to explore producers
  //    + refine crystal to T2 (L10 = Crystal Reservoir unlock). Doubling TB
  //    cumulative (16K → 32K) gives ~10 min in the first realm so the player
  //    can naturally invest in BOTH producers and crystal, and the L10 / T2
  //    unlock lands around or just after the first major BT.
  { name: 'Tempered Body',    stage: 'Layer 1',      cost: 100 },
  { name: 'Tempered Body',    stage: 'Layer 2',      cost: 200 },
  { name: 'Tempered Body',    stage: 'Layer 3',      cost: 350 },
  { name: 'Tempered Body',    stage: 'Layer 4',      cost: 600 },
  { name: 'Tempered Body',    stage: 'Layer 5',      cost: 1_000 },
  { name: 'Tempered Body',    stage: 'Layer 6',      cost: 1_700 },
  { name: 'Tempered Body',    stage: 'Layer 7',      cost: 2_800 },
  { name: 'Tempered Body',    stage: 'Layer 8',      cost: 4_800 },
  { name: 'Tempered Body',    stage: 'Layer 9',      cost: 8_000 },
  { name: 'Tempered Body',    stage: 'Layer 10',     cost: 13_000 },

  // ── Qi Transformation (4 Stages) ───────────────────────────────────────────
  //    QT Early bumped ×1.3 too (150K → 200K) so the first major BT moment
  //    is a slightly bigger achievement — and the player has time during
  //    QT Early to push crystal across the L10 threshold if they didn't
  //    make it during TB.
  { name: 'Qi Transformation', stage: 'Early Stage',  cost: 200_000 },
  { name: 'Qi Transformation', stage: 'Middle Stage', cost: 305_000 },
  { name: 'Qi Transformation', stage: 'Late Stage',   cost: 570_000 },
  { name: 'Qi Transformation', stage: 'Peak Stage',   cost: 1_000_000 },

  // ── True Element (4 Stages) ────────────────────────────────────────────────
  { name: 'True Element',      stage: 'Early Stage',  cost: 1_650_000 },
  { name: 'True Element',      stage: 'Middle Stage', cost: 3_100_000 },
  { name: 'True Element',      stage: 'Late Stage',   cost: 5_700_000 },
  { name: 'True Element',      stage: 'Peak Stage',   cost: 10_500_000 },

  // ── Separation & Reunion (3 Stages) ────────────────────────────────────────
  { name: 'Separation & Reunion', stage: '1st Stage', cost: 18_000_000 },
  { name: 'Separation & Reunion', stage: '2nd Stage', cost: 30_500_000 },
  { name: 'Separation & Reunion', stage: '3rd Stage', cost: 55_000_000 },

  // ── Immortal Ascension (3 Stages) ──────────────────────────────────────────
  { name: 'Immortal Ascension', stage: '1st Stage',   cost: 95_000_000 },
  { name: 'Immortal Ascension', stage: '2nd Stage',   cost: 165_000_000 },
  { name: 'Immortal Ascension', stage: '3rd Stage',   cost: 300_000_000 },

  // ── Saint (3 Stages) — Dial-3 v4 steepening starts here (×1.3 → ×2.0) ──
  //    Life 1 walls land in this band — see `scripts/sim-multilife.mjs`.
  { name: 'Saint',              stage: 'Early Stage',  cost: 650_000_000 },
  { name: 'Saint',              stage: 'Middle Stage', cost: 1_400_000_000 },
  { name: 'Saint',              stage: 'Late Stage',   cost: 3_000_000_000 },

  // ── Saint King (3 Stages) — Dial-3 v4 (×2.5 → ×3.5) ────────────────────────
  { name: 'Saint King',         stage: '1st Stage',   cost: 6_400_000_000 },
  { name: 'Saint King',         stage: '2nd Stage',   cost: 13_000_000_000 },
  { name: 'Saint King',         stage: '3rd Stage',   cost: 27_000_000_000 },

  // ── Origin Returning (3 Stages) — Dial-3 v4 (×4.0 → ×4.8) ──────────────────
  { name: 'Origin Returning',   stage: '1st Stage',   cost: 50_000_000_000 },
  { name: 'Origin Returning',   stage: '2nd Stage',   cost: 95_000_000_000 },
  { name: 'Origin Returning',   stage: '3rd Stage',   cost: 175_000_000_000 },

  // ── Origin King (3 Stages) — Dial-3 v4 (×5.1 → ×5.4) — peak of the wall ──
  { name: 'Origin King',        stage: '1st Stage',   cost: 320_000_000_000 },
  { name: 'Origin King',        stage: '2nd Stage',   cost: 560_000_000_000 },
  { name: 'Origin King',        stage: '3rd Stage',   cost: 1_000_000_000_000 },

  // ── Void King (3 Stages) — Dial-3 v4 (×5.0 → ×4.0, curve flattens) ─────────
  //    Past realm 35, the curve relaxes so accumulated tree-mult carries
  //    the player through into Open Heaven.
  { name: 'Void King',          stage: '1st Stage',   cost: 1_525_000_000_000 },
  { name: 'Void King',          stage: '2nd Stage',   cost: 2_320_000_000_000 },
  { name: 'Void King',          stage: '3rd Stage',   cost: 3_440_000_000_000 },

  // ── Dao Source (3 Stages) — Dial-3 v4 (×3.5 → ×2.5) ────────────────────────
  { name: 'Dao Source',         stage: '1st Stage',   cost: 5_250_000_000_000 },
  { name: 'Dao Source',         stage: '2nd Stage',   cost: 7_350_000_000_000 },
  { name: 'Dao Source',         stage: '3rd Stage',   cost: 10_400_000_000_000 },

  // ── Emperor Realm (3 Stages) — Dial-3 v4 (×2.2 → ×1.8) ─────────────────────
  { name: 'Emperor Realm',      stage: '1st Stage',   cost: 15_200_000_000_000 },
  { name: 'Emperor Realm',      stage: '2nd Stage',   cost: 24_000_000_000_000 },
  { name: 'Emperor Realm',      stage: '3rd Stage',   cost: 36_000_000_000_000 },

  // ── Open Heaven (6 Layers) — Dial-3 v4 (×1.5, post-loop plateau zone) ──
  //    The "Cookie Clicker endgame" — gentle climb, future mechanics drop here.
  { name: 'Open Heaven',        stage: 'Layer 1',     cost: 51_000_000_000_000 },   // Low-Rank
  { name: 'Open Heaven',        stage: 'Layer 2',     cost: 85_500_000_000_000 },   // Low-Rank
  { name: 'Open Heaven',        stage: 'Layer 3',     cost: 137_250_000_000_000 },  // Low-Rank
  { name: 'Open Heaven',        stage: 'Layer 4',     cost: 235_500_000_000_000 },  // Mid-Rank
  { name: 'Open Heaven',        stage: 'Layer 5',     cost: 396_000_000_000_000 },  // Mid-Rank
  { name: 'Open Heaven',        stage: 'Layer 6',     cost: 672_750_000_000_000 },  // High-Rank
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
 *
 * Only one case now: entering the absolute last realm in the array (no
 * entry after it) — that layer is the endgame pinnacle before the final
 * ascension and gets its own banner.
 *
 * REMOVED (2026-05-20): same-name Peak Stage entries (e.g. Qi Transformation
 * Late Stage → Peak Stage) used to count as peak transitions and triggered
 * both the qi/s gate and the old BreakthroughBanner. That was wrong — the
 * peak stage is a normal sub-stage; the gate + banner belong only at the
 * EXIT of the realm (handled by isMajorTransition when the realm name
 * changes). Without this, the player got gated AND celebrated twice
 * (entering peak + exiting peak to the next realm).
 */
export function isPeakTransition(fromIndex) {
  const a = REALMS[fromIndex];
  const b = REALMS[fromIndex + 1];
  if (!a || !b) return false;
  if (!REALMS[fromIndex + 2]) return true; // entering the very last realm
  return false;
}

/**
 * 0-based position of REALMS[stageIndex] within its realm name group.
 * E.g. Tempered Body L1 → 0, L2 → 1, ..., L10 → 9.
 * Returns 0 for the first stage of any realm (or an out-of-range index).
 */
export function getRealmStageOrdinal(stageIndex) {
  const s = REALMS[stageIndex];
  if (!s) return 0;
  let ord = 0;
  for (let i = stageIndex - 1; i >= 0; i--) {
    if (REALMS[i]?.name !== s.name) break;
    ord++;
  }
  return ord;
}

/**
 * True iff the breakthrough INTO `stageIndex` rewards a Qi Spark selection.
 *
 * Rule (Dial-12, deterministic by stage index):
 *   - Major transition (entering a new realm name): YES.
 *   - Sub-stage at an even realm-internal ordinal (2, 4, 6, …): YES, UNLESS
 *     `stageIndex` is the last stage of its realm (in which case the immediate
 *     next BT will be the major and gives the spark; we don't double-up).
 *   - Everything else (1st, 3rd, 5th... sub-stage, plus stage 0 of the entire
 *     game which has no incoming BT): NO.
 *
 * Replaces the old global-counter approach in useQiSparks (which wasn't
 * persisted across reloads and so couldn't be visualised on the roadmap).
 */
export function stageHasSpark(stageIndex) {
  if (stageIndex <= 0) return false;          // first stage of the game has no incoming BT
  const prev = REALMS[stageIndex - 1];
  const curr = REALMS[stageIndex];
  if (!prev || !curr) return false;
  // Major transition: always spark.
  if (prev.name !== curr.name) return true;
  // Sub-stage: even ordinal AND not the realm's last stage.
  const ord = getRealmStageOrdinal(stageIndex);
  if (ord <= 0 || ord % 2 !== 0) return false;
  const next = REALMS[stageIndex + 1];
  const isLastInRealm = !next || next.name !== curr.name;
  return !isLastInRealm;
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
