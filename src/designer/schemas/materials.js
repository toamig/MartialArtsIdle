/**
 * Material schema — used for both HERBS (gatherCost) and ORES (mineCost).
 * The MaterialsEditor decides at render time whether to show gatherCost or
 * mineCost based on which sub-tab is active.
 */
const RARITY_OPTIONS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

export const HERB_SCHEMA = [
  { key: 'rarity',     type: 'enum',   label: 'Rarity', options: RARITY_OPTIONS },
  { key: 'gatherCost', type: 'number', label: 'Gather cost (points)', min: 1, step: 1,
    help: 'Time to gather = gatherCost / gather speed. Default speed is 3 pts/sec, so cost 15 = 5s.' },
];

export const ORE_SCHEMA = [
  { key: 'rarity',   type: 'enum',   label: 'Rarity', options: RARITY_OPTIONS },
  { key: 'mineCost', type: 'number', label: 'Mine cost (points)', min: 1, step: 1,
    help: 'Time to mine = mineCost / mine speed. Default speed is 3 pts/sec, so cost 60 = 20s.' },
];
