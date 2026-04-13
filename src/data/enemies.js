/**
 * enemies.js — all enemy type definitions.
 *
 * sprite: base filename under public/sprites/enemies/.
 *   null  → canvas fallback until art is ready.
 *   set   → loads {sprite}-idle.png and {sprite}-attack.png automatically.
 *
 * statMult: multiplied on top of the player-derived base stats so each
 *   enemy type feels distinct even inside the same region.
 *     hp  — scales enemy max HP
 *     atk — scales enemy attack damage
 *
 * drops: array of { itemId, chance 0–1, qty [min, max] }
 *   itemId references material IDs from data/materials.js
 */

const ENEMIES = {

  // ── World 1 — The Mortal Lands ────────────────────────────────────────────

  outer_sect_disciple: {
    id:       'outer_sect_disciple',
    name:     'Outer Sect Disciple',
    sprite:   'outer_sect_disciple',
    statMult: { hp: 0.8, atk: 0.7 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.90, qty: [1, 4] },
      { itemId: 'iron_mineral_1',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.02 },
  },

  training_golem: {
    id:       'training_golem',
    name:     'Training Golem',
    sprite:   'training_golem',
    statMult: { hp: 1.2, atk: 0.3 },   // tanky, low damage — constructs don't drop techniques
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.50, qty: [1, 2] },
    ],
  },

  wolf: {
    id:       'wolf',
    name:     'Pack Wolf',
    sprite:   'wolf',
    statMult: { hp: 0.9, atk: 1.1 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.70, qty: [1, 3] },
      { itemId: 'bronze_cultivation_1', chance: 0.20, qty: [1, 1] },
      { itemId: 'iron_mineral_1',     chance: 0.10, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.01 },
  },

  bandit_scout: {
    id:       'bandit_scout',
    name:     'Bandit Scout',
    sprite:   'bandit_scout',
    statMult: { hp: 0.9, atk: 1.0 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.85, qty: [2, 6] },
      { itemId: 'iron_mineral_1',     chance: 0.20, qty: [1, 2] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  wandering_beast: {
    id:       'wandering_beast',
    name:     'Wandering Beast',
    sprite:   'wandering_beast',
    statMult: { hp: 1.0, atk: 1.0 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.65, qty: [1, 3] },
      { itemId: 'bronze_cultivation_1', chance: 0.25, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.01 },
  },

  qi_beast: {
    id:       'qi_beast',
    name:     'Qi-Sensing Beast',
    sprite:   'qi_beast',
    statMult: { hp: 1.1, atk: 1.2 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.80, qty: [2, 5] },
      { itemId: 'bronze_cultivation_1', chance: 0.30, qty: [1, 1] },
      { itemId: 'bronze_mineral_1',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  rogue_disciple: {
    id:       'rogue_disciple',
    name:     'Rogue Disciple',
    sprite:   'rogue_disciple',
    statMult: { hp: 1.0, atk: 1.1 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.85, qty: [2, 6] },
      { itemId: 'bronze_mineral_1',   chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  forest_spirit: {
    id:       'forest_spirit',
    name:     'Forest Spirit',
    sprite:   'forest_spirit',
    statMult: { hp: 0.8, atk: 1.3 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.70, qty: [2, 5] },
      { itemId: 'bronze_cultivation_1', chance: 0.35, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  tree_demon: {
    id:       'tree_demon',
    name:     'Awakened Tree Demon',
    sprite:   null,
    statMult: { hp: 1.5, atk: 0.9 },   // slow and tanky
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.75, qty: [3, 7] },
      { itemId: 'bronze_cultivation_1', chance: 0.40, qty: [1, 2] },
    ],
    techniqueDrop: { chance: 0.06 },
  },

  sky_beast: {
    id:       'sky_beast',
    name:     'Sky Beast',
    sprite:   null,
    statMult: { hp: 1.1, atk: 1.2 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.75, qty: [3, 7] },
      { itemId: 'bronze_cultivation_1', chance: 0.30, qty: [1, 1] },
      { itemId: 'silver_mineral_1',     chance: 0.10, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  thunder_hawk: {
    id:       'thunder_hawk',
    name:     'Thunder Hawk',
    sprite:   null,
    statMult: { hp: 1.0, atk: 1.4 },   // fast and hits hard
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.80, qty: [3, 8] },
      { itemId: 'bronze_cultivation_1', chance: 0.35, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  lightning_wyrm: {
    id:       'lightning_wyrm',
    name:     'Lightning Wyrm',
    sprite:   null,
    statMult: { hp: 1.3, atk: 1.5 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.80, qty: [4, 10] },
      { itemId: 'bronze_cultivation_1', chance: 0.40, qty: [1, 2] },
      { itemId: 'silver_mineral_1',     chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.07 },
  },

  storm_elemental: {
    id:       'storm_elemental',
    name:     'Storm Elemental',
    sprite:   null,
    statMult: { hp: 1.2, atk: 1.6 },
    drops: [
      { itemId: 'iron_cultivation_1',  chance: 0.85, qty: [5, 12] },
      { itemId: 'silver_cultivation_1', chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.07 },
  },

  // ── World 2 — The Ancient Frontier ───────────────────────────────────────

  iron_fang_wolf: {
    id:       'iron_fang_wolf',
    name:     'Iron Fang Wolf',
    sprite:   'iron_fang_wolf',
    statMult: { hp: 1.7, atk: 1.9 },   // hardened pack predator, fast and hits hard
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.85, qty: [5, 12] },
      { itemId: 'bronze_cultivation_1', chance: 0.40, qty: [1, 2]  },
      { itemId: 'silver_mineral_2',     chance: 0.20, qty: [1, 1]  },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  sand_dragon: {
    id:       'sand_dragon',
    name:     'Sand Dragon',
    sprite:   null,
    statMult: { hp: 1.5, atk: 1.6 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.85, qty: [5, 15] },
      { itemId: 'silver_mineral_2',   chance: 0.25, qty: [1, 1] },
    ],
  },

  bone_construct: {
    id:       'bone_construct',
    name:     'Bone Construct',
    sprite:   null,
    statMult: { hp: 2.0, atk: 1.2 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.80, qty: [5, 12] },
      { itemId: 'silver_mineral_2',   chance: 0.20, qty: [1, 1] },
    ],
  },

  desert_wraith: {
    id:       'desert_wraith',
    name:     'Desert Wraith',
    sprite:   null,
    statMult: { hp: 1.0, atk: 2.0 },
    drops: [
      { itemId: 'iron_cultivation_1',  chance: 0.85, qty: [6, 15] },
      { itemId: 'silver_cultivation_1', chance: 0.20, qty: [1, 1] },
    ],
  },

  elemental_boar: {
    id:       'elemental_boar',
    name:     'Elemental Boar',
    sprite:   null,
    statMult: { hp: 1.8, atk: 1.5 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.85, qty: [6, 14] },
      { itemId: 'bronze_cultivation_1', chance: 0.45, qty: [1, 2] },
      { itemId: 'silver_mineral_2',     chance: 0.15, qty: [1, 1] },
    ],
  },

  city_guardian: {
    id:       'city_guardian',
    name:     'City Guardian Construct',
    sprite:   null,
    statMult: { hp: 2.5, atk: 1.8 },
    drops: [
      { itemId: 'iron_cultivation_1',  chance: 0.90, qty: [8, 20] },
      { itemId: 'silver_cultivation_1', chance: 0.25, qty: [1, 1] },
      { itemId: 'silver_mineral_2',    chance: 0.10, qty: [1, 1] },
    ],
  },

  immortal_shade: {
    id:       'immortal_shade',
    name:     'Trapped Immortal Shade',
    sprite:   null,
    statMult: { hp: 1.5, atk: 2.2 },
    drops: [
      { itemId: 'iron_cultivation_1',  chance: 0.85, qty: [8, 18] },
      { itemId: 'silver_cultivation_1', chance: 0.30, qty: [1, 2] },
    ],
  },

  corrupted_cultivator: {
    id:       'corrupted_cultivator',
    name:     'Corrupted Cultivator',
    sprite:   null,
    statMult: { hp: 1.6, atk: 2.0 },
    drops: [
      { itemId: 'iron_cultivation_1',  chance: 0.90, qty: [8, 18] },
      { itemId: 'silver_cultivation_1', chance: 0.25, qty: [1, 2] },
      { itemId: 'silver_mineral_2',    chance: 0.15, qty: [1, 1] },
    ],
  },

  blood_leviathan: {
    id:       'blood_leviathan',
    name:     'Blood Sea Leviathan',
    sprite:   null,
    statMult: { hp: 2.5, atk: 2.0 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.90, qty: [10, 25] },
      { itemId: 'bronze_cultivation_1', chance: 0.50, qty: [1, 3] },
      { itemId: 'silver_mineral_2',     chance: 0.25, qty: [1, 2] },
    ],
  },

  // ── World 3 — The Forbidden Lands ────────────────────────────────────────

  burial_guardian: {
    id:       'burial_guardian',
    name:     'Burial Guardian',
    sprite:   null,
    statMult: { hp: 3.0, atk: 2.5 },
    drops: [
      { itemId: 'iron_cultivation_1',  chance: 0.90, qty: [15, 35] },
      { itemId: 'silver_cultivation_1', chance: 0.35, qty: [1, 2] },
      { itemId: 'gold_mineral_1',      chance: 0.15, qty: [1, 1] },
    ],
  },

  saint_corpse_soldier: {
    id:       'saint_corpse_soldier',
    name:     'Saint Corpse-Soldier',
    sprite:   null,
    statMult: { hp: 3.5, atk: 2.2 },
    drops: [
      { itemId: 'iron_cultivation_1',  chance: 0.90, qty: [15, 30] },
      { itemId: 'silver_cultivation_1', chance: 0.30, qty: [1, 2] },
      { itemId: 'gold_mineral_1',      chance: 0.20, qty: [1, 1] },
    ],
  },

  void_rift_predator: {
    id:       'void_rift_predator',
    name:     'Void Rift Predator',
    sprite:   null,
    statMult: { hp: 2.5, atk: 3.5 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.90, qty: [20, 40] },
      { itemId: 'gold_cultivation_1', chance: 0.15, qty: [1, 1] },
      { itemId: 'gold_mineral_2',     chance: 0.20, qty: [1, 1] },
    ],
  },

  // ── World 4 — The Origin Depths ──────────────────────────────────────────

  origin_guardian: {
    id:       'origin_guardian',
    name:     'Origin Guardian',
    sprite:   null,
    statMult: { hp: 5.0, atk: 4.0 },
    drops: [
      { itemId: 'iron_cultivation_1',      chance: 0.90, qty: [30, 60] },
      { itemId: 'gold_cultivation_1',      chance: 0.20, qty: [1, 1] },
      { itemId: 'transcendent_mineral_1',  chance: 0.10, qty: [1, 1] },
    ],
  },

  ancient_beast: {
    id:       'ancient_beast',
    name:     'Ancient Beast',
    sprite:   null,
    statMult: { hp: 6.0, atk: 4.5 },
    drops: [
      { itemId: 'iron_cultivation_1',      chance: 0.90, qty: [40, 80] },
      { itemId: 'gold_cultivation_2',      chance: 0.20, qty: [1, 1] },
      { itemId: 'transcendent_mineral_1',  chance: 0.15, qty: [1, 1] },
    ],
  },

  // ── World 5 — The Void Sea ────────────────────────────────────────────────

  void_elemental: {
    id:       'void_elemental',
    name:     'Void Elemental',
    sprite:   null,
    statMult: { hp: 8.0, atk: 7.0 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.90, qty: [60, 120] },
      { itemId: 'gold_cultivation_2', chance: 0.25, qty: [1, 2] },
    ],
  },

  dao_inscription_guardian: {
    id:       'dao_inscription_guardian',
    name:     'Dao Inscription Guardian',
    sprite:   null,
    statMult: { hp: 10.0, atk: 8.0 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.90, qty: [80, 160] },
      { itemId: 'gold_cultivation_1', chance: 0.30, qty: [1, 2] },
      { itemId: 'gold_cultivation_2', chance: 0.25, qty: [1, 2] },
    ],
  },

  // ── World 6 — The Open Heaven ─────────────────────────────────────────────

  open_heaven_beast: {
    id:       'open_heaven_beast',
    name:     'Open Heaven Beast',
    sprite:   null,
    statMult: { hp: 20.0, atk: 18.0 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.90, qty: [200, 500] },
      { itemId: 'gold_cultivation_2', chance: 0.40, qty: [1, 3] },
    ],
  },

  boundary_wraith: {
    id:       'boundary_wraith',
    name:     'Boundary Wraith',
    sprite:   null,
    statMult: { hp: 15.0, atk: 22.0 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.90, qty: [150, 400] },
      { itemId: 'gold_cultivation_1', chance: 0.40, qty: [1, 3] },
    ],
  },
};

/**
 * Weighted random pick from an enemy pool.
 * pool: [{ enemyId: string, weight: number }]
 */
export function pickEnemy(pool) {
  const total  = pool.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return ENEMIES[entry.enemyId] ?? null;
  }
  return ENEMIES[pool[pool.length - 1].enemyId] ?? null;
}

export default ENEMIES;
