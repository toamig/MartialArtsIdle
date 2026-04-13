/**
 * materials.js — gather/mine costs for herbs and ores.
 * Costs are in "gather points". Initial gather/mine speed = 3/sec.
 * Common=15 (5s), Uncommon=60 (20s), Rare=180 (1min), Epic=600 (3.3min), Legendary=1800 (10min)
 *
 * Each transmutation tier has two materials:
 *   _1  — used for rolling stats  (hone + add operations)
 *   _2  — used for rolling modifiers (replace operation)
 */

export const HERBS = {
  'Iron Herb 1':           { rarity: 'Common',    gatherCost: 15   },
  'Iron Herb 2':           { rarity: 'Common',    gatherCost: 15   },
  'Bronze Herb 1':         { rarity: 'Uncommon',  gatherCost: 60   },
  'Bronze Herb 2':         { rarity: 'Uncommon',  gatherCost: 60   },
  'Silver Herb 1':         { rarity: 'Rare',      gatherCost: 180  },
  'Silver Herb 2':         { rarity: 'Rare',      gatherCost: 180  },
  'Gold Herb 1':           { rarity: 'Epic',      gatherCost: 600  },
  'Gold Herb 2':           { rarity: 'Epic',      gatherCost: 600  },
  'Transcendent Herb 1':   { rarity: 'Legendary', gatherCost: 1800 },
  'Transcendent Herb 2':   { rarity: 'Legendary', gatherCost: 1800 },
};

export const ORES = {
  'Iron Mineral 1':           { rarity: 'Common',    mineCost: 15   },
  'Iron Mineral 2':           { rarity: 'Common',    mineCost: 15   },
  'Bronze Mineral 1':         { rarity: 'Uncommon',  mineCost: 60   },
  'Bronze Mineral 2':         { rarity: 'Uncommon',  mineCost: 60   },
  'Silver Mineral 1':         { rarity: 'Rare',      mineCost: 180  },
  'Silver Mineral 2':         { rarity: 'Rare',      mineCost: 180  },
  'Gold Mineral 1':           { rarity: 'Epic',      mineCost: 600  },
  'Gold Mineral 2':           { rarity: 'Epic',      mineCost: 600  },
  'Transcendent Mineral 1':   { rarity: 'Legendary', mineCost: 1800 },
  'Transcendent Mineral 2':   { rarity: 'Legendary', mineCost: 1800 },
};

export const CULTIVATION_MATERIALS = {
  iron_cultivation_1:          { name: 'Iron Cultivation 1',          rarity: 'Common'    },
  iron_cultivation_2:          { name: 'Iron Cultivation 2',          rarity: 'Common'    },
  bronze_cultivation_1:        { name: 'Bronze Cultivation 1',        rarity: 'Uncommon'  },
  bronze_cultivation_2:        { name: 'Bronze Cultivation 2',        rarity: 'Uncommon'  },
  silver_cultivation_1:        { name: 'Silver Cultivation 1',        rarity: 'Rare'      },
  silver_cultivation_2:        { name: 'Silver Cultivation 2',        rarity: 'Rare'      },
  gold_cultivation_1:          { name: 'Gold Cultivation 1',          rarity: 'Epic'      },
  gold_cultivation_2:          { name: 'Gold Cultivation 2',          rarity: 'Epic'      },
  transcendent_cultivation_1:  { name: 'Transcendent Cultivation 1',  rarity: 'Legendary' },
  transcendent_cultivation_2:  { name: 'Transcendent Cultivation 2',  rarity: 'Legendary' },
};

/** Flat lookup keyed by snake_case ID — covers all material types. */
export const ALL_MATERIALS = {
  // herbs
  iron_herb_1:             { name: 'Iron Herb 1',             rarity: 'Common',    type: 'herb' },
  iron_herb_2:             { name: 'Iron Herb 2',             rarity: 'Common',    type: 'herb' },
  bronze_herb_1:           { name: 'Bronze Herb 1',           rarity: 'Uncommon',  type: 'herb' },
  bronze_herb_2:           { name: 'Bronze Herb 2',           rarity: 'Uncommon',  type: 'herb' },
  silver_herb_1:           { name: 'Silver Herb 1',           rarity: 'Rare',      type: 'herb' },
  silver_herb_2:           { name: 'Silver Herb 2',           rarity: 'Rare',      type: 'herb' },
  gold_herb_1:             { name: 'Gold Herb 1',             rarity: 'Epic',      type: 'herb' },
  gold_herb_2:             { name: 'Gold Herb 2',             rarity: 'Epic',      type: 'herb' },
  transcendent_herb_1:     { name: 'Transcendent Herb 1',     rarity: 'Legendary', type: 'herb' },
  transcendent_herb_2:     { name: 'Transcendent Herb 2',     rarity: 'Legendary', type: 'herb' },
  // ores
  iron_mineral_1:          { name: 'Iron Mineral 1',          rarity: 'Common',    type: 'ore' },
  iron_mineral_2:          { name: 'Iron Mineral 2',          rarity: 'Common',    type: 'ore' },
  bronze_mineral_1:        { name: 'Bronze Mineral 1',        rarity: 'Uncommon',  type: 'ore' },
  bronze_mineral_2:        { name: 'Bronze Mineral 2',        rarity: 'Uncommon',  type: 'ore' },
  silver_mineral_1:        { name: 'Silver Mineral 1',        rarity: 'Rare',      type: 'ore' },
  silver_mineral_2:        { name: 'Silver Mineral 2',        rarity: 'Rare',      type: 'ore' },
  gold_mineral_1:          { name: 'Gold Mineral 1',          rarity: 'Epic',      type: 'ore' },
  gold_mineral_2:          { name: 'Gold Mineral 2',          rarity: 'Epic',      type: 'ore' },
  transcendent_mineral_1:  { name: 'Transcendent Mineral 1',  rarity: 'Legendary', type: 'ore' },
  transcendent_mineral_2:  { name: 'Transcendent Mineral 2',  rarity: 'Legendary', type: 'ore' },
  // cultivation materials
  iron_cultivation_1:      { name: 'Iron Cultivation 1',      rarity: 'Common',    type: 'cultivation' },
  iron_cultivation_2:      { name: 'Iron Cultivation 2',      rarity: 'Common',    type: 'cultivation' },
  bronze_cultivation_1:    { name: 'Bronze Cultivation 1',    rarity: 'Uncommon',  type: 'cultivation' },
  bronze_cultivation_2:    { name: 'Bronze Cultivation 2',    rarity: 'Uncommon',  type: 'cultivation' },
  silver_cultivation_1:    { name: 'Silver Cultivation 1',    rarity: 'Rare',      type: 'cultivation' },
  silver_cultivation_2:    { name: 'Silver Cultivation 2',    rarity: 'Rare',      type: 'cultivation' },
  gold_cultivation_1:      { name: 'Gold Cultivation 1',      rarity: 'Epic',      type: 'cultivation' },
  gold_cultivation_2:      { name: 'Gold Cultivation 2',      rarity: 'Epic',      type: 'cultivation' },
  transcendent_cultivation_1: { name: 'Transcendent Cultivation 1', rarity: 'Legendary', type: 'cultivation' },
  transcendent_cultivation_2: { name: 'Transcendent Cultivation 2', rarity: 'Legendary', type: 'cultivation' },
};

export const RARITY_COLOR = {
  Common:    '#aaa',
  Uncommon:  '#4ade80',
  Rare:      '#60a5fa',
  Epic:      '#c084fc',
  Legendary: '#f59e0b',
};
