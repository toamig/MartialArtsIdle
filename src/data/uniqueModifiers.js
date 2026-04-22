/**
 * uniqueModifiers.js — Unique modifier pools for Artefacts and Techniques.
 *
 * LAW uniques live in src/data/lawUniques.js (that's the live pool consumed
 * by the law engine). This file owns the artefact + technique pools.
 *
 * SHAPE:
 *   { id, name, description, range, slot? (artefacts) }
 *
 *   - id:          stable identifier (e.g. 'a_keen_edge')
 *   - name:        display name
 *   - description: text with {value} placeholders
 *   - range:       { min, max } — single rolled value range
 *   - slot:        (artefacts only) restricts to that equipment slot
 */


// ─── ARTEFACT UNIQUE MODIFIERS ────────────────────────────────────────────────
// Slightly weaker than law uniques, more numerous, slot-themed.
// No major downsides — these are pure upgrades.

export const ARTEFACT_UNIQUES = [

  // ── Weapon-specific ──
  { id: 'a_keen_edge',         name: 'Keen Edge', slot: 'weapon', range: { min: 5, max: 15 }, description: '+{value}% crit chance on weapon attacks.' },
  { id: 'a_blood_drinker',     name: 'Blood Drinker', slot: 'weapon', range: { min: 1, max: 5 }, description: 'Heal {value}% of damage dealt.' },
  { id: 'a_executioner',       name: 'Executioner', slot: 'weapon', range: { min: 50, max: 150 }, description: '+{value}% damage to enemies below 25% HP.' },
  { id: 'a_void_cleaver',      name: 'Void Cleaver', slot: 'weapon', range: { min: 10, max: 25 }, description: 'Ignore {value}% of enemy defense.' },
  { id: 'a_perfect_balance',   name: 'Perfect Balance', slot: 'weapon', range: { min: 5, max: 15 }, description: '+{value}% damage per equipped artefact.' },
  { id: 'a_phantom_edge',      name: 'Phantom Edge', slot: 'weapon', range: { min: 10, max: 30 }, description: 'Attack cooldowns -{value}%.' },
  { id: 'a_void_pierce',       name: 'Void Pierce', slot: 'weapon', range: { min: 5, max: 15 }, description: '+{value}% chance to ignore all defense.' },
  { id: 'a_savage_grip',       name: 'Savage Grip', slot: 'weapon', range: { min: 5, max: 15 }, description: '+{value}% damage from Body stat.' },
  { id: 'a_ethereal_blade',    name: 'Ethereal Blade', slot: 'weapon', range: { min: 20, max: 50 }, description: '+{value}% damage from Soul stat.' },
  { id: 'a_sky_breaker',       name: 'Sky Breaker', slot: 'weapon', range: { min: 5, max: 15 }, description: '+{value}% damage per major realm.' },
  { id: 'a_combo_blade',       name: 'Combo Blade', slot: 'weapon', range: { min: 10, max: 30 }, description: 'Each consecutive hit deals +{value}% bonus.' },

  // ── Head-specific ──
  { id: 'a_clear_mind',        name: 'Clear Mind', slot: 'head', range: { min: 5, max: 15 }, description: 'All technique cooldowns -{value}%.' },
  { id: 'a_focused_will',      name: 'Focused Will', slot: 'head', range: { min: 5, max: 15 }, description: '+{value}% crit chance.' },
  { id: 'a_serene_face',       name: 'Serene Face', slot: 'head', range: { min: 5, max: 15 }, description: '+{value}% healing received.' },
  { id: 'a_warmind',           name: 'Warmind', slot: 'head', range: { min: 20, max: 60 }, description: '+{value}% damage if Soul > Body.' },
  { id: 'a_seeker_eye',        name: 'Seeker\'s Eye', slot: 'head', range: { min: 5, max: 15 }, description: '+{value}% crit damage.' },
  { id: 'a_oracles_insight',   name: 'Oracle\'s Insight', slot: 'head', range: { min: 5, max: 15 }, description: '+{value}% chance to dodge fatal blows.' },
  { id: 'a_clarity_storm',     name: 'Clarity Storm', slot: 'head', range: { min: 5, max: 15 }, description: 'After dodging, cooldowns -{value}% for 3s.' },
  { id: 'a_crown_focus',       name: 'Crown of Focus', slot: 'head', range: { min: 5, max: 15 }, description: '+{value}% chance to crit twice.' },
  { id: 'a_inner_eye',         name: 'Inner Eye', slot: 'head', range: { min: 5, max: 15 }, description: '+{value}% chance for techniques to not consume cooldown.' },
  { id: 'a_visionary_mind',    name: 'Visionary Mind', slot: 'head', range: { min: 30, max: 80 }, description: '+{value}% offline qi gain.' },
  { id: 'a_warmask',           name: 'Warmask', slot: 'head', range: { min: 20, max: 60 }, description: '+{value}% damage if 3+ techniques equipped.' },
  { id: 'a_silent_crown',      name: 'Silent Crown', slot: 'head',range: { min: 30, max: 80 }, description: 'First attack each combat is a guaranteed crit.' },
  { id: 'a_dao_helm',          name: 'Dao Helm', slot: 'head', range: { min: 5, max: 15 }, description: '+{value}% cultivation speed.' },

  // ── Body-specific ──
  { id: 'a_titan_chest',       name: 'Titan\'s Chest', slot: 'body', range: { min: 10, max: 30 }, description: '+{value}% max HP.' },
  { id: 'a_living_armor',      name: 'Living Armor', slot: 'body', range: { min: 1, max: 5 }, description: '+{value}% HP/sec in combat.' },
  { id: 'a_reflective_skin',   name: 'Reflective Skin', slot: 'body', range: { min: 5, max: 15 }, description: 'Reflect {value}% of damage taken.' },
  { id: 'a_phoenix_robe',      name: 'Phoenix Robe', slot: 'body', range: { min: 30, max: 80 }, description: 'Once per fight, revive with {value}% HP.' },
  { id: 'a_void_cloak',        name: 'Void Cloak', slot: 'body', range: { min: 5, max: 15 }, description: '+{value}% dodge chance.' },
  { id: 'a_blessed_robe',      name: 'Blessed Robe', slot: 'body', range: { min: 10, max: 30 }, description: '+{value}% healing received.' },
  { id: 'a_chain_armor',       name: 'Chain Armor', slot: 'body', range: { min: 5, max: 15 }, description: '+{value}% defense per missing 10% HP.' },
  { id: 'a_warlords_mantle',   name: 'Warlord\'s Mantle', slot: 'body', range: { min: 10, max: 30 }, description: '+{value}% damage. +{value/2}% defense.' },
  { id: 'a_silken_robe',       name: 'Silken Robe', slot: 'body', range: { min: 5, max: 15 }, description: '+{value}% Soul. -5% Body.' },
  { id: 'a_iron_carapace_pro', name: 'Heavy Carapace', slot: 'body', range: { min: 30, max: 80 }, description: '+{value}% defense. -10% speed.' },
  { id: 'a_ancestral_robe',    name: 'Ancestral Robe', slot: 'body', range: { min: 5, max: 15 }, description: '+{value}% all stats per major realm.' },
  { id: 'a_battle_mail',       name: 'Battle Mail', slot: 'body', range: { min: 10, max: 30 }, description: '+{value}% damage in first 10s of combat.' },
  { id: 'a_serpent_skin',      name: 'Serpent Skin', slot: 'body', range: { min: 5, max: 15 }, description: '+{value}% dodge. Heal {value}% on dodge.' },
  { id: 'a_unyielding_garb',   name: 'Unyielding Garb', slot: 'body', range: { min: 5, max: 20 }, description: 'Cannot be reduced below {value}% HP for 3s after taking heavy damage.' },
  { id: 'a_blossoming_robe',   name: 'Blossoming Robe', slot: 'body', range: { min: 1, max: 5 }, description: '+{value}% HP/s while at full HP.' },

  // ── Hands-specific ──
  { id: 'a_dragon_claws',      name: 'Dragon Claws', slot: 'hands', range: { min: 5, max: 15 }, description: '+{value}% crit damage.' },
  { id: 'a_qi_channeler',      name: 'Qi Channeler', slot: 'hands', range: { min: 5, max: 15 }, description: '+{value}% damage from essence.' },
  { id: 'a_void_grip',         name: 'Void Grip', slot: 'hands', range: { min: 5, max: 15 }, description: 'Attacks ignore {value}% defense.' },
  { id: 'a_blood_palms',       name: 'Blood Palms', slot: 'hands', range: { min: 1, max: 5 }, description: 'Heal {value}% per hit.' },
  { id: 'a_smith_hands',       name: 'Smith\'s Hands', slot: 'hands', range: { min: 10, max: 30 }, description: 'Crafting cost reduced by {value}%.' },
  { id: 'a_alchemist_hands',   name: 'Alchemist\'s Hands',slot: 'hands', range: { min: 10, max: 30 }, description: 'Pill effects +{value}%.' },
  { id: 'a_combo_grip',        name: 'Combo Grip', slot: 'hands', range: { min: 5, max: 15 }, description: '+{value}% per consecutive hit.' },
  { id: 'a_warriors_grip',     name: 'Warrior\'s Grip', slot: 'hands', range: { min: 5, max: 15 }, description: '+{value}% damage and defense.' },
  { id: 'a_qi_palms',          name: 'Qi Palms', slot: 'hands', range: { min: 5, max: 15 }, description: '+{value}% qi gain.' },
  { id: 'a_destruction_grip',  name: 'Destruction Grip', slot: 'hands', range: { min: 30, max: 80 }, description: '+{value}% damage to objects and constructs.' },
  { id: 'a_phoenix_palms',     name: 'Phoenix Palms', slot: 'hands', range: { min: 5, max: 15 }, description: 'Fire damage heals {value}% of dealt damage.' },

  // ── Waist-specific ──
  { id: 'a_qi_storage',        name: 'Qi Storage', slot: 'waist', range: { min: 10, max: 30 }, description: '+{value}% qi gain.' },
  { id: 'a_sage_belt',         name: 'Sage\'s Belt', slot: 'waist', range: { min: 5, max: 15 }, description: '+{value}% pill effects.' },
  { id: 'a_essence_belt',      name: 'Essence Belt', slot: 'waist', range: { min: 5, max: 15 }, description: 'Convert {value}% body to essence.' },
  { id: 'a_battle_sash',       name: 'Battle Sash', slot: 'waist', range: { min: 5, max: 15 }, description: '+{value}% damage per kill in last 5s.' },
  { id: 'a_eternal_sash',      name: 'Eternal Sash', slot: 'waist', range: { min: 1, max: 5 }, description: '+{value}% HP/s.' },
  { id: 'a_iron_belt',         name: 'Iron Belt', slot: 'waist', range: { min: 10, max: 30 }, description: '+{value}% defense and damage.' },
  { id: 'a_lifebinder',        name: 'Lifebinder', slot: 'waist', range: { min: 10, max: 30 }, description: '+{value}% healing received.' },
  { id: 'a_cursed_belt',       name: 'Cursed Belt', slot: 'waist', range: { min: 50, max: 150 }, description: '+{value}% damage. -25% defense.' },
  { id: 'a_blessed_belt',      name: 'Blessed Belt', slot: 'waist', range: { min: 5, max: 15 }, description: '+{value}% all stats.' },
  { id: 'a_emperor_belt',      name: 'Emperor\'s Belt', slot: 'waist', range: { min: 10, max: 25 }, description: '+{value}% to all stats per realm.' },
  { id: 'a_thirsty_belt',      name: 'Thirsty Belt', slot: 'waist', range: { min: 1, max: 4 }, description: '+{value}% lifesteal.' },
  { id: 'a_assassin_belt',     name: 'Assassin Belt', slot: 'waist', range: { min: 5, max: 15 }, description: '+{value}% crit chance.' },

  // ── Feet-specific ──
  { id: 'a_swift_boots',       name: 'Swift Boots', slot: 'feet', range: { min: 5, max: 15 }, description: '+{value}% dodge chance.' },
  { id: 'a_iron_greaves',      name: 'Iron Greaves', slot: 'feet', range: { min: 10, max: 30 }, description: '+{value}% defense.' },
  { id: 'a_phoenix_boots',     name: 'Phoenix Boots', slot: 'feet', range: { min: 5, max: 15 }, description: '+{value}% HP/sec.' },
  { id: 'a_dancers_boots',     name: 'Dancer\'s Boots', slot: 'feet', range: { min: 10, max: 30 }, description: '+{value}% damage after dodging.' },
  { id: 'a_voidstep',          name: 'Voidstep', slot: 'feet', range: { min: 1, max: 5 }, description: 'Each dodge resets one cooldown.' },
  { id: 'a_dragon_treaders',   name: 'Dragon Treaders', slot: 'feet', range: { min: 5, max: 15 }, description: '+{value}% damage from Body.' },
  { id: 'a_silent_steps',      name: 'Silent Steps', slot: 'feet', range: { min: 50, max: 150 }, description: 'First attack is a guaranteed crit.' },
  { id: 'a_iron_treads',       name: 'Iron Treads', slot: 'feet', range: { min: 5, max: 15 }, description: '+{value}% defense and HP.' },
  { id: 'a_warriors_boots',    name: 'Warrior\'s Boots', slot: 'feet', range: { min: 5, max: 15 }, description: '+{value}% physical damage.' },
  { id: 'a_eternal_treads',    name: 'Eternal Treads', slot: 'feet', range: { min: 1, max: 5 }, description: '+{value}% HP/s out of combat.' },

  // ── Neck-specific ──
  { id: 'a_jade_pendant',      name: 'Jade Pendant', slot: 'neck', range: { min: 5, max: 15 }, description: '+{value}% Soul stat.' },
  { id: 'a_dragon_amulet',     name: 'Dragon Amulet', slot: 'neck', range: { min: 5, max: 15 }, description: '+{value}% damage.' },
  { id: 'a_seer_locket',       name: 'Seer Locket', slot: 'neck', range: { min: 5, max: 15 }, description: '+{value}% all loot.' },
  { id: 'a_void_pendant',      name: 'Void Pendant', slot: 'neck', range: { min: 5, max: 15 }, description: 'Ignore {value}% enemy defense.' },
  { id: 'a_blood_amulet',      name: 'Blood Amulet', slot: 'neck', range: { min: 1, max: 4 }, description: '+{value}% lifesteal.' },
  { id: 'a_qi_amulet',         name: 'Qi Amulet', slot: 'neck', range: { min: 5, max: 15 }, description: '+{value}% qi gain.' },
  { id: 'a_warlords_amulet',   name: 'Warlord\'s Amulet', slot: 'neck', range: { min: 5, max: 15 }, description: '+{value}% damage and defense.' },
  { id: 'a_oracle_amulet',     name: 'Oracle Amulet', slot: 'neck', range: { min: 1, max: 5 }, description: '+{value}% chance to dodge fatal blows.' },
  { id: 'a_assassin_pendant',  name: 'Assassin Pendant', slot: 'neck', range: { min: 5, max: 15 }, description: '+{value}% crit chance.' },
  { id: 'a_emperor_amulet',    name: 'Emperor\'s Amulet', slot: 'neck', range: { min: 5, max: 15 }, description: '+{value}% damage per realm.' },
  { id: 'a_eternal_amulet',    name: 'Eternal Amulet', slot: 'neck', range: { min: 5, max: 15 }, description: '+{value}% healing.' },
  { id: 'a_speed_amulet',      name: 'Amulet of Speed', slot: 'neck', range: { min: 5, max: 15 }, description: '-{value}% all cooldowns.' },
  { id: 'a_combat_amulet',     name: 'Combat Amulet', slot: 'neck', range: { min: 10, max: 30 }, description: '+{value}% damage in first 5s of combat.' },

  // ── Ring-specific ──
  { id: 'a_essence_ring',      name: 'Essence Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% Essence.' },
  { id: 'a_soul_ring',         name: 'Soul Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% Soul.' },
  { id: 'a_body_ring',         name: 'Body Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% Body.' },
  { id: 'a_crit_ring',         name: 'Crit Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% crit chance.' },
  { id: 'a_speed_ring',        name: 'Speed Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '-{value}% cooldowns.' },
  { id: 'a_blood_ring',        name: 'Blood Ring', slot: 'ring', range: { min: 1, max: 4 }, description: '+{value}% lifesteal.' },
  { id: 'a_void_ring',         name: 'Void Ring', slot: 'ring', range: { min: 5, max: 15 }, description: 'Ignore {value}% defense.' },
  { id: 'a_dragon_ring',       name: 'Dragon Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% damage.' },
  { id: 'a_iron_ring',         name: 'Iron Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% defense.' },
  { id: 'a_emperor_ring',      name: 'Emperor Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% damage per realm.' },
  { id: 'a_combo_ring',        name: 'Combo Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% per consecutive hit.' },
  { id: 'a_lucky_ring',        name: 'Lucky Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% loot luck.' },
  { id: 'a_warrior_ring',      name: 'Warrior Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% physical damage.' },
  { id: 'a_mage_ring',         name: 'Mage Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% elemental damage.' },
  { id: 'a_eternal_ring',      name: 'Eternal Ring', slot: 'ring', range: { min: 5, max: 15 }, description: '+{value}% healing.' },
  { id: 'a_harvest_ring',      name: 'Harvest Ring', slot: 'ring', range: { min: 10, max: 30 }, description: '+{value}% harvest speed.' },
  { id: 'a_mining_ring',       name: 'Mining Ring', slot: 'ring', range: { min: 10, max: 30 }, description: '+{value}% mining speed.' },
  { id: 'a_alchemy_ring',      name: 'Alchemy Ring', slot: 'ring', range: { min: 10, max: 30 }, description: 'Pill effects +{value}%.' },
];

// ─── TECHNIQUE UNIQUE MODIFIERS ───────────────────────────────────────────────
// Specific to a technique's behavior. Different pools per type.

export const TECHNIQUE_UNIQUES = {

  Attack: [
    // ── Damage scaling/types ──
    { id: 't_a_overwhelming',  name: 'Overwhelming', range: { min: 30, max: 80 }, description: '+{value}% damage.' },
    { id: 't_a_relentless',    name: 'Relentless', range: { min: 5, max: 15 }, description: 'Each consecutive cast adds +{value}% damage (max 5 stacks).' },
    { id: 't_a_devastating',   name: 'Devastating', range: { min: 50, max: 150 }, description: '+{value}% damage. Cooldown +50%.' },
    { id: 't_a_swift',         name: 'Swift', range: { min: 20, max: 50 }, description: 'Cooldown -{value}%.' },
    { id: 't_a_essence_blade', name: 'Essence Blade', range: { min: 30, max: 80 }, description: '+{value}% damage from Essence stat.' },
    { id: 't_a_soul_blade',    name: 'Soul Blade', range: { min: 30, max: 80 }, description: '+{value}% damage from Soul stat.' },
    { id: 't_a_body_blade',    name: 'Body Blade', range: { min: 30, max: 80 }, description: '+{value}% damage from Body stat.' },
    { id: 't_a_qi_blade',      name: 'Qi Blade', range: { min: 1, max: 4 }, description: 'Each 100 qi adds {value} damage to this technique.' },
    { id: 't_a_chain_strike',  name: 'Chain Strike', range: { min: 1, max: 4 }, description: 'Hits {value} additional enemies for 50% damage.' },
    { id: 't_a_double_strike', name: 'Double Strike', range: { min: 20, max: 50 }, description: '{value}% chance to strike twice.' },
    { id: 't_a_triple_strike', name: 'Triple Strike', range: { min: 5, max: 15 }, description: '{value}% chance to strike three times.' },
    { id: 't_a_pierce_def',    name: 'Pierce', range: { min: 10, max: 30 }, description: 'Ignore {value}% enemy defense.' },
    { id: 't_a_void_strike',   name: 'Void Strike', range: { min: 5, max: 15 }, description: '{value}% chance to ignore all defense.' },
    { id: 't_a_brutal',        name: 'Brutal', range: { min: 30, max: 80 }, description: '+{value}% crit damage.' },
    { id: 't_a_keen',          name: 'Keen', range: { min: 5, max: 15 }, description: '+{value}% crit chance.' },
    { id: 't_a_executioner',   name: 'Executioner', range: { min: 50, max: 150 }, description: '+{value}% damage to enemies below 25% HP.' },
    { id: 't_a_first_blood',   name: 'First Blood', range: { min: 100, max: 300 }, description: '+{value}% damage on first cast each combat.' },
    { id: 't_a_finisher',      name: 'Finisher', range: { min: 30, max: 80 }, description: '+{value}% damage if last cooldown ready.' },
    { id: 't_a_combo',         name: 'Combo', range: { min: 5, max: 15 }, description: '+{value}% damage per other technique used in last 5s.' },
    { id: 't_a_overflow_qi',   name: 'Overflow Qi', range: { min: 5, max: 15 }, description: 'Excess qi deals {value}% bonus damage.' },
    // ── Cooldown/Resource ──
    { id: 't_a_focused',       name: 'Focused', range: { min: 1, max: 4 }, description: 'Cooldown -{value}s on hit.' },
    { id: 't_a_efficient',     name: 'Efficient', range: { min: 5, max: 15 }, description: '{value}% chance to not consume cooldown.' },
    { id: 't_a_qi_drain',      name: 'Qi Drain', range: { min: 1, max: 5 }, description: 'Restore {value}% qi per hit.' },
    { id: 't_a_blood_drinker', name: 'Blood Drinker', range: { min: 1, max: 5 }, description: 'Lifesteal {value}% of damage.' },
    { id: 't_a_kill_refresh',  name: 'Kill Refresh', range: { min: 50, max: 100 }, description: '{value}% chance to reset cooldown on kill.' },
    // ── Element/Conversion ──
    { id: 't_a_fire_strike',   name: 'Fire Strike', range: { min: 30, max: 80 }, description: 'Bonus {value}% as fire damage.' },
    { id: 't_a_frost_strike',  name: 'Frost Strike', range: { min: 30, max: 80 }, description: 'Bonus {value}% as frost damage. Slows enemy.' },
    { id: 't_a_lightning',     name: 'Lightning', range: { min: 30, max: 80 }, description: 'Bonus {value}% as lightning. Chains to nearby.' },
    { id: 't_a_void_dmg',      name: 'Void', range: { min: 30, max: 80 }, description: 'Bonus {value}% as void damage. Ignores 50% defense.' },
    { id: 't_a_elem_match',    name: 'Elemental Match', range: { min: 30, max: 80 }, description: '+{value}% damage if law element matches technique element.' },
    // ── Triggers/Procs ──
    { id: 't_a_burn',          name: 'Burn', range: { min: 5, max: 15 }, description: 'Burns enemies for {value}% over 3s.' },
    { id: 't_a_bleed',         name: 'Bleed', range: { min: 5, max: 15 }, description: 'Bleeds enemies for {value}% over 5s.' },
    { id: 't_a_shock',         name: 'Shock', range: { min: 5, max: 15 }, description: 'Shocked enemies take {value}% extra damage from all sources for 3s.' },
    { id: 't_a_stun',          name: 'Stun', range: { min: 5, max: 15 }, description: '{value}% chance to stun on hit.' },
    { id: 't_a_curse',         name: 'Curse', range: { min: 10, max: 30 }, description: 'Cursed enemies take +{value}% damage from all sources for 5s.' },
    // ── Misc ──
    { id: 't_a_kill_buff',     name: 'Kill Buff', range: { min: 30, max: 80 }, description: '+{value}% damage for 5s after a kill.' },
    { id: 't_a_perfect_form',  name: 'Perfect Form', range: { min: 50, max: 150 }, description: '+{value}% damage at full HP.' },
    { id: 't_a_desperation',   name: 'Desperation', range: { min: 50, max: 150 }, description: '+{value}% damage when below 25% HP.' },
    { id: 't_a_glass_cannon',  name: 'Glass Cannon', range: { min: 50, max: 150 }, description: '+{value}% damage. Take {value/4}% recoil.' },
    { id: 't_a_realm_scale',   name: 'Realm Scaling', range: { min: 5, max: 15 }, description: '+{value}% damage per major realm.' },
    { id: 't_a_artefact_sync', name: 'Artefact Sync', range: { min: 5, max: 15 }, description: '+{value}% damage per equipped artefact.' },
    { id: 't_a_pill_sync',     name: 'Pill Sync', range: { min: 20, max: 50 }, description: '+{value}% damage per active pill.' },
    { id: 't_a_law_resonance', name: 'Law Resonance', range: { min: 30, max: 80 }, description: 'Damage scales with law cultivation speed.' },
  ],

  Heal: [
    { id: 't_h_potent',        name: 'Potent', range: { min: 30, max: 80 }, description: '+{value}% healing.' },
    { id: 't_h_overflow',      name: 'Overflow', range: { min: 10, max: 30 }, description: 'Can overheal up to +{value}% max HP.' },
    { id: 't_h_swift',         name: 'Swift', range: { min: 20, max: 50 }, description: 'Cooldown -{value}%.' },
    { id: 't_h_emergency',     name: 'Emergency', range: { min: 50, max: 150 }, description: '+{value}% healing if HP below 30%.' },
    { id: 't_h_burst',         name: 'Burst Heal', range: { min: 30, max: 80 }, description: 'Heal +{value}% but doubles cooldown.' },
    { id: 't_h_regen',         name: 'Regen Field', range: { min: 5, max: 15 }, description: 'Add +{value}% HP/s for 10s after cast.' },
    { id: 't_h_purify',        name: 'Purify', range: { min: 1, max: 1 }, description: 'Removes all debuffs on cast.' },
    { id: 't_h_qi_restore',    name: 'Qi Restore', range: { min: 5, max: 15 }, description: 'Also restores {value}% qi.' },
    { id: 't_h_combat_meditation', name: 'Combat Meditation', range: { min: 30, max: 80 }, description: 'Healing also grants +{value}% qi.' },
    { id: 't_h_blood_pact',    name: 'Blood Pact', range: { min: 50, max: 150 }, description: '+{value}% healing. Lose {value/4}% on cast.' },
    { id: 't_h_shield',        name: 'Holy Shield', range: { min: 10, max: 30 }, description: 'Cast also grants +{value}% defense for 5s.' },
    { id: 't_h_inner_peace',   name: 'Inner Peace', range: { min: 5, max: 15 }, description: 'Reduces all cooldowns by {value}% on cast.' },
    { id: 't_h_lifebloom',     name: 'Lifebloom', range: { min: 1, max: 5 }, description: 'Heal {value}% per second for 10s.' },
    { id: 't_h_phoenix',       name: 'Phoenix', range: { min: 30, max: 80 }, description: 'On lethal damage, heal {value}% HP. 60s CD.' },
    { id: 't_h_renewal',       name: 'Renewal', range: { min: 5, max: 15 }, description: '+{value}% healing per missing 10% HP.' },
    { id: 't_h_pure_essence',  name: 'Pure Essence', range: { min: 30, max: 80 }, description: 'Healing scales with Essence stat.' },
    { id: 't_h_blood_offering',name: 'Blood Offering', range: { min: 50, max: 150 }, description: 'Healing instead deals damage equal to amount.' },
    { id: 't_h_oversoul',      name: 'Oversoul', range: { min: 30, max: 80 }, description: 'Healing also restores +{value}% Soul stat for 10s.' },
    { id: 't_h_eternal_well',  name: 'Eternal Well', range: { min: 5, max: 15 }, description: 'Subsequent heals within 5s are +{value}% stronger.' },
    { id: 't_h_no_cd',         name: 'No Cooldown', range: { min: 5, max: 15 }, description: '{value}% chance to not consume cooldown.' },
    { id: 't_h_realm_heal',    name: 'Realm Healing', range: { min: 5, max: 15 }, description: '+{value}% healing per major realm.' },
    { id: 't_h_qi_burn',       name: 'Qi Burn Heal', range: { min: 5, max: 15 }, description: 'Spends 5% qi for +{value}% bonus healing.' },
    { id: 't_h_critical_heal', name: 'Critical Heal', range: { min: 30, max: 80 }, description: '{value}% chance to heal twice.' },
    { id: 't_h_aoe_heal',      name: 'AoE Heal', range: { min: 30, max: 80 }, description: 'Also heals nearby allies (future feature).' },
    { id: 't_h_pill_sync_heal',name: 'Pill Sync', range: { min: 20, max: 50 }, description: '+{value}% healing per active pill.' },
    { id: 't_h_meditation',    name: 'Meditation', range: { min: 30, max: 80 }, description: 'On cast, gain +{value}% qi/s for 10s.' },
    { id: 't_h_focus_mind',    name: 'Focus Mind', range: { min: 30, max: 80 }, description: 'After heal, +{value}% damage for 5s.' },
    { id: 't_h_iron_skin',     name: 'Iron Skin', range: { min: 30, max: 80 }, description: 'After heal, +{value}% defense for 5s.' },
    { id: 't_h_swift_recovery',name: 'Swift Recovery', range: { min: 1, max: 4 }, description: 'Reduce other cooldowns by {value}s on cast.' },
    { id: 't_h_perfect_heal',  name: 'Perfect Heal', range: { min: 100, max: 300 }, description: 'First heal each combat is {value}% stronger.' },
  ],

  Defend: [
    { id: 't_d_aegis',         name: 'Aegis', range: { min: 30, max: 80 }, description: 'Defense bonus +{value}%.' },
    { id: 't_d_iron_will',     name: 'Iron Will', range: { min: 5, max: 15 }, description: '+{value}% extra duration.' },
    { id: 't_d_reflect',       name: 'Reflect', range: { min: 10, max: 30 }, description: 'Reflect {value}% of damage taken.' },
    { id: 't_d_counter',       name: 'Counter', range: { min: 30, max: 80 }, description: 'After being hit, deal {value}% damage back.' },
    { id: 't_d_stalwart',      name: 'Stalwart', range: { min: 30, max: 80 }, description: 'Cannot be reduced below 1 HP for {value/10}s.' },
    { id: 't_d_thorns',        name: 'Thorns', range: { min: 5, max: 15 }, description: 'Attackers take {value}% recoil.' },
    { id: 't_d_phalanx',       name: 'Phalanx', range: { min: 5, max: 15 }, description: '+{value}% defense per nearby ally.' },
    { id: 't_d_ironclad',      name: 'Ironclad', range: { min: 1, max: 5 }, description: 'Each hit absorbed extends duration by {value}s.' },
    { id: 't_d_swift_def',     name: 'Swift Defense', range: { min: 20, max: 50 }, description: 'Cooldown -{value}%.' },
    { id: 't_d_blood_shield',  name: 'Blood Shield', range: { min: 5, max: 15 }, description: 'Heal {value}% of blocked damage.' },
    { id: 't_d_qi_shield',     name: 'Qi Shield', range: { min: 5, max: 15 }, description: 'Convert blocked damage to qi (max {value}%).' },
    { id: 't_d_perfect_block', name: 'Perfect Block', range: { min: 5, max: 15 }, description: '{value}% chance to fully block an attack.' },
    { id: 't_d_offensive',     name: 'Offensive Stance', range: { min: 20, max: 60 }, description: 'While active, +{value}% damage.' },
    { id: 't_d_endurance',     name: 'Endurance', range: { min: 1, max: 5 }, description: '+{value}% HP/s while active.' },
    { id: 't_d_meditation',    name: 'Meditation', range: { min: 30, max: 80 }, description: 'While active, +{value}% qi gain.' },
    { id: 't_d_realm_def',     name: 'Realm Defense', range: { min: 5, max: 15 }, description: '+{value}% defense per realm.' },
    { id: 't_d_immovable',     name: 'Immovable', range: { min: 30, max: 80 }, description: 'Cannot be moved or stunned. +{value}% defense.' },
    { id: 't_d_share',         name: 'Share Pain', range: { min: 30, max: 80 }, description: 'Distribute {value}% of damage to attackers.' },
    { id: 't_d_phase',         name: 'Phase Defense', range: { min: 5, max: 15 }, description: '+{value}% chance to phase through attacks.' },
    { id: 't_d_resilient',     name: 'Resilient', range: { min: 30, max: 80 }, description: '+{value}% defense if HP above 80%.' },
  ],

  Dodge: [
    { id: 't_dg_swift',        name: 'Swift', range: { min: 5, max: 15 }, description: '+{value}% dodge chance.' },
    { id: 't_dg_phase',        name: 'Phase', range: { min: 5, max: 15 }, description: 'Phase through {value} attacks.' },
    { id: 't_dg_after_dmg',    name: 'Vengeance', range: { min: 30, max: 80 }, description: 'After dodge, next attack +{value}% damage.' },
    { id: 't_dg_after_heal',   name: 'Recovery', range: { min: 5, max: 15 }, description: 'After dodge, heal {value}% HP.' },
    { id: 't_dg_after_cd',     name: 'Reset', range: { min: 1, max: 5 }, description: 'After dodge, reduce {value} cooldowns by 1s.' },
    { id: 't_dg_chain',        name: 'Chain Dodge', range: { min: 5, max: 15 }, description: 'Each successful dodge +{value}% next dodge chance.' },
    { id: 't_dg_phantom',      name: 'Phantom', range: { min: 5, max: 15 }, description: 'Spawn afterimage that distracts enemies.' },
    { id: 't_dg_blink',        name: 'Blink', range: { min: 5, max: 15 }, description: 'Dodge teleports you behind enemy.' },
    { id: 't_dg_perfect',      name: 'Perfect Dodge', range: { min: 30, max: 80 }, description: 'Perfect dodge guarantees crit on next attack.' },
    { id: 't_dg_eternal',      name: 'Eternal Step', range: { min: 1, max: 4 }, description: '+{value}% chance for dodge to not consume cooldown.' },
    { id: 't_dg_qi_step',      name: 'Qi Step', range: { min: 5, max: 15 }, description: 'Each dodge restores {value}% qi.' },
    { id: 't_dg_assassin',     name: 'Assassin', range: { min: 50, max: 150 }, description: 'After dodge, +{value}% damage for 3s.' },
    { id: 't_dg_safe',         name: 'Safe Step', range: { min: 30, max: 80 }, description: 'After dodge, +{value}% defense for 3s.' },
    { id: 't_dg_speedy_step',  name: 'Speedy Step', range: { min: 5, max: 15 }, description: 'After dodge, -{value}% cooldown for 3s.' },
    { id: 't_dg_realm_dodge',  name: 'Realm Dodge', range: { min: 5, max: 15 }, description: '+{value}% dodge chance per realm.' },
    { id: 't_dg_combo',        name: 'Combo Dodge', range: { min: 5, max: 15 }, description: '+{value}% damage per dodge in last 5s.' },
    { id: 't_dg_eternal_phase',name: 'Eternal Phase', range: { min: 1, max: 5 }, description: '{value}% chance dodge lasts 1s longer.' },
    { id: 't_dg_lucky',        name: 'Lucky Step', range: { min: 5, max: 15 }, description: 'After dodge, next loot is +{value}% better.' },
    { id: 't_dg_void_step',    name: 'Void Step', range: { min: 5, max: 15 }, description: 'After dodge, next attack ignores {value}% defense.' },
    { id: 't_dg_mirror',       name: 'Mirror Step', range: { min: 30, max: 80 }, description: 'After dodge, copy attack is mirrored back.' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get all artefact uniques for a slot. */
export function artefactUniquesBySlot(slot) {
  return ARTEFACT_UNIQUES.filter(u => u.slot === slot);
}

/**
 * Re-roll the value of an EXISTING artefact-unique, preserving its id.
 * Used by the Hone transmutation on Transcendent-tier uniques.
 */
export function rerollArtefactUniqueValue(uniqueId, tier = 'Transcendent') {
  const u = ARTEFACT_UNIQUES.find(x => x.id === uniqueId);
  if (!u) return null;
  const { min, max } = u.range;
  const value = Math.floor(min + Math.random() * (max - min + 1));
  return {
    id:          u.id,
    name:        u.name,
    stat:        null,
    type:        null,
    value,
    tier,
    unique:      true,
    description: (u.description ?? '').replace(/\{value\}/g, value),
  };
}

/**
 * Roll a fresh artefact-unique affix for a given slot. Returns an affix-shaped
 * object tagged `unique: true` so the equipment / transmutation UI can render
 * it distinctly. Unique affixes carry a pre-formatted description instead of
 * the usual (stat, type, value) triple — the value still rolls inside the
 * unique's declared range for display.
 *
 * @param {string} slot          Artefact slot id (weapon, head, body, ...).
 * @param {string} tier          Rarity tier to stamp on the affix (Iron/Transcendent/...).
 * @param {string[]} excludeIds  Affix ids already used on the item (prevents dupes).
 * @returns {object|null}        Affix-shaped object or null if no candidates left.
 */
export function rollArtefactUnique(slot, tier = 'Iron', excludeIds = []) {
  const candidates = ARTEFACT_UNIQUES.filter(
    u => u.slot === slot && !excludeIds.includes(u.id)
  );
  if (!candidates.length) return null;
  const u = candidates[Math.floor(Math.random() * candidates.length)];
  const { min, max } = u.range;
  const value = Math.floor(min + Math.random() * (max - min + 1));
  const description = (u.description ?? '').replace(/\{value\}/g, value);
  return {
    id:          u.id,
    name:        u.name,
    stat:        null,
    type:        null,
    value,
    tier,
    unique:      true,
    description,
  };
}

/** Get technique uniques for a type. */
export function techniqueUniquesByType(type) {
  return TECHNIQUE_UNIQUES[type] ?? [];
}

/** Total counts (for design auditing). */
export const UNIQUE_COUNTS = {
  artefacts: ARTEFACT_UNIQUES.length,
  techniques: Object.values(TECHNIQUE_UNIQUES).reduce((s, arr) => s + arr.length, 0),
  total() {
    return this.artefacts + this.techniques;
  },
};
