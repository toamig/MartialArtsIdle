import { enemyIdOptions, gatherDropItemOptions, mineDropItemOptions } from '../enumSources.js';

/**
 * World record schema (src/data/worlds.js default export).
 * A world has top-level fields + an array of regions, each with its own
 * enemy pool, gather drops, and mine drops.
 *
 * Combat drops live in enemies.js (per-enemy). Regions no longer carry
 * a `drops`, `herbs`, or `ores` field.
 */

/** Shared drop row: { itemId, chance, qty } */
const makeDropRow = (itemOptions) => [
  { key: 'itemId', type: 'enum',   label: 'Item',   options: itemOptions },
  { key: 'chance', type: 'number', label: 'Chance', min: 0, max: 1, step: 0.01,
    help: '0..1 independent probability per gather/mine cycle.' },
  { key: 'qty',    type: 'array',  label: 'Qty range [min, max]', itemType: 'number' },
];

const regionSchema = [
  { key: 'name',          type: 'string', label: 'Region name' },
  { key: 'minRealm',      type: 'string', label: 'Min realm label',
    help: 'Display text. Authoritative value is minRealmIndex.' },
  { key: 'minRealmIndex', type: 'number', label: 'Min realm index', min: 0, step: 1,
    help: 'Index into src/data/realms.js. 0 = Tempered Body Layer 1.' },
  {
    key: 'enemyPool',
    type: 'array',
    label: 'Enemy pool',
    itemSchema: [
      { key: 'enemyId', type: 'enum',   label: 'Enemy', options: enemyIdOptions },
      { key: 'weight',  type: 'number', label: 'Weight', min: 1, step: 1,
        help: 'Relative weight; higher = more likely.' },
    ],
  },
  {
    key: 'gatherDrops',
    type: 'array',
    label: 'Gather drops',
    help: 'Herbs + QI stone bonus drops. Herbs are primary (always given); cultivation items roll independently.',
    itemSchema: makeDropRow(gatherDropItemOptions),
  },
  {
    key: 'mineDrops',
    type: 'array',
    label: 'Mine drops',
    help: 'Ores + QI stone bonus drops. Ores are primary (always given); cultivation items roll independently.',
    itemSchema: makeDropRow(mineDropItemOptions),
  },
  { key: 'noScrollOrArtefactDrops', type: 'boolean', label: 'No technique / artefact drops',
    help: 'When true, enemies in this region do NOT roll technique scrolls or artefacts. Set on Training Grounds for the early-game safety rail.' },
];

export default [
  { key: 'id',             type: 'number', label: 'World id', min: 1, step: 1,
    help: 'Immutable. Changing breaks save-file references and enemy drop tables.' },
  { key: 'name',           type: 'string', label: 'World name' },
  { key: 'realms',         type: 'string', label: 'Realm range label',
    help: 'Display text like "Tempered Body → True Element".' },
  { key: 'minRealmIndex',  type: 'number', label: 'Min realm index', min: 0, step: 1 },
  { key: 'description',    type: 'textarea', label: 'Description', rows: 4 },
  { key: 'regions',        type: 'array', label: 'Regions', itemSchema: regionSchema },
];
