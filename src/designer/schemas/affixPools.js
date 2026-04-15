/**
 * Affix pools per equipment slot (src/data/affixPools.js).
 *
 * Each slot has a list of affixes; each affix has a stat, a modifier type
 * (FLAT / INCREASED / MORE), and per-rarity value ranges.
 *
 * The override file replaces the WHOLE pool for any slot it touches —
 * so editing here is "swap in this complete pool for weapons" rather than
 * "tweak a single weapon affix". Reverting drops the entry and falls back
 * to the source-file pool.
 */

import { statOptions } from '../enumSources.js';

const MOD_TYPE_OPTIONS = [
  { value: 'FLAT',      label: 'FLAT (additive raw)' },
  { value: 'INCREASED', label: 'INCREASED (% additive)' },
  { value: 'MORE',      label: 'MORE (multiplicative)' },
];

const rangePair = [
  { key: 'min', type: 'number', label: 'Min' },
  { key: 'max', type: 'number', label: 'Max' },
];

// A range-tuple as a 2-element number array (e.g. [10, 20])
const rangeArr = { type: 'array', itemType: 'number', label: '[min, max]' };

const affixRow = [
  { key: 'id',     type: 'string', label: 'Affix id' },
  { key: 'name',   type: 'string', label: 'Display name' },
  { key: 'stat',   type: 'enum',   label: 'Stat', options: statOptions },
  { key: 'type',   type: 'enum',   label: 'Modifier type', options: MOD_TYPE_OPTIONS },
  {
    key: 'ranges',
    type: 'object',
    label: 'Ranges per rarity',
    fields: [
      { ...rangeArr, key: 'Iron',         label: 'Iron' },
      { ...rangeArr, key: 'Bronze',       label: 'Bronze' },
      { ...rangeArr, key: 'Silver',       label: 'Silver' },
      { ...rangeArr, key: 'Gold',         label: 'Gold' },
      { ...rangeArr, key: 'Transcendent', label: 'Transcendent' },
    ],
  },
];

/**
 * Each "record" in the affixPools override is a slot key (weapon, head, ...)
 * mapping to a full pool array. We render this as a list of slots in the
 * left rail and a single editable array in the right pane.
 */
export const AFFIX_SLOTS = ['weapon', 'head', 'body', 'hands', 'waist', 'feet', 'neck', 'ring'];

export const AFFIX_ROW_SCHEMA = affixRow;
