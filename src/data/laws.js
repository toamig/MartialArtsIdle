/**
 * Designer overrides: src/data/config/laws.override.json patches laws by `id`.
 * Each law lives under records[<id>]; the singleton THREE_HARMONY_MANUAL can
 * be edited in place. New laws can be appended (will become available once
 * the law swap mechanic is wired into the game).
 */
import { mergeRecords } from './config/loader';

export const LAW_RARITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af', passiveSlots: 1 },
  Bronze:       { label: 'Bronze',       color: '#cd7f32', passiveSlots: 2 },
  Silver:       { label: 'Silver',       color: '#c0c0c0', passiveSlots: 3 },
  Gold:         { label: 'Gold',         color: '#f5c842', passiveSlots: 4 },
  Transcendent: { label: 'Transcendent', color: '#c084fc', passiveSlots: 5 },
};

const LAWS_RAW = {
  three_harmony_manual: {
    id:                   'three_harmony_manual',
    name:                 'Three Harmony Manual',
    element:              'Normal',
    rarity:               'Iron',
    // realmIndex 0 = Tempered Body - Layer 1 (available from the start)
    realmRequirement:     0,
    realmRequirementLabel:'Tempered Body',
    flavour:              'The ancient text speaks of no fire, no storm, no mountain — only the even breath between all things.',
    cultivationSpeedMult: 1.0,
    essenceMult:          0.35,
    soulMult:             0.30,
    bodyMult:             0.35,
    // One unique modifier per tier, up to the law's rarity (Iron = 1 unique).
    uniques: {
      Iron: { id: 'l_balanced_dao', value: 15 },
    },
  },
};

export const LAWS = mergeRecords(LAWS_RAW, 'laws');

export const THREE_HARMONY_MANUAL = LAWS.three_harmony_manual;

// Active law used until a swap mechanic is implemented
export const DEFAULT_LAW = THREE_HARMONY_MANUAL;
