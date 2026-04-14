/**
 * enemies.js — all enemy type definitions.
 *
 * sprite: base filename under public/sprites/enemies/.
 *   null  → canvas fallback until art is ready.
 *   set   → loads {sprite}-idle.png and {sprite}-attack.png automatically.
 *
 * description: visual/conceptual brief for art direction.
 *   For sprited enemies this confirms what the art already shows.
 *   For null-sprite enemies this is the brief for whoever creates the art.
 *
 * statMult: multiplied on top of the player-derived base stats.
 *     hp  — scales enemy max HP
 *     atk — scales enemy attack damage
 *
 * drops: array of { itemId, chance 0–1, qty [min, max] }
 *
 * See docs/enemy-design.md for distribution rules and thematic guidelines.
 */

const ENEMIES = {

  // ── World 1 — The Mortal Lands ────────────────────────────────────────────
  // Theme: mortal sect → wilderness → qi forests → storm peaks
  // statMult targets: hp 0.7–1.2, atk 0.4–1.5

  outer_sect_disciple: {
    id:          'outer_sect_disciple',
    name:        'Outer Sect Disciple',
    sprite:      'outer_sect_disciple',
    description: 'A young cultivator in a plain white training robe, wielding a basic wooden practice sword with clumsy but eager stances.',
    statMult: { hp: 0.7, atk: 0.6 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.90, qty: [1, 4] },
      { itemId: 'iron_cultivation_2', chance: 0.20, qty: [1, 1] },
      { itemId: 'iron_mineral_1',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.02 },
  },

  training_golem: {
    id:          'training_golem',
    name:        'Training Golem',
    sprite:      'training_golem',
    description: 'A squat clay-and-iron automaton stamped with sect seals, built for durability over damage — its fists are blunted iron spheres.',
    statMult: { hp: 1.2, atk: 0.4 },   // tanky construct, low damage
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.50, qty: [1, 2] },
      { itemId: 'iron_cultivation_2', chance: 0.20, qty: [1, 1] },
      { itemId: 'iron_mineral_1',     chance: 0.25, qty: [1, 2] },
      { itemId: 'iron_mineral_2',     chance: 0.15, qty: [1, 1] },
    ],
  },

  wolf: {
    id:          'wolf',
    name:        'Pack Wolf',
    sprite:      'wolf',
    description: 'A lean, grey-furred wolf with faintly glowing eyes, suggesting minor qi absorption from years of roaming spirit-rich wilderness.',
    statMult: { hp: 0.9, atk: 1.0 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.70, qty: [1, 3] },
      { itemId: 'bronze_cultivation_1', chance: 0.20, qty: [1, 1] },
      { itemId: 'iron_mineral_1',       chance: 0.15, qty: [1, 1] },
      { itemId: 'iron_mineral_2',       chance: 0.10, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.01 },
  },

  bandit_scout: {
    id:          'bandit_scout',
    name:        'Bandit Scout',
    sprite:      'bandit_scout',
    description: 'A wiry fighter in rough patchwork armour, carrying a short blade and moving with the practised stealth of someone who survives by ambush.',
    statMult: { hp: 0.8, atk: 1.1 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.85, qty: [2, 6] },
      { itemId: 'iron_cultivation_2', chance: 0.30, qty: [1, 2] },
      { itemId: 'iron_mineral_1',     chance: 0.20, qty: [1, 2] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  wandering_beast: {
    id:          'wandering_beast',
    name:        'Wandering Beast',
    sprite:      'wandering_beast',
    description: 'A large, shaggy four-limbed beast with no fixed territory, its hide scarred from years of roaming dangerous wilderness.',
    statMult: { hp: 1.0, atk: 1.0 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.65, qty: [1, 3] },
      { itemId: 'bronze_cultivation_1', chance: 0.25, qty: [1, 1] },
      { itemId: 'iron_mineral_2',       chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.01 },
  },

  rogue_disciple: {
    id:          'rogue_disciple',
    name:        'Rogue Disciple',
    sprite:      'rogue_disciple',
    description: 'A former sect member in a tattered and stained cultivation robe, bearing the scars of forbidden qi techniques and the look of someone with nothing left to lose.',
    statMult: { hp: 1.0, atk: 1.3 },
    drops: [
      { itemId: 'iron_cultivation_1', chance: 0.85, qty: [2, 6] },
      { itemId: 'iron_cultivation_2', chance: 0.25, qty: [1, 1] },
      { itemId: 'bronze_mineral_1',   chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  // ── World 2 — The Ancient Frontier ───────────────────────────────────────
  // Theme: desert ruins, ancient beast plains, sunken immortal city, blood seas
  // statMult targets: hp 1.5–2.5, atk 1.3–2.5

  iron_fang_wolf: {
    id:          'iron_fang_wolf',
    name:        'Iron Fang Wolf',
    sprite:      'iron_fang_wolf',
    description: 'A massive wolf with iron-density fangs and a hide hardened by years of mineral qi absorption from roaming the ancient plains.',
    statMult: { hp: 1.5, atk: 1.7 },
    drops: [
      { itemId: 'bronze_cultivation_1', chance: 0.80, qty: [3, 8] },
      { itemId: 'silver_cultivation_1', chance: 0.20, qty: [1, 1] },
      { itemId: 'silver_mineral_1',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.02 },
  },

  iron_spine_boar: {
    id:          'iron_spine_boar',
    name:        'Iron Spine Boar',
    sprite:      null,
    description: 'A stocky, aggressive boar whose dorsal quills have calcified into iron-hard spines from grazing on mineral-rich flatlands. Charges head-down with reckless force.',
    statMult: { hp: 1.8, atk: 1.5 },
    drops: [
      { itemId: 'bronze_cultivation_1', chance: 0.80, qty: [4, 10] },
      { itemId: 'silver_cultivation_1', chance: 0.25, qty: [1, 1] },
      { itemId: 'silver_mineral_1',     chance: 0.15, qty: [1, 1] },
    ],
  },

  sand_dragon: {
    id:          'sand_dragon',
    name:        'Sand Dragon',
    sprite:      null,
    description: 'A serpentine dragon with sun-bleached, razor-edged scales that flows through desert sands like water. Ambushes prey by erupting from below, trailing a spray of sand.',
    statMult: { hp: 1.6, atk: 1.8 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.70, qty: [2, 5] },
      { itemId: 'silver_mineral_1',     chance: 0.30, qty: [1, 1] },
      { itemId: 'silver_mineral_2',     chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.02 },
  },

  bone_construct: {
    id:          'bone_construct',
    name:        'Bone Construct',
    sprite:      null,
    description: 'An animated war machine assembled from the fused bones of fallen immortals, bound together by residual battle qi and rusted array seals. Found wherever ancient dead litter the land.',
    statMult: { hp: 2.0, atk: 1.3 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.65, qty: [2, 5] },
      { itemId: 'silver_mineral_1',     chance: 0.25, qty: [1, 1] },
    ],
  },

  city_guardian: {
    id:          'city_guardian',
    name:        'City Guardian Construct',
    sprite:      null,
    description: 'A towering humanoid construct of black iron and jade bearing the crest of the Sunken Immortal City, still faithfully patrolling the waterlogged halls of its long-dead charge.',
    statMult: { hp: 2.3, atk: 1.8 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.80, qty: [3, 7] },
      { itemId: 'silver_cultivation_2', chance: 0.25, qty: [1, 1] },
      { itemId: 'silver_mineral_2',     chance: 0.20, qty: [1, 1] },
    ],
  },

  immortal_shade: {
    id:          'immortal_shade',
    name:        'Trapped Immortal Shade',
    sprite:      null,
    description: 'The spectral remnant of an immortal cultivator trapped when the city sank beneath the earth. Its form flickers between solid and ghost-like, bound eternally by an unfinished vow.',
    statMult: { hp: 1.5, atk: 2.2 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.80, qty: [3, 8] },
      { itemId: 'silver_cultivation_2', chance: 0.30, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  corrupted_cultivator: {
    id:          'corrupted_cultivator',
    name:        'Corrupted Cultivator',
    sprite:      null,
    description: 'A former sect disciple whose qi cultivation devoured their sanity. Their robe is shredded, their meridians visibly blackened beneath the skin, their eyes blank with qi-madness.',
    statMult: { hp: 1.7, atk: 2.0 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.85, qty: [4, 10] },
      { itemId: 'silver_cultivation_2', chance: 0.25, qty: [1, 1] },
      { itemId: 'silver_mineral_2',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  blood_leviathan: {
    id:          'blood_leviathan',
    name:        'Blood Sea Leviathan',
    sprite:      null,
    description: 'A colossal sea beast whose scales have turned deep crimson from centuries feeding in the Blood Sea. It trails caustic red vapour as it moves and strikes with its entire mass.',
    statMult: { hp: 2.5, atk: 2.3 },
    drops: [
      { itemId: 'silver_cultivation_1', chance: 0.80, qty: [5, 12] },
      { itemId: 'silver_cultivation_2', chance: 0.40, qty: [1, 2] },
      { itemId: 'gold_mineral_1',       chance: 0.10, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  // ── World 3 — The Forbidden Lands ────────────────────────────────────────
  // Theme: saint burial grounds, void rifts, sealed war altars, cursed mountains
  // statMult targets: hp 2.0–4.0, atk 2.3–4.0

  burial_guardian: {
    id:          'burial_guardian',
    name:        'Burial Guardian',
    sprite:      null,
    description: 'A hulking armoured soldier whose soul was bound to the burial grounds as an eternal sentinel. Its ancient armour is ornate but corroded, and it moves with the unnatural stillness of something that has not rested in centuries.',
    statMult: { hp: 2.8, atk: 2.5 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.70, qty: [2, 5] },
      { itemId: 'gold_mineral_1',     chance: 0.30, qty: [1, 1] },
    ],
  },

  saint_corpse_soldier: {
    id:          'saint_corpse_soldier',
    name:        'Saint Corpse-Soldier',
    sprite:      null,
    description: 'The perfectly preserved corpse of a Saint-realm warrior, still in battle armour and clutching its weapon in a death grip. Oath-binding seals glow on its chest, compelling it forward regardless of damage taken.',
    statMult: { hp: 3.2, atk: 2.3 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.75, qty: [2, 6] },
      { itemId: 'gold_mineral_1',     chance: 0.25, qty: [1, 1] },
    ],
  },

  ancient_war_spirit: {
    id:          'ancient_war_spirit',
    name:        'Ancient War Spirit',
    sprite:      null,
    description: 'A semi-translucent warrior-wraith crackling with residual battle qi, its form frozen in a war stance from an era long past. It cannot distinguish enemies from allies and attacks anything that moves.',
    statMult: { hp: 2.5, atk: 3.0 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.75, qty: [3, 7] },
      { itemId: 'gold_cultivation_2', chance: 0.20, qty: [1, 1] },
      { itemId: 'gold_mineral_1',     chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  saint_bone_sovereign: {
    id:          'saint_bone_sovereign',
    name:        'Saint Bone Sovereign',
    sprite:      null,
    description: 'A towering skeletal figure assembled from the bones of multiple Saints, crowned with funeral jade and draped in tattered burial silk. Slow and deliberate, each strike carries the combined momentum of every Saint whose bones it wears.',
    statMult: { hp: 3.5, atk: 2.8 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.80, qty: [3, 8] },
      { itemId: 'gold_cultivation_2', chance: 0.25, qty: [1, 1] },
      { itemId: 'gold_mineral_2',     chance: 0.20, qty: [1, 1] },
    ],
  },

  void_shade: {
    id:          'void_shade',
    name:        'Void Shade',
    sprite:      null,
    description: 'A living shadow that slipped through a void rift and shed its original form. Appears as a dark, shapeless mass with only a pair of cold void-white eyes visible, haunting mountain passes and rift-blasted terrain alike.',
    statMult: { hp: 2.0, atk: 3.5 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.75, qty: [3, 8] },
      { itemId: 'gold_cultivation_2', chance: 0.25, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  forbidden_construct: {
    id:          'forbidden_construct',
    name:        'Forbidden Construct',
    sprite:      null,
    description: 'An ancient killing machine that was sealed behind forbidden arrays and has now broken free. Heavy, angular, covered in shattered array seals still sparking with suppressed energy. Its sole directive: eliminate all trespassers.',
    statMult: { hp: 4.0, atk: 2.5 },
    drops: [
      { itemId: 'gold_cultivation_1', chance: 0.80, qty: [4, 10] },
      { itemId: 'gold_mineral_2',     chance: 0.25, qty: [1, 1] },
    ],
  },

  void_rift_predator: {
    id:          'void_rift_predator',
    name:        'Void Rift Predator',
    sprite:      null,
    description: 'A sleek predator evolved entirely within void rifts. Its body is partially translucent and distorted, capable of striking from spatial tears and retreating into them before the target can react.',
    statMult: { hp: 2.8, atk: 3.8 },
    drops: [
      { itemId: 'gold_cultivation_2',     chance: 0.75, qty: [2, 5] },
      { itemId: 'transcendent_mineral_1', chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  rift_stalker: {
    id:          'rift_stalker',
    name:        'Rift Stalker',
    sprite:      null,
    description: 'A faster, leaner cousin of the void rift predator that stalks prey by slipping in and out of micro-rifts, never fully materialising. Only visible as a shimmer in the air until the moment it strikes.',
    statMult: { hp: 3.0, atk: 4.0 },
    drops: [
      { itemId: 'gold_cultivation_2',     chance: 0.80, qty: [3, 7] },
      { itemId: 'transcendent_mineral_1', chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  // ── World 4 — The Origin Depths ──────────────────────────────────────────
  // Theme: underground qi springs, world-root caverns, primordial forests, origin altars
  // statMult targets: hp 4.5–7.0, atk 4.0–6.5

  origin_crystal_golem: {
    id:          'origin_crystal_golem',
    name:        'Origin Crystal Golem',
    sprite:      null,
    description: 'A golem formed entirely from crystallised origin qi drawn up from underground springs. Its body glows from within with compressed spiritual energy, and fractures of light refract off its faceted surface.',
    statMult: { hp: 4.5, atk: 4.0 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.65, qty: [1, 3] },
      { itemId: 'transcendent_mineral_1',     chance: 0.25, qty: [1, 1] },
    ],
  },

  origin_guardian: {
    id:          'origin_guardian',
    name:        'Origin Guardian',
    sprite:      null,
    description: 'An ancient elemental bound to guard the origin qi springs — part compressed stone, part flowing qi. Its form shifts like a standing wave of earth and light, and it treats any approach to the springs as an attack.',
    statMult: { hp: 5.0, atk: 4.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.70, qty: [2, 5] },
      { itemId: 'transcendent_mineral_1',     chance: 0.30, qty: [1, 1] },
    ],
  },

  primordial_serpent: {
    id:          'primordial_serpent',
    name:        'Primordial Serpent',
    sprite:      null,
    description: 'A colossal serpent that has coiled through the world\'s root caverns for millennia. Its scales have absorbed so much primal earth energy that they now resemble ancient stone tiles, and its passage leaves cracks in the cavern walls.',
    statMult: { hp: 5.5, atk: 5.0 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.75, qty: [2, 6] },
      { itemId: 'transcendent_cultivation_2', chance: 0.20, qty: [1, 1] },
      { itemId: 'transcendent_mineral_1',     chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  cavern_elder_demon: {
    id:          'cavern_elder_demon',
    name:        'Cavern Elder Demon',
    sprite:      null,
    description: 'A demon that has lurked in the deepest caverns since before recorded history. Its lower body has fused with stalactite formations over the millennia, and its face is obscured by long calcite growths that ring it like a crown.',
    statMult: { hp: 5.5, atk: 6.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.70, qty: [2, 5] },
      { itemId: 'transcendent_mineral_2',     chance: 0.30, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  root_sovereign: {
    id:          'root_sovereign',
    name:        'Root Sovereign',
    sprite:      null,
    description: 'A tree-spirit that merged with the world\'s underground root network. Its upper body resembles a gnarled ancient elder; its lower body dissolves into roots that vanish into the earth, capable of attacking from any direction underground.',
    statMult: { hp: 6.0, atk: 4.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.80, qty: [3, 7] },
      { itemId: 'transcendent_cultivation_2', chance: 0.25, qty: [1, 1] },
      { itemId: 'transcendent_mineral_1',     chance: 0.20, qty: [1, 1] },
    ],
  },

  deep_earth_titan: {
    id:          'deep_earth_titan',
    name:        'Deep Earth Titan',
    sprite:      null,
    description: 'A titan condensed from the world\'s mantle pressure — massively built and slow-moving, its body composed of compressed rock layers with glowing ore veins running through it. Each footfall triggers tremors.',
    statMult: { hp: 7.0, atk: 5.0 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.80, qty: [3, 8] },
      { itemId: 'transcendent_mineral_1',     chance: 0.35, qty: [1, 1] },
      { itemId: 'transcendent_mineral_2',     chance: 0.15, qty: [1, 1] },
    ],
  },

  ancient_beast: {
    id:          'ancient_beast',
    name:        'Ancient Beast',
    sprite:      null,
    description: 'A primordial creature whose bloodline predates the current age of cultivation. Its hide bears natural dao patterns and its eyes carry the weight of ancient memory — it claims entire sacred sanctuaries as its territory.',
    statMult: { hp: 6.5, atk: 5.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.80, qty: [4, 10] },
      { itemId: 'transcendent_cultivation_2', chance: 0.30, qty: [1, 1] },
      { itemId: 'transcendent_mineral_1',     chance: 0.25, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  world_root_wraith: {
    id:          'world_root_wraith',
    name:        'World Root Wraith',
    sprite:      null,
    description: 'The phantom of an ancient tree-guardian whose physical form dissolved into the root network. A green-black spectre with root-tendrils where its limbs should be, manifesting above ground to defend the sacred beast territories it once protected in life.',
    statMult: { hp: 5.0, atk: 6.5 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.75, qty: [2, 6] },
      { itemId: 'transcendent_mineral_2',     chance: 0.35, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  forest_spirit: {
    id:          'forest_spirit',
    name:        'Forest Spirit',
    sprite:      'forest_spirit',
    description: 'A translucent humanoid figure woven from ancient bark and pale cave moss, its eyes twin ember-points of natural qi. It drifts through deep root hollows where ancient trees push their roots through bedrock — defending territory no surface cultivator has ever mapped.',
    statMult: { hp: 0.8, atk: 1.5 },
    // NOTE: statMult is W1-tier (moved from W1 for visual fit) — balance pass pending
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.30, qty: [1, 1] },
      { itemId: 'iron_cultivation_1',         chance: 0.50, qty: [1, 3] },
      { itemId: 'bronze_cultivation_1',       chance: 0.40, qty: [1, 2] },
      { itemId: 'bronze_mineral_2',           chance: 0.20, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  world_core_titan: {
    id:          'world_core_titan',
    name:        'World Core Titan',
    sprite:      null,
    description: 'A titan that has descended to the world\'s deepest strata — its body no longer composed of mere compressed rock but of the molten material at the planet\'s core. Veins of pure origin qi run across its surface in shifting patterns, and its presence alone generates tremors across multiple cavern layers.',
    statMult: { hp: 7.0, atk: 6.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.85, qty: [4, 10] },
      { itemId: 'transcendent_cultivation_2', chance: 0.30, qty: [1, 2] },
      { itemId: 'transcendent_mineral_2',     chance: 0.35, qty: [1, 1] },
    ],
  },

  // ── World 5 — The Void Sea ────────────────────────────────────────────────
  // Theme: fractured space corridors, void sea, Dao inscription ruins, Emperor tombs, sword ridge
  // statMult targets: hp 7.0–11.0, atk 6.5–11.0

  spatial_fissure_beast: {
    id:          'spatial_fissure_beast',
    name:        'Spatial Fissure Beast',
    sprite:      null,
    description: 'A predator evolved entirely inside spatial cracks. Its body appears visually distorted as though seen through broken glass, and it leaves spatial distortion trails as it moves through the fractured corridors.',
    statMult: { hp: 7.0, atk: 6.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.85, qty: [5, 12] },
      { itemId: 'transcendent_mineral_1',     chance: 0.35, qty: [1, 2] },
    ],
  },

  void_elemental: {
    id:          'void_elemental',
    name:        'Void Elemental',
    sprite:      null,
    description: 'A pure elemental entity born from void energy with no material form. Manifests as a dark sphere of compressed void force with visible gravity distortion at its edges, drifting through fractured space and void sea shores.',
    statMult: { hp: 8.0, atk: 7.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.85, qty: [6, 15] },
      { itemId: 'transcendent_cultivation_2', chance: 0.30, qty: [1, 2] },
    ],
  },

  qi_beast: {
    id:          'qi_beast',
    name:        'Qi-Sensing Beast',
    sprite:      'qi_beast',
    description: 'A sleek, near-black predator threaded with veins of pulsing violet void energy. What began as a surface qi-sensing beast has been transformed across generations in the fractured void corridors — coat darkened to near-black, its original qi-sensing ability mutated into a lethal instinct for hunting through spatial distortions.',
    statMult: { hp: 1.1, atk: 1.2 },
    drops: [
      { itemId: 'iron_cultivation_1',   chance: 0.80, qty: [2, 5] },
      { itemId: 'bronze_cultivation_1', chance: 0.30, qty: [1, 1] },
      { itemId: 'bronze_mineral_1',     chance: 0.15, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.03 },
  },

  void_sea_leviathan: {
    id:          'void_sea_leviathan',
    name:        'Void Sea Leviathan',
    sprite:      null,
    description: 'A titanic creature evolved in the void sea\'s non-space — enormous and whale-like, its body trailing streams of void energy that bend light around it. Its passage displaces the void sea in visible waves.',
    statMult: { hp: 9.0, atk: 8.0 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.85, qty: [8, 20] },
      { itemId: 'transcendent_cultivation_2', chance: 0.35, qty: [1, 2] },
      { itemId: 'transcendent_mineral_2',     chance: 0.20, qty: [1, 1] },
    ],
  },

  dao_inscription_guardian: {
    id:          'dao_inscription_guardian',
    name:        'Dao Inscription Guardian',
    sprite:      null,
    description: 'A construct animated by Dao inscriptions carved directly into its stone core. Its entire surface is covered in glowing script that pulses with each movement, executing ancient defensive programs from a long-dead civilisation.',
    statMult: { hp: 9.5, atk: 8.5 },
    drops: [
      { itemId: 'transcendent_cultivation_1', chance: 0.85, qty: [8, 20] },
      { itemId: 'transcendent_cultivation_2', chance: 0.35, qty: [1, 2] },
    ],
  },

  dao_inscription_revenant: {
    id:          'dao_inscription_revenant',
    name:        'Dao Inscription Revenant',
    sprite:      null,
    description: 'A cultivator who voluntarily sealed their dying consciousness into a Dao inscription array to persist beyond death. A humanoid figure overlaid with glowing Dao script, their original features barely visible beneath the inscriptions that now form their face.',
    statMult: { hp: 8.5, atk: 9.5 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.80, qty: [3, 8] },
      { itemId: 'transcendent_mineral_2',     chance: 0.30, qty: [1, 1] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  star_sea_drifter: {
    id:          'star_sea_drifter',
    name:        'Star Sea Drifter',
    sprite:      null,
    description: 'An enormous, near-weightless creature of the star sea — its body is translucent with nebula-like energy patterns visible inside. Drawn downward by the concentrated Dao source energy radiating from the peak summits below.',
    statMult: { hp: 11.0, atk: 10.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.85, qty: [6, 15] },
      { itemId: 'transcendent_mineral_2',     chance: 0.40, qty: [1, 2] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  petrified_dao_lord: {
    id:          'petrified_dao_lord',
    name:        'Petrified Dao Lord',
    sprite:      null,
    description: 'A Dao-realm cultivator who lost control of their own law mid-breakthrough on the sword ridge, their body turned to stone in a battle stance — still radiating deadly Dao pressure that warps the air around them and kills the unprepared.',
    statMult: { hp: 10.0, atk: 9.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.80, qty: [4, 10] },
      { itemId: 'transcendent_mineral_2',     chance: 0.35, qty: [1, 2] },
    ],
    techniqueDrop: { chance: 0.04 },
  },

  emperor_will_fragment: {
    id:          'emperor_will_fragment',
    name:        'Emperor Will Fragment',
    sprite:      null,
    description: 'A shard of an Emperor\'s consciousness left as a tomb guardian. Manifests as a translucent figure in imperial armour carrying a phantom weapon — its killing intent is genuine and its combat instincts remain those of an Emperor.',
    statMult: { hp: 9.0, atk: 11.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.85, qty: [5, 12] },
      { itemId: 'transcendent_mineral_2',     chance: 0.40, qty: [1, 2] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  emperor_will_sovereign: {
    id:          'emperor_will_sovereign',
    name:        'Emperor Will Sovereign',
    sprite:      null,
    description: 'Where a mere fragment of an Emperor\'s will haunts the tomb, a sovereign-grade manifestation claims the sword ridge itself as its battlefield. This is no splinter of memory — it is a near-complete will that has absorbed the ridge\'s centuries of battle qi, growing into something that approximates the full consciousness of its original Emperor.',
    statMult: { hp: 10.0, atk: 11.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [6, 15] },
      { itemId: 'transcendent_mineral_2',     chance: 0.45, qty: [1, 3] },
    ],
    techniqueDrop: { chance: 0.06 },
  },

  // ── World 6 — The Open Heaven ─────────────────────────────────────────────
  // Theme: heaven pillars, star sea, celestial rifts, eternal storms, cosmic beasts
  // statMult targets: hp 14.0–28.0, atk 16.0–32.0

  boundary_wraith: {
    id:          'boundary_wraith',
    name:        'Boundary Wraith',
    sprite:      null,
    description: 'A wraith born at the boundary between mortal heavens and Open Heaven space, feeding on the qi of those attempting the crossing. Its form is torn and flickering as if caught permanently between two states of existence.',
    statMult: { hp: 14.0, atk: 16.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [10, 25] },
      { itemId: 'transcendent_mineral_2',     chance: 0.50, qty: [1, 3] },
    ],
  },

  heaven_pillar_guardian: {
    id:          'heaven_pillar_guardian',
    name:        'Heaven Pillar Guardian',
    sprite:      null,
    description: 'A massive construct forged to maintain and protect the pillars that hold heaven in place. Angular and enormous, covered in astronomical inscriptions, with a gravitational presence that subtly warps the space around it.',
    statMult: { hp: 16.0, atk: 18.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [12, 30] },
      { itemId: 'transcendent_mineral_2',     chance: 0.50, qty: [1, 3] },
    ],
  },

  open_heaven_beast: {
    id:          'open_heaven_beast',
    name:        'Open Heaven Beast',
    sprite:      null,
    description: 'A beast born and raised inside Open Heaven space. Its physique is fundamentally different from mortal beasts — exuding an ambient pressure that distorts the space around it and instantly overwhelms anyone below the Open Heaven threshold.',
    statMult: { hp: 18.0, atk: 18.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [15, 40] },
      { itemId: 'transcendent_mineral_2',     chance: 0.55, qty: [1, 3] },
    ],
  },

  star_sea_leviathan: {
    id:          'star_sea_leviathan',
    name:        'Star Sea Leviathan',
    sprite:      null,
    description: 'A leviathan of colossal scale that swims through the star sea as a fish swims through water, leaving nebula trails and gravitational ripples behind it. In the eternal storm arena it moves like a natural disaster.',
    statMult: { hp: 20.0, atk: 20.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [20, 50] },
      { itemId: 'transcendent_mineral_2',     chance: 0.60, qty: [1, 3] },
    ],
  },

  eternal_storm_titan: {
    id:          'eternal_storm_titan',
    name:        'Eternal Storm Titan',
    sprite:      null,
    description: 'A titan entity born from and composed of the Open Heaven\'s eternal storms — a cyclone given humanoid form, crackling with continuous lightning. It has never been still and cannot be; stopping would mean ceasing to exist.',
    statMult: { hp: 22.0, atk: 22.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [20, 55] },
      { itemId: 'transcendent_mineral_2',     chance: 0.60, qty: [2, 4] },
    ],
  },

  celestial_sovereign: {
    id:          'celestial_sovereign',
    name:        'Celestial Sovereign',
    sprite:      null,
    description: 'A cultivator who achieved Open Heaven and chose to remain as a guardian of the celestial rift. Their physical body has half-dissolved into celestial energy, leaving a radiant, semi-materialised form that patrols the rift with sovereign authority.',
    statMult: { hp: 24.0, atk: 24.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [25, 60] },
      { itemId: 'transcendent_mineral_2',     chance: 0.65, qty: [2, 4] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  void_apex_predator: {
    id:          'void_apex_predator',
    name:        'Void Apex Predator',
    sprite:      null,
    description: 'The apex predator of void space — its body is an absence of light shaped like a predator. Capable of consuming spatial laws themselves to move instantaneously, it hunts at the intersection of void and Open Heaven.',
    statMult: { hp: 20.0, atk: 28.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [25, 65] },
      { itemId: 'transcendent_mineral_2',     chance: 0.65, qty: [2, 4] },
    ],
    techniqueDrop: { chance: 0.05 },
  },

  open_heaven_sovereign: {
    id:          'open_heaven_sovereign',
    name:        'Open Heaven Sovereign',
    sprite:      null,
    description: 'An ancient Open Heaven cultivator whose physical body fully dissolved into pure energy. Manifests as a sovereign-scale presence of condensed Open Heaven pressure in vaguely humanoid form — confronting it is like standing inside a collapsing star.',
    statMult: { hp: 28.0, atk: 32.0 },
    drops: [
      { itemId: 'transcendent_cultivation_2', chance: 0.90, qty: [30, 80] },
      { itemId: 'transcendent_mineral_2',     chance: 0.70, qty: [2, 5] },
    ],
    techniqueDrop: { chance: 0.06 },
  },
};

/**
 * Weighted random pick from an enemy pool.
 * pool: [{ enemyId: string, weight: number }]
 */
export function pickEnemy(pool) {
  const total  = pool.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return ENEMIES[entry.enemyId] ?? null;
  }
  return ENEMIES[pool[pool.length - 1].enemyId] ?? null;
}

export default ENEMIES;
