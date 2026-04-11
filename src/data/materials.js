/**
 * materials.js — gather/mine costs for herbs and ores.
 * Costs are in "gather points". Initial gather/mine speed = 3/sec.
 * Common=15 (5s), Uncommon=60 (20s), Rare=180 (1min), Epic=600 (3.3min), Legendary=1800 (10min)
 */

export const HERBS = {
  'Soul Calming Grass':           { rarity: 'Common',    gatherCost: 15  },
  'Jade Heart Flower':            { rarity: 'Uncommon',  gatherCost: 60  },
  'Netherworld Flame Mushroom':   { rarity: 'Uncommon',  gatherCost: 60  },
  'Thousand-Year Ginseng':        { rarity: 'Rare',      gatherCost: 180 },
  'Blood Lotus':                  { rarity: 'Rare',      gatherCost: 180 },
  'Dragon Saliva Grass':          { rarity: 'Rare',      gatherCost: 180 },
  'Purple Cloud Vine':            { rarity: 'Epic',      gatherCost: 600 },
  'Immortal Revival Leaf':        { rarity: 'Legendary', gatherCost: 1800 },
};

export const ORES = {
  'Black Tortoise Iron':          { rarity: 'Common',    mineCost: 15  },
  'Crimson Flame Crystal':        { rarity: 'Uncommon',  mineCost: 60  },
  'Void Stone':                   { rarity: 'Rare',      mineCost: 180 },
  'Mithril Essence':              { rarity: 'Rare',      mineCost: 180 },
  'Deep Sea Cold Iron':           { rarity: 'Rare',      mineCost: 180 },
  'Star Metal Ore':               { rarity: 'Epic',      mineCost: 600 },
  'Skyfire Meteorite':            { rarity: 'Epic',      mineCost: 600 },
  'Heavenly Profound Metal':      { rarity: 'Legendary', mineCost: 1800 },
};

export const CULTIVATION_MATERIALS = {
  spirit_stone:             { name: 'Spirit Stone',             rarity: 'Common'    },
  beast_core:               { name: 'Beast Core',               rarity: 'Uncommon'  },
  origin_crystal:           { name: 'Origin Crystal',           rarity: 'Rare'      },
  heaven_spirit_dew:        { name: 'Heaven Spirit Dew',        rarity: 'Epic'      },
  elemental_essence_bead:   { name: 'Elemental Essence Bead',   rarity: 'Epic'      },
};

/** Flat lookup keyed by snake_case ID — covers all material types. */
export const ALL_MATERIALS = {
  // herbs
  soul_calming_grass:          { name: 'Soul Calming Grass',          rarity: 'Common',    type: 'herb' },
  jade_heart_flower:           { name: 'Jade Heart Flower',           rarity: 'Uncommon',  type: 'herb' },
  netherworld_flame_mushroom:  { name: 'Netherworld Flame Mushroom',  rarity: 'Uncommon',  type: 'herb' },
  thousand_year_ginseng:       { name: 'Thousand-Year Ginseng',       rarity: 'Rare',      type: 'herb' },
  blood_lotus:                 { name: 'Blood Lotus',                 rarity: 'Rare',      type: 'herb' },
  dragon_saliva_grass:         { name: 'Dragon Saliva Grass',         rarity: 'Rare',      type: 'herb' },
  purple_cloud_vine:           { name: 'Purple Cloud Vine',           rarity: 'Epic',      type: 'herb' },
  immortal_revival_leaf:       { name: 'Immortal Revival Leaf',       rarity: 'Legendary', type: 'herb' },
  // ores
  black_tortoise_iron:         { name: 'Black Tortoise Iron',         rarity: 'Common',    type: 'ore' },
  crimson_flame_crystal:       { name: 'Crimson Flame Crystal',       rarity: 'Uncommon',  type: 'ore' },
  void_stone:                  { name: 'Void Stone',                  rarity: 'Rare',      type: 'ore' },
  mithril_essence:             { name: 'Mithril Essence',             rarity: 'Rare',      type: 'ore' },
  deep_sea_cold_iron:          { name: 'Deep Sea Cold Iron',          rarity: 'Rare',      type: 'ore' },
  star_metal_ore:              { name: 'Star Metal Ore',              rarity: 'Epic',      type: 'ore' },
  skyfire_meteorite:           { name: 'Skyfire Meteorite',           rarity: 'Epic',      type: 'ore' },
  heavenly_profound_metal:     { name: 'Heavenly Profound Metal',     rarity: 'Legendary', type: 'ore' },
  // cultivation materials
  spirit_stone:                { name: 'Spirit Stone',                rarity: 'Common',    type: 'cultivation' },
  beast_core:                  { name: 'Beast Core',                  rarity: 'Uncommon',  type: 'cultivation' },
  origin_crystal:              { name: 'Origin Crystal',              rarity: 'Rare',      type: 'cultivation' },
  heaven_spirit_dew:           { name: 'Heaven Spirit Dew',           rarity: 'Epic',      type: 'cultivation' },
  elemental_essence_bead:      { name: 'Elemental Essence Bead',      rarity: 'Epic',      type: 'cultivation' },
};

export const RARITY_COLOR = {
  Common:    '#aaa',
  Uncommon:  '#4ade80',
  Rare:      '#60a5fa',
  Epic:      '#c084fc',
  Legendary: '#f59e0b',
};
