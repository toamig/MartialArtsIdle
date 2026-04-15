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

import REALMS from '../data/realms';
import { HERBS, ORES, ALL_MATERIALS } from '../data/materials';
import ENEMIES, { pickEnemy } from '../data/enemies';
import { calcDamage, getCooldown } from '../data/techniques';
import { generateTechnique } from '../data/techniqueDrops';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AUTO_FARM_KEY  = 'mai_auto_farm';
const BASE_GATHER_SPEED     = 3;   // gather points/sec — must match GatheringScreen
const BASE_MINE_SPEED       = 3;   // gather points/sec — must match MiningScreen
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
      // Merge with defaults to handle new fields added in future
      return {
        combat:    { ...getDefaultConfig().combat,    ...saved.combat    },
        gathering: { ...getDefaultConfig().gathering, ...saved.gathering },
        mining:    { ...getDefaultConfig().mining,    ...saved.mining    },
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

/** Resolve display name → snake_case inventory ID. Mirrors GatheringScreen/MiningScreen. */
function nameToId(name) {
  const entry = Object.entries(ALL_MATERIALS).find(([, m]) => m.name === name);
  return entry
    ? entry[0]
    : name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** Parse comma-separated herb/ore string. Mirrors GatheringScreen. */
function parseList(str) {
  return (str ?? '').split(',').map(s => s.trim()).filter(s => s && !s.includes('TBD'));
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
  const { essence = 0, soul = 0, body = 0, lawElement = 'Normal' } = stats;
  const basicDmg = Math.max(5, Math.floor(essence + body));
  const basicDps = basicDmg / TURN_TIME_SEC;

  // Sum DPS contribution from each equipped attack technique
  let techDps = 0;
  let techTimeShare = 0; // fraction of time used by techniques

  for (const tech of (equippedTechs ?? [])) {
    if (!tech || tech.type !== 'Attack') continue;
    const dmg = calcDamage(tech, essence, soul, body, lawElement);
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
 * Player stats applied (formerly hardcoded):
 *   - harvestSpeed: ADDED to BASE_GATHER_SPEED (pts/sec). Stat values come
 *     from soul × 0.1 + modifier stack (see stats.js computeAllStats).
 *   - harvestLuck:  treated as a percent (0–100) chance per item to roll a
 *     bonus duplicate. Capped at 100.
 *
 * @param {number} seconds
 * @param {object} region  — world region with a `herbs` string field
 * @param {object} [stats] — { harvestSpeed?, harvestLuck? }; defaults to base
 * @returns {{ [itemId]: qty }}
 */
export function simulateGathering(seconds, region, stats = null) {
  const herbList = parseList(region?.herbs);
  if (!herbList.length) return {};

  const speed = BASE_GATHER_SPEED + Math.max(0, stats?.harvestSpeed ?? 0);
  const luckPct = Math.min(100, Math.max(0, stats?.harvestLuck ?? 0));

  const result   = {};
  let remaining  = Math.min(seconds, MAX_OFFLINE_HOURS * 3600);

  while (remaining > 0) {
    const name  = herbList[Math.floor(Math.random() * herbList.length)];
    const data  = HERBS[name] ?? { gatherCost: 30 };
    const tCost = data.gatherCost / speed;

    if (tCost > remaining) break;
    remaining -= tCost;

    const id   = nameToId(name);
    const qty  = 1 + (luckPct > 0 && Math.random() * 100 < luckPct ? 1 : 0);
    result[id] = (result[id] ?? 0) + qty;
  }

  return result;
}

// ─── Simulation — Mining ──────────────────────────────────────────────────────

/**
 * Simulate auto-mining for `seconds` in the given region.
 * Same stat semantics as simulateGathering but reads miningSpeed/miningLuck.
 *
 * @param {number} seconds
 * @param {object} region  — world region with an `ores` string field
 * @param {object} [stats] — { miningSpeed?, miningLuck? }; defaults to base
 * @returns {{ [itemId]: qty }}
 */
export function simulateMining(seconds, region, stats = null) {
  const oreList  = parseList(region?.ores);
  if (!oreList.length) return {};

  const speed   = BASE_MINE_SPEED + Math.max(0, stats?.miningSpeed ?? 0);
  const luckPct = Math.min(100, Math.max(0, stats?.miningLuck ?? 0));

  const result   = {};
  let remaining  = Math.min(seconds, MAX_OFFLINE_HOURS * 3600);

  while (remaining > 0) {
    const name  = oreList[Math.floor(Math.random() * oreList.length)];
    const data  = ORES[name] ?? { mineCost: 30 };
    const tCost = data.mineCost / speed;

    if (tCost > remaining) break;
    remaining -= tCost;

    const id   = nameToId(name);
    const qty  = 1 + (luckPct > 0 && Math.random() * 100 < luckPct ? 1 : 0);
    result[id] = (result[id] ?? 0) + qty;
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

    // Enemy HP anchored to region difficulty, same formula as CombatScreen
    const regionBaseQi = REALMS[region.minRealmIndex]?.cost ?? 100;
    const hpMult       = enemyDef.statMult?.hp ?? 1;
    const eHp          = Math.max(200, Math.floor(regionBaseQi * 10 * hpMult));

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
