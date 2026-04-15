import { rarityOptions } from '../enumSources.js';

/**
 * Pill schema (src/data/pills.js). Each pill has rarity, duration, and
 * an effects array. Effects are stat modifiers — see PILL_STAT_DISPLAY in
 * the original drawer for the supported stat list.
 *
 * NOTE: Pill recipes (which 3-herb combo brews this pill) are auto-derived
 * by pills.js at module load from herb tier sums. To shift recipes, edit
 * herb rarities via the Items tab, not here.
 */

const STAT_OPTIONS = [
  'qi_speed',
  'physical_damage',
  'elemental_damage',
  'defense',
  'elemental_defense',
  'health',
  'soul_toughness',
  'harvest_speed',
  'harvest_luck',
  'mining_speed',
  'mining_luck',
  'essence',
];

const TYPE_OPTIONS = [
  { value: '',          label: '— flat (raw value) —' },
  { value: 'flat',      label: 'flat' },
  { value: 'increased', label: 'increased (% multiplier)' },
];

const effectRow = [
  { key: 'stat',  type: 'enum',   label: 'Stat',    options: STAT_OPTIONS },
  { key: 'type',  type: 'enum',   label: 'Type',    options: TYPE_OPTIONS,
    help: 'qi_speed always treats value as a multiplier; for everything else use flat or increased.' },
  { key: 'value', type: 'number', label: 'Value',   step: 0.1 },
];

export default [
  { key: 'name',     type: 'string', label: 'Display name' },
  { key: 'rarity',   type: 'enum',   label: 'Rarity', options: rarityOptions },
  { key: 'duration', type: 'number', label: 'Duration (seconds)', min: 1, step: 1 },
  { key: 'effects',  type: 'array',  label: 'Effects', itemSchema: effectRow },
];
