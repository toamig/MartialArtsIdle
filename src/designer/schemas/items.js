import { rarityOptions } from '../enumSources.js';

/**
 * Item schema — shared across all 4 categories (herbs, minerals, pills,
 * cultivation). New items must declare `_category` so the runtime knows
 * which list to append into.
 */
export default [
  { key: 'name',        type: 'string',   label: 'Display name' },
  { key: 'rarity',      type: 'enum',     label: 'Rarity', options: rarityOptions },
  { key: 'description', type: 'textarea', label: 'Description', rows: 3 },
  { key: '_category',   type: 'enum',     label: 'Category',
    options: ['herbs', 'minerals', 'pills', 'cultivation'],
    help: 'Only required for NEW items. Existing items keep their original category.' },
];
