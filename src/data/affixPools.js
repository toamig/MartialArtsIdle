/**
 * affixPools.js — per-slot affix definitions for artefact transmutation.
 *
 * Each entry: { id, name, stat, type, ranges: { Iron: [min,max], ... } }
 * Slot counts: base 3 at Iron, +2 per quality tier above that.
 * Items are generated with 1 affix; the rest must be filled via Add.
 */

import { MOD } from './stats';

// ─── Slot counts ──────────────────────────────────────────────────────────────

export const AFFIX_SLOT_COUNT = {
  Iron: 3, Bronze: 5, Silver: 7, Gold: 9, Transcendent: 11,
};

// ─── Rarity tiers (for cost calculation) ────────────────────────────────────

export const RARITY_TIER = {
  Iron: 1, Bronze: 2, Silver: 3, Gold: 4, Transcendent: 5,
};

// ─── Per-slot affix pools ────────────────────────────────────────────────────

const WEAPON_POOL = [
  { id: 'w_phys_dmg',  name: 'Sharpness',      stat: 'physical_damage',   type: MOD.FLAT, ranges: { Iron:[5,12],  Bronze:[10,24],  Silver:[20,48],   Gold:[40,96],   Transcendent:[80,192]  } },
  { id: 'w_elem_dmg',  name: 'Spirit Edge',     stat: 'elemental_damage',  type: MOD.FLAT, ranges: { Iron:[4,10],  Bronze:[8,20],   Silver:[16,40],   Gold:[32,80],   Transcendent:[64,160]  } },
  { id: 'w_essence',   name: 'Essence Channel', stat: 'essence',           type: MOD.FLAT, ranges: { Iron:[2,6],   Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]   } },
  { id: 'w_body',      name: 'Body Force',      stat: 'body',              type: MOD.FLAT, ranges: { Iron:[2,6],   Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]   } },
  { id: 'w_exploit',   name: 'Exploit Chance',  stat: 'exploit_chance',    type: MOD.FLAT, ranges: { Iron:[1,3],   Bronze:[2,5],    Silver:[4,8],     Gold:[6,12],    Transcendent:[10,20]   } },
];

const HEAD_POOL = [
  { id: 'h_soul_tough', name: 'Soul Barrier',    stat: 'soul_toughness',    type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128]  } },
  { id: 'h_elem_def',   name: 'Spirit Ward',     stat: 'elemental_defense', type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128]  } },
  { id: 'h_soul',       name: 'Mind Clarity',    stat: 'soul',              type: MOD.FLAT, ranges: { Iron:[2,6],   Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]   } },
  { id: 'h_health',     name: 'Vitality',        stat: 'health',            type: MOD.FLAT, ranges: { Iron:[15,40], Bronze:[30,80],  Silver:[60,160],  Gold:[120,320], Transcendent:[240,640] } },
  { id: 'h_defense',    name: 'Hardened Mind',   stat: 'defense',           type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128]  } },
];

const BODY_POOL = [
  { id: 'b_defense',     name: 'Iron Shell',      stat: 'defense',           type: MOD.FLAT,      ranges: { Iron:[5,14],       Bronze:[10,28],     Silver:[20,56],     Gold:[40,112],    Transcendent:[80,224]    } },
  { id: 'b_health',      name: 'Life Force',      stat: 'health',            type: MOD.FLAT,      ranges: { Iron:[20,50],      Bronze:[40,100],    Silver:[80,200],    Gold:[160,400],   Transcendent:[320,800]   } },
  { id: 'b_elem_def',    name: 'Elemental Shell', stat: 'elemental_defense', type: MOD.FLAT,      ranges: { Iron:[3,8],        Bronze:[6,16],      Silver:[12,32],     Gold:[24,64],     Transcendent:[48,128]    } },
  { id: 'b_body',        name: 'Body Hardening',  stat: 'body',              type: MOD.FLAT,      ranges: { Iron:[2,6],        Bronze:[4,12],      Silver:[8,24],      Gold:[16,48],     Transcendent:[32,96]     } },
  { id: 'b_defense_pct', name: 'Reinforcement',   stat: 'defense',           type: MOD.INCREASED, ranges: { Iron:[0.02,0.06],  Bronze:[0.04,0.10], Silver:[0.08,0.18], Gold:[0.12,0.25], Transcendent:[0.20,0.40] } },
];

const HANDS_POOL = [
  { id: 'ha_phys_dmg', name: 'Iron Fist',   stat: 'physical_damage',   type: MOD.FLAT, ranges: { Iron:[4,10],  Bronze:[8,20],   Silver:[16,40],   Gold:[32,80],   Transcendent:[64,160]  } },
  { id: 'ha_elem_dmg', name: 'Flame Palm',  stat: 'elemental_damage',  type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128]  } },
  { id: 'ha_essence',  name: 'Qi Surge',    stat: 'essence',           type: MOD.FLAT, ranges: { Iron:[2,6],   Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]   } },
  { id: 'ha_body',     name: 'Stone Grip',  stat: 'body',              type: MOD.FLAT, ranges: { Iron:[2,6],   Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]   } },
];

const WAIST_POOL = [
  { id: 'wa_health',  name: 'Dantian Seal', stat: 'health',  type: MOD.FLAT, ranges: { Iron:[20,50],  Bronze:[40,100], Silver:[80,200],  Gold:[160,400], Transcendent:[320,800] } },
  { id: 'wa_defense', name: 'Belt Guard',   stat: 'defense', type: MOD.FLAT, ranges: { Iron:[3,8],    Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128]  } },
  { id: 'wa_body',    name: 'Core Strength',stat: 'body',    type: MOD.FLAT, ranges: { Iron:[2,6],    Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]   } },
  { id: 'wa_essence', name: 'Qi Storage',   stat: 'essence', type: MOD.FLAT, ranges: { Iron:[2,6],    Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]   } },
];

const FEET_POOL = [
  { id: 'fe_defense',    name: 'Rooted Stance',   stat: 'defense',           type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128]  } },
  { id: 'fe_health',     name: 'Endurance',        stat: 'health',            type: MOD.FLAT, ranges: { Iron:[15,40], Bronze:[30,80],  Silver:[60,160],  Gold:[120,320], Transcendent:[240,640] } },
  { id: 'fe_soul_tough', name: 'Mental Footing',   stat: 'soul_toughness',    type: MOD.FLAT, ranges: { Iron:[2,6],   Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]   } },
  { id: 'fe_elem_def',   name: 'Spirit Steps',     stat: 'elemental_defense', type: MOD.FLAT, ranges: { Iron:[2,6],   Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]   } },
];

const NECK_POOL = [
  { id: 'ne_elem_def',   name: 'Warding Light',  stat: 'elemental_defense', type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128] } },
  { id: 'ne_soul_tough', name: 'Soul Anchor',    stat: 'soul_toughness',    type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128] } },
  { id: 'ne_essence',    name: 'Jade Resonance', stat: 'essence',           type: MOD.FLAT, ranges: { Iron:[2,6],   Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]  } },
  { id: 'ne_soul',       name: 'Spiritual Link', stat: 'soul',              type: MOD.FLAT, ranges: { Iron:[2,6],   Bronze:[4,12],   Silver:[8,24],    Gold:[16,48],   Transcendent:[32,96]  } },
];

const RING_POOL = [
  { id: 'ri_essence',  name: 'Essence Flow',   stat: 'essence',          type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128] } },
  { id: 'ri_soul',     name: 'Soul Resonance', stat: 'soul',             type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128] } },
  { id: 'ri_body',     name: 'Body Ring',      stat: 'body',             type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128] } },
  { id: 'ri_phys_dmg', name: 'Striker Band',   stat: 'physical_damage',  type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128] } },
  { id: 'ri_elem_dmg', name: 'Elemental Ring', stat: 'elemental_damage', type: MOD.FLAT, ranges: { Iron:[3,8],   Bronze:[6,16],   Silver:[12,32],   Gold:[24,64],   Transcendent:[48,128] } },
];

export const AFFIX_POOL_BY_SLOT = {
  weapon: WEAPON_POOL,
  head:   HEAD_POOL,
  body:   BODY_POOL,
  hands:  HANDS_POOL,
  waist:  WAIST_POOL,
  feet:   FEET_POOL,
  neck:   NECK_POOL,
  ring:   RING_POOL,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Roll a single affix value within its rarity range. */
export function rollAffix(entry, rarity) {
  const range = entry.ranges[rarity] ?? entry.ranges.Iron;
  const [min, max] = range;
  const value = entry.type === MOD.INCREASED
    ? Math.round((min + Math.random() * (max - min)) * 1000) / 1000
    : Math.floor(min + Math.random() * (max - min + 1));
  return { id: entry.id, name: entry.name, stat: entry.stat, type: entry.type, value };
}

/** Pick a random affix from the slot pool, avoiding already-used ids. */
export function pickRandomAffix(slot, rarity, excludeIds = []) {
  const pool = (AFFIX_POOL_BY_SLOT[slot] ?? []).filter(e => !excludeIds.includes(e.id));
  if (!pool.length) return null;
  const entry = pool[Math.floor(Math.random() * pool.length)];
  return rollAffix(entry, rarity);
}

/** Generate the initial set of affixes for a newly acquired item.
 *  Items start with just 1 affix — the rest must be added via transmutation. */
export function generateAffixes(slot, rarity) {
  const pool = AFFIX_POOL_BY_SLOT[slot] ?? [];
  if (!pool.length) return [];
  const entry = pool[Math.floor(Math.random() * pool.length)];
  return [rollAffix(entry, rarity)];
}

// ─── Law multiplier ranges ────────────────────────────────────────────────────

export const LAW_MULT_RANGES = {
  cultivationSpeedMult: {
    Iron: [0.8, 1.2], Bronze: [0.9, 1.5], Silver: [1.0, 2.0], Gold: [1.2, 2.5], Transcendent: [1.5, 3.0],
  },
  essenceMult: {
    Iron: [0.1, 0.5], Bronze: [0.15, 0.65], Silver: [0.2, 0.85], Gold: [0.30, 1.2], Transcendent: [0.50, 1.8],
  },
  soulMult: {
    Iron: [0.1, 0.5], Bronze: [0.15, 0.65], Silver: [0.2, 0.85], Gold: [0.30, 1.2], Transcendent: [0.50, 1.8],
  },
  bodyMult: {
    Iron: [0.1, 0.5], Bronze: [0.15, 0.65], Silver: [0.2, 0.85], Gold: [0.30, 1.2], Transcendent: [0.50, 1.8],
  },
};

export function rollLawMult(multKey, rarity) {
  const range = LAW_MULT_RANGES[multKey]?.[rarity] ?? [0.2, 0.5];
  const [min, max] = range;
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

// ─── Law passive pool ────────────────────────────────────────────────────────

export const LAW_PASSIVE_POOL = [
  { name: 'Unyielding Spirit',    description: 'Increases DEF by 10% during cultivation.' },
  { name: 'Clear Mind',           description: 'Reduces breakthrough failure chance by 5%.' },
  { name: 'Harmonious Flow',      description: 'Increases cultivation speed by 5% per active artefact slot.' },
  { name: 'Elemental Attunement', description: 'Increases elemental damage by 15%.' },
  { name: 'Body Tempering',       description: 'Body stat gains 10% bonus from body multiplier.' },
  { name: 'Soul Expansion',       description: 'Soul stat gains 10% bonus from soul multiplier.' },
  { name: 'Essence Surge',        description: 'Essence stat gains 10% bonus from essence multiplier.' },
  { name: 'Steady Breath',        description: 'Cultivation is not interrupted when taking damage below 10% of max DEF.' },
  { name: 'Qi Compression',       description: 'Each realm advance increases max HP by 2%.' },
  { name: 'Meridian Widening',    description: 'Cultivation speed increases by 10% for 30s after a realm breakthrough.' },
];

export function pickRandomLawPassive(excludeNames = []) {
  const pool = LAW_PASSIVE_POOL.filter(p => !excludeNames.includes(p.name));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
