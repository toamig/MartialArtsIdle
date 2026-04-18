/**
 * uniqueModifiers.js — Unique modifier pools for Laws, Artefacts, and Techniques.
 *
 * Build-enabling rare modifiers similar to Path of Exile uniques, Slormancer
 * legendaries, and Diablo set bonuses. These modifiers are NOT yet hooked into
 * game logic — this file is the design pool for future implementation.
 *
 * SHAPE:
 *   { id, name, tags, description, range }
 *
 *   - id:          stable identifier (e.g. 'l_diamond_body')
 *   - name:        display name
 *   - tags:        archetype tags for build classification & filtering
 *   - description: text with {value} or {value1}/{value2} placeholders
 *   - range:       { min, max } — single rolled value range
 *                  OR { v1: {min,max}, v2: {min,max} } for multi-value mods
 *
 * POOL POWER LEVELS:
 *   - Laws       — strongest, build-defining; usually has downsides or trade-offs
 *   - Artefacts  — ~70% of law strength; more variety, fewer trade-offs
 *   - Techniques — specific to that technique's combat behavior
 *
 * ARCHETYPE TAGS:
 *   qi-glutton    body         soul         elemental     speed
 *   tank          glass-cannon sustain      crit          conversion
 *   realm-scale   condition    anti-synergy crafting      utility
 *   harvest       mining       offensive    defensive     hybrid
 */

// ─── LAW UNIQUE MODIFIERS ─────────────────────────────────────────────────────
// Build-defining. Each suggests an entire playstyle.

export const LAW_UNIQUES = [

  // ── Qi Glutton archetype (extreme cultivation, weak combat) ──
  { id: 'l_limitless_vessel',     name: 'Limitless Vessel',     tags: ['qi-glutton'],        range: { min: 80,  max: 150 }, description: 'Qi cultivation speed +{value}%. Combat damage -50%.' },
  { id: 'l_qi_overflow',          name: 'Qi Overflow',          tags: ['qi-glutton','condition'], range: { min: 1, max: 3 }, description: 'Every second of cultivation grants +{value}% damage on next combat. Resets on hit taken.' },
  { id: 'l_patient_mountain',     name: 'Patient Mountain',     tags: ['qi-glutton','anti-synergy'], range: { min: 100, max: 200 }, description: 'Qi speed +{value}%. Cannot use techniques for 5s after combat starts.' },
  { id: 'l_greedy_path',          name: 'Greedy Path',          tags: ['qi-glutton','anti-synergy'], range: { min: 60, max: 120 }, description: 'Cultivation Qi gain +{value}%. Realm breakthrough cost +25%.' },
  { id: 'l_dao_hunger',           name: 'Dao Hunger',           tags: ['qi-glutton','realm-scale'], range: { min: 5, max: 15 }, description: 'Qi speed +{value}% per major realm.' },
  { id: 'l_breath_of_eternity',   name: 'Breath of Eternity',   tags: ['qi-glutton'],        range: { min: 40, max: 80 }, description: 'Each pill consumed grants +{value}% Qi speed for its duration.' },
  { id: 'l_qi_spring',            name: 'Qi Spring',            tags: ['qi-glutton','sustain'], range: { min: 5, max: 15 }, description: 'Restore {value}% qi/sec while standing still in combat.' },
  { id: 'l_meditation_path',      name: 'Meditation Path',      tags: ['qi-glutton','condition'], range: { min: 30, max: 80 }, description: '+{value}% qi gain while no combat for 10s.' },
  { id: 'l_seasoned_cultivator',  name: 'Seasoned Cultivator',  tags: ['qi-glutton','realm-scale'], range: { min: 100, max: 250 }, description: '+{value}% qi from offline earnings.' },
  { id: 'l_eternal_breath',       name: 'Eternal Breath',       tags: ['qi-glutton'],        range: { min: 50, max: 120 }, description: 'Cultivation speed +{value}%. Cannot equip techniques.' },

  // ── Body Cultivator archetype ──
  { id: 'l_diamond_body',         name: 'Diamond Body',         tags: ['body','tank'],       range: { min: 60, max: 140 }, description: 'Body stat +{value}%. Soul stat halved.' },
  { id: 'l_iron_marrow',          name: 'Iron Marrow',          tags: ['body','tank'],       range: { min: 30, max: 80 }, description: '+{value}% Health and +{value}% Defense. Qi speed -30%.' },
  { id: 'l_mountain_stance',      name: 'Mountain Stance',      tags: ['body','tank','anti-synergy'], range: { min: 50, max: 120 }, description: 'Health +{value}%. Defense +{value}%. Cannot dodge.' },
  { id: 'l_living_fortress',      name: 'Living Fortress',      tags: ['body','defensive'],  range: { min: 80, max: 200 }, description: 'Defense +{value}%. Technique cooldowns +25%.' },
  { id: 'l_body_over_mind',       name: 'Body Over Mind',       tags: ['body','offensive'],  range: { min: 50, max: 100 }, description: '+{value}% Body. -50% Soul. Physical damage scales with Body × 1.5.' },
  { id: 'l_titan_blood',          name: 'Titan Blood',          tags: ['body','realm-scale'], range: { min: 8, max: 20 }, description: '+{value}% max HP per realm.' },
  { id: 'l_unbreakable_will',     name: 'Unbreakable Will',     tags: ['body','sustain'],    range: { min: 5, max: 15 }, description: 'Recover {value}% max HP per kill.' },
  { id: 'l_reincarnated_titan',   name: 'Reincarnated Titan',   tags: ['body','tank'],       range: { min: 100, max: 250 }, description: 'Health +{value}%. Lose 1 technique slot.' },
  { id: 'l_juggernaut_path',      name: 'Juggernaut Path',      tags: ['body','tank','condition'], range: { min: 30, max: 80 }, description: '+{value}% defense per second standing in same spot (max 5 stacks).' },
  { id: 'l_warrior_pulse',        name: 'Warrior Pulse',        tags: ['body','offensive'],  range: { min: 20, max: 60 }, description: '+{value}% damage if Body > Essence + Soul combined.' },

  // ── Soul Cultivator archetype ──
  { id: 'l_spirit_sea',           name: 'Spirit Sea',           tags: ['soul','elemental'],  range: { min: 60, max: 140 }, description: 'Soul stat +{value}%. Body stat halved.' },
  { id: 'l_mental_blade',         name: 'Mental Blade',         tags: ['soul','offensive'],  range: { min: 80, max: 200 }, description: 'Psychic damage +{value}%. Physical damage halved.' },
  { id: 'l_ethereal_form',        name: 'Ethereal Form',        tags: ['soul','defensive'],  range: { min: 30, max: 70 }, description: 'Take {value}% less physical damage. Take {value}% more elemental damage.' },
  { id: 'l_dream_walker',         name: 'Dream Walker',         tags: ['soul','qi-glutton'], range: { min: 40, max: 100 }, description: 'Cultivation speed +{value}% while in combat.' },
  { id: 'l_soul_pierce',          name: 'Soul Pierce',          tags: ['soul','offensive'],  range: { min: 20, max: 50 }, description: 'Ignore {value}% of enemy soul toughness on attacks.' },
  { id: 'l_astral_projection',    name: 'Astral Projection',    tags: ['soul','crit'],       range: { min: 5, max: 20 }, description: '+{value}% chance for soul attacks to deal triple damage.' },
  { id: 'l_mind_over_matter',     name: 'Mind Over Matter',     tags: ['soul','sustain'],    range: { min: 30, max: 80 }, description: '{value}% of damage taken is removed from soul instead of HP.' },
  { id: 'l_divine_consciousness', name: 'Divine Consciousness', tags: ['soul','realm-scale'],range: { min: 10, max: 25 }, description: '+{value}% Soul stat per Saint+ realm level.' },
  { id: 'l_thoughtless_state',    name: 'Thoughtless State',    tags: ['soul','condition'],  range: { min: 50, max: 150 }, description: '+{value}% damage when at full HP.' },
  { id: 'l_inner_void',           name: 'Inner Void',           tags: ['soul','elemental'],  range: { min: 40, max: 90 }, description: 'Convert {value}% of physical damage to soul damage.' },

  // ── Elemental Master archetype ──
  { id: 'l_element_tyranny',      name: 'Element Tyranny',      tags: ['elemental','offensive'], range: { min: 100, max: 250 }, description: 'Elemental damage +{value}%. Only your law\'s element works.' },
  { id: 'l_volatile_chi',         name: 'Volatile Chi',         tags: ['elemental','glass-cannon'], range: { min: 80, max: 180 }, description: 'Elemental damage +{value}%. Take {value}% bonus elemental damage.' },
  { id: 'l_element_conversion',   name: 'Element Conversion',   tags: ['elemental','conversion'], range: { min: 40, max: 100 }, description: 'Convert {value}% of physical damage to elemental damage of your law.' },
  { id: 'l_elemental_symphony',   name: 'Elemental Symphony',   tags: ['elemental','condition'], range: { min: 15, max: 40 }, description: '+{value}% damage per unique element among equipped techniques.' },
  { id: 'l_burning_path',         name: 'Burning Path',         tags: ['elemental','condition'], range: { min: 30, max: 80 }, description: 'Fire law: +{value}% damage. Each kill leaves a damaging zone.' },
  { id: 'l_frozen_path',          name: 'Frozen Path',          tags: ['elemental','condition'], range: { min: 30, max: 80 }, description: 'Frost law: +{value}% damage. Hits slow enemies for 1s.' },
  { id: 'l_lightning_path',       name: 'Lightning Path',       tags: ['elemental','condition'], range: { min: 30, max: 80 }, description: 'Lightning law: +{value}% damage. {value/2}% chance to chain to nearby enemies.' },
  { id: 'l_void_path',            name: 'Void Path',            tags: ['elemental','condition'], range: { min: 30, max: 80 }, description: 'Void law: +{value}% damage. Attacks ignore 25% defense.' },
  { id: 'l_stone_path',           name: 'Stone Path',           tags: ['elemental','tank'],  range: { min: 30, max: 80 }, description: 'Stone law: +{value}% defense. Reflects 10% physical damage.' },
  { id: 'l_dual_element',         name: 'Dual Element',         tags: ['elemental','hybrid'], range: { min: 40, max: 100 }, description: 'Gain a second element. Both elemental damage types are +{value}% effective.' },

  // ── Speed Demon archetype ──
  { id: 'l_quickened_steps',      name: 'Quickened Steps',      tags: ['speed','glass-cannon'], range: { min: 25, max: 60 }, description: 'All cooldowns -{value}%. Max HP -25%.' },
  { id: 'l_lightning_reflexes',   name: 'Lightning Reflexes',   tags: ['speed','glass-cannon'], range: { min: 20, max: 50 }, description: 'Dodge chance +{value}%. Defense -50%.' },
  { id: 'l_hummingbird_heart',    name: 'Hummingbird\'s Heart', tags: ['speed','anti-synergy'], range: { min: 30, max: 70 }, description: 'Cooldowns -{value}%. Pills last 30% less.' },
  { id: 'l_blink_path',           name: 'Blink Path',           tags: ['speed','sustain'],   range: { min: 5, max: 15 }, description: 'Each successful dodge restores {value}% HP.' },
  { id: 'l_perpetual_motion',     name: 'Perpetual Motion',     tags: ['speed','condition'], range: { min: 5, max: 15 }, description: '+{value}% damage per second since combat started (caps at 100%).' },
  { id: 'l_swallow_strike',       name: 'Swallow Strike',       tags: ['speed','offensive'], range: { min: 30, max: 80 }, description: 'Attack cooldowns -{value}%. Damage -25%.' },
  { id: 'l_sonic_step',           name: 'Sonic Step',           tags: ['speed','condition'], range: { min: 20, max: 60 }, description: 'After dodging, next attack cooldown is {value}% lower.' },
  { id: 'l_river_flow',           name: 'River Flow',           tags: ['speed','sustain'],   range: { min: 1, max: 4 }, description: 'Restore {value}% HP per cooldown reset.' },
  { id: 'l_unyielding_pace',      name: 'Unyielding Pace',      tags: ['speed','condition'], range: { min: 30, max: 70 }, description: '+{value}% cooldown speed if no damage taken in 5s.' },
  { id: 'l_blade_dance',          name: 'Blade Dance',          tags: ['speed','offensive'], range: { min: 5, max: 15 }, description: 'Each consecutive attack deals +{value}% damage (max 10 stacks, resets on hit taken).' },

  // ── Tank archetype ──
  { id: 'l_unmovable_mountain',   name: 'Unmovable Mountain',   tags: ['tank','anti-synergy'], range: { min: 30, max: 70 }, description: 'Damage taken -{value}%. Damage dealt -{value}%.' },
  { id: 'l_reflecting_pool',      name: 'Reflecting Pool',      tags: ['tank','offensive'],  range: { min: 15, max: 40 }, description: '{value}% of damage taken is reflected to attacker.' },
  { id: 'l_living_shield',        name: 'Living Shield',        tags: ['tank','conversion'], range: { min: 5, max: 15 }, description: '+{value}% of max HP added to defense.' },
  { id: 'l_bonecage',             name: 'Bonecage',             tags: ['tank','anti-synergy'], range: { min: 50, max: 120 }, description: '+{value}% defense. Cannot dodge.' },
  { id: 'l_aegis_eternal',        name: 'Aegis Eternal',        tags: ['tank'],              range: { min: 30, max: 70 }, description: '+{value}% damage absorption. Refreshes every 10s.' },
  { id: 'l_shell_path',           name: 'Shell Path',           tags: ['tank','condition'],  range: { min: 50, max: 150 }, description: '+{value}% defense for first 5s of combat.' },
  { id: 'l_immortal_will',        name: 'Immortal Will',        tags: ['tank'],              range: { min: 1, max: 5 }, description: 'Survive lethal damage with 1 HP. {value}-second cooldown.' },
  { id: 'l_passive_resistance',   name: 'Passive Resistance',   tags: ['tank','elemental'],  range: { min: 20, max: 50 }, description: '+{value}% to all elemental defenses.' },
  { id: 'l_perfect_form',         name: 'Perfect Form',         tags: ['tank','realm-scale'], range: { min: 5, max: 12 }, description: '+{value}% defense per major realm.' },
  { id: 'l_stalwart_oath',        name: 'Stalwart Oath',        tags: ['tank','sustain'],    range: { min: 1, max: 3 }, description: 'Regenerate {value}% max HP per second.' },

  // ── Glass Cannon archetype ──
  { id: 'l_razors_edge',          name: 'Razor\'s Edge',        tags: ['glass-cannon','offensive'], range: { min: 60, max: 150 }, description: '+{value}% damage. -50% defense.' },
  { id: 'l_all_in',               name: 'All In',               tags: ['glass-cannon','anti-synergy'], range: { min: 100, max: 250 }, description: 'Damage +{value}%. Health permanently locked at 50%.' },
  { id: 'l_volatile_power',       name: 'Volatile Power',       tags: ['glass-cannon','offensive'], range: { min: 50, max: 120 }, description: 'Damage +{value}%. Take {value/4}% recoil per attack.' },
  { id: 'l_blood_for_power',      name: 'Blood for Power',      tags: ['glass-cannon','condition'], range: { min: 20, max: 50 }, description: '+{value}% damage per 10% missing HP.' },
  { id: 'l_overcharged',          name: 'Overcharged',          tags: ['glass-cannon','speed'], range: { min: 40, max: 100 }, description: 'Damage +{value}%. Each attack drains 1% of current HP.' },
  { id: 'l_unstable_essence',     name: 'Unstable Essence',     tags: ['glass-cannon','elemental'], range: { min: 60, max: 140 }, description: 'Elemental damage +{value}%. {value/2}% chance to self-damage on hit.' },
  { id: 'l_executioner_path',     name: 'Executioner Path',     tags: ['glass-cannon','offensive'], range: { min: 100, max: 300 }, description: '+{value}% damage to enemies below 30% HP.' },
  { id: 'l_blade_of_chaos',       name: 'Blade of Chaos',       tags: ['glass-cannon','crit'], range: { min: 30, max: 80 }, description: '+{value}% crit damage. Crits cost 5% HP.' },
  { id: 'l_sacred_offering',      name: 'Sacred Offering',      tags: ['glass-cannon','condition'], range: { min: 50, max: 150 }, description: '+{value}% damage if HP locked at 25%.' },
  { id: 'l_nuclear_path',         name: 'Nuclear Path',         tags: ['glass-cannon','offensive'], range: { min: 200, max: 500 }, description: 'Damage +{value}%. Cannot heal.' },

  // ── Sustain/Healing archetype ──
  { id: 'l_eternal_spring',       name: 'Eternal Spring',       tags: ['sustain','anti-synergy'], range: { min: 50, max: 120 }, description: '+{value}% healing received. -25% damage dealt.' },
  { id: 'l_vampiric_path',        name: 'Vampiric Path',        tags: ['sustain','offensive'], range: { min: 5, max: 20 }, description: '{value}% of damage dealt is restored as HP.' },
  { id: 'l_self_renewal',         name: 'Self Renewal',         tags: ['sustain'],           range: { min: 1, max: 4 }, description: '+{value}% HP/sec out of combat.' },
  { id: 'l_phoenix_path',         name: 'Phoenix Path',         tags: ['sustain'],           range: { min: 30, max: 80 }, description: 'Revive once with {value}% HP. 5-minute cooldown.' },
  { id: 'l_blood_pact',           name: 'Blood Pact',           tags: ['sustain','condition'], range: { min: 20, max: 60 }, description: 'Heals are {value}% stronger when below 50% HP.' },
  { id: 'l_qi_circulation',       name: 'Qi Circulation',       tags: ['sustain'],           range: { min: 5, max: 15 }, description: 'Heal {value}% HP per pill consumed.' },
  { id: 'l_undying_will',         name: 'Undying Will',         tags: ['sustain'],           range: { min: 30, max: 70 }, description: '+{value}% healing effectiveness.' },
  { id: 'l_renewal_circle',       name: 'Renewal Circle',       tags: ['sustain','condition'], range: { min: 5, max: 15 }, description: 'Heal {value}% HP every 10s in combat.' },
  { id: 'l_blood_overflow',       name: 'Blood Overflow',       tags: ['sustain','tank'],    range: { min: 10, max: 25 }, description: 'Overheal up to {value}% bonus HP.' },
  { id: 'l_lifeblood',            name: 'Lifeblood',            tags: ['sustain','offensive'], range: { min: 1, max: 5 }, description: '+{value}% damage per healing tick.' },

  // ── Crit/Lucky archetype ──
  { id: 'l_lucky_star',           name: 'Lucky Star',           tags: ['crit','anti-synergy'], range: { min: 20, max: 50 }, description: '+{value}% crit chance. {value/2}% chance to deal half damage.' },
  { id: 'l_fortunes_favor',       name: 'Fortune\'s Favor',     tags: ['crit','utility','harvest','mining'], range: { min: 50, max: 150 }, description: '+{value}% harvest and mining luck. -25% defense.' },
  { id: 'l_twin_blade',           name: 'Twin Blade',           tags: ['crit','speed'],      range: { min: 10, max: 30 }, description: '+{value}% chance to attack twice. Costs +25% qi.' },
  { id: 'l_perfect_strike',       name: 'Perfect Strike',       tags: ['crit'],              range: { min: 30, max: 80 }, description: 'Crits deal +{value}% bonus damage.' },
  { id: 'l_crit_storm',           name: 'Crit Storm',           tags: ['crit','condition'],  range: { min: 20, max: 60 }, description: 'After a crit, +{value}% crit chance for 5s.' },
  { id: 'l_executioner_eye',      name: 'Executioner\'s Eye',   tags: ['crit','condition'],  range: { min: 30, max: 80 }, description: '+{value}% crit chance vs enemies above 80% HP.' },
  { id: 'l_lethal_focus',         name: 'Lethal Focus',         tags: ['crit'],              range: { min: 1, max: 5 }, description: '+{value}% crit chance per active pill.' },
  { id: 'l_god_of_chance',        name: 'God of Chance',        tags: ['crit','anti-synergy'], range: { min: 50, max: 150 }, description: '+{value}% crit damage. {value/3}% chance to miss.' },
  { id: 'l_assassin_creed',       name: 'Assassin Creed',       tags: ['crit','condition'],  range: { min: 100, max: 300 }, description: '+{value}% crit damage on first attack.' },
  { id: 'l_blood_in_water',       name: 'Blood in Water',       tags: ['crit','offensive'],  range: { min: 5, max: 15 }, description: 'Crit chance scales with missing HP %, max +{value}%.' },

  // ── Conversion/Hybrid archetype ──
  { id: 'l_body_to_soul',         name: 'Body to Soul',         tags: ['conversion','soul'], range: { min: 30, max: 80 }, description: '{value}% of body stat counts as soul.' },
  { id: 'l_soul_to_body',         name: 'Soul to Body',         tags: ['conversion','body'], range: { min: 30, max: 80 }, description: '{value}% of soul stat counts as body.' },
  { id: 'l_essence_echo',         name: 'Essence Echo',         tags: ['conversion','hybrid'], range: { min: 20, max: 60 }, description: 'Essence stat is duplicated for all 3 stats at {value}%.' },
  { id: 'l_tri_harmony',          name: 'Tri-Harmony',          tags: ['conversion','hybrid','condition'], range: { min: 50, max: 150 }, description: '+{value}% all stats if Essence/Soul/Body are within 10% of each other.' },
  { id: 'l_qi_to_damage',         name: 'Qi to Damage',         tags: ['conversion','offensive'], range: { min: 1, max: 5 }, description: '{value}% of current qi added to damage on attack.' },
  { id: 'l_health_to_essence',    name: 'Health to Essence',    tags: ['conversion'],        range: { min: 5, max: 15 }, description: 'Convert {value}% of max HP into Essence stat.' },
  { id: 'l_essence_to_health',    name: 'Essence to Health',    tags: ['conversion','tank'], range: { min: 5, max: 15 }, description: 'Convert {value}% of essence into max HP.' },
  { id: 'l_defense_to_damage',    name: 'Defense to Damage',    tags: ['conversion','offensive'], range: { min: 10, max: 30 }, description: 'Add {value}% of defense as flat physical damage.' },
  { id: 'l_qi_burn',              name: 'Qi Burn',              tags: ['conversion','glass-cannon'], range: { min: 30, max: 80 }, description: 'Each attack consumes 1% qi for +{value}% damage.' },
  { id: 'l_dao_consumption',      name: 'Dao Consumption',      tags: ['conversion','sustain'], range: { min: 1, max: 4 }, description: 'Convert {value}% of qi/sec to HP/sec.' },

  // ── Realm-scaling archetype ──
  { id: 'l_realm_ascension',      name: 'Realm Ascension',      tags: ['realm-scale'],       range: { min: 5, max: 15 }, description: '+{value}% damage per major realm.' },
  { id: 'l_late_bloomer',         name: 'Late Bloomer',         tags: ['realm-scale'],       range: { min: 10, max: 30 }, description: '+{value}% to all stats per realm above Saint.' },
  { id: 'l_slow_burn',            name: 'Slow Burn',            tags: ['realm-scale','qi-glutton'], range: { min: 5, max: 20 }, description: '+{value}% qi per minute spent cultivating without breakthrough.' },
  { id: 'l_realm_anchor',         name: 'Realm Anchor',         tags: ['realm-scale','tank'], range: { min: 20, max: 60 }, description: '+{value}% defense per realm above your enemy.' },
  { id: 'l_dao_descent',          name: 'Dao Descent',          tags: ['realm-scale','offensive'], range: { min: 30, max: 80 }, description: '+{value}% damage to enemies of lower realm.' },
  { id: 'l_path_of_kings',        name: 'Path of Kings',        tags: ['realm-scale'],       range: { min: 100, max: 300 }, description: 'At max realm, all stats +{value}%.' },
  { id: 'l_first_steps',          name: 'First Steps',          tags: ['realm-scale','condition'], range: { min: 50, max: 150 }, description: '+{value}% to all stats below Qi Transformation.' },
  { id: 'l_immortal_legacy',      name: 'Immortal Legacy',      tags: ['realm-scale','sustain'], range: { min: 5, max: 15 }, description: '+{value}% lifesteal per realm above Saint.' },
  { id: 'l_eternal_pupil',        name: 'Eternal Pupil',        tags: ['realm-scale','utility'], range: { min: 100, max: 300 }, description: 'Each realm gives +{value}% qi/sec permanently.' },
  { id: 'l_seeker_path',          name: 'Seeker\'s Path',       tags: ['realm-scale','crafting'], range: { min: 5, max: 15 }, description: 'Each realm reduces crafting cost by {value}%.' },

  // ── Conditional/Trigger archetype ──
  { id: 'l_predator_patience',    name: 'Predator\'s Patience', tags: ['condition','offensive'], range: { min: 50, max: 150 }, description: '+{value}% damage if no damage taken in last 10s.' },
  { id: 'l_berserker_resolve',    name: 'Berserker\'s Resolve', tags: ['condition','glass-cannon'], range: { min: 50, max: 150 }, description: '+{value}% damage when below 50% HP.' },
  { id: 'l_first_strike',         name: 'First Strike',         tags: ['condition','offensive'], range: { min: 100, max: 300 }, description: '+{value}% damage on first attack after combat starts.' },
  { id: 'l_last_stand',           name: 'Last Stand',           tags: ['condition','glass-cannon'], range: { min: 100, max: 300 }, description: '+{value}% damage when below 25% HP.' },
  { id: 'l_calm_water',           name: 'Calm Water',           tags: ['condition','tank'],  range: { min: 30, max: 80 }, description: '+{value}% defense at full HP.' },
  { id: 'l_deadly_focus',         name: 'Deadly Focus',         tags: ['condition','crit'],  range: { min: 30, max: 80 }, description: '+{value}% crit chance for 3s after dodging.' },
  { id: 'l_combo_artist',         name: 'Combo Artist',         tags: ['condition','offensive'], range: { min: 5, max: 15 }, description: 'Each consecutive attack +{value}% damage. Resets on miss.' },
  { id: 'l_iron_focus',           name: 'Iron Focus',           tags: ['condition','offensive'], range: { min: 50, max: 150 }, description: '+{value}% damage if no movement in last 3s.' },
  { id: 'l_wounded_beast',        name: 'Wounded Beast',        tags: ['condition','glass-cannon'], range: { min: 1, max: 4 }, description: '+{value}% damage per 1% missing HP.' },
  { id: 'l_quiet_mind',           name: 'Quiet Mind',           tags: ['condition','sustain'], range: { min: 30, max: 80 }, description: 'Heal +{value}% effectiveness if no attacks made in last 3s.' },

  // ── Anti-synergy/cost archetype ──
  { id: 'l_heavy_burden',         name: 'Heavy Burden',         tags: ['anti-synergy'],      range: { min: 30, max: 80 }, description: '+{value}% all stats. Cooldowns +50%.' },
  { id: 'l_reckless',             name: 'Reckless',             tags: ['anti-synergy','glass-cannon'], range: { min: 40, max: 100 }, description: '+{value}% damage. +{value}% damage taken.' },
  { id: 'l_greedy_collector',     name: 'Greedy Collector',     tags: ['anti-synergy','utility'], range: { min: 50, max: 150 }, description: '+{value}% loot. -25% damage.' },
  { id: 'l_chained_will',         name: 'Chained Will',         tags: ['anti-synergy'],      range: { min: 50, max: 100 }, description: '+{value}% all stats. Cannot consume pills.' },
  { id: 'l_stubborn_path',        name: 'Stubborn Path',        tags: ['anti-synergy'],      range: { min: 50, max: 100 }, description: '+{value}% damage. Cannot heal.' },
  { id: 'l_cursed_inheritance',   name: 'Cursed Inheritance',   tags: ['anti-synergy','crit'], range: { min: 100, max: 300 }, description: '+{value}% crit damage. -50% normal damage.' },
  { id: 'l_oath_of_silence',      name: 'Oath of Silence',      tags: ['anti-synergy'],      range: { min: 30, max: 80 }, description: '+{value}% qi speed. Cannot use techniques in combat.' },
  { id: 'l_blood_chains',         name: 'Blood Chains',         tags: ['anti-synergy','tank'], range: { min: 50, max: 100 }, description: '+{value}% defense. Cannot dodge or use mobility.' },
  { id: 'l_sealed_path',          name: 'Sealed Path',          tags: ['anti-synergy'],      range: { min: 50, max: 100 }, description: '+{value}% Body. Cannot equip rings.' },
  { id: 'l_burdened_soul',        name: 'Burdened Soul',        tags: ['anti-synergy','soul'], range: { min: 50, max: 150 }, description: '+{value}% Soul. Pills last 50% less.' },

  // ── Crafting/Utility archetype ──
  { id: 'l_master_smith',         name: 'Master Smith',         tags: ['crafting','utility'], range: { min: 20, max: 50 }, description: 'Crafting costs reduced by {value}%.' },
  { id: 'l_alchemist_path',       name: 'Alchemist Path',       tags: ['crafting','utility'], range: { min: 30, max: 80 }, description: 'Pill effects +{value}%.' },
  { id: 'l_lucky_gather',         name: 'Lucky Gather',         tags: ['harvest','utility'], range: { min: 50, max: 150 }, description: 'Harvest speed +{value}%.' },
  { id: 'l_deep_miner',           name: 'Deep Miner',           tags: ['mining','utility'], range: { min: 50, max: 150 }, description: 'Mining speed +{value}%.' },
  { id: 'l_pill_hoarder',         name: 'Pill Hoarder',         tags: ['utility'],           range: { min: 50, max: 150 }, description: 'Pill duration +{value}%.' },
  { id: 'l_treasure_finder',      name: 'Treasure Finder',      tags: ['utility','harvest','mining'], range: { min: 30, max: 80 }, description: 'Harvest and mining luck +{value}%.' },
  { id: 'l_market_savant',        name: 'Market Savant',        tags: ['utility'],           range: { min: 30, max: 80 }, description: 'Shop prices reduced by {value}%.' },
  { id: 'l_dual_brew',            name: 'Dual Brew',            tags: ['utility','crafting'], range: { min: 1, max: 1 }, description: 'Alchemy crafts produce {value} extra pill at 50% chance.' },
  { id: 'l_refining_master',      name: 'Refining Master',      tags: ['utility','crafting'], range: { min: 5, max: 20 }, description: 'Refining has {value}% chance to produce a higher-tier item.' },
  { id: 'l_artisan_path',         name: 'Artisan\'s Path',      tags: ['utility','crafting'], range: { min: 20, max: 60 }, description: 'Transmutation costs reduced by {value}%.' },

  // ── Hybrid/Misc archetype ──
  { id: 'l_balanced_dao',         name: 'Balanced Dao',         tags: ['hybrid'],            range: { min: 20, max: 50 }, description: '+{value}% to all stats.' },
  { id: 'l_dual_path',            name: 'Dual Path',            tags: ['hybrid'],            range: { min: 30, max: 80 }, description: 'Choose any 2 stats. +{value}% to both.' },
  { id: 'l_infinite_growth',      name: 'Infinite Growth',      tags: ['hybrid','realm-scale'], range: { min: 1, max: 3 }, description: '+{value}% qi cap per minute spent in current realm.' },
  { id: 'l_chaos_path',           name: 'Chaos Path',           tags: ['hybrid'],            range: { min: 50, max: 200 }, description: 'Random stat receives +{value}% bonus, rerolled every minute.' },
  { id: 'l_combo_strike',         name: 'Combo Strike',         tags: ['hybrid','condition'], range: { min: 5, max: 20 }, description: 'Each technique used adds +{value}% damage to the next.' },
  { id: 'l_eclipse_dao',          name: 'Eclipse Dao',          tags: ['hybrid','elemental'], range: { min: 50, max: 150 }, description: '+{value}% damage with opposing elements. -50% with matching.' },
  { id: 'l_forgotten_form',       name: 'Forgotten Form',       tags: ['hybrid','condition'], range: { min: 100, max: 300 }, description: '+{value}% damage if no artefacts equipped.' },
  { id: 'l_naked_path',           name: 'Naked Path',           tags: ['hybrid','condition'], range: { min: 200, max: 500 }, description: '+{value}% all stats with no artefacts equipped.' },
  { id: 'l_full_arsenal',         name: 'Full Arsenal',         tags: ['hybrid','condition'], range: { min: 50, max: 150 }, description: '+{value}% damage with all 11 artefact slots filled.' },
  { id: 'l_dao_chain',            name: 'Dao Chain',            tags: ['hybrid','condition'], range: { min: 100, max: 300 }, description: '+{value}% damage if law element matches all equipped technique elements.' },

  // ── Time/Tempo archetype ──
  { id: 'l_time_dilation',        name: 'Time Dilation',        tags: ['speed','condition'], range: { min: 30, max: 80 }, description: 'First 3s of combat: cooldowns -{value}%.' },
  { id: 'l_eternal_battle',       name: 'Eternal Battle',       tags: ['condition','offensive'], range: { min: 1, max: 4 }, description: '+{value}% damage per second in combat (max 30 stacks).' },
  { id: 'l_quick_kill',           name: 'Quick Kill',           tags: ['condition','offensive'], range: { min: 50, max: 150 }, description: 'Killing an enemy within 3s of spawn refunds 100% qi.' },
  { id: 'l_slow_burn_combat',     name: 'Slow Burn Combat',     tags: ['condition','offensive'], range: { min: 5, max: 15 }, description: 'After 30s in combat, +{value}% damage permanently for the encounter.' },
  { id: 'l_time_master',          name: 'Time Master',          tags: ['speed','utility'],   range: { min: 20, max: 50 }, description: 'All buff durations +{value}%.' },
  { id: 'l_lingering_will',       name: 'Lingering Will',       tags: ['condition','offensive'], range: { min: 100, max: 250 }, description: 'Killing an enemy grants +{value}% damage for 5s.' },
  { id: 'l_combat_meditation',    name: 'Combat Meditation',    tags: ['condition','qi-glutton'], range: { min: 50, max: 150 }, description: '+{value}% qi gain during combat.' },
  { id: 'l_heart_of_battle',      name: 'Heart of Battle',      tags: ['condition','sustain'], range: { min: 1, max: 5 }, description: 'Restore {value}% HP per kill.' },
  { id: 'l_warrior_pulse_time',   name: 'Warrior\'s Pulse',     tags: ['condition','speed'], range: { min: 5, max: 15 }, description: '+{value}% cooldown speed per kill in last 10s (max 5 stacks).' },
  { id: 'l_endless_war',          name: 'Endless War',          tags: ['condition','offensive'], range: { min: 50, max: 150 }, description: '+{value}% damage in encounters lasting over 60s.' },
];

// ─── ARTEFACT UNIQUE MODIFIERS ────────────────────────────────────────────────
// Slightly weaker than law uniques, more numerous, slot-themed.
// No major downsides — these are pure upgrades.

export const ARTEFACT_UNIQUES = [

  // ── Weapon-specific ──
  { id: 'a_keen_edge',         name: 'Keen Edge',         slot: 'weapon', tags: ['offensive','crit'], range: { min: 5, max: 15 }, description: '+{value}% crit chance on weapon attacks.' },
  { id: 'a_sharp_mind',        name: 'Sharp Mind',        slot: 'weapon', tags: ['offensive'],        range: { min: 10, max: 30 }, description: '+{value}% damage with techniques matching weapon type.' },
  { id: 'a_blood_drinker',     name: 'Blood Drinker',     slot: 'weapon', tags: ['sustain'],          range: { min: 1, max: 5 }, description: 'Heal {value}% of damage dealt.' },
  { id: 'a_executioner',       name: 'Executioner',       slot: 'weapon', tags: ['offensive','condition'], range: { min: 50, max: 150 }, description: '+{value}% damage to enemies below 25% HP.' },
  { id: 'a_qi_blade',          name: 'Qi Blade',          slot: 'weapon', tags: ['offensive'],        range: { min: 1, max: 4 }, description: 'Each 100 qi adds {value} flat damage.' },
  { id: 'a_void_cleaver',      name: 'Void Cleaver',      slot: 'weapon', tags: ['offensive'],        range: { min: 10, max: 25 }, description: 'Ignore {value}% of enemy defense.' },
  { id: 'a_resonant_strike',   name: 'Resonant Strike',   slot: 'weapon', tags: ['offensive','elemental'], range: { min: 20, max: 60 }, description: '+{value}% bonus damage when law element matches.' },
  { id: 'a_perfect_balance',   name: 'Perfect Balance',   slot: 'weapon', tags: ['offensive'],        range: { min: 5, max: 15 }, description: '+{value}% damage per equipped artefact.' },
  { id: 'a_thirsty_blade',     name: 'Thirsty Blade',     slot: 'weapon', tags: ['offensive','condition'], range: { min: 5, max: 15 }, description: '+{value}% damage per kill in last 10s.' },
  { id: 'a_dragon_tooth',      name: 'Dragon Tooth',      slot: 'weapon', tags: ['offensive'],        range: { min: 20, max: 60 }, description: '+{value}% damage to enemies above your realm.' },
  { id: 'a_phantom_edge',      name: 'Phantom Edge',      slot: 'weapon', tags: ['offensive','speed'], range: { min: 10, max: 30 }, description: 'Attack cooldowns -{value}%.' },
  { id: 'a_storm_blade',       name: 'Storm Blade',       slot: 'weapon', tags: ['elemental'],        range: { min: 20, max: 60 }, description: '+{value}% lightning damage.' },
  { id: 'a_burning_brand',     name: 'Burning Brand',     slot: 'weapon', tags: ['elemental'],        range: { min: 20, max: 60 }, description: 'Attacks burn for {value}% damage over 3s.' },
  { id: 'a_frost_fang',        name: 'Frost Fang',        slot: 'weapon', tags: ['elemental'],        range: { min: 10, max: 30 }, description: 'Hits slow enemy attack speed by {value}% for 2s.' },
  { id: 'a_void_pierce',       name: 'Void Pierce',       slot: 'weapon', tags: ['offensive'],        range: { min: 5, max: 15 }, description: '+{value}% chance to ignore all defense.' },
  { id: 'a_savage_grip',       name: 'Savage Grip',       slot: 'weapon', tags: ['offensive'],        range: { min: 5, max: 15 }, description: '+{value}% damage from Body stat.' },
  { id: 'a_ethereal_blade',    name: 'Ethereal Blade',    slot: 'weapon', tags: ['soul'],             range: { min: 20, max: 50 }, description: '+{value}% damage from Soul stat.' },
  { id: 'a_sky_breaker',       name: 'Sky Breaker',       slot: 'weapon', tags: ['offensive','realm-scale'], range: { min: 5, max: 15 }, description: '+{value}% damage per major realm.' },
  { id: 'a_combo_blade',       name: 'Combo Blade',       slot: 'weapon', tags: ['speed'],            range: { min: 10, max: 30 }, description: 'Each consecutive hit deals +{value}% bonus.' },
  { id: 'a_essence_drain',     name: 'Essence Drain',     slot: 'weapon', tags: ['offensive','sustain'], range: { min: 1, max: 4 }, description: 'Steal {value}% essence per hit (max 30%).' },

  // ── Head-specific ──
  { id: 'a_clear_mind',        name: 'Clear Mind',        slot: 'head', tags: ['utility','speed'],   range: { min: 5, max: 15 }, description: 'All technique cooldowns -{value}%.' },
  { id: 'a_focused_will',      name: 'Focused Will',      slot: 'head', tags: ['offensive'],         range: { min: 5, max: 15 }, description: '+{value}% crit chance.' },
  { id: 'a_third_eye',         name: 'Third Eye',         slot: 'head', tags: ['offensive'],         range: { min: 10, max: 30 }, description: '+{value}% damage to weakened enemies.' },
  { id: 'a_battle_meditation', name: 'Battle Meditation', slot: 'head', tags: ['qi-glutton','condition'], range: { min: 20, max: 60 }, description: '+{value}% qi gain in combat.' },
  { id: 'a_iron_will',         name: 'Iron Will',         slot: 'head', tags: ['soul'],              range: { min: 30, max: 80 }, description: '+{value}% soul toughness.' },
  { id: 'a_serene_face',       name: 'Serene Face',       slot: 'head', tags: ['sustain'],           range: { min: 5, max: 15 }, description: '+{value}% healing received.' },
  { id: 'a_warmind',           name: 'Warmind',           slot: 'head', tags: ['offensive','condition'], range: { min: 20, max: 60 }, description: '+{value}% damage if Soul > Body.' },
  { id: 'a_seeker_eye',        name: 'Seeker\'s Eye',     slot: 'head', tags: ['utility','crit'],   range: { min: 5, max: 15 }, description: '+{value}% crit damage.' },
  { id: 'a_void_gaze',         name: 'Void Gaze',         slot: 'head', tags: ['offensive'],         range: { min: 5, max: 15 }, description: '+{value}% damage to enemies you have stunned.' },
  { id: 'a_oracles_insight',   name: 'Oracle\'s Insight', slot: 'head', tags: ['utility'],           range: { min: 5, max: 15 }, description: '+{value}% chance to dodge fatal blows.' },
  { id: 'a_clarity_storm',     name: 'Clarity Storm',     slot: 'head', tags: ['speed'],             range: { min: 5, max: 15 }, description: 'After dodging, cooldowns -{value}% for 3s.' },
  { id: 'a_crown_focus',       name: 'Crown of Focus',    slot: 'head', tags: ['utility','crit'],   range: { min: 5, max: 15 }, description: '+{value}% chance to crit twice.' },
  { id: 'a_inner_eye',         name: 'Inner Eye',         slot: 'head', tags: ['utility'],           range: { min: 5, max: 15 }, description: '+{value}% chance for techniques to not consume cooldown.' },
  { id: 'a_dragons_gaze',      name: 'Dragon\'s Gaze',    slot: 'head', tags: ['elemental'],         range: { min: 20, max: 50 }, description: '+{value}% elemental damage.' },
  { id: 'a_visionary_mind',    name: 'Visionary Mind',    slot: 'head', tags: ['utility','realm-scale'], range: { min: 30, max: 80 }, description: '+{value}% offline qi gain.' },
  { id: 'a_warmask',           name: 'Warmask',           slot: 'head', tags: ['offensive','condition'], range: { min: 20, max: 60 }, description: '+{value}% damage if 3+ techniques equipped.' },
  { id: 'a_golden_diadem',     name: 'Golden Diadem',     slot: 'head', tags: ['utility'],           range: { min: 5, max: 15 }, description: '+{value}% all loot.' },
  { id: 'a_helm_eternity',     name: 'Helm of Eternity',  slot: 'head', tags: ['sustain'],           range: { min: 1, max: 4 }, description: '+{value}% HP/s out of combat.' },
  { id: 'a_silent_crown',      name: 'Silent Crown',      slot: 'head', tags: ['offensive','speed'],range: { min: 30, max: 80 }, description: 'First attack each combat is a guaranteed crit.' },
  { id: 'a_dao_helm',          name: 'Dao Helm',          slot: 'head', tags: ['qi-glutton'],        range: { min: 5, max: 15 }, description: '+{value}% cultivation speed.' },

  // ── Body-specific ──
  { id: 'a_titan_chest',       name: 'Titan\'s Chest',    slot: 'body', tags: ['tank'],              range: { min: 10, max: 30 }, description: '+{value}% max HP.' },
  { id: 'a_iron_carapace',     name: 'Iron Carapace',     slot: 'body', tags: ['tank'],              range: { min: 10, max: 30 }, description: '+{value}% defense.' },
  { id: 'a_living_armor',      name: 'Living Armor',      slot: 'body', tags: ['sustain'],           range: { min: 1, max: 5 }, description: '+{value}% HP/sec in combat.' },
  { id: 'a_reflective_skin',   name: 'Reflective Skin',   slot: 'body', tags: ['offensive','tank'], range: { min: 5, max: 15 }, description: 'Reflect {value}% of damage taken.' },
  { id: 'a_bramble_garb',      name: 'Bramble Garb',      slot: 'body', tags: ['offensive','tank'], range: { min: 5, max: 15 }, description: 'Attackers take {value}% of damage dealt as recoil.' },
  { id: 'a_phoenix_robe',      name: 'Phoenix Robe',      slot: 'body', tags: ['sustain'],           range: { min: 30, max: 80 }, description: 'Once per fight, revive with {value}% HP.' },
  { id: 'a_void_cloak',        name: 'Void Cloak',        slot: 'body', tags: ['speed'],             range: { min: 5, max: 15 }, description: '+{value}% dodge chance.' },
  { id: 'a_bone_armor',        name: 'Bone Armor',        slot: 'body', tags: ['tank','elemental'], range: { min: 10, max: 30 }, description: '+{value}% physical defense.' },
  { id: 'a_dragon_scales',     name: 'Dragon Scales',     slot: 'body', tags: ['tank','elemental'], range: { min: 10, max: 30 }, description: '+{value}% elemental defense.' },
  { id: 'a_blessed_robe',      name: 'Blessed Robe',      slot: 'body', tags: ['sustain'],           range: { min: 10, max: 30 }, description: '+{value}% healing received.' },
  { id: 'a_chain_armor',       name: 'Chain Armor',       slot: 'body', tags: ['tank','condition'], range: { min: 5, max: 15 }, description: '+{value}% defense per missing 10% HP.' },
  { id: 'a_warlords_mantle',   name: 'Warlord\'s Mantle', slot: 'body', tags: ['offensive','tank'], range: { min: 10, max: 30 }, description: '+{value}% damage. +{value/2}% defense.' },
  { id: 'a_silken_robe',       name: 'Silken Robe',       slot: 'body', tags: ['speed','soul'],     range: { min: 5, max: 15 }, description: '+{value}% Soul. -5% Body.' },
  { id: 'a_iron_carapace_pro', name: 'Heavy Carapace',    slot: 'body', tags: ['tank','anti-synergy'], range: { min: 30, max: 80 }, description: '+{value}% defense. -10% speed.' },
  { id: 'a_voidwalker_garb',   name: 'Voidwalker Garb',   slot: 'body', tags: ['speed'],             range: { min: 1, max: 5 }, description: '+{value}% chance to phase through attacks.' },
  { id: 'a_ancestral_robe',    name: 'Ancestral Robe',    slot: 'body', tags: ['realm-scale'],       range: { min: 5, max: 15 }, description: '+{value}% all stats per major realm.' },
  { id: 'a_battle_mail',       name: 'Battle Mail',       slot: 'body', tags: ['offensive','condition'], range: { min: 10, max: 30 }, description: '+{value}% damage in first 10s of combat.' },
  { id: 'a_serpent_skin',      name: 'Serpent Skin',      slot: 'body', tags: ['speed','sustain'],   range: { min: 5, max: 15 }, description: '+{value}% dodge. Heal {value}% on dodge.' },
  { id: 'a_unyielding_garb',   name: 'Unyielding Garb',   slot: 'body', tags: ['tank'],              range: { min: 5, max: 20 }, description: 'Cannot be reduced below {value}% HP for 3s after taking heavy damage.' },
  { id: 'a_blossoming_robe',   name: 'Blossoming Robe',   slot: 'body', tags: ['sustain','condition'], range: { min: 1, max: 5 }, description: '+{value}% HP/s while at full HP.' },

  // ── Hands-specific ──
  { id: 'a_titan_grip',        name: 'Titan Grip',        slot: 'hands', tags: ['offensive'],        range: { min: 5, max: 15 }, description: '+{value}% physical damage.' },
  { id: 'a_swift_palms',       name: 'Swift Palms',       slot: 'hands', tags: ['speed'],            range: { min: 5, max: 15 }, description: '+{value}% attack speed.' },
  { id: 'a_dragon_claws',      name: 'Dragon Claws',      slot: 'hands', tags: ['offensive','crit'], range: { min: 5, max: 15 }, description: '+{value}% crit damage.' },
  { id: 'a_qi_channeler',      name: 'Qi Channeler',      slot: 'hands', tags: ['offensive'],        range: { min: 5, max: 15 }, description: '+{value}% damage from essence.' },
  { id: 'a_iron_fists',        name: 'Iron Fists',        slot: 'hands', tags: ['offensive','tank'], range: { min: 10, max: 30 }, description: '+{value}% punch damage.' },
  { id: 'a_flame_palms',       name: 'Flame Palms',       slot: 'hands', tags: ['elemental'],        range: { min: 20, max: 50 }, description: '+{value}% fire damage.' },
  { id: 'a_lightning_grip',    name: 'Lightning Grip',    slot: 'hands', tags: ['elemental','crit'], range: { min: 10, max: 25 }, description: 'Crits chain to nearby enemies for {value}% damage.' },
  { id: 'a_void_grip',         name: 'Void Grip',         slot: 'hands', tags: ['offensive'],        range: { min: 5, max: 15 }, description: 'Attacks ignore {value}% defense.' },
  { id: 'a_blood_palms',       name: 'Blood Palms',       slot: 'hands', tags: ['sustain'],          range: { min: 1, max: 5 }, description: 'Heal {value}% per hit.' },
  { id: 'a_soul_grip',         name: 'Soul Grip',         slot: 'hands', tags: ['soul'],             range: { min: 5, max: 15 }, description: '+{value}% Soul.' },
  { id: 'a_smith_hands',       name: 'Smith\'s Hands',    slot: 'hands', tags: ['utility','crafting'], range: { min: 10, max: 30 }, description: 'Crafting cost reduced by {value}%.' },
  { id: 'a_alchemist_hands',   name: 'Alchemist\'s Hands',slot: 'hands', tags: ['utility','crafting'], range: { min: 10, max: 30 }, description: 'Pill effects +{value}%.' },
  { id: 'a_combo_grip',        name: 'Combo Grip',        slot: 'hands', tags: ['speed'],            range: { min: 5, max: 15 }, description: '+{value}% per consecutive hit.' },
  { id: 'a_assassin_grip',     name: 'Assassin Grip',     slot: 'hands', tags: ['crit','condition'], range: { min: 50, max: 150 }, description: '+{value}% crit damage from behind.' },
  { id: 'a_warriors_grip',     name: 'Warrior\'s Grip',   slot: 'hands', tags: ['offensive','tank'], range: { min: 5, max: 15 }, description: '+{value}% damage and defense.' },
  { id: 'a_eternal_grip',      name: 'Eternal Grip',      slot: 'hands', tags: ['speed','sustain'],  range: { min: 5, max: 15 }, description: 'Cannot be disarmed. +{value}% qi gen.' },
  { id: 'a_qi_palms',          name: 'Qi Palms',          slot: 'hands', tags: ['qi-glutton'],       range: { min: 5, max: 15 }, description: '+{value}% qi gain.' },
  { id: 'a_destruction_grip',  name: 'Destruction Grip',  slot: 'hands', tags: ['offensive'],        range: { min: 30, max: 80 }, description: '+{value}% damage to objects and constructs.' },
  { id: 'a_grip_of_kings',     name: 'Grip of Kings',     slot: 'hands', tags: ['utility'],          range: { min: 10, max: 25 }, description: '+{value}% experience gain.' },
  { id: 'a_phoenix_palms',     name: 'Phoenix Palms',     slot: 'hands', tags: ['elemental','sustain'], range: { min: 5, max: 15 }, description: 'Fire damage heals {value}% of dealt damage.' },

  // ── Waist-specific ──
  { id: 'a_dantian_seal',      name: 'Dantian Seal',      slot: 'waist', tags: ['qi-glutton'],       range: { min: 10, max: 30 }, description: '+{value}% qi cap.' },
  { id: 'a_unbreakable_belt',  name: 'Unbreakable Belt',  slot: 'waist', tags: ['tank'],             range: { min: 10, max: 30 }, description: '+{value}% max HP.' },
  { id: 'a_qi_storage',        name: 'Qi Storage',        slot: 'waist', tags: ['qi-glutton'],       range: { min: 10, max: 30 }, description: '+{value}% qi gain.' },
  { id: 'a_warrior_belt',      name: 'Warrior\'s Belt',   slot: 'waist', tags: ['offensive'],        range: { min: 5, max: 15 }, description: '+{value}% damage.' },
  { id: 'a_speed_belt',        name: 'Speed Belt',        slot: 'waist', tags: ['speed'],            range: { min: 5, max: 15 }, description: '+{value}% movement and dodge.' },
  { id: 'a_sage_belt',         name: 'Sage\'s Belt',      slot: 'waist', tags: ['utility'],          range: { min: 5, max: 15 }, description: '+{value}% pill effects.' },
  { id: 'a_dragon_belt',       name: 'Dragon Belt',       slot: 'waist', tags: ['elemental'],        range: { min: 10, max: 30 }, description: '+{value}% elemental damage.' },
  { id: 'a_essence_belt',      name: 'Essence Belt',      slot: 'waist', tags: ['conversion'],       range: { min: 5, max: 15 }, description: 'Convert {value}% body to essence.' },
  { id: 'a_soul_belt',         name: 'Soul Belt',         slot: 'waist', tags: ['soul'],             range: { min: 5, max: 15 }, description: '+{value}% Soul.' },
  { id: 'a_battle_sash',       name: 'Battle Sash',       slot: 'waist', tags: ['offensive','condition'], range: { min: 5, max: 15 }, description: '+{value}% damage per kill in last 5s.' },
  { id: 'a_eternal_sash',      name: 'Eternal Sash',      slot: 'waist', tags: ['sustain'],          range: { min: 1, max: 5 }, description: '+{value}% HP/s.' },
  { id: 'a_iron_belt',         name: 'Iron Belt',         slot: 'waist', tags: ['tank','offensive'], range: { min: 10, max: 30 }, description: '+{value}% defense and damage.' },
  { id: 'a_void_sash',         name: 'Void Sash',         slot: 'waist', tags: ['utility'],          range: { min: 1, max: 5 }, description: '+{value} extra inventory slots.' },
  { id: 'a_lifebinder',        name: 'Lifebinder',        slot: 'waist', tags: ['sustain'],          range: { min: 10, max: 30 }, description: '+{value}% healing received.' },
  { id: 'a_cursed_belt',       name: 'Cursed Belt',       slot: 'waist', tags: ['glass-cannon'],     range: { min: 50, max: 150 }, description: '+{value}% damage. -25% defense.' },
  { id: 'a_blessed_belt',      name: 'Blessed Belt',      slot: 'waist', tags: ['utility'],          range: { min: 5, max: 15 }, description: '+{value}% all stats.' },
  { id: 'a_emperor_belt',      name: 'Emperor\'s Belt',   slot: 'waist', tags: ['realm-scale'],      range: { min: 10, max: 25 }, description: '+{value}% to all stats per realm.' },
  { id: 'a_thirsty_belt',      name: 'Thirsty Belt',      slot: 'waist', tags: ['sustain'],          range: { min: 1, max: 4 }, description: '+{value}% lifesteal.' },
  { id: 'a_qi_belt',           name: 'Qi Belt',           slot: 'waist', tags: ['qi-glutton'],       range: { min: 10, max: 25 }, description: '+{value}% qi/sec.' },
  { id: 'a_assassin_belt',     name: 'Assassin Belt',     slot: 'waist', tags: ['crit'],             range: { min: 5, max: 15 }, description: '+{value}% crit chance.' },

  // ── Feet-specific ──
  { id: 'a_wind_step',         name: 'Wind Step',         slot: 'feet', tags: ['speed'],             range: { min: 5, max: 15 }, description: '+{value}% movement.' },
  { id: 'a_swift_boots',       name: 'Swift Boots',       slot: 'feet', tags: ['speed'],             range: { min: 5, max: 15 }, description: '+{value}% dodge chance.' },
  { id: 'a_thunder_boots',     name: 'Thunder Boots',     slot: 'feet', tags: ['elemental'],         range: { min: 10, max: 25 }, description: '+{value}% lightning damage.' },
  { id: 'a_iron_greaves',      name: 'Iron Greaves',      slot: 'feet', tags: ['tank'],              range: { min: 10, max: 30 }, description: '+{value}% defense.' },
  { id: 'a_phoenix_boots',     name: 'Phoenix Boots',     slot: 'feet', tags: ['sustain'],           range: { min: 5, max: 15 }, description: '+{value}% HP/sec.' },
  { id: 'a_dancers_boots',     name: 'Dancer\'s Boots',   slot: 'feet', tags: ['speed','offensive'], range: { min: 10, max: 30 }, description: '+{value}% damage after dodging.' },
  { id: 'a_voidstep',          name: 'Voidstep',          slot: 'feet', tags: ['speed'],             range: { min: 1, max: 5 }, description: 'Each dodge resets one cooldown.' },
  { id: 'a_dragon_treaders',   name: 'Dragon Treaders',   slot: 'feet', tags: ['offensive'],         range: { min: 5, max: 15 }, description: '+{value}% damage from Body.' },
  { id: 'a_sky_walker',        name: 'Sky Walker',        slot: 'feet', tags: ['speed','sustain'],   range: { min: 5, max: 15 }, description: '+{value}% movement. +{value}% HP regen.' },
  { id: 'a_blood_boots',       name: 'Blood Boots',       slot: 'feet', tags: ['glass-cannon'],     range: { min: 10, max: 30 }, description: '+{value}% damage. {value/3}% recoil.' },
  { id: 'a_silent_steps',      name: 'Silent Steps',      slot: 'feet', tags: ['crit'],              range: { min: 50, max: 150 }, description: 'First attack is a guaranteed crit.' },
  { id: 'a_iron_treads',       name: 'Iron Treads',       slot: 'feet', tags: ['tank'],              range: { min: 5, max: 15 }, description: '+{value}% defense and HP.' },
  { id: 'a_warriors_boots',    name: 'Warrior\'s Boots',  slot: 'feet', tags: ['offensive'],         range: { min: 5, max: 15 }, description: '+{value}% physical damage.' },
  { id: 'a_eternal_treads',    name: 'Eternal Treads',    slot: 'feet', tags: ['sustain'],           range: { min: 1, max: 5 }, description: '+{value}% HP/s out of combat.' },
  { id: 'a_void_boots',        name: 'Void Boots',        slot: 'feet', tags: ['speed'],             range: { min: 1, max: 5 }, description: '+{value}% chance to phase through attacks.' },
  { id: 'a_combo_boots',       name: 'Combo Boots',       slot: 'feet', tags: ['speed','offensive'], range: { min: 5, max: 15 }, description: '+{value}% damage after each dodge.' },
  { id: 'a_qi_boots',          name: 'Qi Boots',          slot: 'feet', tags: ['qi-glutton'],        range: { min: 5, max: 15 }, description: '+{value}% qi/s.' },
  { id: 'a_dao_boots',         name: 'Dao Boots',         slot: 'feet', tags: ['realm-scale'],       range: { min: 5, max: 15 }, description: '+{value}% damage per realm.' },
  { id: 'a_storm_boots',       name: 'Storm Boots',       slot: 'feet', tags: ['elemental'],         range: { min: 10, max: 30 }, description: '+{value}% lightning damage.' },
  { id: 'a_thirsty_boots',     name: 'Thirsty Boots',     slot: 'feet', tags: ['sustain'],           range: { min: 1, max: 4 }, description: 'Heal {value}% per kill.' },

  // ── Neck-specific ──
  { id: 'a_jade_pendant',      name: 'Jade Pendant',      slot: 'neck', tags: ['soul'],              range: { min: 5, max: 15 }, description: '+{value}% Soul stat.' },
  { id: 'a_dragon_amulet',     name: 'Dragon Amulet',     slot: 'neck', tags: ['offensive'],         range: { min: 5, max: 15 }, description: '+{value}% damage.' },
  { id: 'a_seer_locket',       name: 'Seer Locket',       slot: 'neck', tags: ['utility'],           range: { min: 5, max: 15 }, description: '+{value}% all loot.' },
  { id: 'a_phoenix_charm',     name: 'Phoenix Charm',     slot: 'neck', tags: ['sustain'],           range: { min: 30, max: 80 }, description: 'Once per fight, heal {value}% HP.' },
  { id: 'a_void_pendant',      name: 'Void Pendant',      slot: 'neck', tags: ['offensive'],         range: { min: 5, max: 15 }, description: 'Ignore {value}% enemy defense.' },
  { id: 'a_iron_amulet',       name: 'Iron Amulet',       slot: 'neck', tags: ['tank'],              range: { min: 5, max: 15 }, description: '+{value}% defense.' },
  { id: 'a_blood_amulet',      name: 'Blood Amulet',      slot: 'neck', tags: ['sustain'],           range: { min: 1, max: 4 }, description: '+{value}% lifesteal.' },
  { id: 'a_qi_amulet',         name: 'Qi Amulet',         slot: 'neck', tags: ['qi-glutton'],        range: { min: 5, max: 15 }, description: '+{value}% qi gain.' },
  { id: 'a_silver_locket',     name: 'Silver Locket',     slot: 'neck', tags: ['utility'],           range: { min: 5, max: 15 }, description: '+{value}% gold from kills.' },
  { id: 'a_warlords_amulet',   name: 'Warlord\'s Amulet', slot: 'neck', tags: ['offensive','tank'], range: { min: 5, max: 15 }, description: '+{value}% damage and defense.' },
  { id: 'a_crystal_pendant',   name: 'Crystal Pendant',   slot: 'neck', tags: ['elemental'],         range: { min: 10, max: 30 }, description: '+{value}% elemental damage.' },
  { id: 'a_oracle_amulet',     name: 'Oracle Amulet',     slot: 'neck', tags: ['utility'],           range: { min: 1, max: 5 }, description: '+{value}% chance to dodge fatal blows.' },
  { id: 'a_assassin_pendant',  name: 'Assassin Pendant',  slot: 'neck', tags: ['crit'],              range: { min: 5, max: 15 }, description: '+{value}% crit chance.' },
  { id: 'a_emperor_amulet',    name: 'Emperor\'s Amulet', slot: 'neck', tags: ['realm-scale'],       range: { min: 5, max: 15 }, description: '+{value}% damage per realm.' },
  { id: 'a_balance_amulet',    name: 'Amulet of Balance', slot: 'neck', tags: ['hybrid'],            range: { min: 5, max: 15 }, description: '+{value}% to all stats.' },
  { id: 'a_eternal_amulet',    name: 'Eternal Amulet',    slot: 'neck', tags: ['sustain'],           range: { min: 5, max: 15 }, description: '+{value}% healing.' },
  { id: 'a_speed_amulet',      name: 'Amulet of Speed',   slot: 'neck', tags: ['speed'],             range: { min: 5, max: 15 }, description: '-{value}% all cooldowns.' },
  { id: 'a_combat_amulet',     name: 'Combat Amulet',     slot: 'neck', tags: ['offensive','condition'], range: { min: 10, max: 30 }, description: '+{value}% damage in first 5s of combat.' },
  { id: 'a_storm_pendant',     name: 'Storm Pendant',     slot: 'neck', tags: ['elemental'],         range: { min: 10, max: 25 }, description: '+{value}% lightning damage.' },
  { id: 'a_chained_amulet',    name: 'Chained Amulet',    slot: 'neck', tags: ['anti-synergy'],      range: { min: 30, max: 80 }, description: '+{value}% all stats. Cannot use rings.' },

  // ── Ring-specific ──
  { id: 'a_essence_ring',      name: 'Essence Ring',      slot: 'ring', tags: ['conversion'],        range: { min: 5, max: 15 }, description: '+{value}% Essence.' },
  { id: 'a_soul_ring',         name: 'Soul Ring',         slot: 'ring', tags: ['soul'],              range: { min: 5, max: 15 }, description: '+{value}% Soul.' },
  { id: 'a_body_ring',         name: 'Body Ring',         slot: 'ring', tags: ['body'],              range: { min: 5, max: 15 }, description: '+{value}% Body.' },
  { id: 'a_crit_ring',         name: 'Crit Ring',         slot: 'ring', tags: ['crit'],              range: { min: 5, max: 15 }, description: '+{value}% crit chance.' },
  { id: 'a_speed_ring',        name: 'Speed Ring',        slot: 'ring', tags: ['speed'],             range: { min: 5, max: 15 }, description: '-{value}% cooldowns.' },
  { id: 'a_blood_ring',        name: 'Blood Ring',        slot: 'ring', tags: ['sustain'],           range: { min: 1, max: 4 }, description: '+{value}% lifesteal.' },
  { id: 'a_void_ring',         name: 'Void Ring',         slot: 'ring', tags: ['offensive'],         range: { min: 5, max: 15 }, description: 'Ignore {value}% defense.' },
  { id: 'a_dragon_ring',       name: 'Dragon Ring',       slot: 'ring', tags: ['offensive'],         range: { min: 5, max: 15 }, description: '+{value}% damage.' },
  { id: 'a_phoenix_ring',      name: 'Phoenix Ring',      slot: 'ring', tags: ['sustain'],           range: { min: 30, max: 80 }, description: 'Once per fight, heal {value}% HP.' },
  { id: 'a_iron_ring',         name: 'Iron Ring',         slot: 'ring', tags: ['tank'],              range: { min: 5, max: 15 }, description: '+{value}% defense.' },
  { id: 'a_emperor_ring',      name: 'Emperor Ring',      slot: 'ring', tags: ['realm-scale'],       range: { min: 5, max: 15 }, description: '+{value}% damage per realm.' },
  { id: 'a_combo_ring',        name: 'Combo Ring',        slot: 'ring', tags: ['offensive'],         range: { min: 5, max: 15 }, description: '+{value}% per consecutive hit.' },
  { id: 'a_lucky_ring',        name: 'Lucky Ring',        slot: 'ring', tags: ['utility'],           range: { min: 5, max: 15 }, description: '+{value}% loot luck.' },
  { id: 'a_warrior_ring',      name: 'Warrior Ring',      slot: 'ring', tags: ['offensive'],         range: { min: 5, max: 15 }, description: '+{value}% physical damage.' },
  { id: 'a_mage_ring',         name: 'Mage Ring',         slot: 'ring', tags: ['elemental'],         range: { min: 5, max: 15 }, description: '+{value}% elemental damage.' },
  { id: 'a_qi_ring',           name: 'Qi Ring',           slot: 'ring', tags: ['qi-glutton'],        range: { min: 5, max: 15 }, description: '+{value}% qi gain.' },
  { id: 'a_eternal_ring',      name: 'Eternal Ring',      slot: 'ring', tags: ['sustain'],           range: { min: 5, max: 15 }, description: '+{value}% healing.' },
  { id: 'a_harvest_ring',      name: 'Harvest Ring',      slot: 'ring', tags: ['harvest'],           range: { min: 10, max: 30 }, description: '+{value}% harvest speed.' },
  { id: 'a_mining_ring',       name: 'Mining Ring',       slot: 'ring', tags: ['mining'],            range: { min: 10, max: 30 }, description: '+{value}% mining speed.' },
  { id: 'a_alchemy_ring',      name: 'Alchemy Ring',      slot: 'ring', tags: ['utility','crafting'], range: { min: 10, max: 30 }, description: 'Pill effects +{value}%.' },
];

// ─── TECHNIQUE UNIQUE MODIFIERS ───────────────────────────────────────────────
// Specific to a technique's behavior. Different pools per type.

export const TECHNIQUE_UNIQUES = {

  Attack: [
    // ── Damage scaling/types ──
    { id: 't_a_overwhelming',  name: 'Overwhelming',  tags: ['offensive'], range: { min: 30, max: 80 }, description: '+{value}% damage.' },
    { id: 't_a_relentless',    name: 'Relentless',    tags: ['offensive','condition'], range: { min: 5, max: 15 }, description: 'Each consecutive cast adds +{value}% damage (max 5 stacks).' },
    { id: 't_a_devastating',   name: 'Devastating',   tags: ['offensive'], range: { min: 50, max: 150 }, description: '+{value}% damage. Cooldown +50%.' },
    { id: 't_a_swift',         name: 'Swift',         tags: ['speed'], range: { min: 20, max: 50 }, description: 'Cooldown -{value}%.' },
    { id: 't_a_essence_blade', name: 'Essence Blade', tags: ['offensive'], range: { min: 30, max: 80 }, description: '+{value}% damage from Essence stat.' },
    { id: 't_a_soul_blade',    name: 'Soul Blade',    tags: ['offensive','soul'], range: { min: 30, max: 80 }, description: '+{value}% damage from Soul stat.' },
    { id: 't_a_body_blade',    name: 'Body Blade',    tags: ['offensive','body'], range: { min: 30, max: 80 }, description: '+{value}% damage from Body stat.' },
    { id: 't_a_qi_blade',      name: 'Qi Blade',      tags: ['offensive'], range: { min: 1, max: 4 }, description: 'Each 100 qi adds {value} damage to this technique.' },
    { id: 't_a_chain_strike',  name: 'Chain Strike',  tags: ['offensive'], range: { min: 1, max: 4 }, description: 'Hits {value} additional enemies for 50% damage.' },
    { id: 't_a_double_strike', name: 'Double Strike', tags: ['offensive'], range: { min: 20, max: 50 }, description: '{value}% chance to strike twice.' },
    { id: 't_a_triple_strike', name: 'Triple Strike', tags: ['offensive'], range: { min: 5, max: 15 }, description: '{value}% chance to strike three times.' },
    { id: 't_a_pierce_def',    name: 'Pierce',        tags: ['offensive'], range: { min: 10, max: 30 }, description: 'Ignore {value}% enemy defense.' },
    { id: 't_a_void_strike',   name: 'Void Strike',   tags: ['offensive'], range: { min: 5, max: 15 }, description: '{value}% chance to ignore all defense.' },
    { id: 't_a_brutal',        name: 'Brutal',        tags: ['crit'], range: { min: 30, max: 80 }, description: '+{value}% crit damage.' },
    { id: 't_a_keen',          name: 'Keen',          tags: ['crit'], range: { min: 5, max: 15 }, description: '+{value}% crit chance.' },
    { id: 't_a_executioner',   name: 'Executioner',   tags: ['offensive','condition'], range: { min: 50, max: 150 }, description: '+{value}% damage to enemies below 25% HP.' },
    { id: 't_a_first_blood',   name: 'First Blood',   tags: ['offensive','condition'], range: { min: 100, max: 300 }, description: '+{value}% damage on first cast each combat.' },
    { id: 't_a_finisher',      name: 'Finisher',      tags: ['offensive','condition'], range: { min: 30, max: 80 }, description: '+{value}% damage if last cooldown ready.' },
    { id: 't_a_combo',         name: 'Combo',         tags: ['offensive','condition'], range: { min: 5, max: 15 }, description: '+{value}% damage per other technique used in last 5s.' },
    { id: 't_a_overflow_qi',   name: 'Overflow Qi',   tags: ['offensive'], range: { min: 5, max: 15 }, description: 'Excess qi deals {value}% bonus damage.' },
    // ── Cooldown/Resource ──
    { id: 't_a_focused',       name: 'Focused',       tags: ['speed'], range: { min: 1, max: 4 }, description: 'Cooldown -{value}s on hit.' },
    { id: 't_a_efficient',     name: 'Efficient',     tags: ['speed','sustain'], range: { min: 5, max: 15 }, description: '{value}% chance to not consume cooldown.' },
    { id: 't_a_qi_drain',      name: 'Qi Drain',      tags: ['sustain'], range: { min: 1, max: 5 }, description: 'Restore {value}% qi per hit.' },
    { id: 't_a_blood_drinker', name: 'Blood Drinker', tags: ['sustain'], range: { min: 1, max: 5 }, description: 'Lifesteal {value}% of damage.' },
    { id: 't_a_kill_refresh',  name: 'Kill Refresh',  tags: ['speed'], range: { min: 50, max: 100 }, description: '{value}% chance to reset cooldown on kill.' },
    // ── Element/Conversion ──
    { id: 't_a_fire_strike',   name: 'Fire Strike',   tags: ['elemental'], range: { min: 30, max: 80 }, description: 'Bonus {value}% as fire damage.' },
    { id: 't_a_frost_strike',  name: 'Frost Strike',  tags: ['elemental'], range: { min: 30, max: 80 }, description: 'Bonus {value}% as frost damage. Slows enemy.' },
    { id: 't_a_lightning',     name: 'Lightning',     tags: ['elemental'], range: { min: 30, max: 80 }, description: 'Bonus {value}% as lightning. Chains to nearby.' },
    { id: 't_a_void_dmg',      name: 'Void',          tags: ['elemental'], range: { min: 30, max: 80 }, description: 'Bonus {value}% as void damage. Ignores 50% defense.' },
    { id: 't_a_elem_match',    name: 'Elemental Match', tags: ['elemental','condition'], range: { min: 30, max: 80 }, description: '+{value}% damage if law element matches technique element.' },
    // ── Triggers/Procs ──
    { id: 't_a_burn',          name: 'Burn',          tags: ['elemental'], range: { min: 5, max: 15 }, description: 'Burns enemies for {value}% over 3s.' },
    { id: 't_a_bleed',         name: 'Bleed',         tags: ['offensive'], range: { min: 5, max: 15 }, description: 'Bleeds enemies for {value}% over 5s.' },
    { id: 't_a_shock',         name: 'Shock',         tags: ['elemental'], range: { min: 5, max: 15 }, description: 'Shocked enemies take {value}% extra damage from all sources for 3s.' },
    { id: 't_a_stun',          name: 'Stun',          tags: ['offensive'], range: { min: 5, max: 15 }, description: '{value}% chance to stun on hit.' },
    { id: 't_a_curse',         name: 'Curse',         tags: ['offensive'], range: { min: 10, max: 30 }, description: 'Cursed enemies take +{value}% damage from all sources for 5s.' },
    // ── Misc ──
    { id: 't_a_kill_buff',     name: 'Kill Buff',     tags: ['condition'], range: { min: 30, max: 80 }, description: '+{value}% damage for 5s after a kill.' },
    { id: 't_a_perfect_form',  name: 'Perfect Form',  tags: ['offensive','condition'], range: { min: 50, max: 150 }, description: '+{value}% damage at full HP.' },
    { id: 't_a_desperation',   name: 'Desperation',   tags: ['offensive','condition'], range: { min: 50, max: 150 }, description: '+{value}% damage when below 25% HP.' },
    { id: 't_a_glass_cannon',  name: 'Glass Cannon',  tags: ['glass-cannon'], range: { min: 50, max: 150 }, description: '+{value}% damage. Take {value/4}% recoil.' },
    { id: 't_a_realm_scale',   name: 'Realm Scaling', tags: ['realm-scale'], range: { min: 5, max: 15 }, description: '+{value}% damage per major realm.' },
    { id: 't_a_artefact_sync', name: 'Artefact Sync', tags: ['offensive','condition'], range: { min: 5, max: 15 }, description: '+{value}% damage per equipped artefact.' },
    { id: 't_a_pill_sync',     name: 'Pill Sync',     tags: ['offensive','condition'], range: { min: 20, max: 50 }, description: '+{value}% damage per active pill.' },
    { id: 't_a_law_resonance', name: 'Law Resonance', tags: ['offensive'], range: { min: 30, max: 80 }, description: 'Damage scales with law cultivation speed.' },
  ],

  Heal: [
    { id: 't_h_potent',        name: 'Potent',        tags: ['sustain'], range: { min: 30, max: 80 }, description: '+{value}% healing.' },
    { id: 't_h_overflow',      name: 'Overflow',      tags: ['sustain'], range: { min: 10, max: 30 }, description: 'Can overheal up to +{value}% max HP.' },
    { id: 't_h_swift',         name: 'Swift',         tags: ['speed'], range: { min: 20, max: 50 }, description: 'Cooldown -{value}%.' },
    { id: 't_h_emergency',     name: 'Emergency',     tags: ['sustain','condition'], range: { min: 50, max: 150 }, description: '+{value}% healing if HP below 30%.' },
    { id: 't_h_burst',         name: 'Burst Heal',    tags: ['sustain'], range: { min: 30, max: 80 }, description: 'Heal +{value}% but doubles cooldown.' },
    { id: 't_h_regen',         name: 'Regen Field',   tags: ['sustain'], range: { min: 5, max: 15 }, description: 'Add +{value}% HP/s for 10s after cast.' },
    { id: 't_h_purify',        name: 'Purify',        tags: ['sustain'], range: { min: 1, max: 1 }, description: 'Removes all debuffs on cast.' },
    { id: 't_h_qi_restore',    name: 'Qi Restore',    tags: ['sustain'], range: { min: 5, max: 15 }, description: 'Also restores {value}% qi.' },
    { id: 't_h_combat_meditation', name: 'Combat Meditation', tags: ['qi-glutton'], range: { min: 30, max: 80 }, description: 'Healing also grants +{value}% qi.' },
    { id: 't_h_blood_pact',    name: 'Blood Pact',    tags: ['glass-cannon'], range: { min: 50, max: 150 }, description: '+{value}% healing. Lose {value/4}% on cast.' },
    { id: 't_h_shield',        name: 'Holy Shield',   tags: ['tank'], range: { min: 10, max: 30 }, description: 'Cast also grants +{value}% defense for 5s.' },
    { id: 't_h_inner_peace',   name: 'Inner Peace',   tags: ['speed'], range: { min: 5, max: 15 }, description: 'Reduces all cooldowns by {value}% on cast.' },
    { id: 't_h_lifebloom',     name: 'Lifebloom',     tags: ['sustain'], range: { min: 1, max: 5 }, description: 'Heal {value}% per second for 10s.' },
    { id: 't_h_phoenix',       name: 'Phoenix',       tags: ['sustain'], range: { min: 30, max: 80 }, description: 'On lethal damage, heal {value}% HP. 60s CD.' },
    { id: 't_h_renewal',       name: 'Renewal',       tags: ['sustain'], range: { min: 5, max: 15 }, description: '+{value}% healing per missing 10% HP.' },
    { id: 't_h_pure_essence',  name: 'Pure Essence',  tags: ['sustain'], range: { min: 30, max: 80 }, description: 'Healing scales with Essence stat.' },
    { id: 't_h_blood_offering',name: 'Blood Offering',tags: ['offensive'], range: { min: 50, max: 150 }, description: 'Healing instead deals damage equal to amount.' },
    { id: 't_h_oversoul',      name: 'Oversoul',      tags: ['soul'], range: { min: 30, max: 80 }, description: 'Healing also restores +{value}% Soul stat for 10s.' },
    { id: 't_h_eternal_well',  name: 'Eternal Well',  tags: ['sustain'], range: { min: 5, max: 15 }, description: 'Subsequent heals within 5s are +{value}% stronger.' },
    { id: 't_h_no_cd',         name: 'No Cooldown',   tags: ['speed'], range: { min: 5, max: 15 }, description: '{value}% chance to not consume cooldown.' },
    { id: 't_h_realm_heal',    name: 'Realm Healing', tags: ['realm-scale'], range: { min: 5, max: 15 }, description: '+{value}% healing per major realm.' },
    { id: 't_h_qi_burn',       name: 'Qi Burn Heal',  tags: ['conversion'], range: { min: 5, max: 15 }, description: 'Spends 5% qi for +{value}% bonus healing.' },
    { id: 't_h_critical_heal', name: 'Critical Heal', tags: ['crit'], range: { min: 30, max: 80 }, description: '{value}% chance to heal twice.' },
    { id: 't_h_aoe_heal',      name: 'AoE Heal',      tags: ['sustain'], range: { min: 30, max: 80 }, description: 'Also heals nearby allies (future feature).' },
    { id: 't_h_pill_sync_heal',name: 'Pill Sync',     tags: ['utility'], range: { min: 20, max: 50 }, description: '+{value}% healing per active pill.' },
    { id: 't_h_meditation',    name: 'Meditation',    tags: ['qi-glutton'], range: { min: 30, max: 80 }, description: 'On cast, gain +{value}% qi/s for 10s.' },
    { id: 't_h_focus_mind',    name: 'Focus Mind',    tags: ['offensive'], range: { min: 30, max: 80 }, description: 'After heal, +{value}% damage for 5s.' },
    { id: 't_h_iron_skin',     name: 'Iron Skin',     tags: ['tank'], range: { min: 30, max: 80 }, description: 'After heal, +{value}% defense for 5s.' },
    { id: 't_h_swift_recovery',name: 'Swift Recovery',tags: ['speed'], range: { min: 1, max: 4 }, description: 'Reduce other cooldowns by {value}s on cast.' },
    { id: 't_h_perfect_heal',  name: 'Perfect Heal',  tags: ['sustain'], range: { min: 100, max: 300 }, description: 'First heal each combat is {value}% stronger.' },
  ],

  Defend: [
    { id: 't_d_aegis',         name: 'Aegis',         tags: ['tank'], range: { min: 30, max: 80 }, description: 'Defense bonus +{value}%.' },
    { id: 't_d_iron_will',     name: 'Iron Will',     tags: ['tank'], range: { min: 5, max: 15 }, description: '+{value}% extra duration.' },
    { id: 't_d_reflect',       name: 'Reflect',       tags: ['offensive','tank'], range: { min: 10, max: 30 }, description: 'Reflect {value}% of damage taken.' },
    { id: 't_d_counter',       name: 'Counter',       tags: ['offensive','tank'], range: { min: 30, max: 80 }, description: 'After being hit, deal {value}% damage back.' },
    { id: 't_d_stalwart',      name: 'Stalwart',      tags: ['tank'], range: { min: 30, max: 80 }, description: 'Cannot be reduced below 1 HP for {value/10}s.' },
    { id: 't_d_thorns',        name: 'Thorns',        tags: ['offensive'], range: { min: 5, max: 15 }, description: 'Attackers take {value}% recoil.' },
    { id: 't_d_phalanx',       name: 'Phalanx',       tags: ['tank'], range: { min: 5, max: 15 }, description: '+{value}% defense per nearby ally.' },
    { id: 't_d_ironclad',      name: 'Ironclad',      tags: ['tank'], range: { min: 1, max: 5 }, description: 'Each hit absorbed extends duration by {value}s.' },
    { id: 't_d_swift_def',     name: 'Swift Defense', tags: ['speed'], range: { min: 20, max: 50 }, description: 'Cooldown -{value}%.' },
    { id: 't_d_blood_shield',  name: 'Blood Shield',  tags: ['sustain'], range: { min: 5, max: 15 }, description: 'Heal {value}% of blocked damage.' },
    { id: 't_d_qi_shield',     name: 'Qi Shield',     tags: ['sustain'], range: { min: 5, max: 15 }, description: 'Convert blocked damage to qi (max {value}%).' },
    { id: 't_d_perfect_block', name: 'Perfect Block', tags: ['tank'], range: { min: 5, max: 15 }, description: '{value}% chance to fully block an attack.' },
    { id: 't_d_offensive',     name: 'Offensive Stance', tags: ['offensive','tank'], range: { min: 20, max: 60 }, description: 'While active, +{value}% damage.' },
    { id: 't_d_endurance',     name: 'Endurance',     tags: ['tank','sustain'], range: { min: 1, max: 5 }, description: '+{value}% HP/s while active.' },
    { id: 't_d_meditation',    name: 'Meditation',    tags: ['qi-glutton'], range: { min: 30, max: 80 }, description: 'While active, +{value}% qi gain.' },
    { id: 't_d_realm_def',     name: 'Realm Defense', tags: ['realm-scale'], range: { min: 5, max: 15 }, description: '+{value}% defense per realm.' },
    { id: 't_d_immovable',     name: 'Immovable',     tags: ['tank'], range: { min: 30, max: 80 }, description: 'Cannot be moved or stunned. +{value}% defense.' },
    { id: 't_d_share',         name: 'Share Pain',    tags: ['offensive'], range: { min: 30, max: 80 }, description: 'Distribute {value}% of damage to attackers.' },
    { id: 't_d_phase',         name: 'Phase Defense', tags: ['tank'], range: { min: 5, max: 15 }, description: '+{value}% chance to phase through attacks.' },
    { id: 't_d_resilient',     name: 'Resilient',     tags: ['tank','condition'], range: { min: 30, max: 80 }, description: '+{value}% defense if HP above 80%.' },
  ],

  Dodge: [
    { id: 't_dg_swift',        name: 'Swift',         tags: ['speed'], range: { min: 5, max: 15 }, description: '+{value}% dodge chance.' },
    { id: 't_dg_phase',        name: 'Phase',         tags: ['speed'], range: { min: 5, max: 15 }, description: 'Phase through {value} attacks.' },
    { id: 't_dg_after_dmg',    name: 'Vengeance',     tags: ['offensive'], range: { min: 30, max: 80 }, description: 'After dodge, next attack +{value}% damage.' },
    { id: 't_dg_after_heal',   name: 'Recovery',      tags: ['sustain'], range: { min: 5, max: 15 }, description: 'After dodge, heal {value}% HP.' },
    { id: 't_dg_after_cd',     name: 'Reset',         tags: ['speed'], range: { min: 1, max: 5 }, description: 'After dodge, reduce {value} cooldowns by 1s.' },
    { id: 't_dg_chain',        name: 'Chain Dodge',   tags: ['speed'], range: { min: 5, max: 15 }, description: 'Each successful dodge +{value}% next dodge chance.' },
    { id: 't_dg_phantom',      name: 'Phantom',       tags: ['speed'], range: { min: 5, max: 15 }, description: 'Spawn afterimage that distracts enemies.' },
    { id: 't_dg_blink',        name: 'Blink',         tags: ['speed'], range: { min: 5, max: 15 }, description: 'Dodge teleports you behind enemy.' },
    { id: 't_dg_perfect',      name: 'Perfect Dodge', tags: ['speed','crit'], range: { min: 30, max: 80 }, description: 'Perfect dodge guarantees crit on next attack.' },
    { id: 't_dg_eternal',      name: 'Eternal Step',  tags: ['speed'], range: { min: 1, max: 4 }, description: '+{value}% chance for dodge to not consume cooldown.' },
    { id: 't_dg_qi_step',      name: 'Qi Step',       tags: ['qi-glutton'], range: { min: 5, max: 15 }, description: 'Each dodge restores {value}% qi.' },
    { id: 't_dg_assassin',     name: 'Assassin',      tags: ['offensive'], range: { min: 50, max: 150 }, description: 'After dodge, +{value}% damage for 3s.' },
    { id: 't_dg_safe',         name: 'Safe Step',     tags: ['tank'], range: { min: 30, max: 80 }, description: 'After dodge, +{value}% defense for 3s.' },
    { id: 't_dg_speedy_step',  name: 'Speedy Step',   tags: ['speed'], range: { min: 5, max: 15 }, description: 'After dodge, -{value}% cooldown for 3s.' },
    { id: 't_dg_realm_dodge',  name: 'Realm Dodge',   tags: ['realm-scale'], range: { min: 5, max: 15 }, description: '+{value}% dodge chance per realm.' },
    { id: 't_dg_combo',        name: 'Combo Dodge',   tags: ['offensive','condition'], range: { min: 5, max: 15 }, description: '+{value}% damage per dodge in last 5s.' },
    { id: 't_dg_eternal_phase',name: 'Eternal Phase', tags: ['speed','condition'], range: { min: 1, max: 5 }, description: '{value}% chance dodge lasts 1s longer.' },
    { id: 't_dg_lucky',        name: 'Lucky Step',    tags: ['utility'], range: { min: 5, max: 15 }, description: 'After dodge, next loot is +{value}% better.' },
    { id: 't_dg_void_step',    name: 'Void Step',     tags: ['offensive'], range: { min: 5, max: 15 }, description: 'After dodge, next attack ignores {value}% defense.' },
    { id: 't_dg_mirror',       name: 'Mirror Step',   tags: ['offensive','condition'], range: { min: 30, max: 80 }, description: 'After dodge, copy attack is mirrored back.' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get all law uniques matching a tag. */
export function lawUniquesByTag(tag) {
  return LAW_UNIQUES.filter(u => u.tags.includes(tag));
}

/** Get all artefact uniques for a slot. */
export function artefactUniquesBySlot(slot) {
  return ARTEFACT_UNIQUES.filter(u => u.slot === slot);
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
  laws: LAW_UNIQUES.length,
  artefacts: ARTEFACT_UNIQUES.length,
  techniques: Object.values(TECHNIQUE_UNIQUES).reduce((s, arr) => s + arr.length, 0),
  total() {
    return this.laws + this.artefacts + this.techniques;
  },
};
