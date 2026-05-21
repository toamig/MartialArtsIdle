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
  // 2026-05-21 Dial-4.1: per-stack values cut for both. With 65/35 rarity
  // weights players accumulate 3-5 stacks of any given uncommon over a run
  // and these two compound especially hard (offline pile-up + per-BT growth).
  {
    id:          'heavens_bond',
    rarity:      'uncommon',
    name:        "Heaven's Bond",
    description: '+5% offline qi accrual for the rest of this run. Stacks.',
    kind:        'permanent',
    effect:      { type: 'offline_qi_mult_per_stack', value: 0.05 },
  },
  {
    id:          'resonant_soul',
    rarity:      'uncommon',
    name:        'Resonant Soul',
    description: '+0.3% qi/s for every layer breakthrough you reach this run. Stacks.',
    kind:        'permanent',
    effect:      { type: 'qi_mult_per_breakthrough_per_stack', value: 0.003 },
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
    description: 'The crystal stockpiles 30% of your qi/s (up to 2 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        1,
    unlockCheck: 'qi_crystal',
    rate:        0.30,
    capMinutes:  2,
  },
  {
    id:          'crystal_click_t2',
    rarity:      'rare',
    retired:     true,
    name:        'Crystal Reservoir',
    description: 'Upgrades to 50% of your qi/s (up to 3 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        2,
    rate:        0.50,
    capMinutes:  3,
  },
  {
    id:          'crystal_click_t3',
    rarity:      'rare',
    retired:     true,
    name:        'Crystal Reservoir',
    description: 'Upgrades to 70% of your qi/s (up to 4 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        3,
    rate:        0.70,
    capMinutes:  4,
  },
  {
    id:          'crystal_click_t4',
    rarity:      'rare',
    retired:     true,
    name:        'Crystal Reservoir',
    description: 'Upgrades to 85% of your qi/s (up to 5 min). Tap to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        4,
    rate:        0.85,
    capMinutes:  5,
  },
  {
    id:          'crystal_click_t5',
    rarity:      'rare',
    retired:     true,
    name:        'Crystal Reservoir',
    description: 'Full rate: 100% of your qi/s (up to 6 min). Tap the crystal to collect.',
    kind:        'mechanic',
    mechanicId:  'crystal_click',
    tier:        5,
    rate:        1.00,
    capMinutes:  6,
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
    description:     'A golden orb appears every ~3 min. Tap it within 8s for 12s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            1,
    spawnIntervalMs: 180_000,
    windowMs:        8_000,
    burstSeconds:    12,
  },
  {
    id:              'divine_qi_t2',
    rarity:          'rare',
    retired:         true,
    name:            'Divine Qi',
    description:     'Orb every ~2.5 min, 10s window. Tap for 16s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            2,
    spawnIntervalMs: 150_000,
    windowMs:        10_000,
    burstSeconds:    16,
  },
  {
    id:              'divine_qi_t3',
    rarity:          'rare',
    retired:         true,
    name:            'Divine Qi',
    description:     'Orb every ~2 min, 12s window. Tap for 20s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            3,
    spawnIntervalMs: 120_000,
    windowMs:        12_000,
    burstSeconds:    20,
  },
  {
    id:              'divine_qi_t4',
    rarity:          'rare',
    retired:         true,
    name:            'Divine Qi',
    description:     'Orb every ~90s, 15s window. Tap for 22s of qi.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            4,
    spawnIntervalMs: 90_000,
    windowMs:        15_000,
    burstSeconds:    22,
  },
  {
    id:              'divine_qi_t5',
    rarity:          'rare',
    retired:         true,
    name:            'Divine Qi',
    description:     'Two orbs every ~60s. Collect both for 25s qi + ×1.15 qi/s for 15s.',
    kind:            'mechanic',
    mechanicId:      'divine_qi',
    tier:            5,
    spawnIntervalMs: 60_000,
    windowMs:        15_000,
    burstSeconds:    25,
    doubleOrb:       true,
    rateMult:        1.15,
    rateBuffMs:      15_000,
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
    description:     'A pattern spark appears every ~2 min. Tap to begin: 3 dots, 10s to clear for 12s of qi.',
    kind:            'mechanic',
    mechanicId:      'pattern_click',
    tier:            1,
    dotCount:        3,
    spawnIntervalMs: 120_000,
    promptWindowMs:  6_000,
    windowMs:        10_000,
    burstSeconds:    12,
  },
  {
    id:              'pattern_click_t2',
    rarity:          'rare',
    retired:         true,
    name:            'Tracing Meridians',
    description:     'Spark every ~100s. 4 dots, 12s window. Full clear: 16s of qi.',
    kind:            'mechanic',
    mechanicId:      'pattern_click',
    tier:            2,
    dotCount:        4,
    spawnIntervalMs: 100_000,
    promptWindowMs:  6_000,
    windowMs:        12_000,
    burstSeconds:    16,
  },
  {
    id:              'pattern_click_t3',
    rarity:          'rare',
    retired:         true,
    name:            'Tracing Meridians',
    description:     'Spark every ~80s. 5 dots, 14s window. Full clear: 20s of qi.',
    kind:            'mechanic',
    mechanicId:      'pattern_click',
    tier:            3,
    dotCount:        5,
    spawnIntervalMs: 80_000,
    promptWindowMs:  6_000,
    windowMs:        14_000,
    burstSeconds:    20,
  },
  {
    id:              'pattern_click_t4',
    rarity:          'rare',
    retired:         true,
    name:            'Tracing Meridians',
    description:     'Spark every ~60s. 6 dots, 16s window. Full clear: 25s of qi.',
    kind:            'mechanic',
    mechanicId:      'pattern_click',
    tier:            4,
    dotCount:        6,
    spawnIntervalMs: 60_000,
    promptWindowMs:  6_000,
    windowMs:        16_000,
    burstSeconds:    25,
  },
  {
    id:              'pattern_click_t5',
    rarity:          'rare',
    retired:         true,
    name:            'Tracing Meridians',
    description:     'Spark every ~45s. 7 dots, 18s window. Full clear: 35s of qi + ×1.25 qi/s for 8s.',
    kind:            'mechanic',
    mechanicId:      'pattern_click',
    tier:            5,
    dotCount:        7,
    spawnIntervalMs: 45_000,
    promptWindowMs:  6_000,
    windowMs:        18_000,
    burstSeconds:    35,
    doubleOnFullClear: true,
    rateMult:        1.25,
    rateBuffMs:      8_000,
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
  // 2026-05-21 Dial-4 legendary spark tuning — pair-synergy multipliers
  // halved across the board. With many sparks active these were stacking
  // multiplicatively to absurd totals (×2 × ×2.5 × ×3 × ×4 × ×5 = ×300+ from
  // pair synergies alone, on top of every other multiplier source).
  {
    id:                'legendary_a1_smoke_petal',
    rarity:            'legendary',
    name:              'Smoke and Petal',
    description:       'Each Spirit Herb Garden + Meridian Furnace pair multiplies both ×1.5. The garden\'s jade leaves curl in the furnace smoke and bloom faster; the furnace tastes the spirit-herb breath and burns hotter.',
    kind:              'permanent',
    requiresProducers: ['p_herb_garden', 'p_meridian_furnace'],
    effect: { type: 'producer_pair_synergy', producerA: 'p_herb_garden', producerB: 'p_meridian_furnace', mult: 1.5 },
  },
  {
    id:                'legendary_a2_hall_ten_thousand',
    rarity:            'legendary',
    name:              'Hall of Ten Thousand',
    description:       'Each Body Tempering Disciple + Mortal Sect Follower pair multiplies both ×1.75. A single disciple becomes a focal point; ten thousand pilgrims bow toward them.',
    kind:              'permanent',
    requiresProducers: ['p_disciple', 'p_sect_followers'],
    effect: { type: 'producer_pair_synergy', producerA: 'p_disciple', producerB: 'p_sect_followers', mult: 1.75 },
  },
  {
    id:                'legendary_a3_pearl_pendant',
    rarity:            'legendary',
    name:              'The Pearl and the Pendant',
    description:       'Each Slumbering Spirit Dragon + Ancestral Treasure pair multiplies both ×2. The dragon\'s slumber-pearl recognises a relic carried by your ancestors — they were always going to find each other again.',
    kind:              'permanent',
    requiresProducers: ['p_dragon', 'p_treasure'],
    effect: { type: 'producer_pair_synergy', producerA: 'p_dragon', producerB: 'p_treasure', mult: 2 },
  },
  {
    id:                'legendary_a4_climbing_beasts',
    rarity:            'legendary',
    name:              'Climbing Beasts',
    description:       'Each Spirit Beast Pact + Heavenly Pillar pair adds +10% global qi/s. The tigers climb the pillar at midnight to drink directly. They don\'t tell the foxes. The foxes find out.',
    kind:              'permanent',
    requiresProducers: ['p_beast_pact', 'p_pillar'],
    effect: { type: 'producer_pair_global_mult', producerA: 'p_beast_pact', producerB: 'p_pillar', mult: 1.1 },
  },
  {
    id:                'legendary_a5_void_garden',
    rarity:            'legendary',
    name:              'Void Garden',
    description:       'Each Void Conduit + Spirit Herb Garden pair multiplies both ×2.5. The void\'s bleed carries seeds from another world; the garden devours them, blooms in colors no eye has named.',
    kind:              'permanent',
    requiresProducers: ['p_void', 'p_herb_garden'],
    effect: { type: 'producer_pair_synergy', producerA: 'p_void', producerB: 'p_herb_garden', mult: 2.5 },
  },
  {
    id:                'legendary_a6_phoenix_pillar',
    rarity:            'legendary',
    name:              'Phoenix and Pillar',
    description:       'Each Sovereign Phoenix + Heavenly Pillar pair multiplies both ×3. The Fenghuang lands only on a perch tall enough. Each pillar is one step closer to heaven.',
    kind:              'permanent',
    requiresProducers: ['p_phoenix', 'p_pillar'],
    effect: { type: 'producer_pair_synergy', producerA: 'p_phoenix', producerB: 'p_pillar', mult: 3 },
  },

  // ── B. Unidirectional ("per count of") ───────────────────────────────
  // 2026-05-21 Dial-4 tuning — per-count multipliers cut ~40-60%. At 100+
  // owned of the source producer, the previous +60%/+25%/+10% values were
  // ballooning to ×60/×25/×10 effective on a single target producer.
  {
    id:                'legendary_b1_dragon_hoard',
    rarity:            'legendary',
    name:              "Dragon's Hoard",
    description:       'Slumbering Spirit Dragon +25% qi/s per Ancestral Treasure owned. The dragon\'s pearl is whatever you offered it. Every relic you\'ve kept, it has folded into itself.',
    kind:              'permanent',
    requiresProducers: ['p_dragon', 'p_treasure'],
    effect: { type: 'producer_count_mult', target: 'p_dragon', source: 'p_treasure', perEach: 0.25 },
  },
  {
    id:                'legendary_b3_beast_tribute',
    rarity:            'legendary',
    name:              'Beast Tribute',
    description:       'Spirit Beast Pact +12% qi/s per Spirit Herb Garden owned. Tigers eat the spirit herbs you grow. They return larger, faster, sharper.',
    kind:              'permanent',
    requiresProducers: ['p_beast_pact', 'p_herb_garden'],
    effect: { type: 'producer_count_mult', target: 'p_beast_pact', source: 'p_herb_garden', perEach: 0.12 },
  },
  {
    id:                'legendary_b4_furnace_sect',
    rarity:            'legendary',
    name:              'Furnace of the Sect',
    description:       'Meridian Furnace +4% qi/s per Body Tempering Disciple. Every apprentice\'s breath stokes the bronze legs a little brighter. The furnace was always a sect\'s effort.',
    kind:              'permanent',
    requiresProducers: ['p_meridian_furnace', 'p_disciple'],
    effect: { type: 'producer_count_mult', target: 'p_meridian_furnace', source: 'p_disciple', perEach: 0.04 },
  },
  {
    id:                'legendary_b5_heavens_bend',
    rarity:            'legendary',
    name:              'Heavens Bend Down',
    description:       'Heavenly Pillar ×2 qi/s if you own at least 1 Void Conduit. When reality is already torn, heaven stops resisting.',
    kind:              'permanent',
    requiresProducers: ['p_pillar', 'p_void'],
    effect: { type: 'producer_count_threshold_mult', target: 'p_pillar', source: 'p_void', threshold: 1, mult: 2 },
  },
  {
    id:                'legendary_b6_phoenix_garden',
    rarity:            'legendary',
    name:              "Phoenix's Garden",
    description:       'Sovereign Phoenix +5% qi/s per Spirit Herb Garden owned. Fenghuang nests only where the soil is medicine. A hundred gardens, a hundred reasons to stay.',
    kind:              'permanent',
    requiresProducers: ['p_phoenix', 'p_herb_garden'],
    effect: { type: 'producer_count_mult', target: 'p_phoenix', source: 'p_herb_garden', perEach: 0.05 },
  },

  // ── E. Temporal / rhythm ─────────────────────────────────────────────
  // 2026-05-21 Dial-4.1: ×2 exponential per major BT → +50% additive per
  // major BT (rate calc in useQiSparks.computeProducerSparkMult). Was
  // mathematically broken: 10 majors → ×1024 on every non-Phoenix producer.
  {
    id:                'legendary_e2_phoenix_reborn',
    rarity:            'legendary',
    name:              'Phoenix Reborn',
    description:       'Every realm breakthrough resets your Phoenix count to 0 but permanently adds +50% to every other producer\'s qi/s for this run. Fenghuang is reborn from its own ashes — to bless the sect of its hearth.',
    kind:              'permanent',
    requiresProducers: ['p_phoenix'],
    effect: { type: 'phoenix_reborn' },
  },

  // ── F. The Three Beasts — set bonus chase ────────────────────────────
  // 2026-05-21 Dial-4.1: individual ×3 → ×2, Trinity Convergence ×6 → ×2.
  // Pre-tune: each beast ×3 individually × ×6 Convergence = ×18 on all three
  // beasts simultaneously (game-breaking). Post-tune: ×2 × ×2 = ×4 — still
  // a coveted set bonus, no longer trivialising endgame.
  {
    id:                'legendary_f1_storm_tiger',
    rarity:            'legendary',
    name:              'Storm-Furred Tiger',
    description:       'Spirit Beast Pact ×2 qi/s. The tiger paces, ears flat. It will not roar until a dragon dreams its name and a phoenix sings it back. Until then, the storm in its fur only mutters.',
    kind:              'permanent',
    requiresProducers: ['p_beast_pact'],
    trinityPiece:      true,
    effect: { type: 'producer_self_mult', target: 'p_beast_pact', mult: 2 },
  },
  {
    id:                'legendary_f2_pearl_dragon',
    rarity:            'legendary',
    name:              'Pearl-Dream Dragon',
    description:       'Slumbering Spirit Dragon ×2 qi/s. The pearl warms when the dragon hears two distant sounds — a tiger pacing, a phoenix folding its rainbow wings. Only then does the dream finish.',
    kind:              'permanent',
    requiresProducers: ['p_dragon'],
    trinityPiece:      true,
    effect: { type: 'producer_self_mult', target: 'p_dragon', mult: 2 },
  },
  {
    id:                'legendary_f3_rainbow_phoenix',
    rarity:            'legendary',
    name:              'Rainbow-Cry Phoenix',
    description:       'Sovereign Phoenix ×2 qi/s. The Fenghuang\'s cry has three notes. Alone it sings one — somewhere a tiger paces, somewhere a dragon dreams. When all three sound, the heavens bend down.',
    kind:              'permanent',
    requiresProducers: ['p_phoenix'],
    trinityPiece:      true,
    effect: { type: 'producer_self_mult', target: 'p_phoenix', mult: 2 },
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
// 2026-05-21 Dial-4.1: 6 → 2 (was +500%, now +100%). Combined with individual
// ×2 → ×3, the trinity ceiling drops from ×18 to ×6 on the three beasts.
export const TRINITY_CONVERGENCE_MULT = 2;

export const QI_SPARKS = mergeRecordArray(QI_SPARKS_RAW, 'qiSparks', 'id');

export const QI_SPARK_BY_ID = Object.fromEntries(QI_SPARKS.map(s => [s.id, s]));

// ── Display copy + icons — used by QiSparkChoiceModal ───────────────────────
//
// Plain-English game copy split into three views:
//   `effectText`  — short summary shown ON the card (used in-place of `description`)
//   `exampleText` — concrete numerical example shown in the detail panel
//                   (HTML allowed for <strong>)
//   `loreText`    — flavor quote shown italicised in the detail panel
//   `icon`        — sprite path for legendary cards (producer mythic art),
//                   or a single-char emoji for common/uncommon
//
// Falls back gracefully: a card with no SPARK_COPY entry still renders using
// the existing `description` field — old common/uncommon designs aren't broken
// if anything slips through. New design treats this map as canonical.
const PROD_SPRITE = (id) => `/sprites/producers/${id}_mythic.png`;
export const SPARK_COPY = {
  // ── Common ─────────────────────────────────────────────────────────────
  quick_burst: {
    icon: '⚡',
    effectText: 'Gain a burst of qi worth **30 seconds** of your current qi/s, instantly.',
    exampleText: 'If your qi/s is currently <strong>1.2M</strong>, picking this spark adds <strong>36M qi</strong> to your balance.',
    loreText: 'A breath drawn quick — and the world tilts toward you.',
  },
  surging_stream: {
    icon: '🌊',
    effectText: 'Your qi/s is boosted by **+50%** for the next 30 seconds.',
    exampleText: 'At <strong>1M qi/s</strong> baseline, this temporarily raises you to <strong>1.5M qi/s</strong> for half a minute.',
    loreText: 'The current rises. The river forgets its banks.',
  },
  steady_stream: {
    icon: '💧',
    effectText: 'Your qi/s is boosted by **+20%** for the next full minute.',
    exampleText: 'A steady +20% for 60 seconds gives you roughly <strong>12 seconds of bonus production</strong>.',
    loreText: 'Slow flame. Long burn. The mountain wears down the rain.',
  },
  inner_calm: {
    icon: '🧘',
    effectText: 'Your qi/s is boosted by **+10%** until your next layer breakthrough.',
    exampleText: 'Best used right before a long sub-stage push — the boost lasts the entire climb.',
    loreText: 'The mind quiets, and the world tells its secrets.',
  },
  focus_surge: {
    icon: '🎯',
    effectText: 'Your **Focus multiplier** is increased by +30% for the next minute. Only matters while you hold Focus.',
    exampleText: 'If Focus normally gives ×3.0, this boosts it to <strong>×3.9</strong> for 60 seconds. Hold Focus for full value.',
    loreText: 'When the breath sharpens, the dao listens harder.',
  },
  lingering_focus: {
    icon: '🪷',
    effectText: 'For the next 60 seconds, releasing Focus doesn\'t immediately end the boost — your qi/s continues at **half-Focus** for 5 seconds after each release.',
    exampleText: 'Tap-and-release Focus rapidly during the 60s window — the residual 5-second tail covers idle moments without holding.',
    loreText: 'Even after the breath releases, the meridians remember.',
  },
  echo_of_insight: {
    icon: '✨',
    effectText: 'Your qi/s is boosted by **+5%** for your next **3 layer breakthroughs**, then expires.',
    exampleText: 'If you cross layers quickly, this can persist for most of a sub-realm push — a small but reliable tailwind.',
    loreText: 'One realisation echoes through three lifetimes.',
  },

  // ── Uncommon ───────────────────────────────────────────────────────────
  steady_cultivation: {
    icon: '🌱',
    effectText: 'Permanently gain **+1 base qi/s** for the rest of this run. Stacks if drawn again.',
    exampleText: 'Drawn three times → <strong>+3 base qi/s</strong>. This flat bonus is then multiplied by crystal, focus, law, and other multipliers — endgame impact can be huge.',
    loreText: 'One breath at dawn, one at dusk. The thousandth breath is the same as the first, and that is the whole secret.',
  },
  sharper_focus: {
    icon: '🔍',
    effectText: 'Permanently adds **+5%** to your Focus multiplier for the rest of this run. Stacks if drawn again.',
    exampleText: 'Three stacks → Focus is <strong>+15% stronger</strong>. Especially powerful if you Focus often.',
    loreText: 'The blade is sharpened on the same stone, every morning.',
  },
  enduring_stream: {
    icon: '🏞️',
    effectText: 'Permanently boosts your qi/s by **+2%** for the rest of this run. Stacks if drawn again.',
    exampleText: 'Five stacks compounds to roughly <strong>+10% total qi/s</strong>. Small but reliable, never expires.',
    loreText: 'The river that never stops becomes the sea.',
  },
  patience_of_stone: {
    icon: '🗿',
    effectText: 'Reduces your major-realm qi/s gate requirement by **5%** for the rest of this run. Stacks (up to 80% reduction).',
    exampleText: 'Useful for breaking through walls — five stacks shaves <strong>25% off every major gate</strong>.',
    loreText: 'The stone weathers, but it does not hurry.',
  },
  heavens_bond: {
    icon: '☁️',
    effectText: 'Permanently increases your offline qi gain rate by **+5%** for the rest of this run. Stacks if drawn again.',
    exampleText: 'Base offline rate is 20%. Three stacks → <strong>35% offline rate</strong> — your sect cultivates harder while you sleep.',
    loreText: 'The heavens do not require your attention. Only your alignment.',
  },
  resonant_soul: {
    icon: '🔔',
    effectText: 'Permanently gain **+0.3% qi/s** for each layer breakthrough you reach AFTER drawing this spark. Stacks if drawn again.',
    exampleText: 'After 50 breakthroughs with this active, one stack gives <strong>+15% qi/s</strong>. Draw early for biggest payoff.',
    loreText: 'Every breakthrough leaves a tone. The soul gathers them like bells in a temple.',
  },

  // ── Legendary — Pair synergies (A) ─────────────────────────────────────
  // 2026-05-21 Dial-4 / 4.1: pair-synergy values updated to match the
  // post-tuning multipliers in QI_SPARKS_RAW. Pre-tune values caused the
  // qi-firehose; these new figures are still legendary-tier but bounded.
  legendary_a1_smoke_petal: {
    icon: PROD_SPRITE('p_herb_garden'),
    effectText: 'Pair your **Spirit Herb Gardens** with **Meridian Furnaces**. Each pair multiplies BOTH producers by ×1.5.',
    exampleText: 'Own <strong>3 gardens + 5 furnaces</strong> → 3 pairs → each garden\'s AND each furnace\'s qi/s is multiplied by <strong>×2.5</strong> (1 + 3 × 0.5).',
    loreText: 'The garden\'s jade leaves curl in the furnace smoke and bloom faster; the furnace tastes the spirit-herb breath and burns hotter.',
  },
  legendary_a2_hall_ten_thousand: {
    icon: PROD_SPRITE('p_sect_followers'),
    effectText: 'Pair your **Body Tempering Disciples** with **Mortal Sect Followers**. Each pair multiplies BOTH producers by ×1.75.',
    exampleText: 'Own <strong>10 disciples + 4 sect followers</strong> → 4 pairs → each producer\'s qi/s is multiplied by <strong>×4</strong> (1 + 4 × 0.75).',
    loreText: 'A single disciple becomes a focal point; ten thousand pilgrims bow toward them. The pilgrim sees the disciple; the disciple feels the weight.',
  },
  legendary_a3_pearl_pendant: {
    icon: PROD_SPRITE('p_dragon'),
    effectText: 'Pair your **Slumbering Spirit Dragons** with **Ancestral Treasures**. Each pair multiplies BOTH producers by ×2.',
    exampleText: 'Own <strong>2 dragons + 5 treasures</strong> → 2 pairs → each producer\'s qi/s is multiplied by <strong>×3</strong> (1 + 2 × 1).',
    loreText: 'The dragon\'s slumber-pearl recognises a relic carried by your ancestors. They were never separated. They were always going to find each other again.',
  },
  legendary_a4_climbing_beasts: {
    icon: PROD_SPRITE('p_beast_pact'),
    effectText: 'Each **Spirit Beast Pact + Heavenly Pillar** pair adds **+10% global qi/s**. Affects EVERYTHING you produce.',
    exampleText: 'Own <strong>5 beast pacts + 8 pillars</strong> → 5 pairs → <strong>+50% global qi/s</strong> on ALL your production.',
    loreText: 'The tigers climb the heavenly pillar at midnight to drink directly. They don\'t tell the foxes. The foxes find out.',
  },
  legendary_a5_void_garden: {
    icon: PROD_SPRITE('p_void'),
    effectText: 'Pair your **Void Conduits** with **Spirit Herb Gardens**. Each pair multiplies BOTH producers by ×2.5.',
    exampleText: 'Own <strong>3 void conduits + 10 gardens</strong> → 3 pairs → each producer\'s qi/s is multiplied by <strong>×5.5</strong> (1 + 3 × 1.5).',
    loreText: 'The void\'s bleed carries seeds from another world; the garden devours them, blooms in colors no eye has named.',
  },
  legendary_a6_phoenix_pillar: {
    icon: PROD_SPRITE('p_phoenix'),
    effectText: 'Pair your **Sovereign Phoenixes** with **Heavenly Pillars**. Each pair multiplies BOTH producers by ×3.',
    exampleText: 'Own <strong>1 phoenix + 10 pillars</strong> → 1 pair → both producers\' qi/s is multiplied by <strong>×3</strong>. Adding a 2nd phoenix → 2 pairs and ×5 each.',
    loreText: 'The Fenghuang lands only on a perch tall enough. Each pillar is one more step closer to heaven.',
  },

  // ── Legendary — Unidirectional (B) ─────────────────────────────────────
  // 2026-05-21 Dial-4: per-count multipliers cut 40-60% to control the
  // late-game compounding. Examples updated to match the new values.
  legendary_b1_dragon_hoard: {
    icon: PROD_SPRITE('p_dragon'),
    effectText: 'Your **Slumbering Spirit Dragon** grows **25% stronger** for every Ancestral Treasure you own.',
    exampleText: 'Own <strong>1 dragon + 10 treasures</strong> → dragon\'s qi/s is <strong>×3.5</strong> (1 + 10 × 0.25). At 20 treasures, ×6.',
    loreText: 'The dragon\'s pearl is whatever you offered it. Every relic you\'ve kept, it has folded into itself.',
  },
  legendary_b3_beast_tribute: {
    icon: PROD_SPRITE('p_beast_pact'),
    effectText: 'Your **Spirit Beast Pact** grows **12% stronger** for every Spirit Herb Garden you own.',
    exampleText: 'Own <strong>10 beast pacts + 15 gardens</strong> → each beast pact\'s qi/s is <strong>×2.8</strong> (1 + 15 × 0.12).',
    loreText: 'Tigers eat the spirit herbs you grow. They return larger, faster, sharper.',
  },
  legendary_b4_furnace_sect: {
    icon: PROD_SPRITE('p_meridian_furnace'),
    effectText: 'Your **Meridian Furnace** grows **4% stronger** for every Body Tempering Disciple you own.',
    exampleText: 'Own <strong>5 furnaces + 50 disciples</strong> → each furnace\'s qi/s is <strong>×3</strong> (1 + 50 × 0.04).',
    loreText: 'Every apprentice\'s breath stokes the bronze legs a little brighter. The furnace was always a sect\'s effort.',
  },
  legendary_b5_heavens_bend: {
    icon: PROD_SPRITE('p_pillar'),
    effectText: 'Your **Heavenly Pillar** produces **double qi/s** as long as you own at least 1 Void Conduit.',
    exampleText: 'Own <strong>10 pillars + 1 void</strong> → each pillar\'s qi/s is <strong>×2</strong>. Owning more voids doesn\'t increase the bonus further.',
    loreText: 'When reality is already torn, heaven stops resisting.',
  },
  legendary_b6_phoenix_garden: {
    icon: PROD_SPRITE('p_phoenix'),
    effectText: 'Your **Sovereign Phoenix** grows **5% stronger** for every Spirit Herb Garden you own.',
    exampleText: 'Own <strong>1 phoenix + 40 gardens</strong> → phoenix\'s qi/s is <strong>×3</strong> (1 + 40 × 0.05).',
    loreText: 'Fenghuang nests only where the soil is medicine. A hundred gardens, a hundred reasons to stay.',
  },

  // ── Legendary — Temporal (E) ───────────────────────────────────────────
  // 2026-05-21 Dial-4.1: ×2 exponential → +50% additive per major BT.
  legendary_e2_phoenix_reborn: {
    icon: PROD_SPRITE('p_phoenix'),
    effectText: 'Every major realm breakthrough resets your **Phoenix count to zero**, but permanently adds **+50% to every other producer\'s qi/s** for this run.',
    exampleText: 'Cross <strong>5 major realms</strong> with this active → every non-phoenix producer ends at <strong>×3.5 their normal output</strong> (1 + 5 × 0.5). You lose all phoenixes, but the rest of your sect grows steadily.',
    loreText: 'Fenghuang is reborn from its own ashes — to bless the sect of its hearth.',
  },

  // ── Legendary — The Three Beasts (F) ───────────────────────────────────
  // 2026-05-21 Dial-4.1: individual ×3 → ×2, Trinity ×6 → ×2.
  legendary_f1_storm_tiger: {
    icon: PROD_SPRITE('p_beast_pact'),
    effectText: 'Your **Spirit Beast Pact** produces **double qi/s**. One of the Three Beasts — collect all three for Trinity Convergence (+100% global qi/s).',
    exampleText: 'Own <strong>10 beast pacts</strong> → combined qi/s is <strong>doubled</strong>. With the Dragon and Phoenix sparks also active, Trinity Convergence adds <strong>+100% global qi/s</strong> on top of every producer.',
    loreText: 'The tiger paces, ears flat. It will not roar until a dragon dreams its name and a phoenix sings it back. Until then, the storm in its fur only mutters.',
  },
  legendary_f2_pearl_dragon: {
    icon: PROD_SPRITE('p_dragon'),
    effectText: 'Your **Slumbering Spirit Dragon** produces **double qi/s**. One of the Three Beasts — collect all three for Trinity Convergence (+100% global qi/s).',
    exampleText: 'Own <strong>1 dragon</strong> → its qi/s is <strong>doubled</strong>. With the Tiger and Phoenix sparks also active, Trinity Convergence adds <strong>+100% global qi/s</strong> on top of every producer.',
    loreText: 'The pearl warms when the dragon hears two distant sounds — a tiger pacing, a phoenix folding its rainbow wings. Only then does the dream finish.',
  },
  legendary_f3_rainbow_phoenix: {
    icon: PROD_SPRITE('p_phoenix'),
    effectText: 'Your **Sovereign Phoenix** produces **double qi/s**. One of the Three Beasts — collect all three for Trinity Convergence (+100% global qi/s).',
    exampleText: 'Own <strong>1 phoenix</strong> → its qi/s is <strong>doubled</strong>. With the Tiger and Dragon sparks also active, Trinity Convergence adds <strong>+100% global qi/s</strong> on top of every producer.',
    loreText: 'The Fenghuang\'s cry has three notes. Alone it sings one — somewhere a tiger paces, somewhere a dragon dreams. When all three sound, the heavens bend down.',
  },
};

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
