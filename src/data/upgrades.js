/**
 * One-time upgrades for the CultivationScreen shop. Each upgrade is purchased
 * once and grants a permanent effect — Cookie-Clicker model. Stackability
 * lives inside producers' geometric cost curve; upgrades are the multipliers
 * that punctuate the climb.
 *
 * Categories
 * ----------
 *   producer_double — 20 upgrades, 2 per producer (T1 @ ≥10 owned, T2 @ ≥25).
 *                     Each multiplies that producer's output ×2 (T1+T2 = ×4).
 *   crystal_tap     — 5 upgrades, unlocked by crystal level. Each doubles the
 *                     "empty reservoir floor" granted by a crystal tap.
 *   focus_mult      — 4 upgrades, realm-gated. Add +50%/+50%/+50%/+100% to the
 *                     hold-to-cultivate focus multiplier.
 *   offline_rate    — 4 upgrades, realm-gated. Each +5% to the offline qi rate
 *                     (base 20% → 40% with all four).
 *   offline_cap     — 4 upgrades, realm-gated. Each +4 h to the offline window
 *                     (base 8h → 24h with all four).
 *
 * Cost values are STARTING VALUES — validate in scripts/sim-cultivation.js
 * (Phase F) before locking. Visibility: an upgrade is HIDDEN until its
 * unlock condition is met OR the player owns ≥50% of the gating producer.
 *
 * Effect shape:
 *   { type: 'producer_double', producerId, mult: 2 }
 *   { type: 'crystal_tap',     mult: 2 }
 *   { type: 'focus_mult',      add: 50 }   — percentage points
 *   { type: 'offline_rate',    add: 0.05 } — additive fraction
 *   { type: 'offline_cap',     addHours: 4 }
 *
 * Unlock shape:
 *   { type: 'realm',         minRealmIndex: N }
 *   { type: 'crystal_level', min: N }
 *   { type: 'producer',      producerId, min: N }
 */

import PRODUCERS from './producers';

// ── A. Producer doubling (2 per producer) ────────────────────────────────────

const PRODUCER_DOUBLES = PRODUCERS.flatMap(p => {
  const t1Cost = Math.ceil(p.startCost * 250);
  const t2Cost = Math.ceil(t1Cost * 5);
  return [
    {
      id:        `u_${p.id}_double_1`,
      category:  'producer_double',
      name:      `${p.name} I`,
      desc:      `Doubles output of ${p.name}.`,
      cost:      t1Cost,
      unlock:    { type: 'producer', producerId: p.id, min: 10 },
      effect:    { type: 'producer_double', producerId: p.id, mult: 2 },
    },
    {
      id:        `u_${p.id}_double_2`,
      category:  'producer_double',
      name:      `${p.name} II`,
      desc:      `Doubles output of ${p.name} again (stacks ×4 with the first).`,
      cost:      t2Cost,
      unlock:    { type: 'producer', producerId: p.id, min: 25 },
      effect:    { type: 'producer_double', producerId: p.id, mult: 2 },
    },
  ];
});

// ── B. Crystal-tap power (5 tiers) ───────────────────────────────────────────
// Cost rises ~×8 per tier; unlock thresholds match the existing crystal
// visual-tier breakpoints from useQiCrystal.

const CRYSTAL_TAP = [
  { id: 'u_crystal_tap_1', name: 'Refined Tap I',    cost:           500, crystalLevel:   1 },
  { id: 'u_crystal_tap_2', name: 'Refined Tap II',   cost:         4_000, crystalLevel:  10 },
  { id: 'u_crystal_tap_3', name: 'Refined Tap III',  cost:        32_000, crystalLevel:  25 },
  { id: 'u_crystal_tap_4', name: 'Refined Tap IV',   cost:       256_000, crystalLevel:  50 },
  { id: 'u_crystal_tap_5', name: 'Refined Tap V',    cost:     2_048_000, crystalLevel: 100 },
].map((u, i) => ({
  id:        u.id,
  category:  'crystal_tap',
  name:      u.name,
  desc:      `Doubles the qi granted by tapping the crystal when its reservoir is empty.`,
  cost:      u.cost,
  // Crystal-level ramp AND the Crystal Reservoir mechanic must be unlocked —
  // the upgrade's effect ("tap when reservoir is empty") is meaningless
  // before crystal_click T1 is granted at crystal tier 2 (level 10).
  unlock: {
    type: 'all',
    gates: [
      { type: 'crystal_level', min: u.crystalLevel },
      { type: 'mechanic_tier', mechanicId: 'crystal_click', min: 1 },
    ],
  },
  effect:    { type: 'crystal_tap', mult: 2 },
  _tier:     i + 1,
}));

// ── C. Boost / focus mult (4 tiers) ──────────────────────────────────────────

const FOCUS_MULT = [
  { id: 'u_focus_1', name: 'Deeper Breath I',   cost:           5_000, realm:  9, add: 50  },
  { id: 'u_focus_2', name: 'Deeper Breath II',  cost:         100_000, realm: 17, add: 50  },
  { id: 'u_focus_3', name: 'Deeper Breath III', cost:       2_000_000, realm: 29, add: 50  },
  { id: 'u_focus_4', name: 'Deeper Breath IV',  cost: 100_000_000_000, realm: 44, add: 100 },
].map(u => ({
  id:        u.id,
  category:  'focus_mult',
  name:      u.name,
  desc:      `+${u.add}% to the hold-to-cultivate focus multiplier.`,
  cost:      u.cost,
  unlock:    { type: 'realm', minRealmIndex: u.realm },
  effect:    { type: 'focus_mult', add: u.add },
}));

// ── D. Offline gain rate (4 tiers, additive bonus to base 20%) ───────────────
// Each tier adds +5% to the offline qi rate. Base 0.20 → 0.25 / 0.30 / 0.35 /
// 0.40 (Idle-Slayer-equivalent maximum). Numbers Policy: starting values;
// sim run after sweep to confirm hardcore-active land at ~7-8 days.
const OFFLINE_RATE = [
  { id: 'u_offline_rate_1', name: 'Idle Cultivation I',   add: 0.05, cost:        50_000, realm:  9 },
  { id: 'u_offline_rate_2', name: 'Idle Cultivation II',  add: 0.05, cost:    50_000_000, realm: 17 },
  { id: 'u_offline_rate_3', name: 'Idle Cultivation III', add: 0.05, cost: 5_000_000_000, realm: 27 },
  { id: 'u_offline_rate_4', name: 'Idle Cultivation IV',  add: 0.05, cost: 500_000_000_000, realm: 38 },
].map(u => ({
  id:        u.id,
  category:  'offline_rate',
  name:      u.name,
  desc:      `Adds +${Math.round(u.add * 100)}% to your offline qi accrual rate.`,
  cost:      u.cost,
  unlock:    { type: 'realm', minRealmIndex: u.realm },
  effect:    { type: 'offline_rate', add: u.add },
}));

// ── E. Offline duration cap (4 tiers, additive hours to base 8h) ─────────────
// Each tier adds +4 h to the offline window. Base 8 → 12 / 16 / 20 / 24 h
// (typical idle-game ceiling). Past 24 h the cap caps — players returning
// after a week-long absence don't get a week of qi.
const OFFLINE_CAP = [
  { id: 'u_offline_cap_1', name: 'Deeper Slumber I',   addH: 4, cost:        250_000, realm: 13 },
  { id: 'u_offline_cap_2', name: 'Deeper Slumber II',  addH: 4, cost:    250_000_000, realm: 20 },
  { id: 'u_offline_cap_3', name: 'Deeper Slumber III', addH: 4, cost:  50_000_000_000, realm: 30 },
  { id: 'u_offline_cap_4', name: 'Deeper Slumber IV',  addH: 4, cost: 5_000_000_000_000, realm: 41 },
].map(u => ({
  id:        u.id,
  category:  'offline_cap',
  name:      u.name,
  desc:      `Extends your offline accrual window by +${u.addH} hours.`,
  cost:      u.cost,
  unlock:    { type: 'realm', minRealmIndex: u.realm },
  effect:    { type: 'offline_cap', addHours: u.addH },
}));

// ── F. Mechanic tier upgrades (Round 3 — Crystal Discovery) ──────────────────
// Each mechanic's T1 is granted by crystal evolution; T2-T5 are purchased
// here. Unlock requires owning the previous tier of that mechanic. Effect
// type `grant_spark` instructs App.jsx (via CultivationScreen.handleBuyUpgrade)
// to call `qiSparks.grant(sparkId)` after the qi spend succeeds.
//
// Cost ramp ~×8 per tier within a mechanic. Anchored to the realm at which
// the player typically reaches each crystal level. Numbers Policy: starting
// values; sim validation when scripts/sim-cultivation.js lands.

const MECHANIC_TIER_CONFIG = [
  {
    mechanicId: 'crystal_click',
    label:      'Crystal Reservoir',
    descTier:   { 2: 'Reservoir fills 50% of qi/s (up to 10 min).',
                  3: 'Reservoir fills 70% of qi/s (up to 20 min).',
                  4: 'Reservoir fills 85% of qi/s (up to 40 min).',
                  5: 'Reservoir fills 100% of qi/s (up to 60 min).' },
    costs:      { 2: 25_000, 3: 200_000, 4: 1_600_000, 5: 13_000_000 },
  },
  {
    mechanicId: 'consecutive_focus',
    label:      'Consecutive Focus',
    descTier:   { 2: 'Adds: hold Focus 4s → +7% qi/s (total +12%).',
                  3: 'Adds: hold Focus 6s → +13% qi/s (total +25%).',
                  4: 'Adds: hold Focus 8s → +15% qi/s (total +40%).',
                  5: 'Adds: hold Focus 10s → +20% qi/s (total +60%); deep meditation.' },
    costs:      { 2: 200_000, 3: 1_600_000, 4: 13_000_000, 5: 100_000_000 },
  },
  {
    mechanicId: 'divine_qi',
    label:      'Divine Qi',
    descTier:   { 2: 'Orb every ~2.5 min, 10s window. Tap for 40s of qi.',
                  3: 'Orb every ~2 min, 12s window. Tap for 50s of qi.',
                  4: 'Orb every ~90s, 15s window. Tap for 60s of qi.',
                  5: 'Two orbs every ~60s. Collect both for 60s qi + ×1.5 qi/s for 30s.' },
    costs:      { 2: 1_600_000, 3: 13_000_000, 4: 100_000_000, 5: 800_000_000 },
  },
  {
    mechanicId: 'pattern_click',
    label:      'Tracing Meridians',
    descTier:   { 2: 'Spark every ~100s. 4 dots, 12s window. Full clear: 40s of qi.',
                  3: 'Spark every ~80s. 5 dots, 14s window. Full clear: 50s of qi.',
                  4: 'Spark every ~60s. 6 dots, 16s window. Full clear: 60s of qi.',
                  5: 'Spark every ~45s. 7 dots, 18s window. Full clear: 120s qi + ×2 qi/s for 15s.' },
    costs:      { 2: 13_000_000, 3: 100_000_000, 4: 800_000_000, 5: 6_400_000_000 },
  },
];

const ROMAN = { 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };

const MECHANIC_TIERS = MECHANIC_TIER_CONFIG.flatMap(m =>
  [2, 3, 4, 5].map(tier => ({
    id:        `u_${m.mechanicId}_t${tier}`,
    category:  'mechanic_tier',
    name:      `${m.label} ${ROMAN[tier]}`,
    desc:      m.descTier[tier],
    cost:      m.costs[tier],
    unlock:    { type: 'mechanic_tier', mechanicId: m.mechanicId, min: tier - 1 },
    effect:    { type: 'grant_spark', sparkId: `${m.mechanicId}_t${tier}` },
  })),
);

const UPGRADES = [
  ...PRODUCER_DOUBLES,
  ...CRYSTAL_TAP,
  ...FOCUS_MULT,
  ...OFFLINE_RATE,
  ...OFFLINE_CAP,
  ...MECHANIC_TIERS,
];

export const UPGRADES_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

export default UPGRADES;
