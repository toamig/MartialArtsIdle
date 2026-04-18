/**
 * autoFarm.js — Pure simulation engine for auto-combat, gathering, and mining.
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
import ENEMIES, { pickEnemy } from '../data/enemies';
import { calcDamage, getCooldown } from '../data/techniques';
import { generateTechnique } from '../data/techniqueDrops';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AUTO_FARM_KEY  = 'mai_auto_farm';
const BASE_GATHER_SPEED     = 3;   // gather points/sec — must match GatheringScreen
const BASE_MINE_SPEED       = 3;   // mine points/sec — must match MiningScreen
const TURN_TIME_SEC         = 1.0; // seconds per player-turn cycle (animation approximation)
const MAX_OFFLINE_HOURS     = 8;   // cap offline simulation to prevent startup lag
const MAX_KILLS_PER_SESSION = 100_000;

// ─── Config ───────────────────────────────────────────────────────────────────

export function getDefaultConfig() {
  return {
    combat:    { enabled: false, worldIndex: 0, regionIndex: 0 },
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
      // Merge saved values but force every activity to disabled=false — the
      // hook that owns the config (useAutoFarm) will re-enable activities only
      // after verifying the target region is actually cleared.  This prevents
      // a stale config from showing an active idle assignment on a fresh save.
      return {
        combat:    { ...defaults.combat,    ...saved.combat,    enabled: false },
        gathering: { ...defaults.gathering, ...saved.gathering, enabled: false },
        mining:    { ...defaults.mining,    ...saved.mining,    enabled: false },
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

/** Weighted random pick from a drop array (uses `chance` as weight). */
function pickWeighted(drops) {
  if (!drops?.length) return null;
  const total = drops.reduce((s, d) => s + d.chance, 0);
  let roll = Math.random() * total;
  for (const d of drops) {
    roll -= d.chance;
    if (roll <= 0) return d;
  }
  return drops[drops.length - 1];
}

/** Random integer in [min, max] inclusive. */
function rollQty([min, max]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ─── Drop roll (mirrors useCombat.rollDrops) ──────────────────────────────────

function rollDrops(drops) {
  if (!drops?.length) return [];
  const result = [];
  for (const drop of drops) {
    if (Math.random() < drop.chance) {
      const qty = drop.qty[0] + Math.floor(Math.random() * (drop.qty[1] - drop.qty[0] + 1));
      result.push({ itemId: drop.itemId, qty });
    }
  }
  return result;
}

// ─── DPS estimation ───────────────────────────────────────────────────────────

/**
 * Estimate sustained player DPS from stats and equipped techniques.
 * Used to approximate kill time for combat simulation.
 *
 * Model:
 *   - Techniques fire on their cooldowns; basic attack fills gaps.
 *   - Heal/Defend/Dodge techniques contribute 0 damage but consume a turn.
 */
function estimateDps(stats, equippedTechs) {
  const { essence = 0, soul = 0, body = 0, lawElement = 'Normal', law = null, damageStats = null } = stats;
  const basicDmg = Math.max(5, Math.floor(essence + body));
  const basicDps = basicDmg / TURN_TIME_SEC;

  // Sum DPS contribution from each equipped attack technique
  let techDps = 0;
  let techTimeShare = 0; // fraction of time used by techniques

  for (const tech of (equippedTechs ?? [])) {
    if (!tech || tech.type !== 'Attack') continue;
    const dmg = calcDamage(tech, essence, soul, body, law ?? lawElement, 0, damageStats);
    const cd  = getCooldown(tech.type, tech.quality);
    techDps      += dmg / cd;
    techTimeShare += TURN_TIME_SEC / cd;
  }

  // Basic attack fills time not covered by techniques
  const basicShare = Math.max(0, 1 - techTimeShare);
  return techDps + basicDps * basicShare;
}

// ─── Simulation — Gathering ───────────────────────────────────────────────────

/**
 * Simulate auto-gathering for `seconds` in the given region.
 *
 * Uses region.gatherDrops (array of { itemId, chance, qty }) instead of
 * the old herb name string. Primary drops (herbs) are selected by weight;
 * cultivation/bonus drops are rolled independently each cycle.
 *
 * Player stats applied:
 *   - harvestSpeed: ADDED to BASE_GATHER_SPEED (pts/sec).
 *   - harvestLuck:  percent (0–100) chance per primary to roll a bonus duplicate.
 *
 * Partial-gather: when the tick window is shorter than one full gather cycle,
 * the item is yielded probabilistically (remaining/tCost chance) so rare/slow
 * items still accumulate at the correct long-run rate.
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

  const speed   = BASE_GATHER_SPEED + Math.max(0, stats?.harvestSpeed ?? 0);
  const luckPct = Math.min(100, Math.max(0, stats?.harvestLuck ?? 0));

  const result  = {};
  let remaining = Math.min(seconds, MAX_OFFLINE_HOURS * 3600);

  while (remaining > 0) {
    const primary = pickWeighted(activePools);
    if (!primary) break;

    const cost  = getGatherCost(primary.itemId);
    const tCost = cost / speed;

    if (remaining >= tCost) {
      remaining -= tCost;

      // Give primary herb
      const qty = rollQty(primary.qty ?? [1, 1])
                + (luckPct > 0 && Math.random() * 100 < luckPct ? 1 : 0);
      result[primary.itemId] = (result[primary.itemId] ?? 0) + qty;

      // Roll bonus drops (cultivation / QI stones)
      for (const bd of bonusDrops) {
        if (Math.random() < bd.chance) {
          const bqty = rollQty(bd.qty ?? [1, 1]);
          result[bd.itemId] = (result[bd.itemId] ?? 0) + bqty;
        }
      }
    } else {
      // Partial gather — probabilistic yield so slow/rare items still produce
      // at the correct long-run rate regardless of tick window size.
      if (Math.random() < remaining / tCost) {
        const qty = rollQty(primary.qty ?? [1, 1]);
        result[primary.itemId] = (result[primary.itemId] ?? 0) + qty;
      }
      break;
    }
  }

  return result;
}

// ─── Simulation — Mining ──────────────────────────────────────────────────────

/**
 * Simulate auto-mining for `seconds` in the given region.
 * Same stat semantics as simulateGathering but reads miningSpeed/miningLuck.
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

  const speed   = BASE_MINE_SPEED + Math.max(0, stats?.miningSpeed ?? 0);
  const luckPct = Math.min(100, Math.max(0, stats?.miningLuck ?? 0));

  const result  = {};
  let remaining = Math.min(seconds, MAX_OFFLINE_HOURS * 3600);

  while (remaining > 0) {
    const primary = pickWeighted(activePools);
    if (!primary) break;

    const cost  = getMineCost(primary.itemId);
    const tCost = cost / speed;

    if (remaining >= tCost) {
      remaining -= tCost;

      // Give primary ore
      const qty = rollQty(primary.qty ?? [1, 1])
                + (luckPct > 0 && Math.random() * 100 < luckPct ? 1 : 0);
      result[primary.itemId] = (result[primary.itemId] ?? 0) + qty;

      // Roll bonus drops (cultivation / QI stones)
      for (const bd of bonusDrops) {
        if (Math.random() < bd.chance) {
          const bqty = rollQty(bd.qty ?? [1, 1]);
          result[bd.itemId] = (result[bd.itemId] ?? 0) + bqty;
        }
      }
    } else {
      if (Math.random() < remaining / tCost) {
        const qty = rollQty(primary.qty ?? [1, 1]);
        result[primary.itemId] = (result[primary.itemId] ?? 0) + qty;
      }
      break;
    }
  }

  return result;
}

// ─── Simulation — Combat ──────────────────────────────────────────────────────

/**
 * Simulate auto-combat for `seconds` in the given region.
 *
 * @param {number}   seconds
 * @param {object}   region         — world region (enemyPool, minRealmIndex, worldId)
 * @param {object}   stats          — { essence, soul, body, lawElement }
 * @param {Array}    equippedTechs  — [tech|null, tech|null, tech|null]
 * @returns {{ items: { [itemId]: qty }, techniques: Array }}
 */
export function simulateCombat(seconds, region, stats, equippedTechs) {
  if (!region?.enemyPool?.length) return { items: {}, techniques: [] };

  const dps      = estimateDps(stats, equippedTechs ?? []);
  const items    = {};
  const techniques = [];
  let remaining  = Math.min(seconds, MAX_OFFLINE_HOURS * 3600);
  let kills      = 0;

  while (remaining > 0 && kills < MAX_KILLS_PER_SESSION) {
    const enemyDef = pickEnemy(region.enemyPool);
    if (!enemyDef) { remaining -= 1; continue; }

    // Enemy HP anchored to region index, same formula as useCombat.
    const regionIndex = Math.max(0, region.minRealmIndex ?? 0);
    const hpBase      = 150 * Math.pow(1.12, regionIndex);
    const hpMult      = enemyDef.statMult?.hp ?? 1;
    const eHp         = Math.max(100, Math.floor(hpBase * hpMult));

    // Time to kill: if DPS is 0, bail out early
    if (dps <= 0) break;
    const killTime = eHp / dps;
    if (killTime > remaining) break;

    remaining -= killTime;
    kills++;

    // Roll material drops
    for (const d of rollDrops(enemyDef.drops ?? [])) {
      items[d.itemId] = (items[d.itemId] ?? 0) + d.qty;
    }

    // Roll technique drop
    const techChance = enemyDef.techniqueDrop?.chance ?? 0;
    if (techChance > 0 && Math.random() < techChance) {
      techniques.push(generateTechnique(region.worldId ?? 1));
    }
  }

  return { items, techniques };
}
