/**
 * affixPools.js — per-slot affix definitions for artefact transmutation.
 *
 * Each entry: { id, name, stat, type, ranges: { Iron: [min,max], ... } }
 * Artefact slot layout: 2 Iron + 1 Bronze + 1 Silver + 1 Gold + 1 Transcendent
 * (capped at the item's rarity). Artefacts spawn with all visible tier slots
 * already filled; affix ids never repeat within the same item.
 *
 * Uniqueness:
 *   - On creation, 2% chance that one Iron slot rolls an artefact-unique.
 *   - Transcendent slots merge the normal pool with artefact uniques
 *     (uniform weighting) for picks at creation and on Add.
 *   - Hone and Replace never roll a unique; unique affixes are locked.
 */

import { MOD } from './stats';
import { pickRandomUnique, primaryStatForType } from './lawUniques';
import { rollArtefactUnique, ARTEFACT_UNIQUES } from './uniqueModifiers';
import { mergeSingleton } from './config/loader';

// Realm index at which Soul unlocks — mirrors SAINT_INDEX in src/data/stats.js.
// Soul-anchored law types (spirit/void/dao) may not roll before this realm.
const SAINT_INDEX = 24;
const SOUL_ANCHORED_TYPES = new Set(['spirit', 'void', 'dao']);

// ─── Slot counts ──────────────────────────────────────────────────────────────

export const AFFIX_SLOT_COUNT = {
  Iron: 3, Bronze: 5, Silver: 7, Gold: 9, Transcendent: 11,
};

// Per-tier slot limits — applies to techniques (which share this shape).
// Artefacts have their own, tighter schedule below.
export const TIER_SLOT_COUNT = {
  Iron: 3, Bronze: 2, Silver: 2, Gold: 2, Transcendent: 2,
};

// Per-tier slot limits for ARTEFACTS ONLY.
// An artefact has 2 Iron slots + 1 per higher rarity = 6 total at Transcendent.
export const ARTEFACT_TIER_SLOTS = {
  Iron: 2, Bronze: 1, Silver: 1, Gold: 1, Transcendent: 1,
};

// The rarities an artefact of this rarity has unlocked, lowest to highest.
const RARITY_ORDER = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];
export function artefactTierSlotSchedule(rarity) {
  const cap = RARITY_TIER[rarity] ?? 1;
  return RARITY_ORDER.slice(0, cap).map(tier => ({
    tier,
    count: ARTEFACT_TIER_SLOTS[tier] ?? 0,
  }));
}

/** Total affix-slot capacity for an artefact of the given rarity. */
export function artefactTotalSlots(rarity) {
  return artefactTierSlotSchedule(rarity).reduce((s, t) => s + t.count, 0);
}

// Probability that a freshly generated artefact rolls one of its Iron slots
// as an artefact-unique affix instead of a normal one.
export const UNIQUE_ON_CREATION_CHANCE = 0.02;

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

/** Pick a random NORMAL affix (never unique) from the slot pool, avoiding
 *  already-used ids. Use for Hone/Replace and for non-Transcendent Add. */
export function pickRandomAffix(slot, rarity, excludeIds = []) {
  const pool = (AFFIX_POOL_BY_SLOT[slot] ?? []).filter(e => !excludeIds.includes(e.id));
  if (!pool.length) return null;
  const entry = pool[Math.floor(Math.random() * pool.length)];
  return rollAffix(entry, rarity);
}

/**
 * Pick an affix for an artefact tier slot, honouring item-wide uniqueness
 * (no id can repeat anywhere on the item).
 *
 * On the Transcendent tier the candidate pool is merged with the artefact
 * unique pool so unique picks are possible with uniform weighting.
 * On non-Transcendent tiers only normal affixes are rolled.
 *
 * @param {string} slot         Artefact slot (weapon, head, body, ...).
 * @param {string} tier         The rarity label for the slot being filled.
 * @param {string[]} excludeIds Affix ids already used anywhere on the item.
 * @returns {object|null}
 */
export function pickArtefactAffix(slot, tier, excludeIds = []) {
  const normals = (AFFIX_POOL_BY_SLOT[slot] ?? []).filter(e => !excludeIds.includes(e.id));
  if (tier === 'Transcendent') {
    const totalNormals = normals.length;
    // Uniques share the same pool (uniform weighting) at Transcendent.
    // We pick uniformly across the merged candidates so that the chance of
    // rolling a unique is `uniquesAvailable / (normals + uniques)`.
    // Defer the unique lookup to rollArtefactUnique which handles filtering.
    // Simulate merged uniform draw: decide slot among normals+uniques.
    const uniquesAvailable = ARTEFACT_UNIQUES.filter(
      u => u.slot === slot && !excludeIds.includes(u.id)
    ).length;
    const total = totalNormals + uniquesAvailable;
    if (total === 0) return null;
    const idx = Math.floor(Math.random() * total);
    if (idx < totalNormals) {
      return rollAffix(normals[idx], tier);
    }
    return rollArtefactUnique(slot, tier, excludeIds);
  }
  if (!normals.length) return null;
  const entry = normals[Math.floor(Math.random() * normals.length)];
  return rollAffix(entry, tier);
}

/**
 * Generate the full affix array for a freshly acquired artefact of the given
 * rarity. All visible tier slots are filled (no empties). Affix ids are
 * unique across the whole item. There is a flat UNIQUE_ON_CREATION_CHANCE
 * probability that one of the two Iron slots rolls an artefact-unique
 * instead of a normal affix.
 */
export function generateAffixes(slot, rarity) {
  const schedule = artefactTierSlotSchedule(rarity);
  const used = [];
  const affixes = [];

  // Optionally upgrade one Iron slot to a unique up-front so we reserve its id
  // and don't risk picking the same unique twice in other slots.
  let ironUniqueSlot = -1;
  if (Math.random() < UNIQUE_ON_CREATION_CHANCE) {
    const ironSlots = schedule.find(s => s.tier === 'Iron')?.count ?? 0;
    if (ironSlots > 0) {
      ironUniqueSlot = Math.floor(Math.random() * ironSlots);
    }
  }

  let ironSeen = 0;
  for (const { tier, count } of schedule) {
    for (let i = 0; i < count; i++) {
      let affix = null;
      if (tier === 'Iron' && ironSeen === ironUniqueSlot) {
        affix = rollArtefactUnique(slot, 'Iron', used);
      }
      if (!affix) {
        affix = pickArtefactAffix(slot, tier, used);
      }
      if (affix) {
        used.push(affix.id);
        affixes.push(affix);
      }
      if (tier === 'Iron') ironSeen++;
    }
  }
  return affixes;
}

// ─── Law multiplier ranges ────────────────────────────────────────────────────

export const LAW_MULT_RANGES = {
  cultivationSpeedMult: {
    Iron: [0.8, 1.2], Bronze: [0.9, 1.5], Silver: [1.0, 2.0], Gold: [1.2, 2.5], Transcendent: [1.5, 3.0],
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
// Map a generated law's element to the unique-pool types it can draw from.
// Elements we don't explicitly map to a pool fall through to just `general`.
const ELEMENT_TO_TYPES = {
  Fire:      ['fire'],
  Water:     ['water'],
  Frost:     ['water'],
  Ice:       ['water'],
  Earth:     ['earth'],
  Stone:     ['earth'],
  Void:      ['void'],
  // Unmapped elements (Normal, Metal, Wood, Wind, Lightning, …) stay on
  // general-only. Designer can edit law records to override.
};

// Per-category default-attack multiplier roll ranges, by law rarity.
// The roll is the TOTAL multiplier for a primary stat the law covers, not a
// per-type increment. A law with `types: ['fire']` rolls once in the Essence
// slot; a law with `types: ['fire', 'water']` also rolls just once (both
// types anchor to Essence, so they share the slot). Categories the law
// doesn't cover default to 0.
export const LAW_TYPE_MULT_RANGES = {
  Iron:         [1.10, 1.30],
  Bronze:       [1.20, 1.60],
  Silver:       [1.40, 2.00],
  Gold:         [1.70, 2.60],
  Transcendent: [2.20, 3.50],
};

/**
 * Roll per-primary-stat multipliers for a law given its `types` and rarity.
 * Each covered category gets one roll in the rarity's range; uncovered
 * categories are 0 so the default-attack formula collapses their term.
 */
export function rollLawTypeMults(types, rarity) {
  const [min, max] = LAW_TYPE_MULT_RANGES[rarity] ?? LAW_TYPE_MULT_RANGES.Iron;
  const covered = new Set();
  for (const t of types ?? []) {
    const stat = primaryStatForType(t);
    if (stat) covered.add(stat);
  }
  const roll = () => Math.round((min + Math.random() * (max - min)) * 100) / 100;
  return {
    essence: covered.has('essence') ? roll() : 0,
    body:    covered.has('body')    ? roll() : 0,
    soul:    covered.has('soul')    ? roll() : 0,
  };
}

export function generateLaw(forcedRarity, realmIndex = Infinity) {
  const rarity  = forcedRarity ?? pick(LAW_RARITIES);
  const element = pick(LAW_ELEMENTS);
  let types     = ELEMENT_TO_TYPES[element] ?? ['general'];

  // Soul-anchored types only drop once Soul is unlocked.
  if (realmIndex < SAINT_INDEX) {
    const filtered = types.filter(t => !SOUL_ANCHORED_TYPES.has(t));
    types = filtered.length ? filtered : ['general'];
  }

  const rarityTiers = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];
  const rarityIdx = rarityTiers.indexOf(rarity);
  const unlockedTiers = rarityTiers.slice(0, rarityIdx + 1);

  const uniques = {};
  const usedIds = [];
  for (const tier of unlockedTiers) {
    // Pass `{ types }` so the picker filters to the law's pools ∪ general.
    const u = pickRandomUnique({ types }, usedIds);
    if (u) {
      uniques[tier] = u;
      usedIds.push(u.id);
    }
  }

  return {
    id:                    `law_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name:                  genLawName(),
    element,
    types,
    typeMults:             rollLawTypeMults(types, rarity),
    rarity,
    realmRequirement:      0,
    realmRequirementLabel: LAW_REALM_LABELS[rarity] ?? 'Tempered Body',
    flavour:               pick(LAW_FLAVOURS),
    cultivationSpeedMult:  rollLawMult('cultivationSpeedMult', rarity),
    uniques,
  };
}
