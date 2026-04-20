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
    hint: null,
    unlockMsg: null,
  },
  worlds: {
    gate: { type: 'realm', minRealmIndex: 3 },
    hint: 'Reach Tempered Body Layer 4',
    unlockMsg: 'Worlds are open. Begin your conquest.',
  },
  character: {
    gate: { type: 'always' },
    hint: null,
    unlockMsg: null,
  },
  gathering: {
    gate: { type: 'realm', minRealmIndex: 7 },
    hint: 'Reach Tempered Body Layer 8',
    unlockMsg: 'Gathering unlocked. Forage herbs in cleared regions.',
  },
  mining: {
    gate: { type: 'realm', minRealmIndex: 7 },
    hint: 'Reach Tempered Body Layer 8',
    unlockMsg: 'Mining unlocked. Dig for ores in cleared regions.',
  },
  collection: {
    gate: { type: 'always' },
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
    hint: 'Gather herbs, mine minerals, or collect a blood core to unlock',
    unlockMsg: 'Production unlocked. Craft pills and gear.',
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
    hint: 'Gather herbs, mine minerals, or collect a blood core to unlock',
    unlockMsg: 'Transmutation unlocked. Hone, replace, and upgrade your gear.',
  },
  // refining: paired with mining (ore-driven artefact/technique/law forging).
  refining: {
    gate: { type: 'realm', minRealmIndex: 7 },
    hint: 'Reach Tempered Body Layer 8',
    unlockMsg: 'Refining Furnace lit. Smelt minerals into new artefacts.',
  },
  // alchemy: paired with gathering (herb-driven pill crafting). Unlocks
  // the first time the player collects any herb (Sect Grounds Grass /
  // Borderland Root are the Iron-tier first picks).
  alchemy: {
    gate: { type: 'item_category', category: 'herbs' },
    hint: 'Gather a herb to unlock',
    unlockMsg: 'Alchemy unlocked. Brew pills in the Refining Furnace.',
  },
  settings: {
    gate: { type: 'always' },
    hint: null,
    unlockMsg: null,
  },
  qi_crystal: {
    gate: { type: 'realm', minRealmIndex: 3 },
    hint: 'Reach Tempered Body Layer 4',
    unlockMsg: 'The Qi Crystal awakens. Feed it QI stones to boost your cultivation.',
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
