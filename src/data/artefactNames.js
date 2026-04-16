/**
 * Artefact name generation — two-part naming system.
 *
 * Every dropped/owned artefact instance gets a unique name composed of
 * one word from FIRST_NAMES and one from SECOND_NAMES. Both pools are
 * rarity-keyed, so higher-rarity artefacts draw from more evocative
 * word lists.
 *
 * Upgraded instances keep their original generated name and have an
 * "(upgraded)" suffix appended at display time (see useArtefacts).
 *
 * Designer overrides: src/data/config/artefactNames.override.json with
 * records.FIRST_NAMES and records.SECOND_NAMES replacing the pools.
 */

import { mergeSingleton } from './config/loader';

const FIRST_NAMES_RAW = {
  Iron: [
    'Rusty', 'Plain', 'Humble', 'Chipped', 'Worn',
    'Crude', 'Mundane', 'Simple', 'Coarse', 'Tarnished',
  ],
  Bronze: [
    'Steady', 'Polished', 'Ember', 'Vital', 'Tempered',
    'Keen', 'Sturdy', 'Burnished', 'Resolute', 'Glimmering',
  ],
  Silver: [
    'Lunar', 'Radiant', 'Azure', 'Frosted', 'Spectral',
    'Veiled', 'Silent', 'Arcane', 'Mirrored', 'Quicksilver',
  ],
  Gold: [
    'Blazing', 'Imperial', 'Ascendant', 'Thundering', 'Solar',
    'Dragonborne', 'Sovereign', 'Celestial', 'Sacred', 'Resplendent',
  ],
  Transcendent: [
    'Primordial', 'Heaven-Forged', 'Immortal', 'Divine', 'Void-Pierced',
    'Eternal', 'World-Breaking', 'Astral', 'Unbound', 'Apex',
  ],
};

const SECOND_NAMES_RAW = {
  Iron: [
    'Relic', 'Fragment', 'Token', 'Charm', 'Piece',
    'Shard', 'Keepsake', 'Trinket', 'Marker', 'Remnant',
  ],
  Bronze: [
    'Ornament', 'Sigil', 'Mark', 'Insignia', 'Bauble',
    'Effigy', 'Glyph', 'Totem', 'Rune', 'Emblem',
  ],
  Silver: [
    'Talisman', 'Vessel', 'Coronet', 'Wardstone', 'Crest',
    'Seal', 'Chalice', 'Focus', 'Lantern', 'Tome',
  ],
  Gold: [
    'Regalia', 'Aegis', 'Mantle', 'Crown', 'Scepter',
    'Halidom', 'Vestige', 'Boon', 'Sanctum', 'Reliquary',
  ],
  Transcendent: [
    'Aeon', 'Pinnacle', 'Covenant', 'Apotheosis', 'Dominion',
    'Genesis', 'Paragon', 'Oblation', 'Manifest', 'Eidolon',
  ],
};

export const FIRST_NAMES  = mergeSingleton(FIRST_NAMES_RAW,  'artefactNames', 'FIRST_NAMES');
export const SECOND_NAMES = mergeSingleton(SECOND_NAMES_RAW, 'artefactNames', 'SECOND_NAMES');

const FALLBACK_RARITY = 'Iron';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Roll a two-part name for a given rarity.
 * Returns { firstName, secondName } — callers store them on the instance
 * and compose the display string themselves.
 */
export function generateArtefactName(rarity) {
  const firsts  = FIRST_NAMES[rarity]  ?? FIRST_NAMES[FALLBACK_RARITY];
  const seconds = SECOND_NAMES[rarity] ?? SECOND_NAMES[FALLBACK_RARITY];
  return {
    firstName:  pick(firsts),
    secondName: pick(seconds),
  };
}

/**
 * Compose the display name from stored name parts.
 * `upgraded` appends an "(upgraded)" suffix.
 */
export function formatArtefactName({ firstName, secondName, upgraded }) {
  if (!firstName || !secondName) return null;
  const base = `${firstName} ${secondName}`;
  return upgraded ? `${base} (upgraded)` : base;
}
