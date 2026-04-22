/**
 * Feature gate definitions — controls when each nav tab and world becomes
 * accessible. Evaluated by useFeatureFlags against live game state.
 *
 * Gate types:
 *   always            — always unlocked
 *   realm             — realmIndex >= minRealmIndex
 *   region_clear_any  — player has cleared (won combat in) at least one region
 *   item_any          — inventory contains at least one item of any kind
 *   item_category     — inventory contains at least one item in `category`
 *   all               — every sub-gate in `gates` must pass
 *   any               — at least one sub-gate in `gates` must pass
 *
 * Designer overrides: src/data/config/featureGates.override.json
 * Records are keyed by feature id; each record is shallow-merged onto the
 * baseline, so you can patch just `gate` without losing `hint` / `unlockMsg`.
 */
import WORLDS from './worlds';
import { HERB_ITEMS, ORE_ITEMS, BLOOD_CORE_ITEMS, CULTIVATION_ITEMS } from './materials';
import { PILLS } from './pills';
import { mergeRecords } from './config/loader';

const ITEM_CATEGORIES = {
  herbs:       HERB_ITEMS,
  minerals:    ORE_ITEMS,
  bloodCores:  BLOOD_CORE_ITEMS,
  cultivation: CULTIVATION_ITEMS,
  pills:       PILLS,
};

// ── Baseline ──────────────────────────────────────────────────────────────────

const BASELINE = {
  home: {
    gate: { type: 'always' },
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  worlds: {
    gate: { type: 'realm', minRealmIndex: 3 },
    desc: 'Explore regions across multiple worlds, fight enemies in combat, and dispatch idle workers to gather herbs or mine ores.',
    hint: 'Reach Tempered Body Layer 4',
    unlockMsg: 'Worlds unlocked.',
  },
  character: {
    gate: { type: 'always' },
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  gathering: {
    gate: { type: 'realm', minRealmIndex: 7 },
    desc: 'Dispatch an idle worker to harvest herbs from cleared regions. Materials fuel alchemy and crafting.',
    hint: 'Reach Tempered Body Layer 8',
    unlockMsg: 'Gathering unlocked.',
  },
  mining: {
    gate: { type: 'realm', minRealmIndex: 7 },
    desc: 'Dispatch an idle worker to extract ores from cleared regions. Materials fuel refining and forging.',
    hint: 'Reach Tempered Body Layer 8',
    unlockMsg: 'Mining unlocked.',
  },
  collection: {
    gate: { type: 'always' },
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  // Production screen unlocks as soon as the player has ANY crafting
  // material — herbs (gathered), minerals (mined), or blood cores (combat drop).
  // Individual sub-tabs still gate on their source activity below.
  production: {
    gate: { type: 'any', gates: [
      { type: 'item_category', category: 'herbs' },
      { type: 'item_category', category: 'minerals' },
      { type: 'item_category', category: 'bloodCores' },
    ] },
    desc: 'Craft cultivation pills, transmute and upgrade gear, and smelt raw materials into powerful equipment.',
    hint: 'Gather herbs, mine minerals, or collect a blood core to unlock',
    unlockMsg: 'Production unlocked.',
  },
  // ── Production sub-tabs ────────────────────────────────────────────────────
  // transmutation: paired with combat (modifies artefacts / techniques / laws).
  // Same material-driven gate as the parent so the default sub-tab is
  // always reachable once the player enters Production.
  transmutation: {
    gate: { type: 'any', gates: [
      { type: 'item_category', category: 'herbs' },
      { type: 'item_category', category: 'minerals' },
      { type: 'item_category', category: 'bloodCores' },
    ] },
    desc: 'Upgrade, replace, and transmute your artefacts, technique slots, and law bindings using gathered materials.',
    hint: 'Gather herbs, mine minerals, or collect a blood core to unlock',
    unlockMsg: 'Transmutation unlocked.',
  },
  // refining: paired with mining (ore-driven artefact/technique/law forging).
  refining: {
    gate: { type: 'realm', minRealmIndex: 7 },
    desc: 'Feed raw minerals into the Refining Furnace to forge powerful artefacts and high-grade equipment.',
    hint: 'Reach Tempered Body Layer 8',
    unlockMsg: 'Refining Furnace lit.',
  },
  // alchemy: paired with gathering (herb-driven pill crafting). Unlocks
  // the first time the player collects any herb (Sect Grounds Grass /
  // Borderland Root are the Iron-tier first picks).
  alchemy: {
    gate: { type: 'item_category', category: 'herbs' },
    desc: 'Brew cultivation pills in the furnace that grant passive bonuses to combat strength and training speed.',
    hint: 'Gather a herb to unlock',
    unlockMsg: 'Alchemy unlocked.',
  },
  settings: {
    gate: { type: 'always' },
    desc: null,
    hint: null,
    unlockMsg: null,
  },
  qi_crystal: {
    gate: { type: 'realm', minRealmIndex: 3 },
    desc: 'A crystallised vessel of refined Qi. Feed it QI stones to permanently boost your cultivation speed.',
    hint: 'Reach Tempered Body Layer 4',
    unlockMsg: 'Qi Crystal awakened.',
  },
};

export const FEATURE_GATES = mergeRecords(BASELINE, 'featureGates');

// ── Gate evaluation ───────────────────────────────────────────────────────────

/**
 * @param {object} gate
 * @param {{ realmIndex: number, clearedRegions: Set, getQuantity: fn }} ctx
 */
export function evaluateGate(gate, ctx) {
  const { realmIndex, clearedRegions, getQuantity } = ctx;
  switch (gate.type) {
    case 'always':
      return true;
    case 'realm':
      return realmIndex >= gate.minRealmIndex;
    case 'region_clear_any':
      return clearedRegions.size > 0;
    case 'item_any':
      return Object.values(ITEM_CATEGORIES).some(cat => cat.some(item => getQuantity(item.id) > 0));
    case 'item_category':
      return (ITEM_CATEGORIES[gate.category] ?? []).some(item => getQuantity(item.id) > 0);
    case 'all':
      return gate.gates.every(g => evaluateGate(g, ctx));
    case 'any':
      return gate.gates.some(g => evaluateGate(g, ctx));
    default:
      return true;
  }
}

// ── World unlock logic ────────────────────────────────────────────────────────

/**
 * World 1 is always open.
 * World N (N ≥ 2) requires:
 *   - realmIndex ≥ floor (World 2 = 1; later worlds use their own minRealmIndex)
 *   - the final region of the previous world has been cleared in combat
 */
export function isWorldUnlocked(worldIndex, realmIndex, clearedRegions) {
  if (worldIndex === 0) return true;
  const world      = WORLDS[worldIndex];
  const prevWorld  = WORLDS[worldIndex - 1];
  const realmFloor = worldIndex === 1 ? 1 : world.minRealmIndex;
  if (realmIndex < realmFloor) return false;
  const lastRegion = prevWorld.regions[prevWorld.regions.length - 1];
  return clearedRegions.has(lastRegion.name);
}

/** Human-readable lock hint for a world card. */
export function getWorldLockHint(worldIndex, realmIndex, clearedRegions) {
  if (worldIndex === 0) return null;
  const world      = WORLDS[worldIndex];
  const prevWorld  = WORLDS[worldIndex - 1];
  const realmFloor = worldIndex === 1 ? 1 : world.minRealmIndex;
  const prevLast   = prevWorld.regions[prevWorld.regions.length - 1];

  if (!clearedRegions.has(prevLast.name)) {
    return `Clear "${prevLast.name}" in combat to unlock`;
  }
  if (realmIndex < realmFloor) {
    return `Reach realm level ${realmFloor} to unlock`;
  }
  return null;
}
