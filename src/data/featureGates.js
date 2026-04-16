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
import WORLDS        from './worlds';
import { ITEMS }    from './items';
import { mergeRecords } from './config/loader';

// ── Baseline ──────────────────────────────────────────────────────────────────

const BASELINE = {
  home: {
    gate: { type: 'always' },
    hint: null,
    unlockMsg: null,
  },
  combat: {
    gate: { type: 'realm', minRealmIndex: 0 },
    hint: 'Reach Tempered Body Layer 1',
    unlockMsg: 'Worlds are open. Begin your conquest.',
  },
  character: {
    gate: { type: 'realm', minRealmIndex: 0 },
    hint: 'Reach Tempered Body Layer 1',
    unlockMsg: 'Character screen unlocked. Equip techniques and artefacts.',
  },
  gathering: {
    gate: { type: 'realm', minRealmIndex: 0 },
    hint: 'Reach Tempered Body Layer 1',
    unlockMsg: 'Gathering unlocked. Forage herbs in cleared regions.',
  },
  mining: {
    gate: { type: 'realm', minRealmIndex: 0 },
    hint: 'Reach Tempered Body Layer 1',
    unlockMsg: 'Mining unlocked. Dig for ores in cleared regions.',
  },
  collection: {
    gate: { type: 'realm', minRealmIndex: 0 },
    hint: 'Reach Tempered Body Layer 1',
    unlockMsg: 'Collection unlocked. Browse your acquired items.',
  },
  production: {
    gate: { type: 'realm', minRealmIndex: 0 },
    hint: 'Reach Tempered Body Layer 1',
    unlockMsg: 'Production unlocked. Craft pills and gear.',
  },
  settings: {
    gate: { type: 'always' },
    hint: null,
    unlockMsg: null,
  },
  shop: {
    gate: { type: 'always' },
    hint: null,
    unlockMsg: null,
  },
  qi_crystal: {
    gate: { type: 'realm', minRealmIndex: 3 },
    hint: 'Reach Tempered Body Layer 4',
    unlockMsg: 'The Key Crystal awakens. Feed it QI stones to boost your cultivation.',
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
      return Object.values(ITEMS).flat().some(item => getQuantity(item.id) > 0);
    case 'item_category':
      return (ITEMS[gate.category] ?? []).some(item => getQuantity(item.id) > 0);
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
