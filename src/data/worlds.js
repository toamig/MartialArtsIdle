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
    description: 'A misty sect compound framed by a ceremonial red-and-gold gate, stone inscription pillars, and weathered guardian statues. Bamboo groves rise beyond the training grounds and pale mountains dissolve into perpetual mist. The air carries the smell of chalk dust and residual qi from years of disciples\' practice.',
    // W1 — 6 enemies across 5 regions: 1 natural pair (sect) + 4 solo regions.
    // Solo regions give each enemy their own focused encounter with 3-item drop tables.
    // Two new unique-sprite enemies needed to expand to 6 regions without repeats.
    regions: [
      {
        // Disciples and golems share the same training ground — both are standard sect encounters
        name: 'Outer Sect Training Grounds',
        minRealm: 'Tempered Body L1',
        minRealmIndex: 0,
        enemies: 'Outer sect disciples, training golems',
        drops: 'Mortal Qi Residue, Condensed Qi Stone, Sect Iron Shard, Iron Vein Shard',
        herbs: 'Mortal Qi Grass',
        ores: 'Sect Iron Shard',
        enemyPool: [
          { enemyId: 'outer_sect_disciple', weight: 7 },
          { enemyId: 'training_golem',      weight: 3 },
        ],
      },
      {
        // Pack wolves dominate the open borderlands — the first true predator encounter
        name: 'Borderland Wilds',
        minRealm: 'Tempered Body L5',
        minRealmIndex: 4,
        enemies: 'Pack wolves',
        drops: 'Mortal Qi Residue, Beast Qi Core, Sect Iron Shard, Qi Fang',
        herbs: 'Mortal Qi Grass, Qi Vein Vine',
        ores: 'Sect Iron Shard, Qi Fang',
        enemyPool: [
          { enemyId: 'wolf', weight: 10 },
        ],
      },
      {
        // Bandits prey on travellers using the road through the outer wilderness
        name: "Bandit's Crossing",
        minRealm: 'Tempered Body L8',
        minRealmIndex: 7,
        enemies: 'Bandit scouts',
        drops: 'Mortal Qi Residue, Condensed Qi Stone, Sect Iron Shard, Qi Fang',
        herbs: 'Mortal Qi Grass, Qi Vein Vine',
        ores: 'Sect Iron Shard, Qi Fang',
        enemyPool: [
          { enemyId: 'bandit_scout', weight: 10 },
        ],
      },
      {
        // Wandering beasts are drawn to the dense qi seeping up through the ravine rock
        name: 'Qi-Vein Ravines',
        minRealm: 'Qi Transformation Early',
        minRealmIndex: 10,
        enemies: 'Wandering beasts',
        drops: 'Mortal Qi Residue, Beast Qi Core, Corrupted Qi Shard, Qi Fang, Spirit Wood Core',
        herbs: 'Qi Vein Vine, Misty Forest Bloom',
        ores: 'Qi Fang, Spirit Wood Core',
        enemyPool: [
          { enemyId: 'wandering_beast', weight: 10 },
        ],
      },
      {
        // Rogue disciples shelter deep in the spirit mist, unreachable by sect hunters
        name: 'Misty Spirit Forest',
        minRealm: 'True Element Early',
        minRealmIndex: 14,
        enemies: 'Rogue disciples',
        drops: 'Beast Qi Core, Corrupted Qi Shard, Spirit Wood Core',
        herbs: 'Misty Forest Bloom',
        ores: 'Spirit Wood Core',
        enemyPool: [
          { enemyId: 'rogue_disciple', weight: 10 },
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
        drops: 'Ancient Qi Marrow, Iron Spine Scale, Immortal Array Jade',
        herbs: 'Desert Silver Lotus, Blood Reed',
        ores: 'Iron Spine Scale, Immortal Array Jade',
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
        drops: 'Beast Qi Core, Ancient Qi Marrow, Iron Spine Scale',
        herbs: 'Desert Silver Lotus',
        ores: 'Iron Spine Scale',
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
        drops: 'Ancient Qi Marrow, Immortal Soul Remnant, Immortal Array Jade',
        herbs: 'Desert Silver Lotus, Blood Reed',
        ores: 'Iron Spine Scale, Immortal Array Jade',
        enemyPool: [
          { enemyId: 'city_guardian',  weight: 5 },
          { enemyId: 'immortal_shade', weight: 5 },
        ],
      },
      {
        // Blood sea apex predator + the qi-mad cultivators drawn to its shores — the deadliest pairing in the frontier
        name: 'Blood Sea Wastes',
        minRealm: 'Immortal Ascension 3rd',
        minRealmIndex: 23,
        enemies: 'Blood sea leviathans, corrupted cultivators',
        drops: 'Immortal Soul Remnant, Immortal Array Jade, Saint Bone Sliver',
        herbs: 'Blood Reed',
        ores: 'Immortal Array Jade',
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
        drops: 'Saint Qi Relic, Saint Bone Sliver',
        herbs: 'Blood Reed, Burial Ground Lotus',
        ores: 'Immortal Array Jade, Saint Bone Sliver',
        enemyPool: [
          { enemyId: 'burial_guardian',      weight: 5 },
          { enemyId: 'saint_corpse_soldier', weight: 5 },
        ],
      },
      {
        // Both rift-born hunters — the stalker is the faster, leaner predator of the same rift ecosystem
        name: 'Void Rift Expanse',
        minRealm: 'Saint Late',
        minRealmIndex: 26,
        enemies: 'Void rift predators, rift stalkers',
        drops: 'Void Qi Pearl, Forbidden Seal Shard, Void Crystal',
        herbs: 'Burial Ground Lotus, Void Thorn Vine',
        ores: 'Saint Bone Sliver, Forbidden Seal Shard',
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
        drops: 'Void Qi Pearl, Forbidden Seal Shard, Void Crystal',
        herbs: 'Burial Ground Lotus, Void Thorn Vine',
        ores: 'Forbidden Seal Shard',
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
        drops: 'Void Qi Pearl, Void Crystal',
        herbs: 'Void Thorn Vine, Origin Spring Petal',
        ores: 'Forbidden Seal Shard',
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
        drops: 'Primal Qi Core, Void Crystal',
        herbs: 'Origin Spring Petal',
        ores: 'Forbidden Seal Shard, Void Crystal',
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
        drops: 'Primal Qi Core, Heaven Qi Crystal, Void Crystal',
        herbs: 'Origin Spring Petal',
        ores: 'Void Crystal',
        enemyPool: [
          { enemyId: 'primordial_serpent', weight: 5 },
          { enemyId: 'cavern_elder_demon', weight: 5 },
        ],
      },
      {
        // Root spirits drifting through the root hollows + the sovereign whose underground network they inhabit
        name: 'Ancient Root Grotto',
        minRealm: 'Origin Returning 3rd',
        minRealmIndex: 32,
        enemies: 'Forest spirits, root sovereigns',
        drops: 'Primal Qi Core, Beast Qi Core, Void Crystal',
        herbs: 'Origin Spring Petal',
        ores: 'Void Crystal',
        enemyPool: [
          { enemyId: 'forest_spirit',  weight: 5 },
          { enemyId: 'root_sovereign', weight: 5 },
        ],
      },
      {
        // Ancient beasts claim the forest core as territory; world root wraiths are their ethereal guardians
        name: 'Primordial Forest Core',
        minRealm: 'Origin King 1st',
        minRealmIndex: 33,
        enemies: 'Ancient beasts, world root wraiths',
        drops: 'Primal Qi Core, Heaven Qi Crystal, Void Crystal, World Stone Core',
        herbs: 'Origin Spring Petal, Heaven Root Vine',
        ores: 'Void Crystal, World Stone Core',
        enemyPool: [
          { enemyId: 'ancient_beast',     weight: 5 },
          { enemyId: 'world_root_wraith', weight: 5 },
        ],
      },
      {
        // The Deep Earth Titan is the lone guardian of the altar — no other entity survives its pressure
        name: 'Ancient Origin Altar',
        minRealm: 'Origin King 3rd',
        minRealmIndex: 35,
        enemies: 'Deep earth titan',
        drops: 'Primal Qi Core, Heaven Qi Crystal, World Stone Core',
        herbs: 'Heaven Root Vine',
        ores: 'Void Crystal, World Stone Core',
        enemyPool: [
          { enemyId: 'deep_earth_titan', weight: 10 },
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
        // Three void-adapted entities sharing the fractured corridors — born here, transformed here, or manifested here
        name: 'Fractured Space Corridors',
        minRealm: 'Void King 1st',
        minRealmIndex: 36,
        enemies: 'Spatial fissure beasts, qi-sensing beasts, void elementals',
        drops: 'Primal Qi Core, Void Crystal, World Stone Core',
        herbs: 'Origin Spring Petal',
        ores: 'Void Crystal, World Stone Core',
        enemyPool: [
          { enemyId: 'spatial_fissure_beast', weight: 5 },
          { enemyId: 'qi_beast',              weight: 3 },
          { enemyId: 'void_elemental',        weight: 2 },
        ],
      },
      {
        // The leviathan is so massive it crowds out all other life — nothing else survives on its shores
        name: 'Void Sea Shores',
        minRealm: 'Void King 3rd',
        minRealmIndex: 38,
        enemies: 'Void sea leviathan',
        drops: 'Primal Qi Core, Heaven Qi Crystal, World Stone Core',
        herbs: 'Origin Spring Petal',
        ores: 'Void Crystal',
        enemyPool: [
          { enemyId: 'void_sea_leviathan', weight: 10 },
        ],
      },
      {
        name: 'Dao Inscription Ruins',
        minRealm: 'Dao Source 1st',
        minRealmIndex: 39,
        enemies: 'Dao inscription guardians, dao inscription revenants',
        drops: 'Heaven Qi Crystal, World Stone Core',
        herbs: 'Origin Spring Petal',
        ores: 'Void Crystal',
        enemyPool: [
          { enemyId: 'dao_inscription_guardian', weight: 5 },
          { enemyId: 'dao_inscription_revenant', weight: 5 },
        ],
      },
      {
        // Emperor consciousness fragments guard the tomb; petrified Dao lords sealed inside serve as the final line
        name: 'Ancient Emperor Tomb',
        minRealm: 'Emperor Realm 1st',
        minRealmIndex: 42,
        enemies: 'Emperor will fragments, petrified dao lords',
        drops: 'Heaven Qi Crystal, World Stone Core',
        herbs: 'Origin Spring Petal',
        ores: 'Void Crystal',
        enemyPool: [
          { enemyId: 'emperor_will_fragment', weight: 6 },
          { enemyId: 'petrified_dao_lord',    weight: 4 },
        ],
      },
      {
        // Star sea drifters pulled down by the ridge's catastrophic Dao convergence — they arrive alone and hunt alone
        name: 'Heaven Sword Ridge',
        minRealm: 'Emperor Realm 3rd',
        minRealmIndex: 44,
        enemies: 'Star sea drifter',
        drops: 'Heaven Qi Crystal, World Stone Core',
        herbs: 'Heaven Root Vine',
        ores: 'Void Crystal',
        enemyPool: [
          { enemyId: 'star_sea_drifter', weight: 10 },
        ],
      },
    ],
  },
  {
    id: 6,
    name: 'The Open Heaven',
    realms: 'Half-Step Open Heaven → Open Heaven Layer 6',
    minRealmIndex: 45,
    description: 'A boundless open heaven realm of blinding gold and white, where massive inscription-covered pillars rise from a seamless celestial floor into cloud banks that stretch to infinity. Cranes glide silently through the radiant haze between the pillars. The ambient pressure alone is enough to obliterate anything that has not reached the Open Heaven threshold.',
    regions: [
      {
        name: 'Heaven Pillar Ascent',
        minRealm: 'Half-Step Open Heaven',
        minRealmIndex: 45,
        enemies: 'Heaven pillar guardians, boundary wraiths',
        drops: 'Heaven Qi Crystal, World Stone Core',
        herbs: 'Esoteric botanicals (TBD)',
        ores: 'Esoteric minerals (TBD)',
        enemyPool: [
          { enemyId: 'heaven_pillar_guardian', weight: 5 },
          { enemyId: 'boundary_wraith',        weight: 5 },
        ],
      },
      {
        name: 'Star Sea Approaches',
        minRealm: 'Open Heaven Layer 2',
        minRealmIndex: 47,
        enemies: 'Open heaven beasts, star sea leviathans',
        drops: 'Heaven Qi Crystal, World Stone Core',
        herbs: 'Esoteric botanicals (TBD)',
        ores: 'Esoteric minerals (TBD)',
        enemyPool: [
          { enemyId: 'open_heaven_beast',  weight: 6 },
          { enemyId: 'star_sea_leviathan', weight: 4 },
        ],
      },
      {
        // The sovereign commands the rift; the storm titan is a natural force inhabiting the same space
        name: 'Celestial Rift Expanse',
        minRealm: 'Open Heaven Layer 4',
        minRealmIndex: 49,
        enemies: 'Celestial sovereigns, eternal storm titans',
        drops: 'Heaven Qi Crystal, World Stone Core',
        herbs: 'Esoteric botanicals (TBD)',
        ores: 'Esoteric minerals (TBD)',
        enemyPool: [
          { enemyId: 'celestial_sovereign',  weight: 5 },
          { enemyId: 'eternal_storm_titan',  weight: 5 },
        ],
      },
      {
        name: "Heaven's Core",
        minRealm: 'Open Heaven Layer 6',
        minRealmIndex: 51,
        enemies: 'Open heaven sovereigns, void apex predators',
        drops: 'Heaven Qi Crystal, World Stone Core',
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
