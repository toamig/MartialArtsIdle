/**
 * Enum option providers for SchemaForm.
 *
 * Sourced from the game's data modules so dropdowns stay in sync with
 * whatever is actually available at build time. These helpers are pure
 * reads — the designer panel never mutates the imported modules.
 */

import ENEMIES from '../data/enemies.js';
import WORLDS from '../data/worlds.js';
import { ALL_MATERIALS } from '../data/materials.js';
import { PILLS } from '../data/pills.js';

export function enemyIdOptions() {
  return Object.keys(ENEMIES).map((id) => ({ value: id, label: `${id} — ${ENEMIES[id].name}` }));
}

export function itemIdOptions() {
  const all = [];
  for (const [id, mat] of Object.entries(ALL_MATERIALS)) {
    all.push({ value: id, label: `${id} — ${mat.name}` });
  }
  for (const pill of PILLS) {
    all.push({ value: pill.id, label: `${pill.id} — ${pill.name}` });
  }
  return all;
}

export function spriteOptions() {
  // Eagerly enumerate every PNG under public/sprites/enemies at build time.
  // Only filenames are needed — stripping path + extension for the value.
  const files = import.meta.glob('/public/sprites/enemies/*.png', { eager: true, as: 'url' });
  const bases = new Set();
  for (const path of Object.keys(files)) {
    const file = path.split('/').pop().replace(/\.png$/, '');
    // Enemies use pairs: `{name}-idle.png` + `{name}-attack.png`.
    // Collapse to the base name so sprite dropdown shows one option per pair.
    const base = file.replace(/-(idle|attack)$/, '');
    bases.add(base);
  }
  return ['', ...Array.from(bases).sort()]
    .filter((b) => b !== '')
    .map((b) => ({ value: b, label: b }));
}

export function worldIdOptions() {
  return WORLDS.map((w) => ({ value: w.id, label: `${w.id} — ${w.name}` }));
}

/**
 * Items that can be dropped by enemies: blood_core + cultivation types.
 * Used by the enemy drops schema to restrict the itemId dropdown.
 */
export function combatDropItemOptions() {
  const all = [];
  for (const [id, mat] of Object.entries(ALL_MATERIALS)) {
    if (mat.type === 'blood_core' || mat.type === 'cultivation') {
      all.push({ value: id, label: `${id} — ${mat.name}` });
    }
  }
  return all;
}

/**
 * Items that can appear in gatherDrops: herbs + cultivation types.
 */
export function gatherDropItemOptions() {
  const all = [];
  for (const [id, mat] of Object.entries(ALL_MATERIALS)) {
    if (mat.type === 'herb' || mat.type === 'cultivation') {
      all.push({ value: id, label: `${id} — ${mat.name}` });
    }
  }
  return all;
}

/**
 * Items that can appear in mineDrops: ores + cultivation types.
 */
export function mineDropItemOptions() {
  const all = [];
  for (const [id, mat] of Object.entries(ALL_MATERIALS)) {
    if (mat.type === 'ore' || mat.type === 'cultivation') {
      all.push({ value: id, label: `${id} — ${mat.name}` });
    }
  }
  return all;
}

export function rarityOptions() {
  return ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];
}

/**
 * Master list of every stat id the gameplay engine actually consumes.
 * Keep in sync with src/data/stats.js computeAllStats — every entry here
 * either feeds a primary stat, a combat formula, or an activity rate.
 *
 * Schemas import this so designers can ONLY pick stats that are wired
 * into gameplay. Adding a new stat to gameplay = add it here.
 */
export const STAT_IDS = [
  // Primary
  'essence',
  'soul',
  'body',
  'health',
  // Combat damage
  'physical_damage',
  'elemental_damage',
  // Combat defense
  'defense',
  'elemental_defense',
  // Combat exploit (crit)
  'exploit_chance',
  'exploit_attack_mult',
  // Cultivation
  'qi_speed',
  'qi_focus_mult',
  // Activity
  'harvest_speed',
  'harvest_luck',
  'mining_speed',
  'mining_luck',
];

/** Human-readable label for each stat (used in dropdowns). */
export const STAT_LABEL = {
  essence:             'Essence',
  soul:                'Soul',
  body:                'Body',
  health:              'Health',
  physical_damage:     'Physical Damage',
  elemental_damage:    'Elemental Damage',
  defense:             'Defense',
  elemental_defense:   'Elemental Defense',
  exploit_chance:      'Exploit Chance (%)',
  exploit_attack_mult: 'Exploit Damage (%)',
  qi_speed:            'Qi Speed (×)',
  qi_focus_mult:       'Qi Focus / Boost (%)',
  harvest_speed:       'Harvest Speed (+pts/s)',
  harvest_luck:        'Harvest Luck (%)',
  mining_speed:        'Mining Speed (+pts/s)',
  mining_luck:         'Mining Luck (%)',
};

/** Returns dropdown-ready { value, label } pairs for STAT_IDS. */
export function statOptions() {
  return STAT_IDS.map((id) => ({ value: id, label: STAT_LABEL[id] ?? id }));
}
