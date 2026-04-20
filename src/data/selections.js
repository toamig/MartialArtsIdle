/**
 * selections.js — pool of options for the pick-1-of-3 reward system.
 *
 * Every level-up generates a minor selection; every realm-name change
 * (Tempered Body → Qi Transformation etc.) generates a breakthrough selection.
 *
 * effect / effects shape:
 *   { type: 'stat_mod', stat: string, mod: 'flat'|'increased'|'more', value: number }
 *   { type: 'special',  key: string,  value: number }
 *
 * stat_mod keys feed directly into mergeModifiers / computeAllStats.
 * special keys are checked per-system (offline calc, combat, etc.).
 *
 * Designer overrides: src/data/config/selections.override.json patches by id.
 */

import { mergeSingleton } from './config/loader';

// ── Rarity roll weights ───────────────────────────────────────────────────────
export const SELECTION_RARITY = {
  common:      { label: 'Common',      color: '#9ca3af' },
  rare:        { label: 'Rare',        color: '#60a5fa' },
  epic:        { label: 'Epic',        color: '#c084fc' },
};

export const MINOR_WEIGHTS       = { common: 70, rare: 25, epic: 5  };
export const BREAKTHROUGH_WEIGHTS = { common: 20, rare: 50, epic: 30 };

// ── Option pool ───────────────────────────────────────────────────────────────

const POOL_RAW = [

  // ── Cultivation ─────────────────────────────────────────────────────────────

  {
    id: 'focused_breathing',
    name: 'Focused Breathing',
    description: '+20% cultivation speed while focusing',
    category: 'cultivation',
    rarity: 'common',
    minRealmIndex: 0,
    maxStacks: 6,
    effects: [{ type: 'stat_mod', stat: 'qi_focus_mult', mod: 'increased', value: 0.20 }],
  },
  {
    id: 'deep_concentration',
    name: 'Deep Concentration',
    description: '+10% cultivation speed while focusing',
    category: 'cultivation',
    rarity: 'common',
    minRealmIndex: 0,
    maxStacks: 10,
    effects: [{ type: 'stat_mod', stat: 'qi_focus_mult', mod: 'increased', value: 0.10 }],
  },
  {
    id: 'void_comprehension',
    name: 'Void Comprehension',
    description: '+20% base cultivation speed',
    category: 'cultivation',
    rarity: 'rare',
    minRealmIndex: 0,
    maxStacks: 4,
    effects: [{ type: 'special', key: 'qi_speed_mult', value: 0.20 }],
  },
  {
    id: 'dao_insight',
    name: 'Dao Insight',
    description: '+50% base cultivation speed',
    category: 'cultivation',
    rarity: 'epic',
    minRealmIndex: 10,
    maxStacks: 2,
    effects: [{ type: 'special', key: 'qi_speed_mult', value: 0.50 }],
  },
  {
    id: 'eternal_wellspring',
    name: 'Eternal Wellspring',
    description: '+30% offline qi accumulation',
    category: 'cultivation',
    rarity: 'epic',
    minRealmIndex: 14,
    maxStacks: 3,
    effects: [{ type: 'special', key: 'offline_qi_mult', value: 0.30 }],
  },

  // ── Combat ──────────────────────────────────────────────────────────────────

  {
    id: 'iron_physique',
    name: 'Iron Physique',
    description: '+100 Health',
    category: 'combat',
    rarity: 'common',
    minRealmIndex: 0,
    maxStacks: 10,
    effects: [{ type: 'stat_mod', stat: 'health', mod: 'flat', value: 100 }],
  },
  {
    id: 'martial_vigor',
    name: 'Martial Vigor',
    description: '+12 Physical Damage',
    category: 'combat',
    rarity: 'common',
    minRealmIndex: 0,
    maxStacks: 8,
    effects: [{ type: 'stat_mod', stat: 'physical_damage', mod: 'flat', value: 12 }],
  },
  {
    id: 'elemental_touch',
    name: 'Elemental Touch',
    description: '+12 Elemental Damage',
    category: 'combat',
    rarity: 'common',
    minRealmIndex: 0,
    maxStacks: 8,
    effects: [{ type: 'stat_mod', stat: 'elemental_damage', mod: 'flat', value: 12 }],
  },
  {
    id: 'reinforced_meridians',
    name: 'Reinforced Meridians',
    description: '+10 Defense',
    category: 'combat',
    rarity: 'common',
    minRealmIndex: 0,
    maxStacks: 8,
    effects: [{ type: 'stat_mod', stat: 'defense', mod: 'flat', value: 10 }],
  },
  {
    id: 'predator_eye',
    name: 'Predator\'s Eye',
    description: '+6% Exploit Chance',
    category: 'combat',
    rarity: 'rare',
    minRealmIndex: 5,
    maxStacks: 4,
    effects: [{ type: 'stat_mod', stat: 'exploit_chance', mod: 'flat', value: 6 }],
  },
  {
    id: 'killing_aura',
    name: 'Killing Aura',
    description: '+15% Physical Damage',
    category: 'combat',
    rarity: 'rare',
    minRealmIndex: 5,
    maxStacks: 3,
    effects: [{ type: 'stat_mod', stat: 'physical_damage', mod: 'increased', value: 0.15 }],
  },
  {
    id: 'elemental_mastery',
    name: 'Elemental Mastery',
    description: '+15% Elemental Damage',
    category: 'combat',
    rarity: 'rare',
    minRealmIndex: 5,
    maxStacks: 3,
    effects: [{ type: 'stat_mod', stat: 'elemental_damage', mod: 'increased', value: 0.15 }],
  },
  {
    id: 'iron_fortress',
    name: 'Iron Fortress',
    description: '+20% Defense',
    category: 'combat',
    rarity: 'rare',
    minRealmIndex: 0,
    maxStacks: 3,
    effects: [{ type: 'stat_mod', stat: 'defense', mod: 'increased', value: 0.20 }],
  },
  {
    id: 'soul_barrier',
    name: 'Soul Barrier',
    description: '+15% Elemental Defense',
    category: 'combat',
    rarity: 'rare',
    minRealmIndex: 10,
    maxStacks: 3,
    effects: [{ type: 'stat_mod', stat: 'elemental_defense', mod: 'increased', value: 0.15 }],
  },
  {
    id: 'exploit_mastery',
    name: 'Exploit Mastery',
    description: '+15% Exploit Chance, +25% Exploit Damage',
    category: 'combat',
    rarity: 'epic',
    minRealmIndex: 18,
    maxStacks: 2,
    effects: [
      { type: 'stat_mod', stat: 'exploit_chance',      mod: 'flat', value: 15 },
      { type: 'stat_mod', stat: 'exploit_attack_mult', mod: 'flat', value: 25 },
    ],
  },
  {
    id: 'void_cleaver',
    name: 'Void Cleaver',
    description: '×1.30 Physical & Elemental Damage',
    category: 'combat',
    rarity: 'epic',
    minRealmIndex: 18,
    maxStacks: 2,
    effects: [
      { type: 'stat_mod', stat: 'physical_damage',   mod: 'more', value: 1.30 },
      { type: 'stat_mod', stat: 'elemental_damage',  mod: 'more', value: 1.30 },
    ],
  },
  {
    id: 'heaven_shield',
    name: 'Heaven Shield',
    description: '×1.25 Defense, +500 Health',
    category: 'combat',
    rarity: 'epic',
    minRealmIndex: 14,
    maxStacks: 2,
    effects: [
      { type: 'stat_mod', stat: 'defense', mod: 'more',  value: 1.25 },
      { type: 'stat_mod', stat: 'health',  mod: 'flat',  value: 500  },
    ],
  },

  // ── Gathering ───────────────────────────────────────────────────────────────

  {
    id: 'herb_sense',
    name: 'Herb Sense',
    description: '+8 Harvest Luck',
    category: 'gathering',
    rarity: 'common',
    minRealmIndex: 0,
    maxStacks: 8,
    effects: [{ type: 'stat_mod', stat: 'harvest_luck', mod: 'flat', value: 8 }],
  },
  {
    id: 'swift_hands',
    name: 'Swift Hands',
    description: '+10% Harvest Speed',
    category: 'gathering',
    rarity: 'common',
    minRealmIndex: 0,
    maxStacks: 6,
    effects: [{ type: 'stat_mod', stat: 'harvest_speed', mod: 'increased', value: 0.10 }],
  },
  {
    id: 'nature_affinity',
    name: 'Nature Affinity',
    description: '+25% Harvest Speed',
    category: 'gathering',
    rarity: 'rare',
    minRealmIndex: 0,
    maxStacks: 3,
    effects: [{ type: 'stat_mod', stat: 'harvest_speed', mod: 'increased', value: 0.25 }],
  },
  {
    id: 'treasure_nose',
    name: 'Treasure Nose',
    description: '+25 Harvest Luck',
    category: 'gathering',
    rarity: 'rare',
    minRealmIndex: 0,
    maxStacks: 3,
    effects: [{ type: 'stat_mod', stat: 'harvest_luck', mod: 'flat', value: 25 }],
  },
  {
    id: 'forest_sage',
    name: 'Forest Sage',
    description: '+50% Harvest Speed, +40 Harvest Luck',
    category: 'gathering',
    rarity: 'epic',
    minRealmIndex: 10,
    maxStacks: 2,
    effects: [
      { type: 'stat_mod', stat: 'harvest_speed', mod: 'increased', value: 0.50 },
      { type: 'stat_mod', stat: 'harvest_luck',  mod: 'flat',      value: 40  },
    ],
  },

  // ── Mining ──────────────────────────────────────────────────────────────────

  {
    id: 'earth_sense',
    name: 'Earth Sense',
    description: '+8 Mining Luck',
    category: 'mining',
    rarity: 'common',
    minRealmIndex: 0,
    maxStacks: 8,
    effects: [{ type: 'stat_mod', stat: 'mining_luck', mod: 'flat', value: 8 }],
  },
  {
    id: 'strong_arms',
    name: 'Strong Arms',
    description: '+10% Mining Speed',
    category: 'mining',
    rarity: 'common',
    minRealmIndex: 0,
    maxStacks: 6,
    effects: [{ type: 'stat_mod', stat: 'mining_speed', mod: 'increased', value: 0.10 }],
  },
  {
    id: 'vein_reader',
    name: 'Vein Reader',
    description: '+25% Mining Speed',
    category: 'mining',
    rarity: 'rare',
    minRealmIndex: 0,
    maxStacks: 3,
    effects: [{ type: 'stat_mod', stat: 'mining_speed', mod: 'increased', value: 0.25 }],
  },
  {
    id: 'ore_sight',
    name: 'Ore Sight',
    description: '+25 Mining Luck',
    category: 'mining',
    rarity: 'rare',
    minRealmIndex: 0,
    maxStacks: 3,
    effects: [{ type: 'stat_mod', stat: 'mining_luck', mod: 'flat', value: 25 }],
  },
  {
    id: 'mountain_heart',
    name: 'Mountain Heart',
    description: '+50% Mining Speed, +40 Mining Luck',
    category: 'mining',
    rarity: 'epic',
    minRealmIndex: 14,
    maxStacks: 2,
    effects: [
      { type: 'stat_mod', stat: 'mining_speed', mod: 'increased', value: 0.50 },
      { type: 'stat_mod', stat: 'mining_luck',  mod: 'flat',      value: 40  },
    ],
  },

  // ── Economy ─────────────────────────────────────────────────────────────────

  {
    id: 'material_affinity',
    name: 'Material Affinity',
    description: '+15% material drop quantity',
    category: 'economy',
    rarity: 'rare',
    minRealmIndex: 0,
    maxStacks: 4,
    effects: [{ type: 'special', key: 'material_drop_mult', value: 0.15 }],
  },
  {
    id: 'lucky_star',
    name: 'Lucky Star',
    description: '+8% chance for rare material drops',
    category: 'economy',
    rarity: 'epic',
    minRealmIndex: 18,
    maxStacks: 2,
    effects: [{ type: 'special', key: 'rare_drop_chance', value: 0.08 }],
  },
  {
    id: 'jade_affinity',
    name: 'Jade Affinity',
    description: 'Earn +1 Jade per realm breakthrough',
    category: 'economy',
    rarity: 'rare',
    minRealmIndex: 0,
    maxStacks: 5,
    effects: [{ type: 'special', key: 'jade_per_breakthrough', value: 1 }],
  },

  // ── Special ─────────────────────────────────────────────────────────────────

  {
    id: 'resilient_will',
    name: 'Resilient Will',
    description: 'Reduce HP lost on combat defeat by 20%',
    category: 'special',
    rarity: 'rare',
    minRealmIndex: 10,
    maxStacks: 3,
    effects: [{ type: 'special', key: 'death_penalty_reduction', value: 0.20 }],
  },
  {
    id: 'swift_comprehension',
    name: 'Swift Comprehension',
    description: 'Technique cooldowns -10%',
    category: 'special',
    rarity: 'epic',
    minRealmIndex: 14,
    maxStacks: 3,
    effects: [{ type: 'special', key: 'tech_cd_reduction', value: 0.10 }],
  },
  {
    id: 'balanced_cultivation',
    name: 'Balanced Cultivation',
    description: '+5% to all primary stats (Essence, Soul, Body)',
    category: 'special',
    rarity: 'epic',
    minRealmIndex: 24,
    maxStacks: 2,
    effects: [
      { type: 'stat_mod', stat: 'essence', mod: 'increased', value: 0.05 },
      { type: 'stat_mod', stat: 'soul',    mod: 'increased', value: 0.05 },
      { type: 'stat_mod', stat: 'body',    mod: 'increased', value: 0.05 },
    ],
  },
];

// Apply designer overrides
export const SELECTION_POOL = mergeSingleton(POOL_RAW, 'selections') ?? POOL_RAW;

export const SELECTION_BY_ID = {};
for (const opt of SELECTION_POOL) {
  SELECTION_BY_ID[opt.id] = opt;
}

/**
 * Roll 3 distinct options from the pool.
 *
 * Rules:
 * - Respects minRealmIndex
 * - Won't offer an option already at maxStacks
 * - Tries to include options from different categories (soft rule)
 * - Weighted by rarity (minor vs breakthrough weights)
 *
 * @param {number}  realmIndex
 * @param {object}  activeStacks     { optionId: count }
 * @param {'minor'|'breakthrough'} tier
 * @returns {string[]}  array of 3 option IDs
 */
export function rollOptions(realmIndex, activeStacks, tier, optionCount = 3) {
  const weights = tier === 'breakthrough' ? BREAKTHROUGH_WEIGHTS : MINOR_WEIGHTS;

  const eligible = SELECTION_POOL.filter(opt => {
    const currentStacks = activeStacks[opt.id] ?? 0;
    return realmIndex >= opt.minRealmIndex && currentStacks < opt.maxStacks;
  });

  if (eligible.length === 0) return [];

  function weightedPick(pool) {
    const totalWeight = pool.reduce((sum, opt) => sum + (weights[opt.rarity] ?? 10), 0);
    let r = Math.random() * totalWeight;
    for (const opt of pool) {
      r -= weights[opt.rarity] ?? 10;
      if (r <= 0) return opt;
    }
    return pool[pool.length - 1];
  }

  const picked = [];
  const usedCategories = new Set();

  for (let attempt = 0; attempt < optionCount; attempt++) {
    // Soft category diversity: prefer unused categories on first pass
    const preferDiverse = eligible.filter(
      o => !picked.some(p => p.id === o.id) && !usedCategories.has(o.category)
    );
    const pool = preferDiverse.length > 0
      ? preferDiverse
      : eligible.filter(o => !picked.some(p => p.id === o.id));

    if (pool.length === 0) break;
    const choice = weightedPick(pool);
    picked.push(choice);
    usedCategories.add(choice.category);
  }

  return picked.map(o => o.id);
}
