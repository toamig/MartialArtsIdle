/**
 * affixPools.js — per-slot affix definitions for artefact transmutation.
 *
 * Each entry: { id, name, stat, type, ranges: { Iron: [min,max], ... } }
 * Slot counts: base 3 at Iron, +2 per quality tier above that.
 * Items are generated with 1 affix; the rest must be filled via Add.
 */

import { MOD } from './stats';
import { pickRandomUnique } from './lawUniques';
import { mergeSingleton } from './config/loader';

// ─── Slot counts ──────────────────────────────────────────────────────────────

export const AFFIX_SLOT_COUNT = {
  Iron: 3, Bronze: 5, Silver: 7, Gold: 9, Transcendent: 11,
};

// Per-tier slot limits (Iron has 3 slots, all higher tiers have 2 each).
export const TIER_SLOT_COUNT = {
  Iron: 3, Bronze: 2, Silver: 2, Gold: 2, Transcendent: 2,
};

// ─── Rarity tiers (for cost calculation) ────────────────────────────────────

export const RARITY_TIER = {
  Iron: 1, Bronze: 2, Silver: 3, Gold: 4, Transcendent: 5,
};

// ─── Per-slot affix pools ────────────────────────────────────────────────────
// Modifier guidelines:
//   - Primary stats (essence/soul/body) and stats DERIVED from them
//     (health, defense, elemental_defense, soul_toughness) NEVER use FLAT —
//     only INCREASED/MORE, because they scale from Qi via law multipliers.
//   - Stats with base 0 (physical_damage, elemental_damage, psychic_damage)
//     and additive percentages (exploit_chance) can use FLAT.
//   - INCREASED stores additive % (0.10 = +10%); MORE stores multiplier (1.10 = ×1.10).

// Common range tables to keep entries readable
const INCR_SMALL = { Iron:[0.05,0.10], Bronze:[0.08,0.15], Silver:[0.12,0.22], Gold:[0.18,0.32], Transcendent:[0.25,0.45] };
const INCR_LARGE = { Iron:[0.08,0.14], Bronze:[0.12,0.22], Silver:[0.18,0.32], Gold:[0.25,0.42], Transcendent:[0.35,0.60] };
const MORE_TIER  = { Iron:[1.03,1.06], Bronze:[1.05,1.10], Silver:[1.08,1.16], Gold:[1.12,1.22], Transcendent:[1.18,1.35] };

const WEAPON_POOL = [
  { id: 'w_phys_flat', name: 'Sharpness',       stat: 'physical_damage',  type: MOD.FLAT,      ranges: { Iron:[5,12], Bronze:[10,24], Silver:[20,48], Gold:[40,96], Transcendent:[80,192] } },
  { id: 'w_phys_incr', name: 'Empowered',       stat: 'physical_damage',  type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'w_phys_more', name: 'Vicious',         stat: 'physical_damage',  type: MOD.MORE,      ranges: MORE_TIER },
  { id: 'w_essence',   name: 'Essence Channel', stat: 'essence',          type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'w_body',      name: 'Body Force',      stat: 'body',             type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'w_exploit',   name: 'Exploit Chance',  stat: 'exploit_chance',   type: MOD.FLAT,      ranges: { Iron:[1,3], Bronze:[2,5], Silver:[4,8], Gold:[6,12], Transcendent:[10,20] } },
];

const HEAD_POOL = [
  { id: 'h_soul_tough_incr', name: 'Soul Barrier',  stat: 'soul_toughness',   type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'h_elem_def_incr',   name: 'Spirit Ward',   stat: 'elemental_defense',type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'h_soul_incr',       name: 'Mind Clarity',  stat: 'soul',             type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'h_health_incr',     name: 'Vitality',      stat: 'health',           type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'h_def_incr',        name: 'Hardened Mind', stat: 'defense',          type: MOD.INCREASED, ranges: INCR_SMALL },
];

const BODY_POOL = [
  { id: 'b_def_incr',    name: 'Reinforced',     stat: 'defense',          type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'b_def_more',    name: 'Steel Skin',     stat: 'defense',          type: MOD.MORE,      ranges: MORE_TIER },
  { id: 'b_health_incr', name: 'Vigor',          stat: 'health',           type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'b_health_more', name: 'Iron Heart',     stat: 'health',           type: MOD.MORE,      ranges: MORE_TIER },
  { id: 'b_body_incr',   name: 'Body Hardening', stat: 'body',             type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'b_elem_def',    name: 'Elemental Shell',stat: 'elemental_defense',type: MOD.INCREASED, ranges: INCR_SMALL },
];

const HANDS_POOL = [
  { id: 'ha_phys_flat', name: 'Iron Fist', stat: 'physical_damage',  type: MOD.FLAT,      ranges: { Iron:[4,10], Bronze:[8,20], Silver:[16,40], Gold:[32,80], Transcendent:[64,160] } },
  { id: 'ha_elem_flat', name: 'Flame Palm',stat: 'elemental_damage', type: MOD.FLAT,      ranges: { Iron:[3,8],  Bronze:[6,16], Silver:[12,32], Gold:[24,64], Transcendent:[48,128] } },
  { id: 'ha_phys_incr', name: 'Striker',   stat: 'physical_damage',  type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'ha_phys_more', name: 'Brutal',    stat: 'physical_damage',  type: MOD.MORE,      ranges: MORE_TIER },
  { id: 'ha_essence',   name: 'Qi Surge',  stat: 'essence',          type: MOD.INCREASED, ranges: INCR_SMALL },
];

const WAIST_POOL = [
  { id: 'wa_health_incr',name: 'Endurance',     stat: 'health',         type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'wa_def_incr',   name: 'Belt Guard',    stat: 'defense',        type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'wa_body',       name: 'Core Strength', stat: 'body',           type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'wa_essence',    name: 'Qi Storage',    stat: 'essence',        type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'wa_iron_will',  name: 'Iron Will',     stat: 'soul_toughness', type: MOD.INCREASED, ranges: INCR_SMALL },
];

const FEET_POOL = [
  { id: 'fe_def_incr',    name: 'Rooted',        stat: 'defense',          type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'fe_def_more',    name: 'Stalwart',      stat: 'defense',          type: MOD.MORE,      ranges: MORE_TIER },
  { id: 'fe_health_incr', name: 'Light Step',    stat: 'health',           type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'fe_soul_incr',   name: 'Mental Footing',stat: 'soul',             type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'fe_elem_def',    name: 'Spirit Steps',  stat: 'elemental_defense',type: MOD.INCREASED, ranges: INCR_SMALL },
];

const NECK_POOL = [
  { id: 'ne_elem_def_i',   name: 'Warding Light',    stat: 'elemental_defense',type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'ne_soul_tough_m', name: 'Soul Anchor',      stat: 'soul_toughness',   type: MOD.MORE,      ranges: MORE_TIER },
  { id: 'ne_essence',      name: 'Jade Resonance',   stat: 'essence',          type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'ne_soul',         name: 'Spiritual Link',   stat: 'soul',             type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'ne_soul_tough_i', name: 'Mental Fortitude', stat: 'soul_toughness',   type: MOD.INCREASED, ranges: INCR_LARGE },
];

const RING_POOL = [
  { id: 'ri_essence',  name: 'Essence Flow',  stat: 'essence',          type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'ri_soul',     name: 'Soul Resonance',stat: 'soul',             type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'ri_body',     name: 'Body Ring',     stat: 'body',             type: MOD.INCREASED, ranges: INCR_SMALL },
  { id: 'ri_phys_incr',name: 'Striker Band',  stat: 'physical_damage',  type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'ri_elem_incr',name: 'Elemental Ring',stat: 'elemental_damage', type: MOD.INCREASED, ranges: INCR_LARGE },
  { id: 'ri_phys_more',name: 'Pure Power',    stat: 'physical_damage',  type: MOD.MORE,      ranges: MORE_TIER },
];

/**
 * Designer overrides: src/data/config/affixPools.override.json wraps each
 * slot pool under records[<slot>] (e.g. records.weapon = [...full replacement
 * pool]). Edits replace the entire pool for that slot, not individual affixes.
 */
const AFFIX_POOL_BY_SLOT_RAW = {
  weapon: WEAPON_POOL,
  head:   HEAD_POOL,
  body:   BODY_POOL,
  hands:  HANDS_POOL,
  waist:  WAIST_POOL,
  feet:   FEET_POOL,
  neck:   NECK_POOL,
  ring:   RING_POOL,
};
export const AFFIX_POOL_BY_SLOT = {
  weapon: mergeSingleton(WEAPON_POOL, 'affixPools', 'weapon'),
  head:   mergeSingleton(HEAD_POOL,   'affixPools', 'head'),
  body:   mergeSingleton(BODY_POOL,   'affixPools', 'body'),
  hands:  mergeSingleton(HANDS_POOL,  'affixPools', 'hands'),
  waist:  mergeSingleton(WAIST_POOL,  'affixPools', 'waist'),
  feet:   mergeSingleton(FEET_POOL,   'affixPools', 'feet'),
  neck:   mergeSingleton(NECK_POOL,   'affixPools', 'neck'),
  ring:   mergeSingleton(RING_POOL,   'affixPools', 'ring'),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Roll a single affix value within its rarity range. The tier is preserved on the affix. */
export function rollAffix(entry, rarity) {
  const range = entry.ranges[rarity] ?? entry.ranges.Iron;
  const [min, max] = range;
  const value = entry.type === MOD.FLAT
    ? Math.floor(min + Math.random() * (max - min + 1))
    : Math.round((min + Math.random() * (max - min)) * 1000) / 1000;
  return { id: entry.id, name: entry.name, stat: entry.stat, type: entry.type, value, tier: rarity };
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

// ─── Law generator ───────────────────────────────────────────────────────────

const LAW_ELEMENTS = ['Normal', 'Fire', 'Water', 'Stone', 'Air', 'Metal', 'Wood', 'Ice'];
const LAW_RARITIES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];
const LAW_REALM_LABELS = {
  Iron: 'Tempered Body', Bronze: 'Qi Transformation', Silver: 'True Element',
  Gold: 'Immortal Ascension', Transcendent: 'Saint',
};

const LAW_PREFIXES = ['Crimson', 'Jade', 'Iron', 'Azure', 'Golden', 'Shadow', 'Storm', 'Void', 'Ancient', 'Heavenly'];
const LAW_CORES   = ['Dragon', 'Phoenix', 'Lotus', 'Mountain', 'River', 'Star', 'Thunder', 'Serpent', 'Tiger', 'Crane'];
const LAW_SUFFIXES = ['Manual', 'Scripture', 'Sutra', 'Canon', 'Art', 'Method', 'Technique', 'Path'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function genLawName() {
  return `${pick(LAW_PREFIXES)} ${pick(LAW_CORES)} ${pick(LAW_SUFFIXES)}`;
}

const LAW_FLAVOURS = [
  'A forgotten text recovered from the depths of an ancient ruin.',
  'Inscribed on jade slips by an unknown immortal, its wisdom transcends mortal understanding.',
  'The pages hum with latent power, waiting to be unleashed.',
  'Written in the blood of a dying sage — every word carries the weight of a thousand battles.',
  'A scripture so old the language predates the current era of cultivation.',
];

/**
 * Generate a random law. Each tier up to the law's rarity gets exactly one
 * unique modifier rolled from the LAW_UNIQUES pool (see src/data/lawUniques.js).
 *
 *   Iron law:         Iron unique
 *   Bronze law:       Iron + Bronze uniques
 *   Silver law:       Iron + Bronze + Silver
 *   Gold law:         + Gold
 *   Transcendent law: all 5
 */
export function generateLaw(forcedRarity) {
  const rarity  = forcedRarity ?? pick(LAW_RARITIES);
  const element = pick(LAW_ELEMENTS);

  const rarityTiers = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];
  const rarityIdx = rarityTiers.indexOf(rarity);
  const unlockedTiers = rarityTiers.slice(0, rarityIdx + 1);

  const uniques = {};
  const usedIds = [];
  for (const tier of unlockedTiers) {
    const u = pickRandomUnique(usedIds);
    if (u) {
      uniques[tier] = u;
      usedIds.push(u.id);
    }
  }

  return {
    id:                    `law_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name:                  genLawName(),
    element,
    rarity,
    realmRequirement:      0,
    realmRequirementLabel: LAW_REALM_LABELS[rarity] ?? 'Tempered Body',
    flavour:               pick(LAW_FLAVOURS),
    cultivationSpeedMult:  rollLawMult('cultivationSpeedMult', rarity),
    essenceMult:           rollLawMult('essenceMult', rarity),
    soulMult:              rollLawMult('soulMult', rarity),
    bodyMult:              rollLawMult('bodyMult', rarity),
    uniques,
  };
}
