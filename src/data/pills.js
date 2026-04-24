/**
 * pills.js — Pill definitions + recipe system.
 *
 * Pills grant PERMANENT stat bonuses on consumption. See src/hooks/usePills.js
 * for the accumulator that stores permanentStats in localStorage.
 *
 * Recipes are 3-herb combos (with repetition) generated at module load.
 * Constraint: max rarity tier - min rarity tier <= 2 in any recipe.
 * There are exactly 92 valid combinations, each mapped to one of 46 pills.
 */

import { HERB_ITEMS, RARITY } from './materials';
import { RARITY_TIER } from './affixPools';
import { mergeRecordArray } from './config/loader';

export { RARITY as ITEM_RARITY };

// ─── Pill definitions ────────────────────────────────────────────────────────
//
// Designer overrides: src/data/config/pills.override.json patches pills by
// `id`. Unknown ids in the override are appended as new pills. Recipe map
// (RECIPE_MAP) regenerates from HERB_ITEMS (which already respects materials
// overrides) below.
//
// Each pill entry: { id, name, rarity, effects: [{ stat, type?, value }] }
// Effect stat ids must exist in the stats system. `type: 'increased'` causes
// the value to be displayed as a percentage and applied as an INCREASED
// modifier; omit it (or use 'flat') for raw additive bonuses.

const PILL_DEFS_RAW = [
  // ── Iron (+3 primary, +5 damage, +5 defense, +40 health) ──────────────────
  { id: 'iron_essence_pill', name: 'Iron Essence Pill', rarity: 'Iron', effects: [{ stat: 'essence', type: 'flat', value: 3 }] },
  { id: 'iron_soul_pill',    name: 'Iron Soul Pill',    rarity: 'Iron', effects: [{ stat: 'soul',    type: 'flat', value: 3 }] },
  { id: 'iron_body_pill',    name: 'Iron Body Pill',    rarity: 'Iron', effects: [{ stat: 'body',    type: 'flat', value: 3 }] },
  { id: 'iron_fist_pill',    name: 'Iron Fist Pill',    rarity: 'Iron', effects: [{ stat: 'physical_damage',  type: 'flat', value: 5 }] },
  { id: 'iron_ember_pill',   name: 'Iron Ember Pill',   rarity: 'Iron', effects: [{ stat: 'elemental_damage', type: 'flat', value: 5 }] },
  { id: 'iron_skin_pill',    name: 'Iron Skin Pill',    rarity: 'Iron', effects: [{ stat: 'defense',           type: 'flat', value: 5 }] },
  { id: 'iron_ward_pill',    name: 'Iron Ward Pill',    rarity: 'Iron', effects: [{ stat: 'elemental_defense', type: 'flat', value: 5 }] },
  { id: 'iron_vigor_pill',   name: 'Iron Vigor Pill',   rarity: 'Iron', effects: [{ stat: 'health',            type: 'flat', value: 40 }] },

  // ── Bronze (+6 primary, +10 damage, +10 defense, +100 health) ─────────────
  { id: 'bronze_essence_pill', name: 'Bronze Essence Pill', rarity: 'Bronze', effects: [{ stat: 'essence', type: 'flat', value: 6 }] },
  { id: 'bronze_soul_pill',    name: 'Bronze Soul Pill',    rarity: 'Bronze', effects: [{ stat: 'soul',    type: 'flat', value: 6 }] },
  { id: 'bronze_body_pill',    name: 'Bronze Body Pill',    rarity: 'Bronze', effects: [{ stat: 'body',    type: 'flat', value: 6 }] },
  { id: 'bronze_fist_pill',    name: 'Bronze Fist Pill',    rarity: 'Bronze', effects: [{ stat: 'physical_damage',  type: 'flat', value: 10 }] },
  { id: 'bronze_ember_pill',   name: 'Bronze Ember Pill',   rarity: 'Bronze', effects: [{ stat: 'elemental_damage', type: 'flat', value: 10 }] },
  { id: 'bronze_skin_pill',    name: 'Bronze Skin Pill',    rarity: 'Bronze', effects: [{ stat: 'defense',           type: 'flat', value: 10 }] },
  { id: 'bronze_ward_pill',    name: 'Bronze Ward Pill',    rarity: 'Bronze', effects: [{ stat: 'elemental_defense', type: 'flat', value: 10 }] },
  { id: 'bronze_vigor_pill',   name: 'Bronze Vigor Pill',   rarity: 'Bronze', effects: [{ stat: 'health',            type: 'flat', value: 100 }] },

  // ── Silver (+12 primary, +20 damage, +20 defense, +250 health) ────────────
  { id: 'silver_essence_pill', name: 'Silver Essence Pill', rarity: 'Silver', effects: [{ stat: 'essence', type: 'flat', value: 12 }] },
  { id: 'silver_soul_pill',    name: 'Silver Soul Pill',    rarity: 'Silver', effects: [{ stat: 'soul',    type: 'flat', value: 12 }] },
  { id: 'silver_body_pill',    name: 'Silver Body Pill',    rarity: 'Silver', effects: [{ stat: 'body',    type: 'flat', value: 12 }] },
  { id: 'silver_fist_pill',    name: 'Silver Fist Pill',    rarity: 'Silver', effects: [{ stat: 'physical_damage',  type: 'flat', value: 20 }] },
  { id: 'silver_ember_pill',   name: 'Silver Ember Pill',   rarity: 'Silver', effects: [{ stat: 'elemental_damage', type: 'flat', value: 20 }] },
  { id: 'silver_skin_pill',    name: 'Silver Skin Pill',    rarity: 'Silver', effects: [{ stat: 'defense',           type: 'flat', value: 20 }] },
  { id: 'silver_ward_pill',    name: 'Silver Ward Pill',    rarity: 'Silver', effects: [{ stat: 'elemental_defense', type: 'flat', value: 20 }] },
  { id: 'silver_vigor_pill',   name: 'Silver Vigor Pill',   rarity: 'Silver', effects: [{ stat: 'health',            type: 'flat', value: 250 }] },

  // ── Gold (+25 primary, +40 damage, +40 defense, +600 health) ──────────────
  { id: 'gold_essence_pill', name: 'Gold Essence Pill', rarity: 'Gold', effects: [{ stat: 'essence', type: 'flat', value: 25 }] },
  { id: 'gold_soul_pill',    name: 'Gold Soul Pill',    rarity: 'Gold', effects: [{ stat: 'soul',    type: 'flat', value: 25 }] },
  { id: 'gold_body_pill',    name: 'Gold Body Pill',    rarity: 'Gold', effects: [{ stat: 'body',    type: 'flat', value: 25 }] },
  { id: 'gold_fist_pill',    name: 'Gold Fist Pill',    rarity: 'Gold', effects: [{ stat: 'physical_damage',  type: 'flat', value: 40 }] },
  { id: 'gold_ember_pill',   name: 'Gold Ember Pill',   rarity: 'Gold', effects: [{ stat: 'elemental_damage', type: 'flat', value: 40 }] },
  { id: 'gold_skin_pill',    name: 'Gold Skin Pill',    rarity: 'Gold', effects: [{ stat: 'defense',           type: 'flat', value: 40 }] },
  { id: 'gold_ward_pill',    name: 'Gold Ward Pill',    rarity: 'Gold', effects: [{ stat: 'elemental_defense', type: 'flat', value: 40 }] },
  { id: 'gold_vigor_pill',   name: 'Gold Vigor Pill',   rarity: 'Gold', effects: [{ stat: 'health',            type: 'flat', value: 600 }] },

  // ── Transcendent (premium: all-primary, utility, big bundles) ─────────────
  { id: 'transcendent_essence_pill', name: 'Transcendent Essence Pill', rarity: 'Transcendent', effects: [
    { stat: 'essence', type: 'flat', value: 50 },
    { stat: 'soul',    type: 'flat', value: 50 },
    { stat: 'body',    type: 'flat', value: 50 },
  ]},
  { id: 'exploit_mastery_pill', name: 'Exploit Mastery Pill', rarity: 'Transcendent', effects: [
    { stat: 'exploit_chance',       type: 'flat', value: 5 },
    { stat: 'exploit_attack_mult',  type: 'flat', value: 10 },
  ]},
  { id: 'world_harvest_pill', name: 'World Harvest Pill', rarity: 'Transcendent', effects: [
    { stat: 'harvest_speed', type: 'increased', value: 0.5 },
    { stat: 'mining_speed',  type: 'increased', value: 0.5 },
    { stat: 'harvest_luck',  type: 'flat',      value: 30 },
    { stat: 'mining_luck',   type: 'flat',      value: 30 },
  ]},
  { id: 'cataclysm_pill', name: 'Cataclysm Pill', rarity: 'Transcendent', effects: [
    { stat: 'physical_damage',  type: 'flat', value: 110 },
    { stat: 'elemental_damage', type: 'flat', value: 110 },
  ]},
  { id: 'dao_bulwark_pill', name: 'Dao Bulwark Pill', rarity: 'Transcendent', effects: [
    { stat: 'defense',           type: 'flat', value: 110 },
    { stat: 'elemental_defense', type: 'flat', value: 110 },
  ]},
  { id: 'eternal_vigor_pill', name: 'Eternal Vigor Pill', rarity: 'Transcendent', effects: [
    { stat: 'health', type: 'flat', value: 2000 },
  ]},
];

// ─── Pill categorization ─────────────────────────────────────────────────────
//
// Classify each pill by its dominant effect type so the UI can group them.
// A pill can belong to more than one category when its effects span roles
// (e.g. World Harvest → harvest + mining).

export const PILL_CATEGORIES = ['combat', 'harvest', 'mining'];

export const PILL_CATEGORY_LABEL = {
  combat:  'Combat',
  harvest: 'Harvest',
  mining:  'Mining',
};

const STAT_TO_CATEGORY = {
  // Primary stats — drive combat output.
  essence:              'combat',
  soul:                 'combat',
  body:                 'combat',
  // Damage
  physical_damage:      'combat',
  elemental_damage:     'combat',
  // Defense
  defense:              'combat',
  elemental_defense:    'combat',
  health:               'combat',
  // Exploit / crit-style
  exploit_chance:       'combat',
  exploit_attack_mult:  'combat',
  // Gathering utility
  harvest_speed:        'harvest',
  harvest_luck:         'harvest',
  mining_speed:         'mining',
  mining_luck:          'mining',
};

/** Returns the set of categories a pill belongs to (1..4). */
export function getPillCategories(pill) {
  const cats = new Set();
  for (const eff of pill.effects) {
    const cat = STAT_TO_CATEGORY[eff.stat];
    if (cat) cats.add(cat);
  }
  return cats;
}

// Apply designer overrides (patches by id, append unknown ids as new pills).
const PILL_DEFS = mergeRecordArray(PILL_DEFS_RAW, 'pills', 'id');

// Attach categories to each pill up-front.
for (const pill of PILL_DEFS) {
  pill.categories = Array.from(getPillCategories(pill));
}

export const PILLS = PILL_DEFS;
export const PILLS_BY_ID = {};
for (const pill of PILLS) {
  PILLS_BY_ID[pill.id] = pill;
}

// ─── Recipe generation ───────────────────────────────────────────────────────

const herbs = HERB_ITEMS;
const herbIds = herbs.map(h => h.id);
const herbRarityTier = {};
for (const h of herbs) {
  herbRarityTier[h.id] = RARITY_TIER[h.rarity];
}

// Generate all valid 3-herb combos (with repetition), i <= j <= k
const allCombos = [];
for (let i = 0; i < herbIds.length; i++) {
  for (let j = i; j < herbIds.length; j++) {
    for (let k = j; k < herbIds.length; k++) {
      const ids = [herbIds[i], herbIds[j], herbIds[k]];
      const tiers = ids.map(id => herbRarityTier[id]);
      const minT = Math.min(...tiers);
      const maxT = Math.max(...tiers);
      if (maxT - minT <= 2) {
        const sorted = [...ids].sort();
        const key = sorted.join('|');
        const tierSum = tiers.reduce((a, b) => a + b, 0);
        allCombos.push({ key, tierSum });
      }
    }
  }
}

// Sort by tier sum ascending, then by key string
allCombos.sort((a, b) => a.tierSum - b.tierSum || a.key.localeCompare(b.key));

// Assign combos to pills by tier sum ranges (round-robin within each band).
// Band pill counts: 8 / 8 / 8 / 8 / 6 — matches PILL_DEFS_RAW above.
// (Stage 3 of the overhaul removed the mind / anchor pills tied to the
// deprecated psychic_damage / soul_toughness stats.)
const BAND_CONFIG = [
  { sumRange: [3, 5],   pillCount: 8, offset: 0  },  // Iron: pills 0-7
  { sumRange: [6, 7],   pillCount: 8, offset: 8  },  // Bronze: pills 8-15
  { sumRange: [8, 9],   pillCount: 8, offset: 16 },  // Silver: pills 16-23
  { sumRange: [10, 11], pillCount: 8, offset: 24 },  // Gold: pills 24-31
  { sumRange: [12, 15], pillCount: 6, offset: 32 },  // Transcendent: pills 32-37
];

export const RECIPE_MAP = {};

for (const band of BAND_CONFIG) {
  const bandCombos = allCombos.filter(c => c.tierSum >= band.sumRange[0] && c.tierSum <= band.sumRange[1]);
  for (let i = 0; i < bandCombos.length; i++) {
    const pillIndex = band.offset + (i % band.pillCount);
    RECIPE_MAP[bandCombos[i].key] = PILLS[pillIndex].id;
  }
}

/** Reverse map: pillId → array of recipe keys (each key = "herb|herb|herb"). */
export const RECIPES_BY_PILL = {};
for (const [key, pillId] of Object.entries(RECIPE_MAP)) {
  (RECIPES_BY_PILL[pillId] ??= []).push(key);
}

/**
 * Look up a pill from 3 herb IDs.
 * @returns pill object or null
 */
export function findPill(herb1, herb2, herb3) {
  const sorted = [herb1, herb2, herb3].sort();
  const key = sorted.join('|');
  const pillId = RECIPE_MAP[key];
  return pillId ? PILLS_BY_ID[pillId] : null;
}
