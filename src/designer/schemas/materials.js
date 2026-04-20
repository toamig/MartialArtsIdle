/**
 * Material schemas — one per sub-tab in the Materials editor. All four use
 * the canonical rarity tiers (Iron/Bronze/Silver/Gold/Transcendent) via
 * rarityOptions from enumSources.
 */
import { rarityOptions } from '../enumSources.js';

const nameField = { key: 'name', type: 'string', label: 'Display name' };
const rarityField = { key: 'rarity', type: 'enum', label: 'Rarity', options: rarityOptions };
const descriptionField = { key: 'description', type: 'textarea', label: 'Description', rows: 3 };

export const HERB_SCHEMA = [
  nameField,
  rarityField,
  { key: 'gatherCost', type: 'number', label: 'Gather cost (points)', min: 1, step: 1,
    help: 'Time to gather = gatherCost / gather speed. Default speed is 3 pts/sec, so cost 15 = 5s.' },
  descriptionField,
];

export const ORE_SCHEMA = [
  nameField,
  rarityField,
  { key: 'mineCost', type: 'number', label: 'Mine cost (points)', min: 1, step: 1,
    help: 'Time to mine = mineCost / mine speed. Default speed is 3 pts/sec, so cost 60 = 20s.' },
  descriptionField,
];

export const BLOOD_CORE_SCHEMA = [
  nameField,
  rarityField,
  descriptionField,
];

export const QI_STONE_SCHEMA = [
  nameField,
  rarityField,
  { key: 'gatherCost', type: 'number', label: 'Gather cost (points)', min: 1, step: 1 },
  { key: 'mineCost',   type: 'number', label: 'Mine cost (points)',   min: 1, step: 1 },
  { key: 'refinedQi',  type: 'number', label: 'Refined QI granted',   min: 0, step: 1,
    help: 'QI value when fed to the Qi Crystal.' },
  descriptionField,
];
