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

// Techniques are always procedurally generated via generateTechnique() in
// techniqueDrops.js. There's no hand-authored catalogue — names, elements,
// rolled stats and passives are all rolled at drop time and then frozen on
// the instance. Stats (dodgeChance, buffAttacks, healPercent, defMult,
// arteMult, elemBonus, bonus) cannot be modified by transmutation; only
// quality-upgrade and passive replace/add are permitted.
export const TECHNIQUES = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Legacy shim. All live techniques now come from the player's owned drops,
 * so this always returns null and the caller should fall back to the
 * ownedTechniques map (see useTechniques.getTechById).
 */
// eslint-disable-next-line no-unused-vars
export function getTechnique(id) {
  return null;
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

  // Damage-category flat bonus + per-pool flat bonus + universal damage_all.
  // All gated on having a law object + stats + at least one law type.
  if (law && damageStats && Array.isArray(law.types) && law.types.length > 0) {
    const totalTypes = law.types.length;
    const catCounts  = new Map();
    const poolCounts = new Map();
    for (const t of law.types) {
      poolCounts.set(t, (poolCounts.get(t) ?? 0) + 1);
      const cat = TYPE_TO_DAMAGE_CATEGORY[t];
      if (cat) catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    }

    let bonus = 0;
    // Category flat: shared between law types in the same category.
    for (const [cat, count] of catCounts) {
      bonus += (damageStats[cat] ?? 0) * (count / totalTypes);
    }
    // Pool-specific flat: each pool contributes its own portion.
    const pools = damageStats.pools ?? {};
    for (const [pool, count] of poolCounts) {
      bonus += (pools[pool] ?? 0) * (count / totalTypes);
    }
    dmg += bonus;
  }

  // Universal damage_all flat bonus (whole-attack, no share).
  if (damageStats?.damage_all) dmg += damageStats.damage_all;

  // Source multiplier — secret_technique_damage applies only to technique
  // damage (this code path), not to default attacks.
  const techMult = damageStats?.secret_technique_damage ?? 0;
  if (techMult) dmg *= 1 + techMult;

  return Math.floor(dmg);
}

/** Whether the player's realmIndex meets the technique's rank requirement. */
export function canEquip(tech, realmIndex) {
  return realmIndex >= (TECHNIQUE_RANK[tech.rank]?.minRealmIndex ?? 0);
}
