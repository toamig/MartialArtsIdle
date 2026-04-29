import { rarityOptions, statOptions } from '../enumSources.js';

/**
 * Pill schema (src/data/pills.js). Each pill has a rarity and an effects
 * array. Effects are stat modifiers — every stat in statOptions() is wired
 * into gameplay. Pills grant PERMANENT stat bonuses on consumption.
 *
 * NOTE: Pill recipes (which 3-herb combo brews this pill) are auto-derived
 * by pills.js at module load from herb tier sums. To shift recipes, edit
 * herb rarities via the Materials tab, not here.
 */

const TYPE_OPTIONS = [
  { value: '',          label: '— flat (raw value) —' },
  { value: 'flat',      label: 'flat' },
  { value: 'increased', label: 'increased (% multiplier)' },
];

const effectRow = [
  { key: 'stat',  type: 'enum',   label: 'Stat',    options: statOptions },
  { key: 'type',  type: 'enum',   label: 'Type',    options: TYPE_OPTIONS,
    help: 'Use increased for % multipliers (harvest_speed / mining_speed); flat for raw additions.' },
  { key: 'value', type: 'number', label: 'Value',   step: 0.1 },
];

export default [
  { key: 'name',    type: 'string', label: 'Display name' },
  { key: 'rarity',  type: 'enum',   label: 'Rarity', options: rarityOptions },
  { key: 'effects', type: 'array',  label: 'Effects', itemSchema: effectRow },
];
