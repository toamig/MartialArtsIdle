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

// Catalogue revised 2026-04-27: narrowed to 6 stats only — physical_damage,
// elemental_damage, defense, elemental_defense, health, qi_speed (qi_speed
// only appears at Gold + Transcendent). Old essence/soul/body variants
// (vestigial from the deprecated primary-stat layer) and the hand-authored
// Transcendent specials (cataclysm / dao_bulwark / world_harvest /
// exploit_mastery / transcendent_essence / eternal_vigor) are gone.
//
// Naming pattern: <Rarity> <Theme> Pill where theme = stat:
//   physical_damage  → Fist
//   elemental_damage → Ember
//   defense          → Skin
//   elemental_defense→ Ward
//   health           → Vigor
//   qi_speed         → Dao  (Gold + Trans only)
const PILL_DEFS_RAW = [
  // ── Iron (5 pills) ────────────────────────────────────────────────────────
  { id: 'iron_fist_pill',  name: 'Iron Fist Pill',  rarity: 'Iron', effects: [{ stat: 'physical_damage',  type: 'flat', value: 5  }] },
  { id: 'iron_ember_pill', name: 'Iron Ember Pill', rarity: 'Iron', effects: [{ stat: 'elemental_damage', type: 'flat', value: 5  }] },
  { id: 'iron_skin_pill',  name: 'Iron Skin Pill',  rarity: 'Iron', effects: [{ stat: 'defense',           type: 'flat', value: 5  }] },
  { id: 'iron_ward_pill',  name: 'Iron Ward Pill',  rarity: 'Iron', effects: [{ stat: 'elemental_defense', type: 'flat', value: 5  }] },
  { id: 'iron_vigor_pill', name: 'Iron Vigor Pill', rarity: 'Iron', effects: [{ stat: 'health',            type: 'flat', value: 30 }] },

  // ── Bronze (5 pills) ──────────────────────────────────────────────────────
  { id: 'bronze_fist_pill',  name: 'Bronze Fist Pill',  rarity: 'Bronze', effects: [{ stat: 'physical_damage',  type: 'flat', value: 12 }] },
  { id: 'bronze_ember_pill', name: 'Bronze Ember Pill', rarity: 'Bronze', effects: [{ stat: 'elemental_damage', type: 'flat', value: 12 }] },
  { id: 'bronze_skin_pill',  name: 'Bronze Skin Pill',  rarity: 'Bronze', effects: [{ stat: 'defense',           type: 'flat', value: 12 }] },
  { id: 'bronze_ward_pill',  name: 'Bronze Ward Pill',  rarity: 'Bronze', effects: [{ stat: 'elemental_defense', type: 'flat', value: 12 }] },
  { id: 'bronze_vigor_pill', name: 'Bronze Vigor Pill', rarity: 'Bronze', effects: [{ stat: 'health',            type: 'flat', value: 80 }] },

  // ── Silver (5 pills) ──────────────────────────────────────────────────────
  { id: 'silver_fist_pill',  name: 'Silver Fist Pill',  rarity: 'Silver', effects: [{ stat: 'physical_damage',  type: 'flat', value: 25  }] },
  { id: 'silver_ember_pill', name: 'Silver Ember Pill', rarity: 'Silver', effects: [{ stat: 'elemental_damage', type: 'flat', value: 25  }] },
  { id: 'silver_skin_pill',  name: 'Silver Skin Pill',  rarity: 'Silver', effects: [{ stat: 'defense',           type: 'flat', value: 25  }] },
  { id: 'silver_ward_pill',  name: 'Silver Ward Pill',  rarity: 'Silver', effects: [{ stat: 'elemental_defense', type: 'flat', value: 25  }] },
  { id: 'silver_vigor_pill', name: 'Silver Vigor Pill', rarity: 'Silver', effects: [{ stat: 'health',            type: 'flat', value: 175 }] },

  // ── Gold (6 pills — qi_speed unlocks here) ────────────────────────────────
  { id: 'gold_fist_pill',  name: 'Gold Fist Pill',  rarity: 'Gold', effects: [{ stat: 'physical_damage',  type: 'flat', value: 50  }] },
  { id: 'gold_ember_pill', name: 'Gold Ember Pill', rarity: 'Gold', effects: [{ stat: 'elemental_damage', type: 'flat', value: 50  }] },
  { id: 'gold_skin_pill',  name: 'Gold Skin Pill',  rarity: 'Gold', effects: [{ stat: 'defense',           type: 'flat', value: 50  }] },
  { id: 'gold_ward_pill',  name: 'Gold Ward Pill',  rarity: 'Gold', effects: [{ stat: 'elemental_defense', type: 'flat', value: 50  }] },
  { id: 'gold_vigor_pill', name: 'Gold Vigor Pill', rarity: 'Gold', effects: [{ stat: 'health',            type: 'flat', value: 400 }] },
  { id: 'gold_dao_pill',   name: 'Gold Dao Pill',   rarity: 'Gold', effects: [{ stat: 'qi_speed',          type: 'flat', value: 0.05 }] },

  // ── Transcendent (6 pills) ────────────────────────────────────────────────
  { id: 'transcendent_fist_pill',  name: 'Transcendent Fist Pill',  rarity: 'Transcendent', effects: [{ stat: 'physical_damage',  type: 'flat', value: 110 }] },
  { id: 'transcendent_ember_pill', name: 'Transcendent Ember Pill', rarity: 'Transcendent', effects: [{ stat: 'elemental_damage', type: 'flat', value: 110 }] },
  { id: 'transcendent_skin_pill',  name: 'Transcendent Skin Pill',  rarity: 'Transcendent', effects: [{ stat: 'defense',           type: 'flat', value: 110 }] },
  { id: 'transcendent_ward_pill',  name: 'Transcendent Ward Pill',  rarity: 'Transcendent', effects: [{ stat: 'elemental_defense', type: 'flat', value: 110 }] },
  { id: 'transcendent_vigor_pill', name: 'Transcendent Vigor Pill', rarity: 'Transcendent', effects: [{ stat: 'health',            type: 'flat', value: 900 }] },
  { id: 'transcendent_dao_pill',   name: 'Transcendent Dao Pill',   rarity: 'Transcendent', effects: [{ stat: 'qi_speed',          type: 'flat', value: 0.10 }] },
];

// ─── Pill categorization ─────────────────────────────────────────────────────
//
// Classify each pill by its dominant effect type so the UI can group them.
// A pill can belong to more than one category when its effects span roles
// (e.g. World Harvest → harvest + mining).

// 'cultivation' added 2026-04-27 alongside the qi_speed pills (Gold + Trans
// Dao). harvest / mining categories retained for legacy code that may filter
// on them, even though no current pill routes to them.
export const PILL_CATEGORIES = ['combat', 'cultivation', 'harvest', 'mining'];

export const PILL_CATEGORY_LABEL = {
  combat:      'Combat',
  cultivation: 'Cultivation',
  harvest:     'Harvest',
  mining:      'Mining',
};

const STAT_TO_CATEGORY = {
  // Damage
  physical_damage:      'combat',
  elemental_damage:     'combat',
  // Defense
  defense:              'combat',
  elemental_defense:    'combat',
  health:               'combat',
  // Exploit (per-hit damage-multiplier roll)
  exploit_chance:       'combat',
  exploit_attack_mult:  'combat',
  // Cultivation
  qi_speed:             'cultivation',
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
// Band pill counts: 5 / 5 / 5 / 6 / 6 — matches PILL_DEFS_RAW above (revised
// 2026-04-27, narrowed catalogue from 38 → 27 pills). Combos-per-pill rises
// from ~2.4 to ~3.4, so players have more paths to each pill.
const BAND_CONFIG = [
  { sumRange: [3, 5],   pillCount: 5, offset: 0  },  // Iron:        pills 0-4
  { sumRange: [6, 7],   pillCount: 5, offset: 5  },  // Bronze:      pills 5-9
  { sumRange: [8, 9],   pillCount: 5, offset: 10 },  // Silver:      pills 10-14
  { sumRange: [10, 11], pillCount: 6, offset: 15 },  // Gold:        pills 15-20
  { sumRange: [12, 15], pillCount: 6, offset: 21 },  // Transcendent:pills 21-26
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
