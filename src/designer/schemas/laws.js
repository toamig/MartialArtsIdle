import { rarityOptions } from '../enumSources.js';

/**
 * Law schema (src/data/laws.js). Currently THREE_HARMONY_MANUAL is the
 * only law; the swap mechanic for additional laws is unimplemented but
 * the override system is ready when it lands.
 *
 * uniques is a tier-keyed map: { Iron: { id, value }, Bronze: ..., ... }
 * up to the law's rarity. l_balanced_dao etc. are LAW_UNIQUES from
 * lawUniques.js (not editable here in MVP).
 */

import { ELEMENTS } from '../../data/elements';

const uniqueRef = [
  { key: 'id',    type: 'string', label: 'Unique id', help: 'Reference to a LAW_UNIQUE id (e.g. l_balanced_dao). Not validated yet.' },
  { key: 'value', type: 'number', label: 'Value',     step: 1 },
];

export default [
  { key: 'id',                     type: 'string', label: 'Id (immutable)' },
  { key: 'name',                   type: 'string', label: 'Display name' },
  { key: 'element',                type: 'enum',   label: 'Element', options: ELEMENTS },
  { key: 'types',                  type: 'array',  label: 'Unique pool types', itemType: 'string',
    help: 'Element ids whose unique pools this law can roll from (e.g. ["fire", "general"]). The Phase Technique uses every element + "general".' },
  { key: 'rarity',                 type: 'enum',   label: 'Rarity', options: rarityOptions },
  { key: 'realmRequirement',       type: 'number', label: 'Realm requirement (index)', min: 0, step: 1 },
  { key: 'realmRequirementLabel',  type: 'string', label: 'Realm requirement label' },
  { key: 'flavour',                type: 'textarea', label: 'Flavour text', rows: 3 },

  { key: 'cultivationSpeedMult',   type: 'number', label: 'Cultivation speed multiplier', step: 0.05 },

  {
    key: 'uniques',
    type: 'object',
    label: 'Uniques per tier',
    fields: [
      { key: 'Iron',         type: 'object', label: 'Iron',         fields: uniqueRef },
      { key: 'Bronze',       type: 'object', label: 'Bronze',       fields: uniqueRef },
      { key: 'Silver',       type: 'object', label: 'Silver',       fields: uniqueRef },
      { key: 'Gold',         type: 'object', label: 'Gold',         fields: uniqueRef },
      { key: 'Transcendent', type: 'object', label: 'Transcendent', fields: uniqueRef },
    ],
  },
];
