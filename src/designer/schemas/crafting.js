import { itemIdOptions, rarityOptions } from '../enumSources.js';

/**
 * Crafting singleton tables (src/data/crafting.js). The override file keys
 * each record by the singleton name and stores a full replacement object —
 * not per-field patches.
 */

const bracketRow = [
  { key: 'label',       type: 'enum',   label: 'Label', options: rarityOptions },
  { key: 'tier',        type: 'number', label: 'Tier', min: 1, max: 5, step: 1 },
  { key: 'count',       type: 'number', label: 'Slot count', min: 1, step: 1 },
  { key: 'color',       type: 'string', label: 'UI color', help: 'CSS hex, e.g. #9ca3af' },
  { key: 'mineralStat', type: 'enum',   label: 'Stat mineral',     options: itemIdOptions },
  { key: 'mineralMod',  type: 'enum',   label: 'Modifier mineral', options: itemIdOptions },
];

/*
 * Meta-schema describing each singleton. The CraftingEditor picks the right
 * form per singleton name.
 */
export const CRAFTING_SINGLETONS = [
  {
    key: 'SLOT_BRACKETS',
    label: 'Slot brackets',
    description: 'One bracket per rarity tier. Defines slot counts and per-tier materials.',
    type: 'list',              // array of objects
    itemSchema: bracketRow,
  },
];
