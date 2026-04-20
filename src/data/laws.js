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

// ── Phase Technique law ─────────────────────────────────────────────────────
// Granted exclusively by the `cb_pt` reincarnation-tree connector. Cannot be
// dismantled or unequipped (see useReincarnationKarma + Character tab guard).
// Crafting on it stays at base-tier mineral cost regardless of its actual
// quality — handled in src/data/crafting.js.
export const PHASE_TECHNIQUE_ID = 'phase_technique';

export const PHASE_TECHNIQUE_LAW = {
  id:                   PHASE_TECHNIQUE_ID,
  name:                 'Phase Technique',
  element:              'Phase',
  types:                ['physical', 'sword', 'fist', 'fire', 'water', 'earth', 'spirit', 'void', 'dao'],
  typeMults:            { essence: 3.50, body: 3.50, soul: 3.50 },
  rarity:               'Transcendent',
  realmRequirement:     0,
  realmRequirementLabel:'None — granted by Eternal Tree',
  flavour:              'Nine Daos braided into one cycle — the fruit of every life lived. Permanently bound to the soul; can never be unequipped.',
  cultivationSpeedMult: 1.5,
  // Special-case fields read by other systems:
  isPhaseTechnique:     true,
  uniques: {
    // Filled in on grant via lawEngine's standard roll function so each
    // player's Phase Technique has its own flavour. Frozen after grant.
  },
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

// Phase Technique is added to the LAWS map so the rest of the engine
// (typeMults reads, unique evaluation, equip flow) finds it by id.
const LAWS_WITH_PHASE = { ...LAWS_RAW, [PHASE_TECHNIQUE_ID]: PHASE_TECHNIQUE_LAW };
export const LAWS = mergeRecords(LAWS_WITH_PHASE, 'laws');

export const THREE_HARMONY_MANUAL = LAWS.three_harmony_manual;

// Active law used until a swap mechanic is implemented
export const DEFAULT_LAW = THREE_HARMONY_MANUAL;
