/**
 * materials.js — canonical source of truth for all non-pill items.
 *
 * Owns: HERBS, ORES, BLOOD_CORES, CULTIVATION_MATERIALS ("QI Stones"),
 * plus the RARITY colour table re-used by components, the flat
 * ALL_MATERIALS lookup, and getRefinedQi() for QI stones.
 *
 * Rarity tier → cost (in "gather/mine points"; base speed = 3/sec):
 *   Iron: 15 (5s) | Bronze: 60 (20s) | Silver: 180 (1min) | Gold: 600 (3.3min) | Transcendent: 1800 (10min)
 *
 * Designer overrides: src/data/config/materials.override.json patches the
 * four maps under namespaced keys — records.HERBS, records.ORES,
 * records.BLOOD_CORES, records.QI_STONES — each keyed by the item id with
 * a partial patch as the value (e.g. { gatherCost: 25 }).
 */
import { getRecordsPatch } from './config/loader';

export const RARITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af' },
  Bronze:       { label: 'Bronze',       color: '#cd7f32' },
  Silver:       { label: 'Silver',       color: '#c0c0c0' },
  Gold:         { label: 'Gold',         color: '#f5c842' },
  Transcendent: { label: 'Transcendent', color: '#c084fc' },
};

// Alias retained for components that imported ITEM_RARITY historically.
export const ITEM_RARITY = RARITY;

const matsPatch = getRecordsPatch('materials');

function patchMap(map, key) {
  const patches = matsPatch[key] || {};
  for (const [id, p] of Object.entries(patches)) {
    if (!p) continue;
    map[id] = { ...(map[id] || {}), ...p };
  }
}

/** Cost per rarity tier — shared across gather and mine. */
export const RARITY_TIER_COST = {
  Iron:         15,
  Bronze:       60,
  Silver:       180,
  Gold:         600,
  Transcendent: 1800,
};

// ── Herbs (ID-keyed) ──────────────────────────────────────────────────────────
export const HERBS = {
  iron_herb_1:          { name: 'Sect Grounds Grass',  rarity: 'Iron',         gatherCost: 15,   description: 'A weed that grows wherever mortal cultivators train, soaking up residual qi from sect grounds.' },
  iron_herb_2:          { name: 'Borderland Root',     rarity: 'Iron',         gatherCost: 15,   description: 'A gnarled root found in borderland wilderness, drawn to faint spiritual energy in the soil.' },
  bronze_herb_1:        { name: 'Qi Vein Vine',        rarity: 'Bronze',       gatherCost: 60,   description: 'A creeping vine that grows along underground qi veins, its leaves faintly luminescent.' },
  bronze_herb_2:        { name: 'Spirit Forest Bloom', rarity: 'Bronze',       gatherCost: 60,   description: 'A pale flower that blooms only in the Misty Spirit Forest, pollinated by forest spirits.' },
  silver_herb_1:        { name: 'Shattered Sky Lotus', rarity: 'Silver',       gatherCost: 180,  description: 'A silver lotus that survives in the Shattered Sky Desert ruins, drawing water from deep ley lines.' },
  silver_herb_2:        { name: 'Blood Sea Reed',      rarity: 'Silver',       gatherCost: 180,  description: 'A blood-red reed that grows at the edges of the blood sea, its sap thick with corrupted vitality.' },
  gold_herb_1:          { name: 'Saint Burial Lotus',  rarity: 'Gold',         gatherCost: 600,  description: 'A dark lotus that blooms only above saint-grade burial sites, feeding on centuries of death qi.' },
  gold_herb_2:          { name: 'Void Thorn Vine',     rarity: 'Gold',         gatherCost: 600,  description: 'A thorned vine that grows through rift cracks, its barbs sharp enough to pierce saint-grade defenses.' },
  transcendent_herb_1:  { name: 'Origin Spring Petal', rarity: 'Transcendent', gatherCost: 1800, description: "A petal shed by flowers growing at the world's origin qi springs, saturated with primordial energy." },
  transcendent_herb_2:  { name: 'Open Heaven Vine',    rarity: 'Transcendent', gatherCost: 1800, description: 'A legendary vine whose roots reach up into the Open Heaven realm itself, channeling heaven-grade energy.' },
};

// ── Ores (ID-keyed) ───────────────────────────────────────────────────────────
export const ORES = {
  iron_mineral_1:         { name: 'Sect Iron Shard',      rarity: 'Iron',         mineCost: 15,   description: 'A fragment of iron-grade material shed from sect constructs, training equipment, and the iron of mortal cultivators.' },
  iron_mineral_2:         { name: 'Iron Vein Shard',      rarity: 'Iron',         mineCost: 15,   description: 'A dense shard of iron ore extracted from shallow veins, used in basic transmutation.' },
  bronze_mineral_1:       { name: 'Reinforced Steel Thread', rarity: 'Bronze',       mineCost: 60,   description: '- TBD -' },
  bronze_mineral_2:       { name: 'Ancient Quartz',          rarity: 'Bronze',       mineCost: 60,   description: '- TBD -' },
  silver_mineral_1:       { name: 'Corrupted Silver Ore',    rarity: 'Silver',       mineCost: 180,  description: '- TBD -' },
  silver_mineral_2:       { name: 'Ghost Jade',              rarity: 'Silver',       mineCost: 180,  description: '- TBD -' },
  gold_mineral_1:         { name: 'Sun-forged Iron',         rarity: 'Gold',         mineCost: 600,  description: '- TBD -' },
  gold_mineral_2:         { name: 'Void Crystal',            rarity: 'Gold',         mineCost: 600,  description: 'A crystal grown inside rift tears, its structure formed entirely by compressed void energy.' },
  transcendent_mineral_1: { name: 'Divine Netherstone',      rarity: 'Transcendent', mineCost: 1800, description: '- TBD -' },
  transcendent_mineral_2: { name: 'World Stone Core',     rarity: 'Transcendent', mineCost: 1800, description: "An impossibly dense stone core formed at the world's deepest strata or shed by titans of the upper heaven, used only in the most advanced transmutation." },
};

// ── Blood Cores (combat drops only — no gather/mine cost) ─────────────────────
export const BLOOD_CORES = {
  iron_blood_core_1:         { name: 'Weak Blood Core',       rarity: 'Iron',         description: '- TBD -' },
  iron_blood_core_2:         { name: 'Mortal Beast Core',     rarity: 'Iron',         description: '- TBD -' },
  bronze_blood_core_1:       { name: 'Elemental Beast Core',  rarity: 'Bronze',       description: '- TBD -' },
  bronze_blood_core_2:       { name: 'Pure Elemental Core',   rarity: 'Bronze',       description: '- TBD -' },
  silver_blood_core_1:       { name: 'Void Beast Core',       rarity: 'Silver',       description: '- TBD -' },
  silver_blood_core_2:       { name: 'Spirit Core',           rarity: 'Silver',       description: '- TBD -' },
  gold_blood_core_1:         { name: 'Ancient Beast Core',    rarity: 'Gold',         description: '- TBD -' },
  gold_blood_core_2:         { name: 'Void-forged Core',      rarity: 'Gold',         description: '- TBD -' },
  transcendent_blood_core_1: { name: 'Dao-inscribed Core',    rarity: 'Transcendent', description: '- TBD -' },
  transcendent_blood_core_2: { name: 'Heavenly Dao Core',     rarity: 'Transcendent', description: '- TBD -' },
};

// ── QI Stones — cultivation materials (ID-keyed) ──────────────────────────────
// QI stones drop from all three activities (combat, gathering, mining).
export const CULTIVATION_MATERIALS = {
  iron_cultivation_1:         { name: 'Qi Stone',               rarity: 'Iron',         gatherCost: 15,   mineCost: 15,   refinedQi: 5,    description: '- TBD -' },
  iron_cultivation_2:         { name: 'Stray Qi Stone',         rarity: 'Iron',         gatherCost: 15,   mineCost: 15,   refinedQi: 8,    description: '- TBD -' },
  bronze_cultivation_1:       { name: 'Pulse Qi Stone',         rarity: 'Bronze',       gatherCost: 60,   mineCost: 60,   refinedQi: 20,   description: '- TBD -' },
  bronze_cultivation_2:       { name: 'Demonheart Qi Stone',    rarity: 'Bronze',       gatherCost: 60,   mineCost: 60,   refinedQi: 30,   description: '- TBD -' },
  silver_cultivation_1:       { name: 'Saint QI Stone',         rarity: 'Silver',       gatherCost: 180,  mineCost: 180,  refinedQi: 80,   description: '- TBD -' },
  silver_cultivation_2:       { name: 'Condensed QI Stone',     rarity: 'Silver',       gatherCost: 180,  mineCost: 180,  refinedQi: 120,  description: '- TBD -' },
  gold_cultivation_1:         { name: 'Dragonpulse Qi Stone',   rarity: 'Gold',         gatherCost: 600,  mineCost: 600,  refinedQi: 300,  description: '- TBD -' },
  gold_cultivation_2:         { name: 'Void-forged QI Stone',   rarity: 'Gold',         gatherCost: 600,  mineCost: 600,  refinedQi: 450,  description: '- TBD -' },
  transcendent_cultivation_1: { name: 'Primordial Qi Stone ',   rarity: 'Transcendent', gatherCost: 1800, mineCost: 1800, refinedQi: 1000, description: '- TBD -' },
  transcendent_cultivation_2: { name: 'Heavenscribed Qi Stone', rarity: 'Transcendent', gatherCost: 1800, mineCost: 1800, refinedQi: 1500, description: '- TBD -' },
};

// Apply designer overrides BEFORE building ALL_MATERIALS so the flat lookup
// sees the final patched records.
patchMap(HERBS,                 'HERBS');
patchMap(ORES,                  'ORES');
patchMap(BLOOD_CORES,           'BLOOD_CORES');
patchMap(CULTIVATION_MATERIALS, 'QI_STONES');

// ── Flat lookup keyed by snake_case ID — covers every material type ──────────
export const ALL_MATERIALS = {};
for (const [id, rec] of Object.entries(HERBS))                 ALL_MATERIALS[id] = { ...rec, type: 'herb' };
for (const [id, rec] of Object.entries(ORES))                  ALL_MATERIALS[id] = { ...rec, type: 'ore' };
for (const [id, rec] of Object.entries(BLOOD_CORES))           ALL_MATERIALS[id] = { ...rec, type: 'blood_core' };
for (const [id, rec] of Object.entries(CULTIVATION_MATERIALS)) ALL_MATERIALS[id] = { ...rec, type: 'cultivation' };

// ── Array-form exports — consumers that iterate a category ───────────────────
// Each element is a plain object with `id` prepended so existing code using
// `.map(h => h.id)` and `.filter(h => ...)` keeps working.
function toArray(map) {
  return Object.entries(map).map(([id, rec]) => ({ id, ...rec }));
}
export const HERB_ITEMS        = toArray(HERBS);
export const ORE_ITEMS         = toArray(ORES);
export const BLOOD_CORE_ITEMS  = toArray(BLOOD_CORES);
export const CULTIVATION_ITEMS = toArray(CULTIVATION_MATERIALS);

/**
 * Look up the gather cost for any item by ID.
 * Falls back to RARITY_TIER_COST[rarity] if the item doesn't have a direct gatherCost.
 */
export function getGatherCost(itemId) {
  const mat = ALL_MATERIALS[itemId];
  if (!mat) return 30;
  return mat.gatherCost ?? RARITY_TIER_COST[mat.rarity] ?? 30;
}

/**
 * Look up the mine cost for any item by ID.
 */
export function getMineCost(itemId) {
  const mat = ALL_MATERIALS[itemId];
  if (!mat) return 30;
  return mat.mineCost ?? RARITY_TIER_COST[mat.rarity] ?? 30;
}

/** Look up the refined QI value of a cultivation stone by item id. */
export function getRefinedQi(itemId) {
  return CULTIVATION_MATERIALS[itemId]?.refinedQi ?? 0;
}
