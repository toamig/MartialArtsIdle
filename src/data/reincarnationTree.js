/**
 * Eternal Tree — Plan B V1 redesign (2026-05-21).
 *
 * The previous tree (5 thematic branches + cross-branch capstones, 24 nodes,
 * total cost 143) has been scrapped per design direction. This V1 ships only
 * the **Producer Evolution** branch — eleven nodes that solve the immediate
 * "first producer becomes irrelevant" problem via the Tier-Up Resonance
 * mechanic (see `src/hooks/useTierUpResonance.js`).
 *
 * Other branches (Cultivation, Combat, Offline, etc.) are stubbed for the UI
 * (V1.3) as "Coming soon" placeholders and will land in V7+ of the rollout.
 *
 * Schema:
 *   BRANCHES — array of { id, name, color, colorRgb }
 *   NODES    — array of { id, branchId, x, y, cost, name, desc, requires,
 *                         effect: { type, ... } }
 *
 * Coordinates are 0-100 % of the canvas (rendered by the V1.3 UI).
 *
 * Effect types:
 *   tier_up_base                — { value }            adds to tier-up baseline (all producers)
 *   tier_up_per_producer        — { producerId, value } adds to tier-up amplifier (one producer)
 *
 * The hook (useReincarnationTree) walks every purchased node, sums the
 * effects, and exposes the results as { tierUpResonanceBase, tierUpResonancePerProducer }
 * on `tree.modifiers`. Future branches add new effect types here.
 *
 * Save migration: detection + one-shot refund lives in
 * `src/systems/treeMigration.js`. Triggered at module load on the FIRST
 * boot after this redesign ships. Wipes old purchase ids, refunds karma
 * to the player's `totalKarmaForPeak(maxAwarded)` total.
 */

// Karma earning thresholds — these are FROM THE OLD TREE and preserved
// here for V1 because the karma rework is deferred to V2 (see plan file).
// Existing consumers (useReincarnationKarma) import these by name.
export const SAINT_UNLOCK_INDEX = 24;
export const PEAK_INDEX         = 50;

/**
 * Karma awarded for first-time breakthrough INTO realm index `i`.
 * Curve unchanged from pre-Plan-B (total 143 over peak life). V2 will
 * redesign this to Idle Slayer's multi-source model.
 */
export function karmaForReachingIndex(i) {
  if (i <= 0) return 0;
  if (i <= 17) return 2;
  if (i <= 23) return 3;
  if (i <= 26) return 1;
  if (i <= 32) return 2;
  if (i <= 38) return 3;
  if (i <= 44) return 4;
  if (i <= 46) return 5;
  return 6;
}

export function totalKarmaForPeak(maxIndex) {
  let total = 0;
  for (let i = 1; i <= maxIndex; i++) total += karmaForReachingIndex(i);
  return total;
}

// ── Branches ──────────────────────────────────────────────────────────────

export const BRANCHES = {
  producer_evolution: {
    id: 'producer_evolution',
    label: 'Producer Evolution',
    color: '#4ade80',
    colorRgb: '74,222,128',
  },
  // V7+ stubs — surfaced by the UI as "Coming soon" placeholders.
  cultivation_path: {
    id: 'cultivation_path',
    label: 'Cultivation Path',
    color: '#22d3ee',
    colorRgb: '34,211,238',
    placeholder: true,
  },
  combat_path: {
    id: 'combat_path',
    label: 'Combat Path',
    color: '#ef4444',
    colorRgb: '239,68,68',
    placeholder: true,
  },
  offline_path: {
    id: 'offline_path',
    label: 'Offline Path',
    color: '#a78bfa',
    colorRgb: '167,139,250',
    placeholder: true,
  },
};

// ── Nodes ─────────────────────────────────────────────────────────────────
//
// All Producer Evolution leaves require the root (`pe_root`) directly.
// Costs follow a placeholder curve proportional to each producer's
// `startQiPerSec × 50` rounded into karma units 3-8. Tune via playtest.

export const NODES = [
  {
    id:       'pe_root',
    branchId: 'producer_evolution',
    x: 50, y: 8,
    cost: 5,
    name: 'Producer Mastery',
    desc: 'Tier-Up Resonance unlocked. Every producer gains +0.5 qi/s per unit for each sprite tier it has reached this run.',
    requires: [],
    effect: { type: 'tier_up_base', value: 0.5 },
  },
  {
    id:       'pe_disciple_res',
    branchId: 'producer_evolution',
    x: 28, y: 20,
    cost: 3,
    name: 'Disciple Resonance',
    desc: 'Body Tempering Disciples gain an additional +5 qi/s per unit for each sprite tier they reach.',
    requires: ['pe_root'],
    effect: { type: 'tier_up_per_producer', producerId: 'p_disciple', value: 5 },
  },
  {
    id:       'pe_herb_garden_res',
    branchId: 'producer_evolution',
    x: 72, y: 20,
    cost: 4,
    name: 'Garden Resonance',
    desc: 'Spirit Herb Gardens gain +50 qi/s per unit for each sprite tier they reach.',
    requires: ['pe_root'],
    effect: { type: 'tier_up_per_producer', producerId: 'p_herb_garden', value: 50 },
  },
  {
    id:       'pe_meridian_furnace_res',
    branchId: 'producer_evolution',
    x: 28, y: 30,
    cost: 4,
    name: 'Furnace Resonance',
    desc: 'Meridian Furnaces gain +400 qi/s per unit for each sprite tier they reach.',
    requires: ['pe_root'],
    effect: { type: 'tier_up_per_producer', producerId: 'p_meridian_furnace', value: 400 },
  },
  {
    id:       'pe_treasure_res',
    branchId: 'producer_evolution',
    x: 72, y: 30,
    cost: 5,
    name: 'Treasure Resonance',
    desc: 'Ancestral Treasures gain +2,500 qi/s per unit for each sprite tier they reach.',
    requires: ['pe_root'],
    effect: { type: 'tier_up_per_producer', producerId: 'p_treasure', value: 2_500 },
  },
  {
    id:       'pe_beast_pact_res',
    branchId: 'producer_evolution',
    x: 28, y: 40,
    cost: 5,
    name: 'Beast Resonance',
    desc: 'Spirit Beast Pacts gain +13,000 qi/s per unit for each sprite tier they reach.',
    requires: ['pe_root'],
    effect: { type: 'tier_up_per_producer', producerId: 'p_beast_pact', value: 13_000 },
  },
  {
    id:       'pe_pillar_res',
    branchId: 'producer_evolution',
    x: 72, y: 40,
    cost: 6,
    name: 'Pillar Resonance',
    desc: 'Heavenly Pillars gain +70,000 qi/s per unit for each sprite tier they reach.',
    requires: ['pe_root'],
    effect: { type: 'tier_up_per_producer', producerId: 'p_pillar', value: 70_000 },
  },
  {
    id:       'pe_sect_followers_res',
    branchId: 'producer_evolution',
    x: 28, y: 50,
    cost: 6,
    name: 'Sect Resonance',
    desc: 'Mortal Sect Followers gain +400,000 qi/s per unit for each sprite tier they reach.',
    requires: ['pe_root'],
    effect: { type: 'tier_up_per_producer', producerId: 'p_sect_followers', value: 400_000 },
  },
  {
    id:       'pe_void_res',
    branchId: 'producer_evolution',
    x: 72, y: 50,
    cost: 7,
    name: 'Void Resonance',
    desc: 'Void Conduits gain +2.2M qi/s per unit for each sprite tier they reach.',
    requires: ['pe_root'],
    effect: { type: 'tier_up_per_producer', producerId: 'p_void', value: 2_200_000 },
  },
  {
    id:       'pe_dragon_res',
    branchId: 'producer_evolution',
    x: 28, y: 60,
    cost: 7,
    name: 'Dragon Resonance',
    desc: 'Slumbering Spirit Dragons gain +13M qi/s per unit for each sprite tier they reach.',
    requires: ['pe_root'],
    effect: { type: 'tier_up_per_producer', producerId: 'p_dragon', value: 13_000_000 },
  },
  {
    id:       'pe_phoenix_res',
    branchId: 'producer_evolution',
    x: 72, y: 60,
    cost: 8,
    name: 'Phoenix Resonance',
    desc: 'Sovereign Phoenixes gain +80M qi/s per unit for each sprite tier they reach.',
    requires: ['pe_root'],
    effect: { type: 'tier_up_per_producer', producerId: 'p_phoenix', value: 80_000_000 },
  },
];

export const NODES_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));

export const TREE_TOTAL_COST = NODES.reduce((s, n) => s + n.cost, 0);

// ── Legacy stub exports ───────────────────────────────────────────────────
//
// The OLD tree exported MAIN_KEYSTONES (the four ★ keystones used to gate
// the Yin Yang branch) and NODE_DESCRIPTIONS (a tooltip map). Several
// screens still import these — they're replaced in V1.3 alongside the new
// UI. Until then, expose empty stubs so build keeps passing. The legacy
// screens will render no content; they're suppressed from the route in
// V1.3 too.

/** @deprecated Removed in Plan B V1 — kept as empty stub for legacy imports. */
export const MAIN_KEYSTONES = [];

/** @deprecated Removed in Plan B V1 — descriptions live on each node now. */
export const NODE_DESCRIPTIONS = {};
