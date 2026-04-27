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
  // TODO Phase 1B — `painless_ascension` and `lingering_focus` need deeper
  // integration with useCultivation tick (qi-drain interception; focus-release
  // transition tracking). Held back from the launch pool until then.
  {
    id:          'echo_of_insight',
    rarity:      'common',
    name:        'Echo of Insight',
    description: '+5% qi/s for the next 3 layer breakthroughs.',
    kind:        'event_count',
    breakthroughs: 3,
    effect:      { type: 'qi_mult', value: 0.05 },
  },
];

export const QI_SPARK_BY_ID = Object.fromEntries(QI_SPARKS.map(s => [s.id, s]));

// ── Rarity config ───────────────────────────────────────────────────────────

export const SPARK_RARITY = {
  common:   { label: 'Common',   color: '#9ca3af' },
  uncommon: { label: 'Uncommon', color: '#4ade80' },
  rare:     { label: 'Rare',     color: '#a78bfa' },
};

// Phase 1: only common cards exist. Weights effective even if other tiers
// are added later — empty pools simply contribute zero.
export const SPARK_RARITY_WEIGHTS = {
  common:   55,
  uncommon: 30,
  rare:     15,
};

// ── Drawing ─────────────────────────────────────────────────────────────────

/**
 * Build the eligible pool for an offer. Phase 1 has no gating beyond rarity
 * existence; later phases will filter by mechanic-unlock state.
 */
function eligiblePool() {
  return QI_SPARKS;
}

/**
 * Draw `count` distinct sparks from the eligible pool, weighted by rarity.
 */
export function drawOffer(count = 2) {
  const pool = eligiblePool();
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
