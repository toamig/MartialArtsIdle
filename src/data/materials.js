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

export const RARITY_COLOR = {
  Common:    '#aaa',
  Uncommon:  '#4ade80',
  Rare:      '#60a5fa',
  Epic:      '#c084fc',
  Legendary: '#f59e0b',
};
