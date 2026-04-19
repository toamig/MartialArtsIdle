import { TYPE_TO_DAMAGE_CATEGORY } from './lawUniques';

// ─── Quality tiers ────────────────────────────────────────────────────────────
export const TECHNIQUE_QUALITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af', cdMult: 1.00 },
  Bronze:       { label: 'Bronze',       color: '#cd7f32', cdMult: 0.90 },
  Silver:       { label: 'Silver',       color: '#c0c0c0', cdMult: 0.80 },
  Gold:         { label: 'Gold',         color: '#f5c842', cdMult: 0.70 },
  Transcendent: { label: 'Transcendent', color: '#c084fc', cdMult: 0.55 },
};

// ─── Rank definitions ─────────────────────────────────────────────────────────
// minRealmIndex matches REALMS array in realms.js
// Techniques are available from the start; rank gates which you can equip.
export const TECHNIQUE_RANK = {
  Mortal:   { label: 'Mortal',   minRealmIndex: 0  },  // Tempered Body
  Earth:    { label: 'Earth',    minRealmIndex: 10 },  // Qi Transformation
  Sky:      { label: 'Sky',      minRealmIndex: 18 },  // Separation & Reunion
  Saint:    { label: 'Saint',    minRealmIndex: 24 },  // Saint
  Emperor:  { label: 'Emperor',  minRealmIndex: 36 },  // Void King
  Heaven:   { label: 'Heaven',   minRealmIndex: 45 },  // Open Heaven
};

// ─── K multiplier table: rank × quality ──────────────────────────────────────
export const K_TABLE = {
  Mortal:   { Iron: 0.5, Bronze: 0.7, Silver: 1.0, Gold: 1.3, Transcendent: 1.8  },
  Earth:    { Iron: 1.0, Bronze: 1.4, Silver: 2.0, Gold: 2.7, Transcendent: 3.5  },
  Sky:      { Iron: 1.5, Bronze: 2.0, Silver: 2.8, Gold: 3.8, Transcendent: 5.0  },
  Saint:    { Iron: 2.0, Bronze: 2.8, Silver: 3.8, Gold: 5.2, Transcendent: 6.8  },
  Emperor:  { Iron: 2.5, Bronze: 3.5, Silver: 4.8, Gold: 6.5, Transcendent: 8.5  },
  Heaven:   { Iron: 4.0, Bronze: 5.5, Silver: 7.5, Gold: 10.0, Transcendent: 13.0 },
};

// ─── Base cooldowns (seconds) by type ────────────────────────────────────────
export const BASE_COOLDOWN = {
  Attack: 6,
  Heal:   12,
  Defend: 10,
  Dodge:  10,
};

export const TYPE_COLOR = {
  Attack: '#ef4444',
  Heal:   '#4ade80',
  Defend: '#60a5fa',
  Dodge:  '#facc15',
};

// ─── Technique catalogue (legacy — techniques are now procedurally generated) ─
export const TECHNIQUES = [
  { id: 'raging_fire_slash', name: 'Raging Fire Slash', type: 'Attack', rank: 'Mortal', quality: 'Iron', element: 'Fire', flavour: 'A blade wreathed in living fire, forged from fury alone.', arteMult: 1.0, elemBonus: 1.2, bonus: 0, passives: [{ name: 'Ignite', description: 'Applies a burn dealing 5% dmg/s for 3s.' }] },
  { id: 'void_piercer', name: 'Void Piercer', type: 'Attack', rank: 'Sky', quality: 'Silver', element: 'Normal', flavour: 'A thrust so precise it tears space itself.', arteMult: 1.0, elemBonus: 1.0, bonus: 0, passives: [{ name: 'Penetrating', description: 'Ignores 20% of enemy DEF.' }, { name: 'Momentum', description: 'Next attack cooldown −1s.' }, { name: 'Focus', description: '+10% critical hit chance.' }] },
  { id: 'twin_dragons_rage', name: "Twin Dragon's Rage", type: 'Attack', rank: 'Saint', quality: 'Gold', element: 'Fire', flavour: 'Two dragons roar as one — heaven itself trembles.', arteMult: 1.2, elemBonus: 1.3, bonus: 0, passives: [{ name: "Dragon's Fury", description: 'First strike deals double damage.' }, { name: 'Inferno', description: 'Burn stacks amplify dmg by 15%.' }, { name: 'Soul Resonance', description: 'Soul contribution +50%.' }, { name: 'Dragon Roar', description: '15% chance to stun for 1s.' }] },
  { id: 'mending_breath', name: 'Mending Breath', type: 'Heal', rank: 'Mortal', quality: 'Bronze', element: 'Normal', flavour: 'A single exhale restores what years of battle have worn away.', healPercent: 0.25, passives: [{ name: 'Deep Breath', description: '+5% HP regen over 3s after heal.' }, { name: 'Calm Mind', description: 'Reduces cooldowns by 10% for 5s.' }] },
  { id: 'heaven_mending_art', name: 'Heaven Mending Art', type: 'Heal', rank: 'Emperor', quality: 'Gold', element: 'Normal', flavour: 'Even shattered meridians knit themselves whole.', healPercent: 0.50, passives: [{ name: "Heaven's Will", description: 'Can overheal up to 120% max HP.' }, { name: 'Purify', description: 'Removes all debuffs on heal.' }, { name: 'Regeneration', description: '+5% HP/s for 5s after cast.' }, { name: 'Soul Mending', description: 'Restores a portion of Soul stat.' }] },
  { id: 'stone_skin', name: 'Stone Skin', type: 'Defend', rank: 'Mortal', quality: 'Iron', element: 'Normal', flavour: 'Flesh becomes iron. Iron becomes stone.', defMult: 1.5, buffAttacks: 2, passives: [{ name: 'Hardened', description: 'Buff absorbs 1 extra hit.' }] },
  { id: 'iron_fortress', name: 'Iron Fortress', type: 'Defend', rank: 'Earth', quality: 'Silver', element: 'Normal', flavour: "A citadel of qi — no blow can shake its walls.", defMult: 2.0, buffAttacks: 3, passives: [{ name: 'Unbreakable', description: 'Cannot be reduced below 1 HP while active.' }, { name: 'Counterforce', description: '20% of blocked damage returned.' }, { name: 'Ironclad', description: 'Buff absorbs 1 extra hit per blow taken.' }] },
  { id: 'phantom_step', name: 'Phantom Step', type: 'Dodge', rank: 'Mortal', quality: 'Iron', element: 'Normal', flavour: 'Between one heartbeat and the next — you are elsewhere.', dodgeChance: 0.40, buffAttacks: 2, passives: [{ name: 'Swift', description: 'Buff covers 1 extra hit.' }] },
  { id: 'shadow_walk', name: 'Shadow Walk', type: 'Dodge', rank: 'Earth', quality: 'Bronze', element: 'Normal', flavour: 'The shadow peels away and becomes you for a precious moment.', dodgeChance: 0.60, buffAttacks: 3, passives: [{ name: 'Afterimage', description: 'Afterimage taunts enemy for 1s.' }, { name: 'Phase Shift', description: 'First attack after dodge deals ×1.5 dmg.' }] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTechnique(id) {
  return TECHNIQUES.find(t => t.id === id) ?? null;
}

/** Effective cooldown in seconds for a given type + quality. */
export function getCooldown(type, quality) {
  return BASE_COOLDOWN[type] * (TECHNIQUE_QUALITY[quality]?.cdMult ?? 1);
}

/** K damage multiplier from rank × quality table. */
export function getK(rank, quality) {
  return K_TABLE[rank]?.[quality] ?? 1.0;
}

/**
 * Attack damage formula:
 *   K * (Essence + Soul + Body + artefactFlat) * arteMult * elemBonus + bonus
 *   + damage-category flat bonus (split across the law's types)
 *
 * elemBonus only applies when the active Law's element matches the technique's.
 *
 * Category-flat bonus: each law type maps to one of the three damage
 * categories (physical / elemental / psychic) via damageCategoryForType().
 * The attack is treated as dealing an even share across the UNIQUE categories
 * covered by law.types, and each category contributes its flat damage stat
 * proportionally. Example: a law with types [fire, sword] splits 50/50, so
 * half of stats.elemental_damage plus half of stats.physical_damage is added.
 * A law with types [fire, water, earth] collapses to one category (elemental)
 * and gets the full elemental_damage flat bonus.
 *
 * @param {object} tech
 * @param {number} essence
 * @param {number} soul
 * @param {number} body
 * @param {object|string|null} lawOrElement  — full law object, or legacy
 *                                             lawElement string for backcompat.
 * @param {number} artefactFlat
 * @param {{physical:number, elemental:number, psychic:number}|null} damageStats
 */
export function calcDamage(tech, essence, soul, body, lawOrElement = 'Normal', artefactFlat = 0, damageStats = null) {
  const law = (lawOrElement && typeof lawOrElement === 'object') ? lawOrElement : null;
  const lawElement = law?.element ?? (typeof lawOrElement === 'string' ? lawOrElement : 'Normal');

  const K = getK(tech.rank, tech.quality);
  const elemMatch = tech.element !== 'Normal' && tech.element === lawElement;
  const elemBonus = elemMatch ? (tech.elemBonus ?? 1.0) : 1.0;
  let dmg = K * (essence + soul + body + artefactFlat)
          * (tech.arteMult ?? 1.0)
          * elemBonus
          + (tech.bonus ?? 0);

  // Damage-category flat bonus — only when we have a law object and stats.
  if (law && damageStats && Array.isArray(law.types) && law.types.length > 0) {
    const catCounts = new Map();
    for (const t of law.types) {
      const cat = TYPE_TO_DAMAGE_CATEGORY[t];
      if (!cat) continue;
      catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    }
    const totalTypes = law.types.length;
    if (catCounts.size > 0) {
      let bonus = 0;
      for (const [cat, count] of catCounts) {
        const share = count / totalTypes;
        bonus += (damageStats[cat] ?? 0) * share;
      }
      dmg += bonus;
    }
  }

  return Math.floor(dmg);
}

/** Whether the player's realmIndex meets the technique's rank requirement. */
export function canEquip(tech, realmIndex) {
  return realmIndex >= (TECHNIQUE_RANK[tech.rank]?.minRealmIndex ?? 0);
}
