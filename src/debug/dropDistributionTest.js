/**
 * dropDistributionTest.js — auditable balance check for region drop tables.
 *
 * Validates three properties across the 27 playable regions:
 *
 *   A. Quantity cap.       Every gather/mine drop entry has qty[max] <= 3.
 *   B. Tier alignment.     Each region's dominant gather/mine rarity equals
 *                          its dominant combat blood-core rarity (within +/-1
 *                          tier tolerance — combat may surface a splash tier).
 *   C. EV monotonicity.    Each region's rarity-weighted expected value per
 *                          gather/mine cycle is strictly greater than the
 *                          previous region's. This guarantees every new area
 *                          is a meaningful upgrade, even when tier doesn't
 *                          change (chance / qty within tier escalate).
 *
 * Run with `gd.testDrops()` from the dev console. Returns true on full pass.
 */

import WORLDS from '../data/worlds';
import ENEMIES from '../data/enemies';
import { ALL_MATERIALS } from '../data/materials';

const TIERS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];
const TIER_INDEX = Object.fromEntries(TIERS.map((t, i) => [t, i]));

// Rarity weights mirror gatherCost ratios (15 / 60 / 180 / 600 / 1800), so a
// Bronze item is "worth" 4 Iron items in EV terms. Used only for monotonicity
// — the absolute scale is irrelevant.
const TIER_WEIGHT = [1, 4, 12, 40, 120];

function rarityOf(itemId) {
  const item = ALL_MATERIALS[itemId];
  return item?.rarity ?? null;
}

function tierIndexOf(rarity) {
  return TIER_INDEX[rarity] ?? -1;
}

/** Average qty for a [min, max] range. */
function avgQty(range) {
  if (!Array.isArray(range)) return 1;
  return (range[0] + range[1]) / 2;
}

/** Max qty across a drop list. Returns 0 if empty. */
function maxQty(drops = []) {
  let m = 0;
  for (const d of drops) {
    const q = Array.isArray(d.qty) ? d.qty[1] : 1;
    if (q > m) m = q;
  }
  return m;
}

/**
 * Dominant rarity of a drop list = the highest-tier rarity that appears with
 * cumulative chance >= MIN_DOMINANT_CHANCE. Splash tiers (low chance) don't
 * count — they're flavour, not the tier the player will harvest at scale.
 */
const MIN_DOMINANT_CHANCE = 0.30;
function dominantRarity(drops = []) {
  // Bucket by rarity, summing chance for items in that rarity
  const buckets = {};
  for (const d of drops) {
    const r = rarityOf(d.itemId);
    if (!r) continue;
    buckets[r] = (buckets[r] || 0) + (d.chance ?? 0);
  }
  // Walk tiers HIGH → LOW, picking the first one with substantial chance.
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i];
    if ((buckets[t] || 0) >= MIN_DOMINANT_CHANCE) return t;
  }
  // Fallback: the highest-tier rarity that appears at all.
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (buckets[TIERS[i]]) return TIERS[i];
  }
  return null;
}

/** Rarity-weighted EV per cycle for a drop list. */
function normalizedEV(drops = []) {
  let ev = 0;
  for (const d of drops) {
    const r = rarityOf(d.itemId);
    if (!r) continue;
    const w = TIER_WEIGHT[tierIndexOf(r)] ?? 0;
    ev += (d.chance ?? 0) * avgQty(d.qty) * w;
  }
  return ev;
}

/**
 * Combat blood-core dominant rarity for a region. Aggregates blood-core drops
 * (itemId matches `*_blood_core_*`) across all enemies in the region's
 * enemyPool, weighted by enemy spawn weight. Returns null when no blood cores
 * drop in this region (e.g. the tutorial Region 1).
 */
function combatBloodCoreRarity(region) {
  const buckets = {};
  let totalWeight = 0;
  for (const slot of region.enemyPool ?? []) {
    const enemy = ENEMIES[slot.enemyId];
    if (!enemy) continue;
    totalWeight += slot.weight ?? 0;
    for (const d of enemy.drops ?? []) {
      if (!/_blood_core_/.test(d.itemId)) continue;
      const r = rarityOf(d.itemId);
      if (!r) continue;
      const expected = (slot.weight ?? 0) * (d.chance ?? 0) * avgQty(d.qty);
      buckets[r] = (buckets[r] || 0) + expected;
    }
  }
  if (totalWeight === 0) return null;
  // Pick highest-tier rarity with >= 30% of the max bucket as "dominant".
  let maxBucket = 0;
  for (const v of Object.values(buckets)) maxBucket = Math.max(maxBucket, v);
  if (maxBucket === 0) return null;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i];
    if ((buckets[t] || 0) >= maxBucket * 0.30) return t;
  }
  return null;
}

/**
 * Run the full check. Logs a per-region table + summary. Returns true on
 * full pass, false if any assertion fails. Result object also exposed as
 * window.__lastDropTest for further inspection.
 */
export function runDropDistributionTest() {
  const failures = [];
  const rows = [];

  // Flatten regions across all worlds in playable order
  const regions = [];
  for (const w of WORLDS) {
    for (const r of w.regions) {
      regions.push({ ...r, worldName: w.name });
    }
  }

  let prevEV = -Infinity;
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const idx = i + 1;
    const gather = region.gatherDrops ?? [];
    const mine   = region.mineDrops ?? [];

    const gatherDom = dominantRarity(gather);
    const mineDom   = dominantRarity(mine);
    const combatDom = combatBloodCoreRarity(region);

    const gatherEV = normalizedEV(gather);
    const mineEV   = normalizedEV(mine);
    const totalEV  = gatherEV + mineEV;
    const maxQ     = Math.max(maxQty(gather), maxQty(mine));

    // ── Assertion A: qty cap ─────────────────────────────────────────────
    if (maxQ > 3) {
      failures.push(`R${idx} ${region.name}: max qty ${maxQ} > 3`);
    }

    // ── Assertion B: tier alignment vs combat ────────────────────────────
    // Skip the very first region — it intentionally drops no blood cores
    // (tutorial). For all others, gather/mine dominant tier must match
    // combat dominant tier within +/-1.
    if (combatDom !== null) {
      const ci = tierIndexOf(combatDom);
      if (gatherDom && Math.abs(tierIndexOf(gatherDom) - ci) > 1) {
        failures.push(`R${idx} ${region.name}: gather=${gatherDom} vs combat=${combatDom} (diff > 1 tier)`);
      }
      if (mineDom && Math.abs(tierIndexOf(mineDom) - ci) > 1) {
        failures.push(`R${idx} ${region.name}: mine=${mineDom} vs combat=${combatDom} (diff > 1 tier)`);
      }
    }

    // ── Assertion C: monotonic EV ────────────────────────────────────────
    if (totalEV <= prevEV) {
      failures.push(`R${idx} ${region.name}: totalEV ${totalEV.toFixed(2)} <= prev ${prevEV.toFixed(2)}`);
    }
    prevEV = totalEV;

    rows.push({
      idx, name: region.name,
      gatherDom, mineDom, combatDom,
      gatherEV: +gatherEV.toFixed(2),
      mineEV:   +mineEV.toFixed(2),
      totalEV:  +totalEV.toFixed(2),
      maxQ,
    });
  }

  // ── Output ────────────────────────────────────────────────────────────
  console.group('%c[testDrops] per-region report', 'color: #c084fc; font-weight: bold');
  console.table(rows);

  if (failures.length === 0) {
    console.log(`%c✓ ALL PASS — ${rows.length} regions checked`, 'color: #4ade80; font-weight: bold');
  } else {
    console.log(`%c✗ ${failures.length} FAILURE(S)`, 'color: #f87171; font-weight: bold');
    for (const f of failures) console.log(`  • ${f}`);
  }
  console.groupEnd();

  if (typeof window !== 'undefined') {
    window.__lastDropTest = { rows, failures, pass: failures.length === 0 };
  }
  return failures.length === 0;
}
