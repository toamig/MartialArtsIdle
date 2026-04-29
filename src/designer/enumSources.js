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
 *
 * Sources of truth:
 *   - src/data/stats.js computeAllStats (primary derivations)
 *   - src/App.jsx collapseFlat / collapsePct (modifier aggregations into
 *     the stats bundle consumed by useCombat / useCultivation / etc.)
 *   - src/data/artefactSets.js stat effects
 *   - src/data/laws.js + lawUniques.js stat effects
 *
 * Schemas import this so designers can ONLY pick stats that are wired
 * into gameplay. Adding a new stat to gameplay = add it here.
 */
export const STAT_IDS = [
  // ── Survival ──
  'health',
  'incoming_damage_reduction',
  'hp_regen_in_combat',
  'hp_regen_out_combat',
  'healing_received',
  'lifesteal',
  // ── Damage ──
  'physical_damage',
  'elemental_damage',
  'damage_all',
  'default_attack_damage',
  'secret_technique_damage',
  // ── Defense ──
  'defense',
  'elemental_defense',
  'defense_penetration',
  'ignore_defense_pct',
  'ignore_defense_chance',
  // ── Exploit (post-2026-04-26 consolidation; replaces crit) ──
  'exploit_chance',
  'exploit_attack_mult',
  // ── Dodge / reflect ──
  'dodge_chance',
  'dodge_fatal_chance',
  'reflect_pct',
  // ── Cooldowns + cast ──
  'cooldown_reduction_all',
  'technique_cd_reduction',
  'attack_cd_reduction',
  'tech_free_cast_chance',
  // ── Buff scaling ──
  'buff_duration',
  'buff_effect',
  // ── Cultivation ──
  'qi_speed',
  'qi_focus_mult',
  'offline_qi_mult',
  'heavenly_qi_mult',
  // ── Loot / crafting / activity ──
  'all_loot_bonus',
  'loot_luck',
  'pill_effect_mult',
  'crafting_cost_reduction',
  'harvest_speed',
  'harvest_luck',
  'mining_speed',
  'mining_luck',
];

/** Human-readable label for each stat (used in dropdowns). */
export const STAT_LABEL = {
  // Survival
  health:                    'Health',
  incoming_damage_reduction: 'Incoming Dmg Reduction',
  hp_regen_in_combat:        'HP Regen (in combat)',
  hp_regen_out_combat:       'HP Regen (out of combat)',
  healing_received:          'Healing Received (%)',
  lifesteal:                 'Lifesteal (%)',
  // Damage
  physical_damage:           'Physical Damage',
  elemental_damage:          'Elemental Damage',
  damage_all:                'Damage — All',
  default_attack_damage:     'Default Attack Damage',
  secret_technique_damage:   'Secret Technique Damage',
  // Defense
  defense:                   'Defense',
  elemental_defense:         'Elemental Defense',
  defense_penetration:       'Defense Penetration',
  ignore_defense_pct:        'Ignore Defense (%)',
  ignore_defense_chance:     'Ignore Defense Chance (%)',
  // Exploit
  exploit_chance:            'Exploit Chance (%)',
  exploit_attack_mult:       'Exploit Damage (%)',
  // Dodge / reflect
  dodge_chance:              'Dodge Chance (%)',
  dodge_fatal_chance:        'Dodge Fatal Chance (%)',
  reflect_pct:               'Reflect (%)',
  // Cooldowns + cast
  cooldown_reduction_all:    'Cooldown Reduction — All',
  technique_cd_reduction:    'Technique CD Reduction',
  attack_cd_reduction:       'Attack CD Reduction',
  tech_free_cast_chance:     'Free Cast Chance (%)',
  // Buff scaling
  buff_duration:             'Buff Duration (%)',
  buff_effect:               'Buff Effect (%)',
  // Cultivation
  qi_speed:                  'Qi Speed (×)',
  qi_focus_mult:             'Qi Focus / Boost (%)',
  offline_qi_mult:           'Offline Qi Multiplier',
  heavenly_qi_mult:          'Heavenly Qi Multiplier',
  // Loot / crafting / activity
  all_loot_bonus:            'All Loot Bonus (%)',
  loot_luck:                 'Loot Luck (%)',
  pill_effect_mult:          'Pill Effect Multiplier',
  crafting_cost_reduction:   'Crafting Cost Reduction',
  harvest_speed:             'Harvest Speed (+pts/s)',
  harvest_luck:              'Harvest Luck (%)',
  mining_speed:              'Mining Speed (+pts/s)',
  mining_luck:               'Mining Luck (%)',
};

/** Returns dropdown-ready { value, label } pairs for STAT_IDS. */
export function statOptions() {
  return STAT_IDS.map((id) => ({ value: id, label: STAT_LABEL[id] ?? id }));
}
