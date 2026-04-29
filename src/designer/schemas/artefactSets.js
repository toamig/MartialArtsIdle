import { ELEMENTS } from '../../data/elements';

/**
 * Artefact set schema (src/data/artefactSets.js SET_BONUSES).
 *
 * Each set has a stable id (set_<element>_<n>) and exposes a 2-piece and a
 * 4-piece bonus. Each bonus has a description (display) and an effects array
 * (engine). Effects are kind-discriminated:
 *   - 'stat'       → stat/mod/value (+ optional condition.{type,value})
 *   - 'flag'       → flag/value (boolean OR number — see flag below)
 *   - 'trigger'    → event/action.{type,value}
 *   - 'cd_mult'    → techType/mult
 *   - 'conversion' → from/to/pct (percent of `from` defense converted into `to`)
 *
 * The schema is intentionally permissive — kind-specific fields all live at
 * the top level and the engine ignores fields a given kind doesn't consume.
 */

const EFFECT_KIND_OPTIONS = [
  { value: 'stat',       label: 'stat — bonus to a stat' },
  { value: 'flag',       label: 'flag — boolean or numeric flag the engine reads' },
  { value: 'trigger',    label: 'trigger — fires on a combat event' },
  { value: 'cd_mult',    label: 'cd_mult — multiplies cooldown of one tech type' },
  { value: 'conversion', label: 'conversion — convert pct of one defense into another' },
];

const MOD_OPTIONS = [
  { value: 'flat',           label: 'flat (additive raw value)' },
  { value: 'increased',      label: 'increased (additive %)' },
  { value: 'more',           label: 'more (multiplicative)' },
  { value: 'base_flat',      label: 'base_flat (flat into base stage)' },
  { value: 'increased_base', label: 'increased_base (% of base added to base)' },
];

const TECH_TYPE_OPTIONS = [
  { value: 'Attack', label: 'Attack' },
  { value: 'Heal',   label: 'Heal' },
  { value: 'Defend', label: 'Defend' },
  { value: 'Dodge',  label: 'Dodge' },
  { value: 'Expose', label: 'Expose' },
];

const TRIGGER_EVENT_OPTIONS = [
  { value: 'on_heal',           label: 'on_heal' },
  { value: 'on_dodge_success',  label: 'on_dodge_success' },
  { value: 'on_enemy_killed',   label: 'on_enemy_killed' },
  { value: 'on_attack',         label: 'on_attack' },
];

const CONDITION_TYPE_OPTIONS = [
  { value: '',              label: '— always —' },
  { value: 'hp_below_pct',  label: 'hp_below_pct (player HP under threshold)' },
  { value: 'hp_above_pct',  label: 'hp_above_pct (player HP over threshold)' },
];

const DEFENSE_OPTIONS = [
  { value: 'defense',           label: 'defense' },
  { value: 'elemental_defense', label: 'elemental_defense' },
];

// Stats referenced by set bonuses today. Keep in sync with computeAllStats.
const SET_STAT_OPTIONS = [
  // damage / offense
  { value: 'damage_all',           label: 'damage_all' },
  { value: 'physical_damage',      label: 'physical_damage' },
  { value: 'elemental_damage',     label: 'elemental_damage' },
  { value: 'lifesteal',            label: 'lifesteal' },
  { value: 'exploit_chance',       label: 'exploit_chance' },
  { value: 'exploit_attack_mult',  label: 'exploit_attack_mult' },
  { value: 'buff_effect',          label: 'buff_effect (Expose buff scalar)' },
  // defense / sustain
  { value: 'defense',              label: 'defense' },
  { value: 'elemental_defense',    label: 'elemental_defense' },
  { value: 'incoming_damage_reduction', label: 'incoming_damage_reduction' },
  { value: 'health',               label: 'health' },
  { value: 'healing_received',     label: 'healing_received' },
  { value: 'hp_regen_in_combat',   label: 'hp_regen_in_combat' },
  { value: 'dodge_chance',         label: 'dodge_chance' },
];

const conditionSchema = [
  { key: 'type',  type: 'enum',   label: 'Condition', options: CONDITION_TYPE_OPTIONS },
  { key: 'value', type: 'number', label: 'Threshold (%)', step: 1,
    help: 'Used when type = hp_below_pct / hp_above_pct.' },
];

const actionSchema = [
  { key: 'type',  type: 'string', label: 'Action type',
    help: 'e.g. heal_pct, damage_enemy_pct_of_payload — read by combat trigger dispatcher.' },
  { key: 'value', type: 'number', label: 'Action value', step: 0.01 },
];

const effectRow = [
  { key: 'kind',  type: 'enum', label: 'Kind', options: EFFECT_KIND_OPTIONS },

  // stat / conversion
  { key: 'stat',  type: 'enum', label: 'Stat',  options: SET_STAT_OPTIONS },
  { key: 'mod',   type: 'enum', label: 'Mod',   options: MOD_OPTIONS },
  { key: 'value', type: 'number', label: 'Value', step: 0.01,
    help: 'For stat: the magnitude (e.g. 1.20 for +20% MORE). For flag: numeric value or true. For trigger: unused.' },
  { key: 'condition', type: 'object', label: 'Condition (stat only)', fields: conditionSchema },

  // flag
  { key: 'flag',  type: 'string', label: 'Flag id',
    help: 'Engine reads setFlags[<flag>]. Names are conventional (e.g. doubleSecretTechs, exposeBuffsApplyToAttack).' },

  // trigger
  { key: 'event',  type: 'enum',   label: 'Trigger event', options: TRIGGER_EVENT_OPTIONS },
  { key: 'action', type: 'object', label: 'Trigger action', fields: actionSchema },

  // cd_mult
  { key: 'techType', type: 'enum',   label: 'Tech type (cd_mult)', options: TECH_TYPE_OPTIONS },
  { key: 'mult',     type: 'number', label: 'CD multiplier',       step: 0.05 },

  // conversion
  { key: 'from', type: 'enum',   label: 'From (conversion)', options: DEFENSE_OPTIONS },
  { key: 'to',   type: 'enum',   label: 'To (conversion)',   options: DEFENSE_OPTIONS },
  { key: 'pct',  type: 'number', label: 'Pct (conversion)',  min: 0, max: 100, step: 1 },
];

const bonusSchema = [
  { key: 'description', type: 'textarea', label: 'Description (display)', rows: 2 },
  { key: 'effects', type: 'array', label: 'Effects', itemSchema: effectRow,
    help: 'Each effect contributes once. Multi-effect bonuses are common (e.g. fire-3 4-piece stacks lifesteal + cannotHeal flag).' },
];

export default [
  { key: 'element',   type: 'enum',     label: 'Element', options: ELEMENTS,
    help: 'Cosmetic; element identity actually comes from the id (set_<element>_<n>).' },
  { key: 'twoPiece',  type: 'object',   label: '2-piece bonus', fields: bonusSchema },
  { key: 'fourPiece', type: 'object',   label: '4-piece bonus', fields: bonusSchema },
];
