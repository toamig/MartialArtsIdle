/**
 * pills.js — Pill definitions + recipe system.
 *
 * Recipes are 3-herb combos (with repetition) generated at module load.
 * Constraint: max rarity tier - min rarity tier <= 2 in any recipe.
 * There are exactly 92 valid combinations, each mapped to one of 30 pills.
 */

import { ITEMS, RARITY } from './items';
import { RARITY_TIER } from './affixPools';

export { RARITY as ITEM_RARITY };

// ─── Pill definitions ────────────────────────────────────────────────────────

const PILL_DEFS = [
  // Iron pills (5)
  { id: 'qi_condensation_pill',  name: 'Qi Condensation Pill',  rarity: 'Iron', duration: 60,  effects: [{ stat: 'qi_speed', value: 0.5 }] },
  { id: 'body_tempering_pill',   name: 'Body Tempering Pill',   rarity: 'Iron', duration: 60,  effects: [{ stat: 'defense', type: 'flat', value: 30 }] },
  { id: 'spirit_calming_pill',   name: 'Spirit Calming Pill',   rarity: 'Iron', duration: 60,  effects: [{ stat: 'harvest_speed', type: 'increased', value: 0.2 }] },
  { id: 'fortification_pill',    name: 'Fortification Pill',    rarity: 'Iron', duration: 60,  effects: [{ stat: 'health', type: 'flat', value: 50 }] },
  { id: 'miners_focus_pill',     name: "Miner's Focus Pill",    rarity: 'Iron', duration: 60,  effects: [{ stat: 'mining_speed', type: 'increased', value: 0.2 }] },

  // Bronze pills (7)
  { id: 'qi_gathering_pill',     name: 'Qi Gathering Pill',     rarity: 'Bronze', duration: 60,  effects: [{ stat: 'qi_speed', value: 1.0 }] },
  { id: 'meridian_opening_pill', name: 'Meridian Opening Pill', rarity: 'Bronze', duration: 90,  effects: [{ stat: 'qi_speed', value: 0.8 }] },
  { id: 'flame_body_pill',       name: 'Flame Body Pill',       rarity: 'Bronze', duration: 60,  effects: [{ stat: 'physical_damage', type: 'flat', value: 15 }, { stat: 'elemental_damage', type: 'flat', value: 15 }] },
  { id: 'iron_skin_pill',        name: 'Iron Skin Pill',        rarity: 'Bronze', duration: 60,  effects: [{ stat: 'defense', type: 'flat', value: 60 }, { stat: 'health', type: 'flat', value: 100 }] },
  { id: 'earth_pulse_pill',      name: 'Earth Pulse Pill',      rarity: 'Bronze', duration: 90,  effects: [{ stat: 'mining_speed', type: 'increased', value: 0.4 }] },
  { id: 'spirit_sight_pill',     name: 'Spirit Sight Pill',     rarity: 'Bronze', duration: 90,  effects: [{ stat: 'harvest_speed', type: 'increased', value: 0.4 }] },
  { id: 'qi_flow_pill',          name: 'Qi Flow Pill',          rarity: 'Bronze', duration: 45,  effects: [{ stat: 'qi_speed', value: 1.2 }] },

  // Silver pills (8)
  { id: 'profound_qi_pill',      name: 'Profound Qi Pill',      rarity: 'Silver', duration: 60,  effects: [{ stat: 'qi_speed', value: 2.0 }] },
  { id: 'dragon_blood_pill',     name: 'Dragon Blood Pill',     rarity: 'Silver', duration: 90,  effects: [{ stat: 'physical_damage', type: 'flat', value: 40 }, { stat: 'health', type: 'flat', value: 120 }] },
  { id: 'soul_stabilizing_pill', name: 'Soul Stabilizing Pill', rarity: 'Silver', duration: 60,  effects: [{ stat: 'soul_toughness', type: 'flat', value: 50 }, { stat: 'elemental_defense', type: 'flat', value: 30 }] },
  { id: 'vitality_pill',         name: 'Vitality Pill',         rarity: 'Silver', duration: 120, effects: [{ stat: 'health', type: 'flat', value: 300 }] },
  { id: 'heavenly_root_pill',    name: 'Heavenly Root Pill',    rarity: 'Silver', duration: 90,  effects: [{ stat: 'harvest_speed', type: 'increased', value: 0.6 }, { stat: 'harvest_luck', type: 'flat', value: 30 }] },
  { id: 'deep_vein_pill',        name: 'Deep Vein Pill',        rarity: 'Silver', duration: 90,  effects: [{ stat: 'mining_speed', type: 'increased', value: 0.6 }, { stat: 'mining_luck', type: 'flat', value: 30 }] },
  { id: 'qi_surge_pill',         name: 'Qi Surge Pill',         rarity: 'Silver', duration: 45,  effects: [{ stat: 'qi_speed', value: 2.5 }] },
  { id: 'combat_pill',           name: 'Combat Pill',           rarity: 'Silver', duration: 60,  effects: [{ stat: 'physical_damage', type: 'flat', value: 30 }, { stat: 'elemental_damage', type: 'flat', value: 20 }, { stat: 'defense', type: 'flat', value: 80 }] },

  // Gold pills (6)
  { id: 'qi_ascension_pill',     name: 'Qi Ascension Pill',     rarity: 'Gold', duration: 60,  effects: [{ stat: 'qi_speed', value: 5.0 }] },
  { id: 'true_element_pill',     name: 'True Element Pill',     rarity: 'Gold', duration: 90,  effects: [{ stat: 'physical_damage', type: 'flat', value: 80 }, { stat: 'elemental_damage', type: 'flat', value: 60 }, { stat: 'health', type: 'flat', value: 200 }] },
  { id: 'heaven_marrow_pill',    name: 'Heaven Marrow Pill',    rarity: 'Gold', duration: 90,  effects: [{ stat: 'defense', type: 'flat', value: 150 }, { stat: 'elemental_defense', type: 'flat', value: 50 }, { stat: 'health', type: 'flat', value: 400 }] },
  { id: 'origin_gathering_pill', name: 'Origin Gathering Pill', rarity: 'Gold', duration: 120, effects: [{ stat: 'harvest_speed', type: 'increased', value: 0.8 }, { stat: 'mining_speed', type: 'increased', value: 0.8 }] },
  { id: 'qi_breakthrough_pill',  name: 'Qi Breakthrough Pill',  rarity: 'Gold', duration: 120, effects: [{ stat: 'qi_speed', value: 4.0 }] },
  { id: 'dao_heart_pill',        name: 'Dao Heart Pill',        rarity: 'Gold', duration: 90,  effects: [{ stat: 'soul_toughness', type: 'flat', value: 100 }, { stat: 'essence', type: 'flat', value: 60 }] },

  // Transcendent pills (4)
  { id: 'immortal_qi_pill',      name: 'Immortal Qi Pill',      rarity: 'Transcendent', duration: 60,  effects: [{ stat: 'qi_speed', value: 10.0 }] },
  { id: 'heaven_defying_pill',   name: 'Heaven Defying Pill',   rarity: 'Transcendent', duration: 120, effects: [{ stat: 'physical_damage', type: 'flat', value: 200 }, { stat: 'elemental_damage', type: 'flat', value: 150 }, { stat: 'health', type: 'flat', value: 800 }] },
  { id: 'dao_foundation_pill',   name: 'Dao Foundation Pill',   rarity: 'Transcendent', duration: 120, effects: [{ stat: 'qi_speed', value: 5.0 }, { stat: 'defense', type: 'flat', value: 200 }] },
  { id: 'eternal_vigor_pill',    name: 'Eternal Vigor Pill',    rarity: 'Transcendent', duration: 120, effects: [{ stat: 'harvest_speed', type: 'increased', value: 1.0 }, { stat: 'mining_speed', type: 'increased', value: 1.0 }, { stat: 'mining_luck', type: 'flat', value: 100 }] },
];

export const PILLS = PILL_DEFS;
export const PILLS_BY_ID = {};
for (const pill of PILLS) {
  PILLS_BY_ID[pill.id] = pill;
}

// ─── Recipe generation ───────────────────────────────────────────────────────

const herbs = ITEMS.herbs;
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

// Assign combos to pills by tier sum ranges (round-robin within each band)
const BAND_CONFIG = [
  { sumRange: [3, 5],   pillCount: 5,  offset: 0  },  // Iron: pills 0-4
  { sumRange: [6, 7],   pillCount: 7,  offset: 5  },  // Bronze: pills 5-11
  { sumRange: [8, 9],   pillCount: 8,  offset: 12 },  // Silver: pills 12-19
  { sumRange: [10, 11], pillCount: 6,  offset: 20 },  // Gold: pills 20-25
  { sumRange: [12, 15], pillCount: 4,  offset: 26 },  // Transcendent: pills 26-29
];

export const RECIPE_MAP = {};

for (const band of BAND_CONFIG) {
  const bandCombos = allCombos.filter(c => c.tierSum >= band.sumRange[0] && c.tierSum <= band.sumRange[1]);
  for (let i = 0; i < bandCombos.length; i++) {
    const pillIndex = band.offset + (i % band.pillCount);
    RECIPE_MAP[bandCombos[i].key] = PILLS[pillIndex].id;
  }
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
