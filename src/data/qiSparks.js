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

import { mergeRecordArray } from './config/loader';

const QI_SPARKS_RAW = [
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
  // RETIRED — Cookie-Clicker pivot (v1 Polish P2b). Breakthroughs no longer
  // drain qi balance, so this spark would be a no-op. Removing from the
  // offer pool prevents new instances; existing pending/active sparks of
  // this id continue to consume gracefully via the `mai:painless-consumed`
  // event listener in useCultivation.
  // {
  //   id:          'painless_ascension',
  //   rarity:      'common',
  //   name:        'Painless Ascension',
  //   description: 'Your next breakthrough costs no qi — the full amount carries into the next realm.',
  //   kind:        'next_breakthrough_flag',
  //   flag:        'painless_breakthrough',
  // },
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
  // RETIRED from spark draw pool (Round 3 — Crystal Discovery).
  // Granted via crystal-tier evolution + upgrade-shop purchases instead.
  // `retired: true` flag is read by eligiblePool() to filter from offers
  // but does NOT delete the data — `qiSparks.grant(id)` and `useQiSparks`
  // mechanic accounting still resolve these card definitions normally.
  {
    id:          'crystal_click_t1',
    rarity:      'rare',
    retired:     true,
    name:        'Crystal Reservoir',
    description: 'The crystal stockpiles 30% of your qi/s (up to 3 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        1,
    unlockCheck: 'qi_crystal',
    rate:        0.30,
    capMinutes:  3,
  },
  {
    id:          'crystal_click_t2',
    rarity:      'rare',
    retired:     true,
    name:        'Crystal Reservoir',
    description: 'Upgrades to 50% of your qi/s (up to 4 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        2,
    rate:        0.50,
    capMinutes:  4,
  },
  {
    id:          'crystal_click_t3',
    rarity:      'rare',
    retired:     true,
    name:        'Crystal Reservoir',
    description: 'Upgrades to 70% of your qi/s (up to 5 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        3,
    rate:        0.70,
    capMinutes:  5,
  },
  {
    id:          'crystal_click_t4',
    rarity:      'rare',
    retired:     true,
    name:        'Crystal Reservoir',
    description: 'Upgrades to 85% of your qi/s (up to 7 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        4,
    rate:        0.85,
    capMinutes:  7,
  },
  {
    id:          'crystal_click_t5',
    rarity:      'rare',
    retired:     true,
    name:        'Crystal Reservoir',
    description: 'Full rate: 100% of your qi/s (up to 10 min). Tap the crystal to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        5,
    rate:        1.00,
    capMinutes:  10,
  },

  // ── Rare — Mechanic: Divine Qi ─────────────────────────────────────────
  // A golden orb manifests in the scene at random intervals. Tap it before
  // it fades to collect a burst of qi. Higher tiers shorten the interval,
  // widen the tap window, and increase the burst. T5 spawns a second orb
  // simultaneously; collecting both also grants a short qi/s rate buff.
  {
    id:              'divine_qi_t1',
    rarity:          'rare',
    retired:         true,
    name:            'Divine Qi',
    description:     'A golden orb appears every ~3 min. Tap it within 8s for 20s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            1,
    spawnIntervalMs: 180_000,
    windowMs:        8_000,
    burstSeconds:    20,
  },
  {
    id:              'divine_qi_t2',
    rarity:          'rare',
    retired:         true,
    name:            'Divine Qi',
    description:     'Orb every ~2.5 min, 10s window. Tap for 25s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            2,
    spawnIntervalMs: 150_000,
    windowMs:        10_000,
    burstSeconds:    25,
  },
  {
    id:              'divine_qi_t3',
    rarity:          'rare',
    retired:         true,
    name:            'Divine Qi',
    description:     'Orb every ~2 min, 12s window. Tap for 30s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            3,
    spawnIntervalMs: 120_000,
    windowMs:        12_000,
    burstSeconds:    30,
  },
  {
    id:              'divine_qi_t4',
    rarity:          'rare',
    retired:         true,
    name:            'Divine Qi',
    description:     'Orb every ~90s, 15s window. Tap for 35s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            4,
    spawnIntervalMs: 90_000,
    windowMs:        15_000,
    burstSeconds:    35,
  },
  {
    id:              'divine_qi_t5',
    rarity:          'rare',
    retired:         true,
    name:            'Divine Qi',
    description:     'Two orbs every ~60s. Collect both for 40s qi + ×1.25 qi/s for 20s.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            5,
    spawnIntervalMs: 60_000,
    windowMs:        15_000,
    burstSeconds:    40,
    doubleOrb:       true,
    rateMult:        1.25,
    rateBuffMs:      20_000,
  },

  // ── Rare — Mechanic: Tracing Meridians (id stays `pattern_click`) ─────
  // A spark prompt appears in the scene; tap it within `promptWindowMs` to
  // open the dot challenge, or ignore it to let it pass (no penalty). Once
  // opened, tap the numbered dots in order before `windowMs` runs out for a
  // qi burst. Higher tiers add more dots, shorten the spawn interval, and
  // widen both windows. T5 doubles the burst on full clear and grants a
  // short qi/s rate buff.
  {
    id:              'pattern_click_t1',
    rarity:          'rare',
    retired:         true,
    name:            'Tracing Meridians',
    description:     'A pattern spark appears every ~2 min. Tap to begin: 3 dots, 10s to clear for 20s of qi.',
    kind:            'mechanic',
    mechanicId:      'pattern_click',
    tier:            1,
    dotCount:        3,
    spawnIntervalMs: 120_000,
    promptWindowMs:  6_000,
    windowMs:        10_000,
    burstSeconds:    20,
  },
  {
    id:              'pattern_click_t2',
    rarity:          'rare',
    retired:         true,
    name:            'Tracing Meridians',
    description:     'Spark every ~100s. 4 dots, 12s window. Full clear: 25s of qi.',
    kind:            'mechanic',
    mechanicId:      'pattern_click',
    tier:            2,
    dotCount:        4,
    spawnIntervalMs: 100_000,
    promptWindowMs:  6_000,
    windowMs:        12_000,
    burstSeconds:    25,
  },
  {
    id:              'pattern_click_t3',
    rarity:          'rare',
    retired:         true,
    name:            'Tracing Meridians',
    description:     'Spark every ~80s. 5 dots, 14s window. Full clear: 30s of qi.',
    kind:            'mechanic',
    mechanicId:      'pattern_click',
    tier:            3,
    dotCount:        5,
    spawnIntervalMs: 80_000,
    promptWindowMs:  6_000,
    windowMs:        14_000,
    burstSeconds:    30,
  },
  {
    id:              'pattern_click_t4',
    rarity:          'rare',
    retired:         true,
    name:            'Tracing Meridians',
    description:     'Spark every ~60s. 6 dots, 16s window. Full clear: 40s of qi.',
    kind:            'mechanic',
    mechanicId:      'pattern_click',
    tier:            4,
    dotCount:        6,
    spawnIntervalMs: 60_000,
    promptWindowMs:  6_000,
    windowMs:        16_000,
    burstSeconds:    40,
  },
  {
    id:              'pattern_click_t5',
    rarity:          'rare',
    retired:         true,
    name:            'Tracing Meridians',
    description:     'Spark every ~45s. 7 dots, 18s window. Full clear: 60s of qi + ×1.5 qi/s for 10s.',
    kind:            'mechanic',
    mechanicId:      'pattern_click',
    tier:            5,
    dotCount:        7,
    spawnIntervalMs: 45_000,
    promptWindowMs:  6_000,
    windowMs:        18_000,
    burstSeconds:    60,
    doubleOnFullClear: true,
    rateMult:        1.5,
    rateBuffMs:      10_000,
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
    retired:     true,
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
    retired:     true,
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
    retired:     true,
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
    retired:     true,
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
    retired:     true,
    name:        'Consecutive Focus',
    description: 'Adds: hold Focus 10s → +20% more qi/s (total +60%) and enter deep meditation.',
    kind:        'mechanic',
    mechanicId:  'consecutive_focus',
    tier:        5,
    holdMs:      10000,
    bonus:       0.20,
    deepMeditation: true,
  },

  // ── Legendary — producer-synergy sparks ───────────────────────────────
  // Read the player's producer composition and apply effects that intertwine
  // two or more producers. Gated by `requiresProducers` against
  // `producers.isUnlocked(...)` so a card can never be drawn before its
  // referenced producers are unlockable.
  //
  // Effect-type vocabulary (resolved in useQiSparks.recomputeRefs +
  // useProducers.getRate per-producer multiplier callback):
  //   producer_pair_synergy        — min(A,B) pairs each add (mult-1) to BOTH producers' per-producer mult
  //   producer_pair_global_mult    — min(A,B) pairs each add (mult-1) to GLOBAL qi/s mult
  //   producer_count_mult          — producer A per-mult = 1 + count(B) × perEach
  //   producer_count_threshold_mult — if count(B) >= threshold, producer A per-mult = mult
  //   producer_self_mult           — flat per-mult on a single producer
  //   phoenix_reborn               — on major breakthrough: phoenix count → 0, all other producers' permanent mult ×2

  // ── A. Bidirectional pair synergies ──────────────────────────────────
  {
    id:                'legendary_a1_smoke_petal',
    rarity:            'legendary',
    name:              'Smoke and Petal',
    description:       'Each Spirit Herb Garden + Meridian Furnace pair multiplies both ×2. The garden\'s jade leaves curl in the furnace smoke and bloom twice as fast; the furnace tastes the spirit-herb breath and burns hotter.',
    kind:              'permanent',
    requiresProducers: ['p_herb_garden', 'p_meridian_furnace'],
    effect: { type: 'producer_pair_synergy', producerA: 'p_herb_garden', producerB: 'p_meridian_furnace', mult: 2 },
  },
  {
    id:                'legendary_a2_hall_ten_thousand',
    rarity:            'legendary',
    name:              'Hall of Ten Thousand',
    description:       'Each Body Tempering Disciple + Mortal Sect Follower pair multiplies both ×2.5. A single disciple becomes a focal point; ten thousand pilgrims bow toward them.',
    kind:              'permanent',
    requiresProducers: ['p_disciple', 'p_sect_followers'],
    effect: { type: 'producer_pair_synergy', producerA: 'p_disciple', producerB: 'p_sect_followers', mult: 2.5 },
  },
  {
    id:                'legendary_a3_pearl_pendant',
    rarity:            'legendary',
    name:              'The Pearl and the Pendant',
    description:       'Each Slumbering Spirit Dragon + Ancestral Treasure pair multiplies both ×3. The dragon\'s slumber-pearl recognises a relic carried by your ancestors — they were always going to find each other again.',
    kind:              'permanent',
    requiresProducers: ['p_dragon', 'p_treasure'],
    effect: { type: 'producer_pair_synergy', producerA: 'p_dragon', producerB: 'p_treasure', mult: 3 },
  },
  {
    id:                'legendary_a4_climbing_beasts',
    rarity:            'legendary',
    name:              'Climbing Beasts',
    description:       'Each Spirit Beast Pact + Heavenly Pillar pair adds +20% global qi/s. The tigers climb the pillar at midnight to drink directly. They don\'t tell the foxes. The foxes find out.',
    kind:              'permanent',
    requiresProducers: ['p_beast_pact', 'p_pillar'],
    effect: { type: 'producer_pair_global_mult', producerA: 'p_beast_pact', producerB: 'p_pillar', mult: 1.2 },
  },
  {
    id:                'legendary_a5_void_garden',
    rarity:            'legendary',
    name:              'Void Garden',
    description:       'Each Void Conduit + Spirit Herb Garden pair multiplies both ×4. The void\'s bleed carries seeds from another world; the garden devours them, blooms in colors no eye has named.',
    kind:              'permanent',
    requiresProducers: ['p_void', 'p_herb_garden'],
    effect: { type: 'producer_pair_synergy', producerA: 'p_void', producerB: 'p_herb_garden', mult: 4 },
  },
  {
    id:                'legendary_a6_phoenix_pillar',
    rarity:            'legendary',
    name:              'Phoenix and Pillar',
    description:       'Each Sovereign Phoenix + Heavenly Pillar pair multiplies both ×5. The Fenghuang lands only on a perch tall enough. Each pillar is one step closer to heaven.',
    kind:              'permanent',
    requiresProducers: ['p_phoenix', 'p_pillar'],
    effect: { type: 'producer_pair_synergy', producerA: 'p_phoenix', producerB: 'p_pillar', mult: 5 },
  },

  // ── B. Unidirectional ("per count of") ───────────────────────────────
  {
    id:                'legendary_b1_dragon_hoard',
    rarity:            'legendary',
    name:              "Dragon's Hoard",
    description:       'Slumbering Spirit Dragon +60% qi/s per Ancestral Treasure owned. The dragon\'s pearl is whatever you offered it. Every relic you\'ve kept, it has folded into itself.',
    kind:              'permanent',
    requiresProducers: ['p_dragon', 'p_treasure'],
    effect: { type: 'producer_count_mult', target: 'p_dragon', source: 'p_treasure', perEach: 0.6 },
  },
  {
    id:                'legendary_b3_beast_tribute',
    rarity:            'legendary',
    name:              'Beast Tribute',
    description:       'Spirit Beast Pact +25% qi/s per Spirit Herb Garden owned. Tigers eat the spirit herbs you grow. They return larger, faster, sharper.',
    kind:              'permanent',
    requiresProducers: ['p_beast_pact', 'p_herb_garden'],
    effect: { type: 'producer_count_mult', target: 'p_beast_pact', source: 'p_herb_garden', perEach: 0.25 },
  },
  {
    id:                'legendary_b4_furnace_sect',
    rarity:            'legendary',
    name:              'Furnace of the Sect',
    description:       'Meridian Furnace +8% qi/s per Body Tempering Disciple. Every apprentice\'s breath stokes the bronze legs a little brighter. The furnace was always a sect\'s effort.',
    kind:              'permanent',
    requiresProducers: ['p_meridian_furnace', 'p_disciple'],
    effect: { type: 'producer_count_mult', target: 'p_meridian_furnace', source: 'p_disciple', perEach: 0.08 },
  },
  {
    id:                'legendary_b5_heavens_bend',
    rarity:            'legendary',
    name:              'Heavens Bend Down',
    description:       'Heavenly Pillar ×3 qi/s if you own at least 1 Void Conduit. When reality is already torn, heaven stops resisting.',
    kind:              'permanent',
    requiresProducers: ['p_pillar', 'p_void'],
    effect: { type: 'producer_count_threshold_mult', target: 'p_pillar', source: 'p_void', threshold: 1, mult: 3 },
  },
  {
    id:                'legendary_b6_phoenix_garden',
    rarity:            'legendary',
    name:              "Phoenix's Garden",
    description:       'Sovereign Phoenix +10% qi/s per Spirit Herb Garden owned. Fenghuang nests only where the soil is medicine. A hundred gardens, a hundred reasons to stay.',
    kind:              'permanent',
    requiresProducers: ['p_phoenix', 'p_herb_garden'],
    effect: { type: 'producer_count_mult', target: 'p_phoenix', source: 'p_herb_garden', perEach: 0.1 },
  },

  // ── E. Temporal / rhythm ─────────────────────────────────────────────
  {
    id:                'legendary_e2_phoenix_reborn',
    rarity:            'legendary',
    name:              'Phoenix Reborn',
    description:       'Every realm breakthrough resets your Phoenix count to 0 but permanently doubles every other producer\'s qi/s for this run. Fenghuang is reborn from its own ashes — to bless the sect of its hearth.',
    kind:              'permanent',
    requiresProducers: ['p_phoenix'],
    effect: { type: 'phoenix_reborn' },
  },

  // ── F. The Three Beasts — set bonus chase ────────────────────────────
  // Each card individually buffs its creature ×3. The rate calc separately
  // checks "are all three of these spark ids active?" — if so, applies a
  // +500% global multiplier (Trinity Convergence). The trinity bonus is
  // hard-coded in useCultivation; the cards just need their ids stable.
  {
    id:                'legendary_f1_storm_tiger',
    rarity:            'legendary',
    name:              'Storm-Furred Tiger',
    description:       'Spirit Beast Pact ×3 qi/s. The tiger paces, ears flat. It will not roar until a dragon dreams its name and a phoenix sings it back. Until then, the storm in its fur only mutters.',
    kind:              'permanent',
    requiresProducers: ['p_beast_pact'],
    trinityPiece:      true,
    effect: { type: 'producer_self_mult', target: 'p_beast_pact', mult: 3 },
  },
  {
    id:                'legendary_f2_pearl_dragon',
    rarity:            'legendary',
    name:              'Pearl-Dream Dragon',
    description:       'Slumbering Spirit Dragon ×3 qi/s. The pearl warms when the dragon hears two distant sounds — a tiger pacing, a phoenix folding its rainbow wings. Only then does the dream finish.',
    kind:              'permanent',
    requiresProducers: ['p_dragon'],
    trinityPiece:      true,
    effect: { type: 'producer_self_mult', target: 'p_dragon', mult: 3 },
  },
  {
    id:                'legendary_f3_rainbow_phoenix',
    rarity:            'legendary',
    name:              'Rainbow-Cry Phoenix',
    description:       'Sovereign Phoenix ×3 qi/s. The Fenghuang\'s cry has three notes. Alone it sings one — somewhere a tiger paces, somewhere a dragon dreams. When all three sound, the heavens bend down.',
    kind:              'permanent',
    requiresProducers: ['p_phoenix'],
    trinityPiece:      true,
    effect: { type: 'producer_self_mult', target: 'p_phoenix', mult: 3 },
  },
];

// The three trinity-piece spark ids. Rate calc imports this to check
// whether all three are active simultaneously (Trinity Convergence:
// +500% global qi/s). Kept here so the canonical list lives next to the
// card definitions.
export const TRINITY_SPARK_IDS = Object.freeze([
  'legendary_f1_storm_tiger',
  'legendary_f2_pearl_dragon',
  'legendary_f3_rainbow_phoenix',
]);
export const TRINITY_CONVERGENCE_MULT = 6; // +500% means × 6 global

export const QI_SPARKS = mergeRecordArray(QI_SPARKS_RAW, 'qiSparks', 'id');

export const QI_SPARK_BY_ID = Object.fromEntries(QI_SPARKS.map(s => [s.id, s]));

// ── Rarity config ───────────────────────────────────────────────────────────

export const SPARK_RARITY = {
  common:    { label: 'Common',    color: '#9ca3af' },
  uncommon:  { label: 'Uncommon',  color: '#4ade80' },
  rare:      { label: 'Rare',      color: '#a78bfa' },
  legendary: { label: 'Legendary', color: '#ffd66b' },
};

// Per-card weights summed over the eligible NON-LEGENDARY pool. Rare tier
// was the mechanic-unlock pool (Crystal Reservoir, Divine Qi, Pattern Click,
// Consecutive Focus). Round 3 moved mechanic discovery to crystal evolution
// and tier upgrades to the qi shop — see `crystalMechanicGrants.js` and the
// `mechanic_tier` category in `data/upgrades.js`. Weight is 0 so future rare
// additions still slot in if you re-introduce a rare card.
//
// Legendary tier — producer-synergy sparks — does NOT use this table. Each
// card slot rolls independently for legendary at LEGENDARY_PER_CARD_CHANCE;
// only on failure does the slot fall through to the weighted pool below.
// Keeps the legendary surface rate stable regardless of how many legendaries
// happen to be eligible at the current realm.
export const SPARK_RARITY_WEIGHTS = {
  common:    65,
  uncommon:  35,
  rare:      0,
  legendary: 0,
};

/** Per-card-slot chance of a legendary appearing. Tuned for ~3 legendaries
 *  per full run (50 breakthroughs × 2 cards = 100 slots → ~3 expected).
 *  Pity counter (17 breakthroughs without a legendary → next breakthrough
 *  guaranteed) sets the floor at 3 per run for the most unlucky player. */
export const LEGENDARY_PER_CARD_CHANCE = 0.03;
/** Pity threshold: this many breakthroughs without a legendary appearing
 *  in any offer slot → next breakthrough's offer guarantees one slot is
 *  legendary. Counter resets to 0 whenever a legendary appears in an offer
 *  (drawn OR rerolled into view), even if the player doesn't pick it. */
export const LEGENDARY_PITY_THRESHOLD = 17;

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
 * Producer-synergy gating (Legendary tier):
 *   - Cards with `requiresProducers: ['p_id', ...]` are filtered out unless
 *     every referenced producer is currently unlocked. The check delegates
 *     to a `producerUnlocked(id) → bool` callback so we don't import
 *     useProducers into a data file. App.jsx binds this callback to
 *     `producers.isUnlocked`.
 *   - Cards already active for this run are filtered out so a legendary
 *     can't be re-drawn (no double-stacking the same producer-synergy
 *     effect).
 *
 * @param {object} ctx
 * @param {Array}  ctx.activeSparks       Current active sparks (instances).
 * @param {Function} ctx.isFeatureUnlocked  (featureId) → boolean.
 * @param {Function} [ctx.producerUnlocked] (producerId) → boolean. If omitted,
 *                                          producer-gated cards are filtered
 *                                          out conservatively.
 */
function eligiblePool({ activeSparks = [], isFeatureUnlocked, producerUnlocked } = {}) {
  // Build mechanicId → highest active tier from the active spark set.
  const tierByMechanic = new Map();
  // Track already-active spark ids so legendary cards don't re-draw.
  const activeSparkIds = new Set();
  for (const s of activeSparks) {
    activeSparkIds.add(s.sparkId);
    const card = QI_SPARK_BY_ID[s.sparkId];
    if (card?.kind !== 'mechanic') continue;
    const prev = tierByMechanic.get(card.mechanicId) ?? 0;
    if (card.tier > prev) tierByMechanic.set(card.mechanicId, card.tier);
  }

  return QI_SPARKS.filter((card) => {
    // Round 3 — retired cards (mechanic-tier sparks) never appear in the
    // random offer pool. They're still resolvable via QI_SPARK_BY_ID for
    // crystal-evolution grants and shop upgrades.
    if (card.retired) return false;
    // Producer-synergy gating — every required producer must be unlocked.
    if (card.requiresProducers?.length) {
      if (!producerUnlocked) return false; // conservative: no callback → drop
      for (const pid of card.requiresProducers) {
        if (!producerUnlocked(pid)) return false;
      }
    }
    // Legendary sparks don't re-draw if already active.
    if (card.rarity === 'legendary' && activeSparkIds.has(card.id)) return false;
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
 * Pick a single random non-legendary card by rarity weight from an array.
 * Returns the chosen card, or null if the array is empty / all-zero-weight.
 */
function pickWeightedNonLegendary(cards) {
  if (cards.length === 0) return null;
  const total = cards.reduce((s, c) => s + (SPARK_RARITY_WEIGHTS[c.rarity] ?? 0), 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (let j = 0; j < cards.length; j++) {
    r -= SPARK_RARITY_WEIGHTS[cards[j].rarity] ?? 0;
    if (r <= 0) return cards[j];
  }
  return cards[cards.length - 1];
}

/**
 * Roll a single card slot. Each slot independently rolls for legendary at
 * LEGENDARY_PER_CARD_CHANCE — on success, pick a random eligible legendary;
 * on failure, fall through to the weighted non-legendary pool.
 *
 * @param {object} pool        Eligible pool (output of eligiblePool).
 * @param {Set} excludeIds     Card ids already drawn this offer (no duplicates).
 * @param {boolean} forceLegendary  If true, skip the chance roll and pick legendary.
 * @returns {string|null} Card id, or null if no eligible card.
 */
function rollSingleSlot(pool, excludeIds, forceLegendary) {
  const available = pool.filter(c => !excludeIds.has(c.id));
  const legendaries    = available.filter(c => c.rarity === 'legendary');
  const nonLegendaries = available.filter(c => c.rarity !== 'legendary');

  const shouldRollLegendary = forceLegendary
    ? true
    : Math.random() < LEGENDARY_PER_CARD_CHANCE;

  if (shouldRollLegendary && legendaries.length > 0) {
    const pick = legendaries[Math.floor(Math.random() * legendaries.length)];
    return pick.id;
  }

  const pick = pickWeightedNonLegendary(nonLegendaries);
  return pick ? pick.id : null;
}

/**
 * Draw `count` distinct sparks from the eligible pool. Each card slot
 * independently rolls for legendary (LEGENDARY_PER_CARD_CHANCE per slot).
 *
 * @param {number} count
 * @param {object} [ctx]                  Forwarded to eligiblePool.
 * @param {boolean} [ctx.forceLegendary]  If true, force the FIRST slot to be a legendary
 *                                        (pity counter trigger from useQiSparks).
 */
export function drawOffer(count = 2, ctx = {}) {
  const pool = eligiblePool(ctx);
  if (pool.length === 0) return [];

  const picked    = [];
  const usedIds   = new Set();
  for (let i = 0; i < count; i++) {
    const id = rollSingleSlot(pool, usedIds, i === 0 && !!ctx.forceLegendary);
    if (!id) break;
    picked.push(id);
    usedIds.add(id);
  }
  return picked;
}

/**
 * Draw a single replacement card — used by per-card rerolls. Caller passes
 * the ids of cards already in the offer (the other card + the one being
 * replaced) via `excludeIds` so the new draw never duplicates them.
 */
export function drawSingleCard(ctx = {}, excludeIds = []) {
  const pool = eligiblePool(ctx);
  if (pool.length === 0) return null;
  const exclude = new Set(excludeIds);
  return rollSingleSlot(pool, exclude, !!ctx.forceLegendary);
}
