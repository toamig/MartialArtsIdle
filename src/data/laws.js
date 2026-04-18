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
  // id kept stable across the rebrand so existing saves keep their active law.
  three_harmony_manual: {
    id:                   'three_harmony_manual',
    name:                 'Unyielding Fist Manual',
    element:              'Normal',
    // Law types drive both the unique-pool filter and the per-primary-stat
    // default-attack multipliers (see typeMults below). Fist anchors to Body.
    types:                ['fist'],
    // Per-category default-attack multipliers. Only Body is covered here,
    // so the default attack becomes floor(B * 1.20).
    typeMults:            { essence: 0, body: 1.20, soul: 0 },
    rarity:               'Iron',
    // realmIndex 0 = Tempered Body - Layer 1 (available from the start)
    realmRequirement:     0,
    realmRequirementLabel:'Tempered Body',
    flavour:              "A drill-book of Tempered Body strikes — the disciple's first hundred blows, repeated until the bones remember them.",
    cultivationSpeedMult: 1.0,
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
