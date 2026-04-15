import { rarityOptions } from '../enumSources.js';

/**
 * Artefact schema (src/data/artefacts.js). Slot bonuses are formula-driven
 * by getSlotBonuses() and not editable here — only the metadata fields are.
 *
 * To change the actual stat bonus a slot grants, edit the formula in
 * src/data/artefacts.js (out of scope for the runtime override system).
 */

const SLOT_OPTIONS = ['weapon', 'head', 'body', 'hands', 'waist', 'feet', 'neck', 'ring'];

const WEAPON_TYPE_OPTIONS = [
  '', 'sword', 'spear', 'fan', 'staff', 'whip', 'bow',
];

export default [
  { key: 'name',        type: 'string', label: 'Display name' },
  { key: 'slot',        type: 'enum',   label: 'Slot', options: SLOT_OPTIONS },
  { key: 'rarity',      type: 'enum',   label: 'Rarity', options: rarityOptions },
  { key: 'weaponType',  type: 'enum',   label: 'Weapon type (weapons only)', options: WEAPON_TYPE_OPTIONS,
    help: 'Leave unset for non-weapon slots.' },
  { key: 'description', type: 'textarea', label: 'Description', rows: 3 },
];
