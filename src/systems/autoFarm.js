/**
 * autoFarm.js — Pure simulation engine for auto-farm gathering and mining.
 *
 * All functions here are stateless and side-effect-free.
 * They take time (seconds) + game state and return what would have been earned.
 *
 * Integration points (none here — handled by useAutoFarm hook):
 *   - Config persistence (localStorage)
 *   - Applying gains to inventory
 *   - Triggering offline calculation on load
 *   - Background setInterval ticking
 */

import { ALL_MATERIALS, getGatherCost, getMineCost } from '../data/materials';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AUTO_FARM_KEY  = 'mai_auto_farm';
const BASE_GATHER_SPEED     = 3;   // gather points/sec — must match ActivityTooltip
const BASE_MINE_SPEED       = 3;   // mine points/sec — must match ActivityTooltip
// Global throttle on production rate. Multiplies the effective speed (base +
// stat bonuses) so the *whole* throughput — base, pills, artefacts, laws —
// scales together. Tuned to 0.10 on 2026-05-01 to slow mid-game gathering /
// mining loops by 10×. Mirror in ActivityTooltip.RATE_MULTIPLIER.
export const RATE_MULTIPLIER = 0.10;
// Cap offline simulation to prevent startup lag and to avoid week-long
// away sessions trivialising progression. Shared across gather, mine,
// and qi (imported by useCultivation.js).
export const MAX_OFFLINE_HOURS = 8;

// ─── Config ───────────────────────────────────────────────────────────────────

export function getDefaultConfig() {
  return {
    gathering: { enabled: false, worldIndex: 0, regionIndex: 0 },
    mining:    { enabled: false, worldIndex: 0, regionIndex: 0 },
  };
}

export function loadAutoFarmConfig() {
  try {
    const raw = localStorage.getItem(AUTO_FARM_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const defaults = getDefaultConfig();
      return {
        gathering: { ...defaults.gathering, ...saved.gathering },
        mining:    { ...defaults.mining,    ...saved.mining    },
      };
    }
  } catch {}
  return getDefaultConfig();
}

export function saveAutoFarmConfig(config) {
  try { localStorage.setItem(AUTO_FARM_KEY, JSON.stringify(config)); } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Merge two gain maps { [itemId]: qty } into one. */
export function mergeGains(a, b) {
  const result = { ...a };
  for (const [id, qty] of Object.entries(b)) {
    result[id] = (result[id] ?? 0) + qty;
  }
  return result;
}

/** Returns true if a gains object has anything in it. */
export function hasGains(gains) {
  if (!gains) return false;
  return (
    Object.keys(gains.items ?? {}).length > 0 ||
    (gains.techniques?.length ?? 0) > 0
  );
}

/** Random integer in [min, max] inclusive. */
function rollQty([min, max]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ─── Simulation — Gathering ───────────────────────────────────────────────────

/**
 * Simulate auto-gathering for `seconds` in the given region.
 *
 * Uses an independent-rate model: each item's expected yield is derived
 * from its share of the drop pool and its gather cost, then realised with a
 * floor + fractional-probability roll. This makes the simulation tick-size
 * independent — changing TICK_INTERVAL_MS does not affect long-run rates.
 *
 * Player stats applied:
 *   - harvestSpeed: ADDED to BASE_GATHER_SPEED (pts/sec).
 *   - harvestLuck:  percent (0–100) chance per primary cycle for a bonus qty.
 *
 * @param {number} seconds
 * @param {object} region  — world region with a `gatherDrops` array field
 * @param {object} [stats] — { harvestSpeed?, harvestLuck? }; defaults to base
 * @returns {{ [itemId]: qty }}
 */
export function simulateGathering(seconds, region, stats = null) {
  const gatherDrops = region?.gatherDrops;
  if (!gatherDrops?.length) return {};

  const primaryDrops = gatherDrops.filter(d => (ALL_MATERIALS[d.itemId]?.type ?? '') !== 'cultivation');
  const bonusDrops   = gatherDrops.filter(d => (ALL_MATERIALS[d.itemId]?.type ?? '') === 'cultivation');
  const activePools  = primaryDrops.length ? primaryDrops : gatherDrops;

  const speed        = (BASE_GATHER_SPEED + Math.max(0, stats?.harvestSpeed ?? 0)) * RATE_MULTIPLIER;
  const luckPct      = Math.min(100, Math.max(0, stats?.harvestLuck ?? 0));
  const tierUpChance = stats?.gatherMineRarityUpChance ?? 0;
  const capped       = Math.min(seconds, (stats?.maxOfflineHours ?? MAX_OFFLINE_HOURS) * 3600);
  const totalW       = activePools.reduce((s, d) => s + d.chance, 0);
  // Artefact `all_loot_bonus` — scales every yielded qty uniformly.
  const lootMult     = 1 + Math.max(0, stats?.allLootBonusPct ?? 0);

  const result = {};
  let cyclesPerSec = 0; // accumulated for bonus-drop rate

  // cb_ts Veteran's Hunt — one-shot rarity bump applied to the first primary
  // item that gets at least one cycle. Caller is responsible for clearing the flag.
  let killBumpRemaining = stats?.regionKillBumpPending ? 1 : 0;

  for (const drop of activePools) {
    const rate       = (drop.chance / totalW) * (speed / getGatherCost(drop.itemId));
    cyclesPerSec    += rate;
    const expected   = capped * rate;
    const fullCycles = Math.floor(expected);
    const frac       = expected - fullCycles;
    const cycles     = fullCycles + (Math.random() < frac ? 1 : 0);
    if (cycles === 0) continue;

    for (let i = 0; i < cycles; i++) {
      let qty = rollQty(drop.qty ?? [1, 1])
              + (luckPct > 0 && Math.random() * 100 < luckPct ? 1 : 0);
      qty = Math.max(1, Math.floor(qty * lootMult));
      let dropId = drop.itemId;
      if (killBumpRemaining > 0) {
        dropId = nextRarityItemId(dropId);
        killBumpRemaining = 0;
      } else if (tierUpChance > 0 && Math.random() < tierUpChance) {
        dropId = nextRarityItemId(dropId);
      }
      result[dropId] = (result[dropId] ?? 0) + qty;
    }
  }

  // Bonus drops (cultivation / QI stones) fire at: cyclesPerSec × bd.chance
  for (const bd of bonusDrops) {
    const expected   = capped * cyclesPerSec * bd.chance;
    const fullCycles = Math.floor(expected);
    const frac       = expected - fullCycles;
    const count      = fullCycles + (Math.random() < frac ? 1 : 0);
    if (count === 0) continue;
    let total = 0;
    for (let i = 0; i < count; i++) total += rollQty(bd.qty ?? [1, 1]);
    result[bd.itemId] = (result[bd.itemId] ?? 0) + total;
  }

  return result;
}

// Map an item id like `iron_herb_1` → `bronze_herb_1`. Falls back to the
// original id if the next-tier id doesn't exist in `ALL_MATERIALS`.
const RARITY_LADDER = ['iron', 'bronze', 'silver', 'gold', 'transcendent'];
function nextRarityItemId(itemId) {
  for (let i = 0; i < RARITY_LADDER.length - 1; i++) {
    const prefix = RARITY_LADDER[i] + '_';
    if (itemId.startsWith(prefix)) {
      const candidate = RARITY_LADDER[i + 1] + '_' + itemId.slice(prefix.length);
      return ALL_MATERIALS[candidate] ? candidate : itemId;
    }
  }
  return itemId;
}

// ─── Simulation — Mining ──────────────────────────────────────────────────────

/**
 * Simulate auto-mining for `seconds` in the given region.
 * Same independent-rate model as simulateGathering; reads miningSpeed/miningLuck.
 *
 * @param {number} seconds
 * @param {object} region  — world region with a `mineDrops` array field
 * @param {object} [stats] — { miningSpeed?, miningLuck? }; defaults to base
 * @returns {{ [itemId]: qty }}
 */
export function simulateMining(seconds, region, stats = null) {
  const mineDrops = region?.mineDrops;
  if (!mineDrops?.length) return {};

  const primaryDrops = mineDrops.filter(d => (ALL_MATERIALS[d.itemId]?.type ?? '') !== 'cultivation');
  const bonusDrops   = mineDrops.filter(d => (ALL_MATERIALS[d.itemId]?.type ?? '') === 'cultivation');
  const activePools  = primaryDrops.length ? primaryDrops : mineDrops;

  const speed        = (BASE_MINE_SPEED + Math.max(0, stats?.miningSpeed ?? 0)) * RATE_MULTIPLIER;
  const luckPct      = Math.min(100, Math.max(0, stats?.miningLuck ?? 0));
  const tierUpChance = stats?.gatherMineRarityUpChance ?? 0;
  const capped       = Math.min(seconds, (stats?.maxOfflineHours ?? MAX_OFFLINE_HOURS) * 3600);
  const totalW       = activePools.reduce((s, d) => s + d.chance, 0);
  const lootMult     = 1 + Math.max(0, stats?.allLootBonusPct ?? 0);

  const result = {};
  let cyclesPerSec = 0;
  let killBumpRemaining = stats?.regionKillBumpPending ? 1 : 0;

  for (const drop of activePools) {
    const rate       = (drop.chance / totalW) * (speed / getMineCost(drop.itemId));
    cyclesPerSec    += rate;
    const expected   = capped * rate;
    const fullCycles = Math.floor(expected);
    const frac       = expected - fullCycles;
    const cycles     = fullCycles + (Math.random() < frac ? 1 : 0);
    if (cycles === 0) continue;

    for (let i = 0; i < cycles; i++) {
      let qty = rollQty(drop.qty ?? [1, 1])
              + (luckPct > 0 && Math.random() * 100 < luckPct ? 1 : 0);
      qty = Math.max(1, Math.floor(qty * lootMult));
      let dropId = drop.itemId;
      if (killBumpRemaining > 0) {
        dropId = nextRarityItemId(dropId);
        killBumpRemaining = 0;
      } else if (tierUpChance > 0 && Math.random() < tierUpChance) {
        dropId = nextRarityItemId(dropId);
      }
      result[dropId] = (result[dropId] ?? 0) + qty;
    }
  }

  for (const bd of bonusDrops) {
    const expected   = capped * cyclesPerSec * bd.chance;
    const fullCycles = Math.floor(expected);
    const frac       = expected - fullCycles;
    const count      = fullCycles + (Math.random() < frac ? 1 : 0);
    if (count === 0) continue;
    let total = 0;
    for (let i = 0; i < count; i++) total += rollQty(bd.qty ?? [1, 1]);
    result[bd.itemId] = (result[bd.itemId] ?? 0) + total;
  }

  return result;
}

