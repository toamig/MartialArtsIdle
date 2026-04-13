/**
 * World map data — 6 worlds each with multiple regions.
 * minRealmIndex maps to the REALMS array in data/realms.js.
 * Herbs/ores cross-reference Gathering.md and Mining.md.
 *
 * enemyPool: [{ enemyId, weight }] — weighted list of enemies that can appear.
 *   enemyId references ENEMIES in data/enemies.js.
 *   weight is relative; higher = more likely to appear.
 *   Max 2 enemy types per region. See docs/enemy-design.md.
 */
const WORLDS = [
  {
    id: 1,
    name: 'The Mortal Lands',
    realms: 'Tempered Body → True Element',
    minRealmIndex: 0,
    regions: [
      {
        name: 'Outer Sect Training Grounds',
        minRealm: 'Tempered Body L1',
        minRealmIndex: 0,
        enemies: 'Outer sect disciples, training golems',
        drops: 'Iron Cultivation 1, Iron Mineral 1',
        herbs: 'Iron Herb 1',
        ores: 'Iron Mineral 1',
        enemyPool: [
          { enemyId: 'outer_sect_disciple', weight: 7 },
          { enemyId: 'training_golem',      weight: 3 },
        ],
      },
      {
        name: 'Borderland Wilds',
        minRealm: 'Tempered Body L5',
        minRealmIndex: 4,
        enemies: 'Pack wolves, bandit scouts',
        drops: 'Iron Cultivation 1, Bronze Cultivation 1, Iron Mineral 1',
        herbs: 'Iron Herb 1, Bronze Herb 1',
        ores: 'Iron Mineral 1, Bronze Mineral 1',
        enemyPool: [
          { enemyId: 'wolf',         weight: 6 },
          { enemyId: 'bandit_scout', weight: 4 },
        ],
      },
      {
        name: 'Qi-Vein Ravines',
        minRealm: 'Qi Transformation Early',
        minRealmIndex: 10,
        enemies: 'Wandering beasts, qi-sensing beasts',
        drops: 'Iron Cultivation 1, Bronze Cultivation 1, Bronze Mineral 1',
        herbs: 'Bronze Herb 1, Bronze Herb 2',
        ores: 'Bronze Mineral 1',
        enemyPool: [
          { enemyId: 'wandering_beast', weight: 5 },
          { enemyId: 'qi_beast',        weight: 5 },
        ],
      },
      {
        name: 'Misty Spirit Forest',
        minRealm: 'Qi Transformation Peak',
        minRealmIndex: 13,
        enemies: 'Forest spirits, rogue disciples',
        drops: 'Iron Cultivation 1, Bronze Cultivation 1, Bronze Mineral 2',
        herbs: 'Bronze Herb 2',
        ores: 'Bronze Mineral 1, Bronze Mineral 2',
        enemyPool: [
          { enemyId: 'forest_spirit',  weight: 6 },
          { enemyId: 'rogue_disciple', weight: 4 },
        ],
      },
      {
        // Clifftop forests where spirits linger; rogue disciples seek seclusion here
        name: "Heaven's Edge Peak",
        minRealm: 'True Element Early',
        minRealmIndex: 14,
        enemies: 'Rogue disciples, forest spirits',
        drops: 'Bronze Cultivation 1, Bronze Mineral 1, Bronze Mineral 2',
        herbs: 'Bronze Herb 1, Bronze Herb 2',
        ores: 'Bronze Mineral 2',
        enemyPool: [
          { enemyId: 'rogue_disciple', weight: 5 },
          { enemyId: 'forest_spirit',  weight: 5 },
        ],
      },
      {
        // Qi beasts drawn to storm lightning; rogue disciples surviving the plateau's qi storms
        name: 'Thunderstorm Plateau',
        minRealm: 'True Element Peak',
        minRealmIndex: 17,
        enemies: 'Qi-sensing beasts, rogue disciples',
        drops: 'Bronze Cultivation 1, Bronze Cultivation 2, Bronze Mineral 2',
        herbs: 'Bronze Herb 2',
        ores: 'Bronze Mineral 2',
        enemyPool: [
          { enemyId: 'qi_beast',       weight: 6 },
          { enemyId: 'rogue_disciple', weight: 4 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'The Ancient Frontier',
    realms: 'Separation & Reunion → Immortal Ascension',
    minRealmIndex: 18,
    regions: [
      {
        name: 'Shattered Sky Desert',
        minRealm: 'Separation & Reunion 1st',
        minRealmIndex: 18,
        enemies: 'Sand dragons, bone constructs',
        drops: 'Silver Cultivation 1, Silver Mineral 1, Silver Mineral 2',
        herbs: 'Silver Herb 1, Silver Herb 2',
        ores: 'Silver Mineral 1, Silver Mineral 2',
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
        drops: 'Bronze Cultivation 1, Silver Cultivation 1, Silver Mineral 1',
        herbs: 'Silver Herb 1',
        ores: 'Silver Mineral 1',
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
        drops: 'Silver Cultivation 1, Silver Cultivation 2, Silver Mineral 2',
        herbs: 'Silver Herb 1, Silver Herb 2',
        ores: 'Silver Mineral 1, Silver Mineral 2',
        enemyPool: [
          { enemyId: 'city_guardian',  weight: 5 },
          { enemyId: 'immortal_shade', weight: 5 },
        ],
      },
      {
        // Bone constructs from ancient ruins scattered through the wastes; corrupted qi-mad cultivators
        name: 'Primal Qi Wastes',
        minRealm: 'Immortal Ascension 2nd',
        minRealmIndex: 22,
        enemies: 'Corrupted cultivators, bone constructs',
        drops: 'Silver Cultivation 1, Silver Cultivation 2, Silver Mineral 2',
        herbs: 'Silver Herb 2',
        ores: 'Silver Mineral 2',
        enemyPool: [
          { enemyId: 'corrupted_cultivator', weight: 6 },
          { enemyId: 'bone_construct',       weight: 4 },
        ],
      },
      {
        name: 'Blood Sea Periphery',
        minRealm: 'Immortal Ascension 3rd',
        minRealmIndex: 23,
        enemies: 'Blood sea leviathans, corrupted cultivators',
        drops: 'Silver Cultivation 2, Silver Mineral 2, Gold Mineral 1',
        herbs: 'Silver Herb 2',
        ores: 'Silver Mineral 2',
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
    regions: [
      {
        name: 'Saint Burial Grounds',
        minRealm: 'Saint Early',
        minRealmIndex: 24,
        enemies: 'Burial guardians, saint corpse-soldiers',
        drops: 'Gold Cultivation 1, Gold Mineral 1',
        herbs: 'Silver Herb 2, Gold Herb 1',
        ores: 'Silver Mineral 2, Gold Mineral 1',
        enemyPool: [
          { enemyId: 'burial_guardian',      weight: 5 },
          { enemyId: 'saint_corpse_soldier', weight: 5 },
        ],
      },
      {
        name: 'Primal Qi Wastes (Deep)',
        minRealm: 'Saint Middle',
        minRealmIndex: 25,
        enemies: 'Ancient war spirits, saint bone sovereigns',
        drops: 'Gold Cultivation 1, Gold Cultivation 2, Gold Mineral 1',
        herbs: 'Gold Herb 1',
        ores: 'Gold Mineral 1',
        enemyPool: [
          { enemyId: 'ancient_war_spirit',   weight: 5 },
          { enemyId: 'saint_bone_sovereign', weight: 5 },
        ],
      },
      {
        // Both rift-born hunters — the stalker is the faster, leaner predator of the same rift ecosystem
        name: 'Void Rift Expanse',
        minRealm: 'Saint Late',
        minRealmIndex: 26,
        enemies: 'Void rift predators, rift stalkers',
        drops: 'Gold Cultivation 2, Gold Mineral 2, Transcendent Mineral 1',
        herbs: 'Gold Herb 1, Gold Herb 2',
        ores: 'Gold Mineral 1, Gold Mineral 2',
        enemyPool: [
          { enemyId: 'void_rift_predator', weight: 5 },
          { enemyId: 'rift_stalker',       weight: 5 },
        ],
      },
      {
        // Cursed mountain passes haunted by void shades; the Saint Bone Sovereign claims the range as territory
        name: 'Nine-Death Mountain Range',
        minRealm: 'Saint King 1st',
        minRealmIndex: 27,
        enemies: 'Saint bone sovereigns, void shades',
        drops: 'Gold Cultivation 2, Gold Mineral 2, Transcendent Mineral 1',
        herbs: 'Gold Herb 1, Gold Herb 2',
        ores: 'Gold Mineral 2',
        enemyPool: [
          { enemyId: 'saint_bone_sovereign', weight: 5 },
          { enemyId: 'void_shade',           weight: 5 },
        ],
      },
      {
        // Forbidden construct guards the sealed altar; ancient war spirits are bound to the altar itself
        name: 'Sealed War Altar',
        minRealm: 'Saint King 3rd',
        minRealmIndex: 29,
        enemies: 'Forbidden constructs, ancient war spirits',
        drops: 'Gold Cultivation 2, Transcendent Mineral 1',
        herbs: 'Gold Herb 2, Transcendent Herb 1',
        ores: 'Gold Mineral 2',
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
    regions: [
      {
        name: 'Origin Qi Spring Depths',
        minRealm: 'Origin Returning 1st',
        minRealmIndex: 30,
        enemies: 'Origin guardians, origin crystal golems',
        drops: 'Transcendent Cultivation 1, Transcendent Mineral 1',
        herbs: 'Transcendent Herb 1',
        ores: 'Gold Mineral 2, Transcendent Mineral 1',
        enemyPool: [
          { enemyId: 'origin_guardian',      weight: 5 },
          { enemyId: 'origin_crystal_golem', weight: 5 },
        ],
      },
      {
        // Cavern ecosystem: serpents hunt the caverns; elder demons are fused with the cavern itself
        name: 'World Root Caverns',
        minRealm: 'Origin Returning 2nd',
        minRealmIndex: 31,
        enemies: 'Primordial serpents, cavern elder demons',
        drops: 'Transcendent Cultivation 1, Transcendent Cultivation 2, Transcendent Mineral 1',
        herbs: 'Transcendent Herb 1',
        ores: 'Transcendent Mineral 1',
        enemyPool: [
          { enemyId: 'primordial_serpent',  weight: 5 },
          { enemyId: 'cavern_elder_demon',  weight: 5 },
        ],
      },
      {
        name: 'Primordial Forest Core',
        minRealm: 'Origin King 1st',
        minRealmIndex: 33,
        enemies: 'Root sovereigns, deep earth titans',
        drops: 'Transcendent Cultivation 1, Transcendent Cultivation 2, Transcendent Mineral 1',
        herbs: 'Transcendent Herb 1, Transcendent Herb 2',
        ores: 'Transcendent Mineral 1',
        enemyPool: [
          { enemyId: 'root_sovereign',   weight: 4 },
          { enemyId: 'deep_earth_titan', weight: 6 },
        ],
      },
      {
        // Ancient beasts claim the sanctuary as territory; world root wraiths are their ethereal guardians
        name: 'Heaven Beast Sanctuary',
        minRealm: 'Origin King 2nd',
        minRealmIndex: 34,
        enemies: 'Ancient beasts, world root wraiths',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 1, Transcendent Mineral 2',
        herbs: 'Transcendent Herb 1, Transcendent Herb 2',
        ores: 'Transcendent Mineral 1, Transcendent Mineral 2',
        enemyPool: [
          { enemyId: 'ancient_beast',      weight: 5 },
          { enemyId: 'world_root_wraith',  weight: 5 },
        ],
      },
      {
        name: 'Ancient Origin Altar',
        minRealm: 'Origin King 3rd',
        minRealmIndex: 35,
        enemies: 'Root sovereigns, deep earth titans',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Transcendent Herb 2',
        ores: 'Transcendent Mineral 1, Transcendent Mineral 2',
        enemyPool: [
          { enemyId: 'root_sovereign',   weight: 5 },
          { enemyId: 'deep_earth_titan', weight: 5 },
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'The Void Sea',
    realms: 'Void King → Emperor Realm',
    minRealmIndex: 36,
    regions: [
      {
        name: 'Fractured Space Corridors',
        minRealm: 'Void King 1st',
        minRealmIndex: 36,
        enemies: 'Spatial fissure beasts, void elementals',
        drops: 'Transcendent Cultivation 1, Transcendent Mineral 1, Transcendent Mineral 2',
        herbs: 'Transcendent Herb 1',
        ores: 'Transcendent Mineral 1, Transcendent Mineral 2',
        enemyPool: [
          { enemyId: 'spatial_fissure_beast', weight: 5 },
          { enemyId: 'void_elemental',        weight: 5 },
        ],
      },
      {
        name: 'Void Sea Shores',
        minRealm: 'Void King 3rd',
        minRealmIndex: 38,
        enemies: 'Void sea leviathans, void elementals',
        drops: 'Transcendent Cultivation 1, Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Transcendent Herb 1',
        ores: 'Transcendent Mineral 1',
        enemyPool: [
          { enemyId: 'void_sea_leviathan', weight: 6 },
          { enemyId: 'void_elemental',     weight: 4 },
        ],
      },
      {
        name: 'Dao Inscription Ruins',
        minRealm: 'Dao Source 1st',
        minRealmIndex: 39,
        enemies: 'Dao inscription guardians, dao inscription revenants',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Transcendent Herb 1',
        ores: 'Transcendent Mineral 1',
        enemyPool: [
          { enemyId: 'dao_inscription_guardian', weight: 5 },
          { enemyId: 'dao_inscription_revenant', weight: 5 },
        ],
      },
      {
        // Star sea drifters pulled down by Dao source energy; revenants inhabiting the peak ruins
        name: 'Source Peak Summits',
        minRealm: 'Dao Source 3rd',
        minRealmIndex: 41,
        enemies: 'Star sea drifters, dao inscription revenants',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Transcendent Herb 1',
        ores: 'Transcendent Mineral 1',
        enemyPool: [
          { enemyId: 'star_sea_drifter',         weight: 6 },
          { enemyId: 'dao_inscription_revenant', weight: 4 },
        ],
      },
      {
        name: 'Ancient Emperor Tomb',
        minRealm: 'Emperor Realm 1st',
        minRealmIndex: 42,
        enemies: 'Emperor will fragments, dao inscription guardians',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Transcendent Herb 1',
        ores: 'Transcendent Mineral 1',
        enemyPool: [
          { enemyId: 'emperor_will_fragment',    weight: 6 },
          { enemyId: 'dao_inscription_guardian', weight: 4 },
        ],
      },
      {
        // Petrified Dao lords frozen mid-duel on the ridge; Emperor will fragments haunt the battlefield
        name: 'Heaven Sword Ridge',
        minRealm: 'Emperor Realm 3rd',
        minRealmIndex: 44,
        enemies: 'Petrified dao lords, emperor will fragments',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Transcendent Herb 2',
        ores: 'Transcendent Mineral 1',
        enemyPool: [
          { enemyId: 'petrified_dao_lord',    weight: 5 },
          { enemyId: 'emperor_will_fragment', weight: 5 },
        ],
      },
    ],
  },
  {
    id: 6,
    name: 'The Open Heaven',
    realms: 'Half-Step Open Heaven → Open Heaven Layer 6',
    minRealmIndex: 45,
    regions: [
      {
        name: 'Heaven Pillar Ascent',
        minRealm: 'Half-Step Open Heaven',
        minRealmIndex: 45,
        enemies: 'Heaven pillar guardians, boundary wraiths',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Esoteric botanicals (TBD)',
        ores: 'Esoteric minerals (TBD)',
        enemyPool: [
          { enemyId: 'heaven_pillar_guardian', weight: 5 },
          { enemyId: 'boundary_wraith',        weight: 5 },
        ],
      },
      {
        name: 'Star Sea Approaches',
        minRealm: 'Open Heaven Layer 1',
        minRealmIndex: 46,
        enemies: 'Open heaven beasts, star sea leviathans',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Esoteric botanicals (TBD)',
        ores: 'Esoteric minerals (TBD)',
        enemyPool: [
          { enemyId: 'open_heaven_beast',  weight: 6 },
          { enemyId: 'star_sea_leviathan', weight: 4 },
        ],
      },
      {
        name: 'Celestial Rift Expanse',
        minRealm: 'Open Heaven Layer 2',
        minRealmIndex: 47,
        enemies: 'Celestial sovereigns, void apex predators',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Esoteric botanicals (TBD)',
        ores: 'Esoteric minerals (TBD)',
        enemyPool: [
          { enemyId: 'celestial_sovereign', weight: 5 },
          { enemyId: 'void_apex_predator',  weight: 5 },
        ],
      },
      {
        // The leviathan rages inside the eternal storms as a natural force, not a visitor
        name: 'Eternal Storm Arena',
        minRealm: 'Open Heaven Layer 3',
        minRealmIndex: 48,
        enemies: 'Eternal storm titans, star sea leviathans',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Esoteric botanicals (TBD)',
        ores: 'Esoteric minerals (TBD)',
        enemyPool: [
          { enemyId: 'eternal_storm_titan', weight: 6 },
          { enemyId: 'star_sea_leviathan',  weight: 4 },
        ],
      },
      {
        // Heaven pillar guardians patrol the beast grounds as territorial wardens
        name: 'Cosmic Beast Grounds',
        minRealm: 'Open Heaven Layer 4',
        minRealmIndex: 49,
        enemies: 'Open heaven beasts, heaven pillar guardians',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Esoteric botanicals (TBD)',
        ores: 'Esoteric minerals (TBD)',
        enemyPool: [
          { enemyId: 'open_heaven_beast',      weight: 6 },
          { enemyId: 'heaven_pillar_guardian', weight: 4 },
        ],
      },
      {
        name: "Heaven's Core",
        minRealm: 'Open Heaven Layer 6',
        minRealmIndex: 51,
        enemies: 'Open heaven sovereigns, void apex predators',
        drops: 'Transcendent Cultivation 2, Transcendent Mineral 2',
        herbs: 'Rarest botanicals (TBD)',
        ores: 'Rarest minerals (TBD)',
        enemyPool: [
          { enemyId: 'open_heaven_sovereign', weight: 6 },
          { enemyId: 'void_apex_predator',    weight: 4 },
        ],
      },
    ],
  },
];

// Denormalize worldId into each region so regions carry their world context.
const WORLDS_WITH_ID = WORLDS.map(w => ({
  ...w,
  regions: w.regions.map(r => ({ ...r, worldId: w.id })),
}));

export default WORLDS_WITH_ID;
