import { combatDropItemOptions, spriteOptions } from '../enumSources.js';

/**
 * Per-enemy schema. Values match the shape declared in src/data/enemies.js:
 *   {
 *     id, name, sprite, description, damageType,
 *     statMult: { hp, atk, def, elemDef },
 *     drops: [{ itemId, chance, qty: [min, max] }],
 *     techniqueDrop?: { chance },
 *   }
 *
 * Combat drops are restricted to blood_core + cultivation (QI stone) item types.
 * Minerals are gathering/mining-only and must NOT appear in enemy drops.
 *
 * `damageType` is auto-derived from DAMAGE_TYPE_BY_ID for built-in enemies, but
 * is editable via override so designer-added enemies can pick a damage type.
 */

const DAMAGE_TYPE_OPTIONS = [
  { value: 'physical',   label: 'physical' },
  { value: 'elemental',  label: 'elemental' },
];

export default [
  { key: 'name',        type: 'string',   label: 'Display name' },
  { key: 'sprite',      type: 'enum',     label: 'Sprite',       options: spriteOptions,
    help: 'Base filename under public/sprites/enemies/. Pairs as {name}-idle.png and {name}-attack.png.' },
  { key: 'description', type: 'textarea', label: 'Description',  rows: 3 },
  { key: 'damageType',  type: 'enum',     label: 'Damage type',  options: DAMAGE_TYPE_OPTIONS,
    help: 'physical hits player DEF, elemental hits ELEM_DEF. Defaults to physical for designer-added enemies.' },

  {
    key: 'statMult',
    type: 'object',
    label: 'Stat multipliers',
    fields: [
      { key: 'hp',      type: 'number', label: 'HP mult',           step: 0.05, help: 'Scales enemy max HP vs. player base stats.' },
      { key: 'atk',     type: 'number', label: 'Attack mult',       step: 0.05, help: 'Scales enemy attack damage vs. player base stats.' },
      { key: 'def',     type: 'number', label: 'DEF mult',          step: 0.05, help: 'Scales physical mitigation. Default 1.0.' },
      { key: 'elemDef', type: 'number', label: 'ELEM_DEF mult',     step: 0.05, help: 'Scales elemental mitigation. Default 1.0.' },
    ],
  },

  {
    key: 'drops',
    type: 'array',
    label: 'Drops',
    help: 'Blood cores + QI stones only. Minerals must NOT be added here — they drop from mining only.',
    itemSchema: [
      { key: 'itemId', type: 'enum',   label: 'Item',   options: combatDropItemOptions,
        help: 'Only blood_core and cultivation (QI stone) items are valid combat drops.' },
      { key: 'chance', type: 'number', label: 'Chance', min: 0, max: 1, step: 0.01,
        help: '0..1 probability per kill.' },
      { key: 'qty',    type: 'array',  label: 'Qty range [min, max]', itemType: 'number' },
    ],
  },

  {
    key: 'techniqueDrop',
    type: 'object',
    label: 'Technique drop',
    fields: [
      { key: 'chance', type: 'number', label: 'Chance', min: 0, max: 1, step: 0.01,
        help: 'Leave blank if this enemy does not drop techniques.' },
    ],
  },
];
