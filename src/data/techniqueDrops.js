/**
 * techniqueDrops.js — procedural Secret Technique generation for loot drops.
 *
 * Quality and element pools are biased by world tier so that later worlds
 * yield better techniques. Rank scales with world:
 *   World 1 → Mortal, World 2 → Earth, World 3 → Sky,
 *   World 4 → Saint, World 5 → Emperor, World 6 → Heaven
 */

import { TECHNIQUE_QUALITY } from './techniques';

// ─── World-tier tables ────────────────────────────────────────────────────────

/** Quality weights per world (index = worldId - 1). Mirrors the DD rarity table. */
export const WORLD_QUALITY_WEIGHTS = [
  { Iron: 60, Bronze: 30, Silver: 9,  Gold: 1,  Transcendent: 0  }, // World 1
  { Iron: 20, Bronze: 40, Silver: 30, Gold: 9,  Transcendent: 1  }, // World 2
  { Iron: 5,  Bronze: 20, Silver: 40, Gold: 30, Transcendent: 5  }, // World 3
  { Iron: 0,  Bronze: 8,  Silver: 28, Gold: 47, Transcendent: 17 }, // World 4
  { Iron: 0,  Bronze: 2,  Silver: 10, Gold: 43, Transcendent: 45 }, // World 5
  { Iron: 0,  Bronze: 0,  Silver: 3,  Gold: 20, Transcendent: 77 }, // World 6
];

/**
 * Dominant elements per world. Normal appears multiple times in early worlds
 * to lower the chance of an element match — keeping elementless techniques
 * common in World 1 where most players won't have elemental Laws yet.
 */
const WORLD_ELEMENTS = [
  ['Normal', 'Normal', 'Normal', 'Fire', 'Lightning'],             // World 1
  ['Normal', 'Normal', 'Fire', 'Frost', 'Shadow'],                 // World 2
  ['Normal', 'Shadow', 'Void', 'Lightning'],                       // World 3
  ['Normal', 'Fire', 'Void'],                                      // World 4
  ['Void', 'Void', 'Normal'],                                      // World 5
  ['Normal', 'Fire', 'Frost', 'Lightning', 'Wind', 'Void'],        // World 6
];

/** Rank of dropped techniques per world. */
const WORLD_RANK = [
  'Mortal', 'Earth', 'Sky', 'Saint', 'Emperor', 'Heaven',
];

const TYPE_WEIGHTS = { Attack: 50, Heal: 20, Defend: 15, Dodge: 15 };

// ─── Name generation ──────────────────────────────────────────────────────────

const ELEM_WORDS = {
  Normal:    ['Iron', 'Stone', 'Mountain', 'Steel', ''],
  Fire:      ['Flame', 'Blazing', 'Inferno', 'Scorching'],
  Lightning: ['Thunder', 'Storm', 'Lightning', 'Crackling'],
  Frost:     ['Frost', 'Glacial', 'Ice', 'Frozen'],
  Shadow:    ['Shadow', 'Dark', 'Umbra', 'Eclipse'],
  Void:      ['Void', 'Spatial', 'Rift'],
  Wind:      ['Wind', 'Gale', 'Tempest'],
  Ancient:   ['Ancient', 'Primordial', 'Archaic'],
  Blood:     ['Blood', 'Crimson', 'Scarlet'],
};

const TYPE_WORDS = {
  Attack: ['Slash', 'Strike', 'Surge', 'Edge', 'Palm', 'Fist', 'Puncture', 'Cleave'],
  Heal:   ['Breath', 'Mending', 'Recovery', 'Restoration', 'Purification'],
  Defend: ['Shield', 'Barrier', 'Fortress', 'Ward', 'Guard', 'Shell'],
  Dodge:  ['Step', 'Flash', 'Shift', 'Blur', 'Feint', 'Vanish'],
};

const SUFFIXES = ['Technique', 'Art', 'Method', 'Scripture', 'Form', 'Scroll', 'Manual'];

// ─── Passive pools ────────────────────────────────────────────────────────────

const PASSIVE_POOLS = {
  Attack: [
    { name: 'Penetrating',    description: 'Ignores 15% of enemy DEF.' },
    { name: 'Sharpened',      description: 'Deals 10% bonus damage.' },
    { name: 'Swift Strike',   description: 'Cooldown reduced by 0.5s on hit.' },
    { name: 'Vicious',        description: '20% chance to deal double damage.' },
    { name: 'Focus',          description: '+10% critical hit chance.' },
  ],
  Heal: [
    { name: 'Restorative',    description: 'Heals an additional 5% HP over 3s.' },
    { name: 'Calm Mind',      description: 'Reduces all cooldowns by 5% for 5s.' },
    { name: 'Inner Peace',    description: 'Increases DEF by 10% for 4s after heal.' },
    { name: 'Swift Recovery', description: 'Cooldown reduced by 1s.' },
    { name: 'Overflow',       description: 'Can overheal up to 110% max HP.' },
  ],
  Defend: [
    { name: 'Enduring',       description: 'Duration extended by 1s.' },
    { name: 'Counterforce',   description: '10% of blocked damage returned to attacker.' },
    { name: 'Qi Fortification', description: 'Restores 5% HP when activated.' },
    { name: 'Ironclad',       description: 'Cannot be reduced below 1 HP while active.' },
    { name: 'Hardened',       description: 'DEF bonus increased by 15%.' },
  ],
  Dodge: [
    { name: 'Swift',          description: 'Dodge window extended by 0.5s.' },
    { name: 'Afterimage',     description: 'Afterimage distracts enemy for 0.5s.' },
    { name: 'Fleet Foot',     description: 'Cooldown reduced by 1s on successful dodge.' },
    { name: 'Phase',          description: 'Next attack after dodge deals ×1.3 dmg.' },
    { name: 'Ghost',          description: 'Dodge chance increased by +10%.' },
  ],
};

const FLAVOURS = {
  Attack: [
    'A technique born from necessity, honed through blood and trial.',
    'Its edge does not forgive.',
    'Speed and precision — two blades, one strike.',
    'Strike before the enemy has finished thinking.',
  ],
  Heal: [
    'The body remembers wholeness even after it is broken.',
    'Qi flows inward, mending what battle has torn.',
    'A breath drawn in darkness; life reasserts itself.',
  ],
  Defend: [
    'No force can penetrate a will made into stone.',
    'Stillness is its own kind of strength.',
    'Stand firm. Let the storm break against you.',
  ],
  Dodge: [
    "The best defence is never being where the blade lands.",
    'Between heartbeats — there is a gap wide enough to vanish into.',
    'Motion without thought; instinct sharpened into art.',
  ],
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(weights) {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return Object.keys(weights).at(-1);
}

function genName(type, element) {
  const prefix = pick(ELEM_WORDS[element] ?? ['']);
  const word   = pick(TYPE_WORDS[type]);
  const suffix = pick(SUFFIXES);
  return prefix ? `${prefix} ${word} ${suffix}` : `${word} ${suffix}`;
}

function genPassives(type, quality) {
  const count = Object.keys(TECHNIQUE_QUALITY).indexOf(quality) + 1; // Iron=1, Bronze=2…
  const pool  = [...(PASSIVE_POOLS[type] ?? [])];
  const result = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a random technique appropriate for the given world tier.
 * @param {number} worldId  1–6
 * @returns Technique object — shape mirrors static TECHNIQUES entries.
 */
export function generateTechnique(worldId) {
  const wIdx    = Math.max(0, Math.min(5, worldId - 1));
  const quality = weightedPick(WORLD_QUALITY_WEIGHTS[wIdx]);
  const type    = weightedPick(TYPE_WEIGHTS);
  const element = pick(WORLD_ELEMENTS[wIdx]);
  const rank    = WORLD_RANK[wIdx];

  const typeStats = {};
  if (type === 'Attack') {
    typeStats.arteMult  = 1.0;
    typeStats.elemBonus = element !== 'Normal'
      ? parseFloat((1.0 + Math.random() * 0.3).toFixed(2))
      : 1.0;
    typeStats.bonus = 0;
  } else if (type === 'Heal') {
    typeStats.healPercent = parseFloat((0.15 + Math.random() * 0.20).toFixed(3));
  } else if (type === 'Defend') {
    typeStats.defMult     = parseFloat((1.3 + Math.random() * 0.7).toFixed(2));
    // Buffs are charge-based (N enemy attacks) now, not a wall-clock timer.
    typeStats.buffAttacks = 2 + Math.floor(Math.random() * 3); // 2-4 hits
  } else if (type === 'Dodge') {
    typeStats.dodgeChance = parseFloat((0.30 + Math.random() * 0.30).toFixed(2));
    typeStats.buffAttacks = 2 + Math.floor(Math.random() * 2); // 2-3 hits
  }

  return {
    id:       `drop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name:     genName(type, element),
    type,
    rank,
    quality,
    element,
    flavour:  pick(FLAVOURS[type]),
    passives: genPassives(type, quality),
    ...typeStats,
  };
}
