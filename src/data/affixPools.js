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
import { pickRandomUnique } from './lawUniques';
import { rollArtefactUnique, ARTEFACT_UNIQUES } from './uniqueModifiers';
import { mergeSingleton } from './config/loader';
import { ELEMENTS } from './elements';

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
//     (health, defense, elemental_defense) NEVER use FLAT —
//     only INCREASED/MORE, because they scale from Qi via law multipliers.
//   - Stats with base 0 (physical_damage, elemental_damage)
//     and additive percentages (exploit_chance) can use FLAT.
//   - INCREASED stores additive % (0.10 = +10%); MORE stores multiplier (1.10 = ×1.10).

// ─── Per-rarity value families ────────────────────────────────────────────────
// Each affix entry references one of these by name (see STAT_META below).
// Keep numbers in canonical units:
//   - INCR / MORE rolls store decimals (0.10 = +10%, 1.10 = ×1.10).
//   - FLAT primary / HP / damage rolls store integers (Math.floor at roll).
//   - FLAT_PCT rolls store decimals (0.05 = +5pp on percentage stats).
//   - FLAT_QI rolls store decimals (0.30 = +0.30 qi/sec).
const RANGES = {
  INCR_BASIC:   { Iron:[0.06,0.12], Bronze:[0.10,0.18], Silver:[0.16,0.28], Gold:[0.24,0.40], Transcendent:[0.35,0.60] },
  INCR_LARGE:   { Iron:[0.08,0.15], Bronze:[0.14,0.24], Silver:[0.22,0.36], Gold:[0.32,0.50], Transcendent:[0.45,0.75] },
  MORE_TIER:    { Iron:[1.03,1.07], Bronze:[1.05,1.11], Silver:[1.09,1.18], Gold:[1.14,1.26], Transcendent:[1.20,1.40] },
  FLAT_DMG:     { Iron:[6,14],      Bronze:[14,32],     Silver:[32,70],     Gold:[70,150],    Transcendent:[150,300]   },
  FLAT_HP:      { Iron:[20,50],     Bronze:[50,120],    Silver:[120,280],   Gold:[280,600],   Transcendent:[600,1200]  },
  FLAT_PRIMARY: { Iron:[3,8],       Bronze:[8,18],      Silver:[18,35],     Gold:[35,60],     Transcendent:[60,100]    },
  FLAT_PCT:     { Iron:[0.01,0.03], Bronze:[0.02,0.05], Silver:[0.04,0.08], Gold:[0.06,0.12], Transcendent:[0.10,0.20] },
  FLAT_QI:      { Iron:[0.05,0.15], Bronze:[0.15,0.30], Silver:[0.30,0.55], Gold:[0.55,0.90], Transcendent:[0.90,1.50] },
};

// Aggregate stats (damage_all, all_primary_stats) roll at this fraction of
// the single-stat range — between 1/3 and 1/1 per design constraint.
const AGGREGATE_SCALE = 0.5;

// ─── Stat catalogue ──────────────────────────────────────────────────────────
// Per-stat metadata used by the affix generator:
//   incr  → range key for INCREASED rolls
//   flat  → range key for FLAT / BASE_FLAT rolls (FLAT_* tables)
//   decimalFlat → if true, FLAT/BASE_FLAT rolls store decimal (no Math.floor)
//   aggregate   → if true, all rolled values are scaled by AGGREGATE_SCALE
const STAT_META = {
  // Primary stats
  essence:                 { incr: 'INCR_BASIC', flat: 'FLAT_PRIMARY' },
  body:                    { incr: 'INCR_BASIC', flat: 'FLAT_PRIMARY' },
  soul:                    { incr: 'INCR_BASIC', flat: 'FLAT_PRIMARY' },
  all_primary_stats:       { incr: 'INCR_BASIC', flat: 'FLAT_PRIMARY', aggregate: true },
  // Defensive stats
  health:                  { incr: 'INCR_BASIC', flat: 'FLAT_HP' },
  defense:                 { incr: 'INCR_BASIC', flat: 'FLAT_PRIMARY' },
  elemental_defense:       { incr: 'INCR_BASIC', flat: 'FLAT_PRIMARY' },
  // Damage categories (existing engine consumers)
  physical_damage:         { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  elemental_damage:        { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  damage_all:              { incr: 'INCR_LARGE', flat: 'FLAT_DMG', aggregate: true },
  // Per-pool damage (gated by law.types share at calcDamage time)
  dmg_physical:            { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  dmg_sword:               { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  dmg_fist:                { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  dmg_fire:                { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  dmg_water:               { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  dmg_earth:               { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  dmg_spirit:              { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  dmg_void:                { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  dmg_dao:                 { incr: 'INCR_LARGE', flat: 'FLAT_DMG' },
  // Source-gated damage multipliers
  default_attack_damage:   { incr: 'INCR_BASIC', flat: 'FLAT_PCT', decimalFlat: true },
  secret_technique_damage: { incr: 'INCR_BASIC', flat: 'FLAT_PCT', decimalFlat: true },
  // Cultivation
  qi_speed:                { incr: 'INCR_BASIC', flat: 'FLAT_QI',  decimalFlat: true },
  qi_focus_mult:           { incr: 'INCR_BASIC', flat: 'FLAT_PCT', decimalFlat: true },
  heavenly_qi_mult:        { incr: 'INCR_BASIC', flat: 'FLAT_PCT', decimalFlat: true },
  // Activity
  harvest_speed:           { incr: 'INCR_BASIC', flat: 'FLAT_PRIMARY' },
  harvest_luck:            { incr: 'INCR_BASIC', flat: 'FLAT_PCT', decimalFlat: true },
  mining_speed:            { incr: 'INCR_BASIC', flat: 'FLAT_PRIMARY' },
  mining_luck:             { incr: 'INCR_BASIC', flat: 'FLAT_PCT', decimalFlat: true },
  // Combat utility
  exploit_chance:          { incr: 'INCR_BASIC', flat: 'FLAT_PCT', decimalFlat: true },
  exploit_attack_mult:     { incr: 'INCR_BASIC', flat: 'FLAT_PCT', decimalFlat: true },
  // Buff scaling
  buff_effect:             { incr: 'INCR_BASIC', flat: 'FLAT_PCT', decimalFlat: true },
};

// ─── Per-slot stat allowlist ─────────────────────────────────────────────────
// The pool for a slot is the cross-product of its stats × all 4 mod types,
// generated at module load by buildSlotPool().
const SLOT_STATS = {
  weapon: [
    'damage_all', 'physical_damage', 'elemental_damage',
    'dmg_physical', 'dmg_sword', 'dmg_fist',
    'dmg_fire', 'dmg_water', 'dmg_earth',
    'dmg_spirit', 'dmg_void', 'dmg_dao',
    'default_attack_damage', 'secret_technique_damage',
  ],
  head:   ['elemental_defense', 'defense', 'health', 'soul'],
  body:   ['elemental_defense', 'defense', 'health', 'body'],
  hands:  ['qi_speed', 'harvest_luck', 'mining_luck', 'elemental_defense',
           'defense', 'health', 'exploit_chance', 'exploit_attack_mult'],
  waist:  ['elemental_defense', 'defense', 'health', 'essence'],
  feet:   ['elemental_defense', 'defense', 'health',
           'exploit_chance', 'exploit_attack_mult', 'mining_speed', 'harvest_speed', 'qi_speed'],
  neck:   ['essence', 'soul', 'body', 'all_primary_stats', 'buff_effect'],
  ring:   ['qi_speed', 'harvest_speed', 'harvest_luck', 'mining_speed', 'mining_luck',
           'qi_focus_mult', 'heavenly_qi_mult'],
};

const SLOT_PREFIX = {
  weapon: 'w', head: 'h', body: 'b', hands: 'ha',
  waist: 'wa', feet: 'fe', neck: 'ne', ring: 'ri',
};

const ALL_MOD_TYPES = [MOD.FLAT, MOD.BASE_FLAT, MOD.INCREASED, MOD.MORE];

const MOD_SUFFIX = {
  [MOD.FLAT]:      'flat',
  [MOD.BASE_FLAT]: 'base',
  [MOD.INCREASED]: 'incr',
  [MOD.MORE]:      'more',
};

const MOD_LABEL = {
  [MOD.FLAT]:      '',
  [MOD.BASE_FLAT]: '(base)',
  [MOD.INCREASED]: '(%)',
  [MOD.MORE]:      '(more)',
};

/** Convert a stat id like 'all_primary_stats' or 'dmg_fire' into a display name. */
function statDisplayName(statId) {
  if (statId.startsWith('dmg_')) {
    const pool = statId.slice(4);
    return `${pool[0].toUpperCase()}${pool.slice(1)} Damage`;
  }
  return statId.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function rangesFor(stat, modType) {
  const meta = STAT_META[stat];
  if (!meta) return RANGES.FLAT_PRIMARY;
  if (modType === MOD.MORE)      return RANGES.MORE_TIER;
  if (modType === MOD.INCREASED) return RANGES[meta.incr];
  return RANGES[meta.flat];
}

/** Build the affix pool for a slot — every (stat × mod_type) tuple. */
function buildSlotPool(slot) {
  const pool   = [];
  const stats  = SLOT_STATS[slot] ?? [];
  const prefix = SLOT_PREFIX[slot] ?? slot;
  for (const stat of stats) {
    const meta = STAT_META[stat];
    if (!meta) continue;
    for (const modType of ALL_MOD_TYPES) {
      pool.push({
        id:           `${prefix}_${stat}_${MOD_SUFFIX[modType]}`,
        name:         `${statDisplayName(stat)} ${MOD_LABEL[modType]}`.trim(),
        stat,
        type:         modType,
        ranges:       rangesFor(stat, modType),
        decimalFlat:  !!meta.decimalFlat,
        aggregate:    !!meta.aggregate,
      });
    }
  }
  return pool;
}

/**
 * Designer overrides: src/data/config/affixPools.override.json wraps each
 * slot pool under records[<slot>] (e.g. records.weapon = [...full replacement
 * pool]). Edits replace the entire pool for that slot, not individual affixes.
 */
const AFFIX_POOL_BY_SLOT_RAW = {
  weapon: buildSlotPool('weapon'),
  head:   buildSlotPool('head'),
  body:   buildSlotPool('body'),
  hands:  buildSlotPool('hands'),
  waist:  buildSlotPool('waist'),
  feet:   buildSlotPool('feet'),
  neck:   buildSlotPool('neck'),
  ring:   buildSlotPool('ring'),
};
export const AFFIX_POOL_BY_SLOT = {
  weapon: mergeSingleton(AFFIX_POOL_BY_SLOT_RAW.weapon, 'affixPools', 'weapon'),
  head:   mergeSingleton(AFFIX_POOL_BY_SLOT_RAW.head,   'affixPools', 'head'),
  body:   mergeSingleton(AFFIX_POOL_BY_SLOT_RAW.body,   'affixPools', 'body'),
  hands:  mergeSingleton(AFFIX_POOL_BY_SLOT_RAW.hands,  'affixPools', 'hands'),
  waist:  mergeSingleton(AFFIX_POOL_BY_SLOT_RAW.waist,  'affixPools', 'waist'),
  feet:   mergeSingleton(AFFIX_POOL_BY_SLOT_RAW.feet,   'affixPools', 'feet'),
  neck:   mergeSingleton(AFFIX_POOL_BY_SLOT_RAW.neck,   'affixPools', 'neck'),
  ring:   mergeSingleton(AFFIX_POOL_BY_SLOT_RAW.ring,   'affixPools', 'ring'),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Roll a single affix value within its rarity range.
 *
 * - INCREASED rolls store decimals (0.10 = +10%).
 * - MORE rolls store multipliers (1.10 = ×1.10). For aggregate stats the
 *   bonus distance from 1.0 is scaled (1 + (raw - 1) × scale).
 * - FLAT / BASE_FLAT rolls are integers UNLESS the entry is flagged
 *   `decimalFlat` (percentage-points / qi-per-second).
 * - Aggregate-stat rolls (damage_all, all_primary_stats) get
 *   AGGREGATE_SCALE applied so they don't outshine single-stat rolls.
 */
export function rollAffix(entry, rarity) {
  const range = entry.ranges[rarity] ?? entry.ranges.Iron;
  const [min, max] = range;
  const isFlatLike = entry.type === MOD.FLAT || entry.type === MOD.BASE_FLAT;
  const isInt      = isFlatLike && !entry.decimalFlat;
  const scale      = entry.aggregate ? AGGREGATE_SCALE : 1;

  let value;
  if (isInt) {
    value = Math.floor(min + Math.random() * (max - min + 1));
    value = Math.max(1, Math.floor(value * scale));
  } else if (entry.type === MOD.MORE) {
    const raw = min + Math.random() * (max - min);
    // Scale distance from 1: 1.20 with 0.5 scale → 1.10.
    value = 1 + (raw - 1) * scale;
    value = Math.round(value * 1000) / 1000;
  } else {
    const raw = min + Math.random() * (max - min);
    value = raw * scale;
    value = Math.round(value * 1000) / 1000;
  }

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

const LAW_ELEMENTS = ELEMENTS;
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
// Trivial 1:1 post-Stage-5 since element names == pool names. `general` is
// implicitly added by pickRandomUnique for every law.
const ELEMENT_TO_TYPES = Object.fromEntries(ELEMENTS.map(e => [e, [e]]));

// typeMults removed in Stage 4 of the Damage & Element Overhaul —
// basic-attack damage is now scaled by realm index alone. The previous
// LAW_TYPE_MULT_RANGES table and rollLawTypeMults helper are gone.

// eslint-disable-next-line no-unused-vars
export function generateLaw(forcedRarity, realmIndex = Infinity) {
  const rarity  = forcedRarity ?? pick(LAW_RARITIES);
  const element = pick(LAW_ELEMENTS);
  const types   = ELEMENT_TO_TYPES[element] ?? ['general'];

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
    rarity,
    realmRequirement:      0,
    realmRequirementLabel: LAW_REALM_LABELS[rarity] ?? 'Tempered Body',
    flavour:               pick(LAW_FLAVOURS),
    cultivationSpeedMult:  rollLawMult('cultivationSpeedMult', rarity),
    uniques,
  };
}
