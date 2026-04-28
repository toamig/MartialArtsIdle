/**
 * qiSparks.js — Qi Sparks card pool.
 *
 * Phase 1 ships 8 common cards (temporary qi buffs). Uncommon (permanent
 * buffs) and Rare (mechanic unlocks/upgrades) tiers come in later phases.
 *
 * Card shape:
 *   {
 *     id:           string                                — stable identifier
 *     rarity:       'common' | 'uncommon' | 'rare'        — drives draw weight + visual border
 *     name:         string                                — display name
 *     description:  string                                — flavor + numbers
 *     kind:         CardKind                              — drives lifecycle
 *     ...kind-specific fields
 *   }
 *
 * CardKinds (Phase 1):
 *   'instant'                  — fire-once on choose; no persistent state
 *     effect: { type: 'qi_seconds', value: number }       — grant N seconds of current qi/s as instant qi
 *   'timed'                    — active until expiresAt
 *     duration: number (ms)
 *     effect: { type: 'qi_mult', value }                  — adds value to qi/s multiplier
 *           | { type: 'focus_mult_bonus', value }         — adds value to focus multiplier (additive %)
 *   'until_breakthrough'       — active until next layer breakthrough fires
 *     effect: { type: 'qi_mult', value }
 *   'event_count'              — active for N breakthroughs
 *     breakthroughs: number
 *     effect: { type: 'qi_mult', value }
 *   'next_breakthrough_flag'   — sets a one-shot flag consumed by the next breakthrough
 *     flag: 'painless_breakthrough'
 *   'lingering_focus_flag'     — sets a flag that modifies focus-release behavior for `duration` ms
 *     duration: number (ms)
 *     residualMult: number    — qi/s mult applied for `residualDurationMs` after focus release
 *     residualDurationMs: number
 *   'permanent'                — persists for the entire run; resets on reincarnation only.
 *                                Stacks additively when re-drawn (instance.stacks counter).
 *     effect: { type: 'qi_flat_per_stack',                  value }   — adds to base qi/s
 *           | { type: 'qi_mult_per_stack',                  value }   — adds to qi/s mult bonus (sums across stacks)
 *           | { type: 'focus_mult_bonus_per_stack',         value }   — adds to focus mult bonus
 *           | { type: 'gate_reduction_per_stack',           value }   — reduces major-realm gate qi/s requirement
 *           | { type: 'offline_qi_mult_per_stack',          value }   — multiplies offline qi accrual
 *           | { type: 'qi_mult_per_breakthrough_per_stack', value }   — qi/s mult that grows with breakthroughs accrued
 *   'mechanic'                 — rare-tier mechanic unlock or upgrade. One
 *                                active spark per mechanicId; picking a higher
 *                                tier replaces the lower one in place.
 *     mechanicId:  string                  — groups the 5 tier cards together
 *     tier:        1 | 2 | 3 | 4 | 5       — drives gating & in-game effect
 *     unlockCheck: string?                 — feature-gate id required for T1 only (e.g. 'qi_crystal')
 *     ...mechanic-specific fields read by useCultivation / mechanic UI
 */

export const QI_SPARKS = [
  // ── Common (temporary buffs) ────────────────────────────────────────────
  {
    id:          'quick_burst',
    rarity:      'common',
    name:        'Quick Burst',
    description: 'Instant qi gain worth 30 seconds of your current qi/s.',
    kind:        'instant',
    effect:      { type: 'qi_seconds', value: 30 },
  },
  {
    id:          'surging_stream',
    rarity:      'common',
    name:        'Surging Stream',
    description: '+50% qi/s for 30 seconds.',
    kind:        'timed',
    duration:    30_000,
    effect:      { type: 'qi_mult', value: 0.5 },
  },
  {
    id:          'steady_stream',
    rarity:      'common',
    name:        'Steady Stream',
    description: '+20% qi/s for 60 seconds.',
    kind:        'timed',
    duration:    60_000,
    effect:      { type: 'qi_mult', value: 0.2 },
  },
  {
    id:          'inner_calm',
    rarity:      'common',
    name:        'Inner Calm',
    description: '+10% qi/s until your next breakthrough.',
    kind:        'until_breakthrough',
    effect:      { type: 'qi_mult', value: 0.1 },
  },
  {
    id:          'focus_surge',
    rarity:      'common',
    name:        'Focus Surge',
    description: '+30% Focus multiplier for 60 seconds.',
    kind:        'timed',
    duration:    60_000,
    effect:      { type: 'focus_mult_bonus', value: 0.3 },
  },
  {
    id:          'painless_ascension',
    rarity:      'common',
    name:        'Painless Ascension',
    description: 'Your next breakthrough costs no qi — the full amount carries into the next realm.',
    kind:        'next_breakthrough_flag',
    flag:        'painless_breakthrough',
  },
  {
    id:          'lingering_focus',
    rarity:      'common',
    name:        'Lingering Focus',
    description: 'For 60 seconds, your qi/s continues at 50% for 5 seconds after you release Focus.',
    kind:        'lingering_focus_flag',
    duration:    60_000,
    residualMult:        0.5,
    residualDurationMs:  5_000,
  },
  {
    id:          'echo_of_insight',
    rarity:      'common',
    name:        'Echo of Insight',
    description: '+5% qi/s for the next 3 layer breakthroughs.',
    kind:        'event_count',
    breakthroughs: 3,
    effect:      { type: 'qi_mult', value: 0.05 },
  },

  // ── Uncommon (permanent run buffs, additive stacking) ───────────────────
  {
    id:          'steady_cultivation',
    rarity:      'uncommon',
    name:        'Steady Cultivation',
    description: '+1 base qi/s for the rest of this run. Stacks.',
    kind:        'permanent',
    effect:      { type: 'qi_flat_per_stack', value: 1 },
  },
  {
    id:          'sharper_focus',
    rarity:      'uncommon',
    name:        'Sharper Focus',
    description: '+5% Focus multiplier for the rest of this run. Stacks.',
    kind:        'permanent',
    effect:      { type: 'focus_mult_bonus_per_stack', value: 0.05 },
  },
  {
    id:          'enduring_stream',
    rarity:      'uncommon',
    name:        'Enduring Stream',
    description: '+2% qi/s for the rest of this run. Stacks.',
    kind:        'permanent',
    effect:      { type: 'qi_mult_per_stack', value: 0.02 },
  },
  {
    id:          'patience_of_stone',
    rarity:      'uncommon',
    name:        'Patience of Stone',
    description: 'Major-realm gate qi/s requirement reduced 5% for the rest of this run. Stacks.',
    kind:        'permanent',
    effect:      { type: 'gate_reduction_per_stack', value: 0.05 },
  },
  {
    id:          'heavens_bond',
    rarity:      'uncommon',
    name:        "Heaven's Bond",
    description: '+10% offline qi accrual for the rest of this run. Stacks.',
    kind:        'permanent',
    effect:      { type: 'offline_qi_mult_per_stack', value: 0.10 },
  },
  {
    id:          'resonant_soul',
    rarity:      'uncommon',
    name:        'Resonant Soul',
    description: '+0.5% qi/s for every layer breakthrough you reach this run. Stacks.',
    kind:        'permanent',
    effect:      { type: 'qi_mult_per_breakthrough_per_stack', value: 0.005 },
  },

  // ── Rare — Mechanic: Crystal Click ─────────────────────────────────────
  // The Qi Crystal silently stockpiles a fraction of your qi/s into a
  // reservoir while you cultivate. Tapping the crystal collects everything
  // at once — it's satisfying offline, like a golden cookie sitting full.
  // Each tier raises both the fill rate and the reservoir cap.
  //
  // Tier curve (rate × qi/s = fill speed; cap = minutes of current qi/s):
  //   T1  30% · 5 min cap
  //   T2  50% · 10 min cap
  //   T3  70% · 20 min cap
  //   T4  85% · 40 min cap
  //   T5 100% · 60 min cap   (full rate — crystal mirrors your cultivation)
  {
    id:          'crystal_click_t1',
    rarity:      'rare',
    name:        'Crystal Reservoir',
    description: 'The crystal stockpiles 30% of your qi/s (up to 5 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        1,
    unlockCheck: 'qi_crystal',
    rate:        0.30,
    capMinutes:  5,
  },
  {
    id:          'crystal_click_t2',
    rarity:      'rare',
    name:        'Crystal Reservoir',
    description: 'Upgrades to 50% of your qi/s (up to 10 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        2,
    rate:        0.50,
    capMinutes:  10,
  },
  {
    id:          'crystal_click_t3',
    rarity:      'rare',
    name:        'Crystal Reservoir',
    description: 'Upgrades to 70% of your qi/s (up to 20 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        3,
    rate:        0.70,
    capMinutes:  20,
  },
  {
    id:          'crystal_click_t4',
    rarity:      'rare',
    name:        'Crystal Reservoir',
    description: 'Upgrades to 85% of your qi/s (up to 40 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        4,
    rate:        0.85,
    capMinutes:  40,
  },
  {
    id:          'crystal_click_t5',
    rarity:      'rare',
    name:        'Crystal Reservoir',
    description: 'Full rate: 100% of your qi/s (up to 60 min). Tap the crystal to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        5,
    rate:        1.00,
    capMinutes:  60,
  },

  // ── Rare — Mechanic: Divine Qi ─────────────────────────────────────────
  // A golden orb manifests in the scene at random intervals. Tap it before
  // it fades to collect a burst of qi. Higher tiers shorten the interval,
  // widen the tap window, and increase the burst. T5 spawns a second orb
  // simultaneously; collecting both also grants a short qi/s rate buff.
  {
    id:              'divine_qi_t1',
    rarity:          'rare',
    name:            'Divine Qi',
    description:     'A golden orb appears every ~3 min. Tap it within 8s for 30s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            1,
    spawnIntervalMs: 180_000,
    windowMs:        8_000,
    burstSeconds:    30,
  },
  {
    id:              'divine_qi_t2',
    rarity:          'rare',
    name:            'Divine Qi',
    description:     'Orb every ~2.5 min, 10s window. Tap for 40s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            2,
    spawnIntervalMs: 150_000,
    windowMs:        10_000,
    burstSeconds:    40,
  },
  {
    id:              'divine_qi_t3',
    rarity:          'rare',
    name:            'Divine Qi',
    description:     'Orb every ~2 min, 12s window. Tap for 50s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            3,
    spawnIntervalMs: 120_000,
    windowMs:        12_000,
    burstSeconds:    50,
  },
  {
    id:              'divine_qi_t4',
    rarity:          'rare',
    name:            'Divine Qi',
    description:     'Orb every ~90s, 15s window. Tap for 60s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            4,
    spawnIntervalMs: 90_000,
    windowMs:        15_000,
    burstSeconds:    60,
  },
  {
    id:              'divine_qi_t5',
    rarity:          'rare',
    name:            'Divine Qi',
    description:     'Two orbs every ~60s. Collect both for 60s qi + ×1.5 qi/s for 30s.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            5,
    spawnIntervalMs: 60_000,
    windowMs:        15_000,
    burstSeconds:    60,
    doubleOrb:       true,
    rateMult:        1.5,
    rateBuffMs:      30_000,
  },

  // ── Rare — Mechanic: Consecutive Focus ──────────────────────────────────
  // Each tier ADDS a new threshold rung on top of the previous ones, so
  // holding Focus rewards the player with stepped gains over time.
  // `bonus` = incremental qi/s mult added at THIS tier's threshold.
  // Even 2s spacing keeps every rung-up feeling rhythmic.
  // Cumulative table (T5 player, hold 10s):
  //   2s  → +5%   (T1)
  //   4s  → +12%  (T2: +7%)
  //   6s  → +25%  (T3: +13%)
  //   8s  → +40%  (T4: +15%)
  //  10s  → +60%  (T5: +20%, deep meditation visual)
  {
    id:          'consecutive_focus_t1',
    rarity:      'rare',
    name:        'Consecutive Focus',
    description: 'Hold Focus 2s → +5% qi/s.',
    kind:        'mechanic',
    mechanicId:  'consecutive_focus',
    tier:        1,
    holdMs:      2000,
    bonus:       0.05,
  },
  {
    id:          'consecutive_focus_t2',
    rarity:      'rare',
    name:        'Consecutive Focus',
    description: 'Adds: hold Focus 4s → +7% more qi/s (total +12%).',
    kind:        'mechanic',
    mechanicId:  'consecutive_focus',
    tier:        2,
    holdMs:      4000,
    bonus:       0.07,
  },
  {
    id:          'consecutive_focus_t3',
    rarity:      'rare',
    name:        'Consecutive Focus',
    description: 'Adds: hold Focus 6s → +13% more qi/s (total +25%).',
    kind:        'mechanic',
    mechanicId:  'consecutive_focus',
    tier:        3,
    holdMs:      6000,
    bonus:       0.13,
  },
  {
    id:          'consecutive_focus_t4',
    rarity:      'rare',
    name:        'Consecutive Focus',
    description: 'Adds: hold Focus 8s → +15% more qi/s (total +40%).',
    kind:        'mechanic',
    mechanicId:  'consecutive_focus',
    tier:        4,
    holdMs:      8000,
    bonus:       0.15,
  },
  {
    id:          'consecutive_focus_t5',
    rarity:      'rare',
    name:        'Consecutive Focus',
    description: 'Adds: hold Focus 10s → +20% more qi/s (total +60%) and enter deep meditation.',
    kind:        'mechanic',
    mechanicId:  'consecutive_focus',
    tier:        5,
    holdMs:      10000,
    bonus:       0.20,
    deepMeditation: true,
  },
];

export const QI_SPARK_BY_ID = Object.fromEntries(QI_SPARKS.map(s => [s.id, s]));

// ── Rarity config ───────────────────────────────────────────────────────────

export const SPARK_RARITY = {
  common:   { label: 'Common',   color: '#9ca3af' },
  uncommon: { label: 'Uncommon', color: '#4ade80' },
  rare:     { label: 'Rare',     color: '#a78bfa' },
};

// Per-card weights summed over the eligible pool. Rare tier (Phase 3) is
// empty until mechanic cards ship — its weight then contributes zero.
export const SPARK_RARITY_WEIGHTS = {
  common:   55,
  uncommon: 30,
  rare:     15,
};

// ── Drawing ─────────────────────────────────────────────────────────────────

/**
 * Build the eligible pool for an offer.
 *
 * Mechanic-card gating (Phase 3+):
 *   - Each `mechanicId` may have at most one active card. The eligible card
 *     for that mechanic is exactly tier (currentTier + 1).
 *   - currentTier 0 means "not yet drawn" → only T1 is eligible, AND its
 *     `unlockCheck` (if set) must pass via `isFeatureUnlocked`.
 *   - currentTier 5 → mechanic is capped, no more upgrades drawn.
 *
 * @param {object} ctx
 * @param {Array}  ctx.activeSparks       Current active sparks (instances).
 * @param {Function} ctx.isFeatureUnlocked  (featureId) → boolean.
 */
function eligiblePool({ activeSparks = [], isFeatureUnlocked } = {}) {
  // Build mechanicId → highest active tier from the active spark set.
  const tierByMechanic = new Map();
  for (const s of activeSparks) {
    const card = QI_SPARK_BY_ID[s.sparkId];
    if (card?.kind !== 'mechanic') continue;
    const prev = tierByMechanic.get(card.mechanicId) ?? 0;
    if (card.tier > prev) tierByMechanic.set(card.mechanicId, card.tier);
  }

  return QI_SPARKS.filter((card) => {
    if (card.kind !== 'mechanic') return true;
    const currentTier = tierByMechanic.get(card.mechanicId) ?? 0;
    if (currentTier >= 5) return false;          // capped
    if (card.tier !== currentTier + 1) return false;
    if (card.tier === 1 && card.unlockCheck) {
      return isFeatureUnlocked ? !!isFeatureUnlocked(card.unlockCheck) : false;
    }
    return true;
  });
}

/**
 * Draw `count` distinct sparks from the eligible pool, weighted by rarity.
 *
 * @param {number} count
 * @param {object} [ctx]  Forwarded to eligiblePool — required once mechanic
 *                        cards exist; defaults are safe for plain rarity rolls.
 */
export function drawOffer(count = 2, ctx = {}) {
  const pool = eligiblePool(ctx);
  if (pool.length === 0) return [];

  const picked = [];
  const remaining = [...pool];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const total = remaining.reduce((s, c) => s + (SPARK_RARITY_WEIGHTS[c.rarity] ?? 0), 0);
    if (total <= 0) break;
    let r = Math.random() * total;
    let chosenIdx = -1;
    for (let j = 0; j < remaining.length; j++) {
      r -= SPARK_RARITY_WEIGHTS[remaining[j].rarity] ?? 0;
      if (r <= 0) { chosenIdx = j; break; }
    }
    if (chosenIdx < 0) chosenIdx = remaining.length - 1;
    picked.push(remaining[chosenIdx].id);
    remaining.splice(chosenIdx, 1);
  }

  return picked;
}
