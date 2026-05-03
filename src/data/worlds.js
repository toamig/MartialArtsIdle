/**
 * World map data — 6 worlds each with multiple regions.
 * minRealmIndex maps to the REALMS array in data/realms.js.
 *
 * Drop system:
 *   combat (enemies) → blood cores + QI stones — defined per-enemy in enemies.js
 *   gatherDrops      → herbs + QI stones — rolled per gather cycle, each entry independent
 *   mineDrops        → ores  + QI stones — rolled per mine cycle, each entry independent
 *
 * Each drop entry: { itemId, chance: 0–1, qty: [min, max] }
 *   For the focus item (progress bar target), item is selected weighted by chance.
 *   Secondary drops (QI stones) are then rolled independently.
 *
 * enemyPool: [{ enemyId, weight }] — weighted list of enemies that can appear.
 *   enemyId references ENEMIES in data/enemies.js.
 *   weight is relative; higher = more likely to appear.
 *   Max 2 enemy types per region. See docs/enemy-design.md.
 *
 * Designer overrides: src/data/config/worlds.override.json applies per-world
 * patches keyed by world `id` (top-level). Region edits go through full
 * world-record replacement since regions are nested arrays.
 */
import { mergeRecordArray } from './config/loader';

// ─── Drop-table helpers ──────────────────────────────────────────────────────
// Each region gets a (tier, step) descriptor. The tier matches the dominant
// combat blood-core rarity at that region (audited by gd.testDrops()), and
// the step is a 0-based escalation index inside that tier band — chance and
// qty climb step-by-step so every successive region is a meaningful upgrade
// even before the tier transitions. Quantity is capped at 3.
//
// The pattern was tuned 2026-05-03: previously gather/mine reached
// Transcendent ~7 regions earlier than combat blood cores, collapsing the
// progression curve. See `gd.testDrops()` for the audit.

const TIER_HERBS = {
  Iron:         ['iron_herb_1',         'iron_herb_2'],
  Bronze:       ['bronze_herb_1',       'bronze_herb_2'],
  Silver:       ['silver_herb_1',       'silver_herb_2'],
  Gold:         ['gold_herb_1',         'gold_herb_2'],
  Transcendent: ['transcendent_herb_1', 'transcendent_herb_2'],
};
const TIER_MINERALS = {
  Iron:         ['iron_mineral_1',         'iron_mineral_2'],
  Bronze:       ['bronze_mineral_1',       'bronze_mineral_2'],
  Silver:       ['silver_mineral_1',       'silver_mineral_2'],
  Gold:         ['gold_mineral_1',         'gold_mineral_2'],
  Transcendent: ['transcendent_mineral_1', 'transcendent_mineral_2'],
};
const TIER_GATHER_CULT = {
  Iron:         'iron_cultivation_1',
  Bronze:       'bronze_cultivation_1',
  Silver:       'silver_cultivation_1',
  Gold:         'gold_cultivation_1',
  Transcendent: 'transcendent_cultivation_1',
};
const TIER_MINE_CULT = {
  Iron:         'iron_cultivation_2',
  Bronze:       'bronze_cultivation_2',
  Silver:       'silver_cultivation_2',
  Gold:         'gold_cultivation_2',
  Transcendent: 'transcendent_cultivation_2',
};

// Step pattern: each entry escalates chance + qty for the same tier. EV
// per cycle climbs monotonically (1.225 → 3.1 in within-tier units).
const STEP_PATTERN = [
  { p1c: 0.55, p1q: [1, 2], p2c: 0.40, p2q: [1, 1], cultC: 0.35, cultQ: [1, 2] }, // 0
  { p1c: 0.60, p1q: [1, 2], p2c: 0.45, p2q: [1, 2], cultC: 0.40, cultQ: [1, 2] }, // 1
  { p1c: 0.65, p1q: [1, 2], p2c: 0.50, p2q: [1, 2], cultC: 0.40, cultQ: [1, 2] }, // 2
  { p1c: 0.70, p1q: [1, 3], p2c: 0.55, p2q: [1, 2], cultC: 0.45, cultQ: [1, 2] }, // 3
  { p1c: 0.75, p1q: [1, 3], p2c: 0.60, p2q: [1, 3], cultC: 0.45, cultQ: [1, 3] }, // 4
  { p1c: 0.80, p1q: [1, 3], p2c: 0.65, p2q: [1, 3], cultC: 0.50, cultQ: [1, 3] }, // 5
  { p1c: 0.85, p1q: [1, 3], p2c: 0.70, p2q: [1, 3], cultC: 0.50, cultQ: [1, 3] }, // 6
];

function gatherDropsFor(tier, step) {
  const [p1, p2] = TIER_HERBS[tier];
  const s = STEP_PATTERN[step];
  return [
    { itemId: p1, chance: s.p1c, qty: s.p1q },
    { itemId: p2, chance: s.p2c, qty: s.p2q },
    { itemId: TIER_GATHER_CULT[tier], chance: s.cultC, qty: s.cultQ },
  ];
}
function mineDropsFor(tier, step) {
  const [p1, p2] = TIER_MINERALS[tier];
  const s = STEP_PATTERN[step];
  return [
    { itemId: p1, chance: s.p1c, qty: s.p1q },
    { itemId: p2, chance: s.p2c, qty: s.p2q },
    { itemId: TIER_MINE_CULT[tier], chance: s.cultC, qty: s.cultQ },
  ];
}

const WORLDS = [
  {
    id: 1,
    name: 'The Mortal Lands',
    realms: 'Tempered Body → True Element',
    minRealmIndex: 0,
    description: 'A misty sect compound framed by a ceremonial red-and-gold gate, stone inscription pillars, and weathered guardian statues. Bamboo groves rise beyond the training grounds and pale mountains dissolve into perpetual mist. The air carries the smell of chalk dust and residual qi from years of disciples\' practice.',
    regions: [
      {
        name: 'Outer Sect Training Grounds',
        minRealm: 'Tempered Body L1',
        minRealmIndex: 0,
        enemies: 'Outer sect disciples, training golems',
        // First zone: training grounds yield no scrolls or artefacts. Combat
        // rolls (techDropChance / artefactDropChance) get zeroed in CombatScreen
        // when this flag is set, so the player has to clear it to start the
        // real loot loop in zone 2 onward.
        noScrollOrArtefactDrops: true,
        gatherDrops: gatherDropsFor('Iron', 0),
        mineDrops:   mineDropsFor('Iron', 0),
        enemyPool: [
          { enemyId: 'outer_sect_disciple', weight: 7 },
          { enemyId: 'training_golem',      weight: 3 },
        ],
      },
      {
        name: 'Borderland Wilds',
        minRealm: 'Tempered Body L5',
        minRealmIndex: 4,
        enemies: 'Outer sect disciples, pack wolves',
        gatherDrops: gatherDropsFor('Iron', 1),
        mineDrops:   mineDropsFor('Iron', 1),
        enemyPool: [
          { enemyId: 'outer_sect_disciple', weight: 5 },
          { enemyId: 'wolf',                weight: 5 },
        ],
      },
      {
        name: "Bandit's Crossing",
        minRealm: 'Tempered Body L8',
        minRealmIndex: 7,
        enemies: 'Bandit scouts, rogue disciples',
        gatherDrops: gatherDropsFor('Iron', 2),
        mineDrops:   mineDropsFor('Iron', 2),
        enemyPool: [
          { enemyId: 'bandit_scout',   weight: 5 },
          { enemyId: 'rogue_disciple', weight: 5 },
        ],
      },
      {
        name: 'Qi-Vein Ravines',
        minRealm: 'Qi Transformation Early',
        minRealmIndex: 10,
        enemies: 'Wandering beasts, bandit scouts',
        gatherDrops: gatherDropsFor('Bronze', 0),
        mineDrops:   mineDropsFor('Bronze', 0),
        enemyPool: [
          { enemyId: 'wandering_beast', weight: 5 },
          { enemyId: 'bandit_scout',    weight: 5 },
        ],
      },
      {
        name: 'Misty Spirit Forest',
        minRealm: 'True Element Early',
        minRealmIndex: 14,
        enemies: 'Rogue disciples, wandering beasts',
        gatherDrops: gatherDropsFor('Bronze', 1),
        mineDrops:   mineDropsFor('Bronze', 1),
        enemyPool: [
          { enemyId: 'rogue_disciple',  weight: 5 },
          { enemyId: 'wandering_beast', weight: 5 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'The Ancient Frontier',
    realms: 'Separation & Reunion → Immortal Ascension',
    minRealmIndex: 18,
    description: 'A vast wasteland of cracked orange earth baked to the texture of ancient pottery. Collapsed stone archways and ruined gate structures jut from the desert floor alongside enormous bleached bone remains. A massive corroded cauldron sits at the heart of the ruins — the only structure still standing intact in an otherwise dead landscape.',
    regions: [
      {
        name: 'Shattered Sky Desert',
        minRealm: 'Separation & Reunion 1st',
        minRealmIndex: 18,
        enemies: 'Sand dragons, bone constructs',
        gatherDrops: gatherDropsFor('Bronze', 2),
        mineDrops:   mineDropsFor('Bronze', 2),
        enemyPool: [
          { enemyId: 'sand_dragon',    weight: 5 },
          { enemyId: 'bone_construct', weight: 5 },
        ],
      },
      {
        name: 'Demon Beast Plains',
        minRealm: 'Separation & Reunion 3rd',
        minRealmIndex: 20,
        enemies: 'Iron fang wolves, iron spine boars',
        gatherDrops: gatherDropsFor('Bronze', 3),
        mineDrops:   mineDropsFor('Bronze', 3),
        enemyPool: [
          { enemyId: 'iron_fang_wolf',  weight: 5 },
          { enemyId: 'iron_spine_boar', weight: 5 },
        ],
      },
      {
        name: 'Sunken Immortal City',
        minRealm: 'Immortal Ascension 1st',
        minRealmIndex: 21,
        enemies: 'City guardian constructs, trapped immortal shades',
        gatherDrops: gatherDropsFor('Bronze', 4),
        mineDrops:   mineDropsFor('Bronze', 4),
        enemyPool: [
          { enemyId: 'city_guardian',  weight: 5 },
          { enemyId: 'immortal_shade', weight: 5 },
        ],
      },
      {
        name: 'Blood Sea Wastes',
        minRealm: 'Immortal Ascension 3rd',
        minRealmIndex: 23,
        enemies: 'Blood sea leviathans, corrupted cultivators',
        gatherDrops: gatherDropsFor('Bronze', 5),
        mineDrops:   mineDropsFor('Bronze', 5),
        enemyPool: [
          { enemyId: 'blood_leviathan',      weight: 6 },
          { enemyId: 'corrupted_cultivator', weight: 4 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'The Forbidden Lands',
    realms: 'Saint → Saint King',
    minRealmIndex: 24,
    description: 'A forbidden stone corridor lined with ancient guardian statues, their eyes alight with cold green spiritual fire. Beyond the rows of sentinels, a dark palace looms with green-lit torches burning at its sealed threshold. The air is still and heavy with the qi of the long-dead, the silence broken only by the distant resonance of ancient war seals.',
    regions: [
      {
        name: 'Saint Burial Grounds',
        minRealm: 'Saint Early',
        minRealmIndex: 24,
        enemies: 'Burial guardians, saint corpse-soldiers',
        gatherDrops: gatherDropsFor('Silver', 0),
        mineDrops:   mineDropsFor('Silver', 0),
        enemyPool: [
          { enemyId: 'burial_guardian',      weight: 5 },
          { enemyId: 'saint_corpse_soldier', weight: 5 },
        ],
      },
      {
        name: 'Void Rift Expanse',
        minRealm: 'Saint Late',
        minRealmIndex: 26,
        enemies: 'Void rift predators, rift stalkers',
        gatherDrops: gatherDropsFor('Silver', 1),
        mineDrops:   mineDropsFor('Silver', 1),
        enemyPool: [
          { enemyId: 'void_rift_predator', weight: 5 },
          { enemyId: 'rift_stalker',       weight: 5 },
        ],
      },
      {
        name: 'Nine-Death Mountain Range',
        minRealm: 'Saint King 1st',
        minRealmIndex: 27,
        enemies: 'Saint bone sovereigns, void shades',
        gatherDrops: gatherDropsFor('Silver', 2),
        mineDrops:   mineDropsFor('Silver', 2),
        enemyPool: [
          { enemyId: 'saint_bone_sovereign', weight: 5 },
          { enemyId: 'void_shade',           weight: 5 },
        ],
      },
      {
        name: 'Sealed War Altar',
        minRealm: 'Saint King 3rd',
        minRealmIndex: 29,
        enemies: 'Forbidden constructs, ancient war spirits',
        gatherDrops: gatherDropsFor('Silver', 3),
        mineDrops:   mineDropsFor('Silver', 3),
        enemyPool: [
          { enemyId: 'forbidden_construct', weight: 5 },
          { enemyId: 'ancient_war_spirit',  weight: 5 },
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'The Origin Depths',
    realms: 'Origin Returning → Origin King',
    minRealmIndex: 30,
    description: 'A vast underground cavern lit by twin dragon-head stone pillars flanking a waterfall that cascades into a glowing origin qi pool. Teal crystal formations cluster across the cave walls, casting cool light into the dark. Ancient gnarled roots descend from the ceiling far above, and the air is thick with the overwhelming pressure of primordial earth energy.',
    regions: [
      {
        name: 'Origin Qi Spring Depths',
        minRealm: 'Origin Returning 1st',
        minRealmIndex: 30,
        enemies: 'Origin guardians, origin crystal golems',
        gatherDrops: gatherDropsFor('Gold', 0),
        mineDrops:   mineDropsFor('Gold', 0),
        enemyPool: [
          { enemyId: 'origin_guardian',      weight: 5 },
          { enemyId: 'origin_crystal_golem', weight: 5 },
        ],
      },
      {
        name: 'World Root Caverns',
        minRealm: 'Origin Returning 2nd',
        minRealmIndex: 31,
        enemies: 'Origin guardians, primordial serpents, cavern elder demons',
        gatherDrops: gatherDropsFor('Gold', 1),
        mineDrops:   mineDropsFor('Gold', 1),
        enemyPool: [
          { enemyId: 'origin_guardian',    weight: 5 },
          { enemyId: 'primordial_serpent', weight: 5 },
          { enemyId: 'cavern_elder_demon', weight: 5 },
        ],
      },
      {
        name: 'Ancient Root Grotto',
        minRealm: 'Origin Returning 3rd',
        minRealmIndex: 32,
        enemies: 'Forest spirits, root sovereigns, cavern elder demons',
        gatherDrops: gatherDropsFor('Gold', 2),
        mineDrops:   mineDropsFor('Gold', 2),
        enemyPool: [
          { enemyId: 'forest_spirit',      weight: 5 },
          { enemyId: 'root_sovereign',     weight: 5 },
          { enemyId: 'cavern_elder_demon', weight: 5 },
        ],
      },
      {
        name: 'Primordial Forest Core',
        minRealm: 'Origin King 1st',
        minRealmIndex: 33,
        enemies: 'Ancient beasts, world root wraiths, forest spirits',
        gatherDrops: gatherDropsFor('Gold', 3),
        mineDrops:   mineDropsFor('Gold', 3),
        enemyPool: [
          { enemyId: 'ancient_beast',     weight: 5 },
          { enemyId: 'world_root_wraith', weight: 5 },
          { enemyId: 'forest_spirit',     weight: 5 },
        ],
      },
      {
        name: 'Ancient Origin Altar',
        minRealm: 'Origin King 3rd',
        minRealmIndex: 35,
        enemies: 'Deep earth titans, ancient beasts',
        gatherDrops: gatherDropsFor('Gold', 4),
        mineDrops:   mineDropsFor('Gold', 4),
        enemyPool: [
          { enemyId: 'deep_earth_titan', weight: 5 },
          { enemyId: 'ancient_beast',    weight: 5 },
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'The Void Sea',
    realms: 'Void King → Emperor Realm',
    minRealmIndex: 36,
    description: 'A fractured void expanse under a sky of deep magenta, split by jagged energy cracks and floating Dao inscription tablets. A solitary stone gate stands on crumbling ground at the horizon, and a yin-yang symbol drifts overhead in charged silence. The floor is cracked like old clay — the only solid surface in a space that is constantly breaking apart at the edges.',
    regions: [
      {
        name: 'Fractured Space Corridors',
        minRealm: 'Void King 1st',
        minRealmIndex: 36,
        enemies: 'Spatial fissure beasts, qi-sensing beasts, void elementals',
        gatherDrops: gatherDropsFor('Gold', 5),
        mineDrops:   mineDropsFor('Gold', 5),
        enemyPool: [
          { enemyId: 'spatial_fissure_beast', weight: 5 },
          { enemyId: 'qi_beast',              weight: 3 },
          { enemyId: 'void_elemental',        weight: 2 },
        ],
      },
      {
        name: 'Void Sea Shores',
        minRealm: 'Void King 3rd',
        minRealmIndex: 38,
        enemies: 'Void sea leviathans, void elementals',
        gatherDrops: gatherDropsFor('Gold', 6),
        mineDrops:   mineDropsFor('Gold', 6),
        enemyPool: [
          { enemyId: 'void_sea_leviathan', weight: 5 },
          { enemyId: 'void_elemental',     weight: 5 },
        ],
      },
      {
        name: 'Dao Inscription Ruins',
        minRealm: 'Dao Source 1st',
        minRealmIndex: 39,
        enemies: 'Dao inscription guardians, dao inscription revenants',
        gatherDrops: gatherDropsFor('Transcendent', 0),
        mineDrops:   mineDropsFor('Transcendent', 0),
        enemyPool: [
          { enemyId: 'dao_inscription_guardian', weight: 5 },
          { enemyId: 'dao_inscription_revenant', weight: 5 },
        ],
      },
      {
        name: 'Ancient Emperor Tomb',
        minRealm: 'Emperor Realm 1st',
        minRealmIndex: 42,
        enemies: 'Emperor will fragments, petrified dao lords',
        gatherDrops: gatherDropsFor('Transcendent', 1),
        mineDrops:   mineDropsFor('Transcendent', 1),
        enemyPool: [
          { enemyId: 'emperor_will_fragment', weight: 6 },
          { enemyId: 'petrified_dao_lord',    weight: 4 },
        ],
      },
      {
        name: 'Heaven Sword Ridge',
        minRealm: 'Emperor Realm 3rd',
        minRealmIndex: 44,
        enemies: 'Star sea drifters, emperor will fragments, dao inscription revenants',
        gatherDrops: gatherDropsFor('Transcendent', 2),
        mineDrops:   mineDropsFor('Transcendent', 2),
        enemyPool: [
          { enemyId: 'star_sea_drifter',         weight: 5 },
          { enemyId: 'emperor_will_fragment',    weight: 5 },
          { enemyId: 'dao_inscription_revenant', weight: 5 },
        ],
      },
    ],
  },
  {
    id: 6,
    name: 'The Open Heaven',
    realms: 'Open Heaven Layer 1 → Open Heaven Layer 6',
    minRealmIndex: 45,
    description: 'A boundless open heaven realm of blinding gold and white, where massive inscription-covered pillars rise from a seamless celestial floor into cloud banks that stretch to infinity. Cranes glide silently through the radiant haze between the pillars. The ambient pressure alone is enough to obliterate anything that has not reached the Open Heaven threshold.',
    regions: [
      {
        name: 'Heaven Pillar Ascent',
        minRealm: 'Open Heaven Layer 1',
        minRealmIndex: 45,
        enemies: 'Heaven pillar guardians, boundary wraiths',
        gatherDrops: gatherDropsFor('Transcendent', 3),
        mineDrops:   mineDropsFor('Transcendent', 3),
        enemyPool: [
          { enemyId: 'heaven_pillar_guardian', weight: 5 },
          { enemyId: 'boundary_wraith',        weight: 5 },
        ],
      },
      {
        name: 'Star Sea Approaches',
        minRealm: 'Open Heaven Layer 2',
        minRealmIndex: 46,
        enemies: 'Open heaven beasts, star sea leviathans',
        gatherDrops: gatherDropsFor('Transcendent', 4),
        mineDrops:   mineDropsFor('Transcendent', 4),
        enemyPool: [
          { enemyId: 'open_heaven_beast',  weight: 6 },
          { enemyId: 'star_sea_leviathan', weight: 4 },
        ],
      },
      {
        name: 'Celestial Rift Expanse',
        minRealm: 'Open Heaven Layer 4',
        minRealmIndex: 48,
        enemies: 'Celestial sovereigns, eternal storm titans',
        gatherDrops: gatherDropsFor('Transcendent', 5),
        mineDrops:   mineDropsFor('Transcendent', 5),
        enemyPool: [
          { enemyId: 'celestial_sovereign', weight: 5 },
          { enemyId: 'eternal_storm_titan', weight: 5 },
        ],
      },
      {
        name: "Heaven's Core",
        minRealm: 'Open Heaven Layer 6',
        minRealmIndex: 50,
        enemies: 'Open heaven sovereigns, void apex predators',
        gatherDrops: gatherDropsFor('Transcendent', 6),
        mineDrops:   mineDropsFor('Transcendent', 6),
        enemyPool: [
          { enemyId: 'open_heaven_sovereign', weight: 6 },
          { enemyId: 'void_apex_predator',    weight: 4 },
        ],
      },
    ],
  },
];

// Apply designer overrides (keyed by world id) BEFORE denormalizing regions,
// so region edits shipped via the override flow through to the runtime shape.
const WORLDS_PATCHED = mergeRecordArray(WORLDS, 'worlds', 'id');

// Denormalize worldId into each region so regions carry their world context.
const WORLDS_WITH_ID = WORLDS_PATCHED.map(w => ({
  ...w,
  regions: w.regions.map(r => ({ ...r, worldId: w.id })),
}));

export default WORLDS_WITH_ID;
