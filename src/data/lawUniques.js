/**
 * lawUniques.js — All 128 Law unique modifiers as structured effect data.
 *
 * Laws have exactly one unique modifier per unlocked tier:
 *   - Iron law:         1 unique  (Iron tier)
 *   - Bronze law:       2 uniques (Iron + Bronze)
 *   - Silver law:       3 uniques (Iron + Bronze + Silver)
 *   - Gold law:         4 uniques
 *   - Transcendent law: 5 uniques
 *
 * Uniques are evaluated by `src/systems/lawEngine.js` which merges their
 * effects into the stat computation, combat event pipeline, cultivation
 * tick, and UI gating.
 *
 * ── Effect schema ────────────────────────────────────────────────────────
 *
 *   STAT       { kind: 'stat', stat, mod, value, condition? }
 *              stat = 'qi_speed' | 'physical_damage' | 'health' | ...
 *              mod  = 'flat' | 'increased' | 'more' | 'less' | 'reduced'
 *              value = number (fixed) | 'rolled' (use the unique's rolled value)
 *              condition = { type, ... } — optional predicate
 *
 *   TRIGGER    { kind: 'trigger', event, action }
 *              event  = 'on_kill' | 'on_dodge' | 'on_hit_taken' | 'on_crit' |
 *                       'on_first_attack' | 'on_cooldown_reset' | 'on_combat_start' |
 *                       'on_pill_consumed' | 'tick_sec' | 'lethal_damage'
 *              action = { type, value?, ... } — see ACTIONS below
 *
 *   CONVERSION { kind: 'conversion', from, to, pct }
 *              "pct% of {from} counts as {to}"
 *
 *   REGEN      { kind: 'regen', resource, perSec, condition? }
 *              resource = 'hp' | 'qi'
 *              perSec   = number (fraction of max per second)
 *
 *   SPECIAL    { kind: 'special', flag, value? }
 *              flag = 'cannot_dodge' | 'cannot_heal' | 'cannot_techniques' |
 *                     'cannot_rings' | 'cannot_pills' | 'hp_cap_pct' |
 *                     'only_elemental_techniques' | 'damage_is_wild' |
 *                     'random_stat_minute'
 *
 *   STACK      { kind: 'stack', stat, mod, perStack, max, gainOn, resetOn? }
 *              Builds stacks from events; each stack grants (perStack) of the
 *              effect. resetOn clears all stacks.
 *
 *   ONCE_PER_FIGHT { kind: 'once', trigger, action }
 *              trigger = same as TRIGGER events; action fires once per combat.
 *
 * ── Condition types (condition.type) ─────────────────────────────────────
 *
 *   hp_below_pct {value}        hp_above_pct {value}     hp_full
 *   first_attack                no_damage_for_sec {sec}  no_technique_for_sec {sec}
 *   recent_kill_sec {sec}       recent_dodge_sec {sec}   recent_crit_sec {sec}
 *   in_combat                   out_of_combat
 *   body_gt_soul                soul_gt_body             body_gt_essence_plus_soul
 *   realm_below {index}         realm_above {index}      at_peak_realm
 *   no_artefacts                no_rings                 all_tech_elements_match_law
 *   enemy_hp_below_pct {value}  enemy_hp_above_pct {value}
 *   combat_time_below {sec}     combat_time_above {sec}
 *   tri_harmony_10              single_attack_tech       focusing (hold-to-boost)
 *   no_pills_active             per_active_pill          per_realm
 *   per_realm_above_saint       missing_hp_pct           consecutive_attacks {n}
 *   per_unique_tech_element     all_artefacts_equipped
 *
 * ── Action types (trigger.action.type) ───────────────────────────────────
 *
 *   heal_pct {value}            // heal X% of max HP
 *   heal_flat {value}           // heal flat X HP
 *   restore_qi_pct {value}
 *   grant_qi_flat {value}
 *   self_damage_pct {value}
 *   refund_all_cooldowns
 *   reduce_cooldowns_pct {value}
 *   reduce_cooldowns_flat {sec}
 *   survive_1hp                 // Immortal Will
 *   restore_full_hp             // Phoenix (full heal)
 *   chain_kill                  // damage spreads on kill
 *   increase_buff_duration_pct {value}
 *
 * ── Stat names ───────────────────────────────────────────────────────────
 *
 *   Primary:     essence, soul, body
 *   Derived:     health, defense, elemental_defense, soul_toughness
 *   Damage:      physical_damage, elemental_damage, psychic_damage, damage_all
 *   Combat:      crit_chance, crit_damage, dodge_chance, miss_chance, lifesteal
 *   Activity:    qi_speed, qi_cap, harvest_speed, mining_speed, harvest_luck,
 *                mining_luck, pill_effect, pill_duration, offline_qi,
 *                crafting_cost, transmutation_cost, all_stats, all_loot
 *   Resistance:  phys_dmg_taken, elem_dmg_taken, dmg_taken_all
 *
 *   Special "stat" tokens used by unique effects:
 *     - 'damage_all'        — applies to ALL damage dealt
 *     - 'all_stats'         — applies to essence + soul + body simultaneously
 *     - 'all_elem_defenses' — all elemental resistances at once
 */

import { MOD } from './stats';

// ─── Helpers for writing effects ─────────────────────────────────────────────

const rolled = 'rolled';

const stat  = (s, m, v, cond) => ({ kind: 'stat', stat: s, mod: m, value: v, ...(cond && { condition: cond }) });
const trig  = (event, action) => ({ kind: 'trigger', event, action });
const conv  = (from, to, pct) => ({ kind: 'conversion', from, to, pct });
const regen = (resource, perSec, cond) => ({ kind: 'regen', resource, perSec, ...(cond && { condition: cond }) });
const spec  = (flag, value) => ({ kind: 'special', flag, ...(value !== undefined && { value }) });
const stack = (s, m, perStack, max, gainOn, resetOn) => ({ kind: 'stack', stat: s, mod: m, perStack, max, gainOn, ...(resetOn && { resetOn }) });
const once  = (trigger, action) => ({ kind: 'once', trigger, action });

// Condition builders
const cHpBelow   = (v) => ({ type: 'hp_below_pct', value: v });
const cHpAbove   = (v) => ({ type: 'hp_above_pct', value: v });
const cHpFull    = () => ({ type: 'hp_full' });
const cEnemyHpBelow = (v) => ({ type: 'enemy_hp_below_pct', value: v });
const cEnemyHpAbove = (v) => ({ type: 'enemy_hp_above_pct', value: v });
const cNoDmgFor  = (sec) => ({ type: 'no_damage_for_sec', sec });
const cNoTechFor = (sec) => ({ type: 'no_technique_for_sec', sec });
const cFirstAttack = () => ({ type: 'first_attack' });
const cRecentKill  = (sec) => ({ type: 'recent_kill_sec', sec });
const cRecentDodge = (sec) => ({ type: 'recent_dodge_sec', sec });
const cInCombat    = () => ({ type: 'in_combat' });
const cRealmAbove  = (idx) => ({ type: 'realm_above', index: idx });
const cRealmBelow  = (idx) => ({ type: 'realm_below', index: idx });
const cAtPeak      = () => ({ type: 'at_peak_realm' });
const cBodyGtSoul  = () => ({ type: 'body_gt_soul' });
const cSoulGtBody  = () => ({ type: 'soul_gt_body' });
const cBodyGtEsSl  = () => ({ type: 'body_gt_essence_plus_soul' });
const cTriHarmony  = () => ({ type: 'tri_harmony_10' });
const cNoArtefacts = () => ({ type: 'no_artefacts' });
const cNoRings     = () => ({ type: 'no_rings' });
const cAllTechMatchLaw = () => ({ type: 'all_tech_elements_match_law' });
const cCombatAbove = (sec) => ({ type: 'combat_time_above', sec });
const cCombatBelow = (sec) => ({ type: 'combat_time_below', sec });
const cFocusing    = () => ({ type: 'focusing' });
const cEnemyJustSpawned = (sec) => ({ type: 'enemy_just_spawned', sec });

// Realm indices (from REALMS array)
const SAINT_INDEX = 24;
const PEAK_INDEX  = 46;

// ─── Pools ───────────────────────────────────────────────────────────────────
// Every unique is tagged with exactly one `pool`. A law rolls uniques only
// from the pools listed in its `types` array plus the `general` pool, which
// every law can draw from regardless of type.
//
// The 9 typed pools are anchored to the three primary stats (Body, Essence,
// Soul) for balance:
//   Body    → physical, sword, fist
//   Essence → fire, water, earth
//   Soul    → spirit, void, dao
// Uniques with no clear thematic fit default to `general` — the catch-all.

export const LAW_UNIQUE_POOLS = [
  'physical', 'sword', 'fist',
  'fire', 'water', 'earth',
  'spirit', 'void', 'dao',
  'general',
];

// ─── Damage categories ───────────────────────────────────────────────────────
// The 9 typed pools double as damage types. Each type folds into exactly one
// of the three base damage categories, mirroring its primary-stat anchor:
//   Body anchors    → physical_damage
//   Essence anchors → elemental_damage
//   Soul anchors    → psychic_damage
// A law's damage bucket(s) are derived from its `types` array — see
// calcDamage() in src/data/techniques.js for how the split is applied.
export const TYPE_TO_DAMAGE_CATEGORY = {
  physical: 'physical', sword: 'physical', fist: 'physical',
  fire:     'elemental', water: 'elemental', earth: 'elemental',
  spirit:   'psychic',   void:  'psychic',   dao:   'psychic',
};

/**
 * Map a single law-type/damage-type to one of 'physical' | 'elemental' |
 * 'psychic'. Returns null for unknown / non-typed values (e.g. 'general').
 */
export function damageCategoryForType(type) {
  return TYPE_TO_DAMAGE_CATEGORY[type] ?? null;
}

// ─── Unique modifier pool ────────────────────────────────────────────────────

export const LAW_UNIQUES = [

  // ── Qi-Glutton / cultivation focus ──
  { id: 'l_limitless_vessel',  range: { min: 80,  max: 150 }, description: (v) => `${v}% increased Qi Cultivation Speed. 50% less Combat Damage.`,
    effects: [stat('qi_speed', MOD.INCREASED, rolled), stat('damage_all', MOD.MORE, 0.5)] },

  { id: 'l_patient_mountain',  range: { min: 100, max: 200 }, description: (v) => `${v}% increased Qi Cultivation Speed. Cannot use techniques for 5s after combat starts.`,
    effects: [stat('qi_speed', MOD.INCREASED, rolled), spec('delay_techniques_sec', 5)] },

  { id: 'l_dao_hunger',        range: { min: 5,   max: 15  }, description: (v) => `${v}% increased Qi Cultivation Speed per major realm.`,
    effects: [stat('qi_speed', MOD.INCREASED, 'rolled_per_major_realm')] },

  { id: 'l_breath_of_eternity',range: { min: 40,  max: 80  }, description: (v) => `${v}% increased Qi Cultivation Speed per active Pill.`,
    effects: [stat('qi_speed', MOD.INCREASED, 'rolled_per_active_pill')] },

  { id: 'l_qi_spring',         range: { min: 5,   max: 15  }, description: (v) => `${v}% more Qi gained while idle in combat.`,
    effects: [stat('qi_speed', MOD.MORE, rolled, { type: 'in_combat_idle' })] },

  { id: 'l_meditation_path',   range: { min: 30,  max: 80  }, description: (v) => `${v}% increased Qi Gain after 20 minutes without combat.`,
    effects: [stat('qi_speed', MOD.INCREASED, rolled, { type: 'no_combat_for_sec', sec: 1200 })] },

  { id: 'l_seasoned_cultivator', range: { min: 100, max: 250 }, description: (v) => `${v}% increased Qi from Offline Earnings.`,
    effects: [stat('offline_qi', MOD.INCREASED, rolled)] },

  { id: 'l_eternal_breath',    range: { min: 50,  max: 120 }, description: (v) => `${v}% increased Cultivation Speed. Cannot equip techniques.`,
    effects: [stat('qi_speed', MOD.INCREASED, rolled), spec('cannot_techniques')] },

  { id: 'l_focused_cultivation', range: { min: 50, max: 90 }, description: (v) => `${v}% increased Cultivation Speed while focusing, ${v}% reduced while not.`,
    effects: [
      stat('qi_speed', MOD.INCREASED, rolled, cFocusing()),
      stat('qi_speed', MOD.REDUCED,  rolled, { type: 'not_focusing' }),
    ] },

  // ── Body / tank ──
  { id: 'l_diamond_body',      range: { min: 30,  max: 60  }, description: (v) => `${v}% increased Body. 50% less Soul.`,
    effects: [stat('body', MOD.INCREASED, rolled), stat('soul', MOD.MORE, 0.5)] },

  { id: 'l_iron_marrow',       range: { min: 30,  max: 80  }, description: (v) => `${v}% increased Health and Defense. 30% less Qi Cultivation Speed.`,
    effects: [stat('health', MOD.INCREASED, rolled), stat('defense', MOD.INCREASED, rolled), stat('qi_speed', MOD.MORE, 0.7)] },

  { id: 'l_mountain_stance',   range: { min: 50,  max: 120 }, description: (v) => `${v}% increased Health and Defense. Cannot dodge.`,
    effects: [stat('health', MOD.INCREASED, rolled), stat('defense', MOD.INCREASED, rolled), spec('cannot_dodge')] },

  { id: 'l_living_fortress',   range: { min: 80,  max: 200 }, description: (v) => `${v}% increased Defense. 25% increased Technique Cooldowns.`,
    effects: [stat('defense', MOD.INCREASED, rolled), stat('cooldown_duration', MOD.INCREASED, 0.25)] },

  { id: 'l_titan_blood',       range: { min: 8,   max: 20  }, description: (v) => `${v}% increased Maximum Health per major realm.`,
    effects: [stat('health', MOD.INCREASED, 'rolled_per_major_realm')] },

  { id: 'l_reincarnated_titan',range: { min: 100, max: 250 }, description: (v) => `${v}% increased Health. Lose 1 Technique Slot.`,
    effects: [stat('health', MOD.INCREASED, rolled), spec('lose_technique_slot', 1)] },

  { id: 'l_warrior_pulse',     range: { min: 20,  max: 60  }, description: (v) => `${v}% increased Damage while Body > Essence + Soul.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cBodyGtEsSl())] },

  // ── Soul ──
  { id: 'l_spirit_sea',        range: { min: 60,  max: 140 }, description: (v) => `${v}% increased Soul. 50% less Body.`,
    effects: [stat('soul', MOD.INCREASED, rolled), stat('body', MOD.MORE, 0.5)] },

  { id: 'l_mental_blade',      range: { min: 80,  max: 100 }, description: (v) => `${v}% increased Psychic Damage. 50% less Physical Damage.`,
    effects: [stat('psychic_damage', MOD.INCREASED, rolled), stat('physical_damage', MOD.MORE, 0.5)] },

  { id: 'l_ethereal_form',     range: { min: 30,  max: 70  }, description: (v) => `${v}% less Physical Damage Taken. ${v}% more Elemental Damage Taken.`,
    effects: [stat('phys_dmg_taken', MOD.MORE, 'rolled_as_less'), stat('elem_dmg_taken', MOD.MORE, 'rolled_as_more')] },

  { id: 'l_dream_walker',      range: { min: 40,  max: 100 }, description: (v) => `${v}% increased Cultivation Speed while in combat.`,
    effects: [stat('qi_speed', MOD.INCREASED, rolled, cInCombat())] },

  { id: 'l_soul_pierce',       range: { min: 20,  max: 50  }, description: (v) => `Attacks ignore ${v}% of enemy Soul Toughness.`,
    effects: [stat('ignore_enemy_soul_toughness', MOD.FLAT, rolled)] },

  { id: 'l_astral_projection', range: { min: 5,   max: 20  }, description: (v) => `${v}% chance for Psychic Attacks to deal Triple Damage.`,
    effects: [stat('psychic_triple_chance', MOD.FLAT, rolled)] },

  { id: 'l_divine_consciousness', range: { min: 10, max: 25 }, description: (v) => `${v}% increased Soul per Saint+ realm level.`,
    effects: [stat('soul', MOD.INCREASED, 'rolled_per_realm_above_saint')] },

  { id: 'l_thoughtless_state', range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Damage while at full Health.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cHpFull())] },

  { id: 'l_inner_void',        range: { min: 40,  max: 90  }, description: (v) => `${v}% of Physical Damage converted to Psychic Damage.`,
    effects: [conv('physical_damage', 'psychic_damage', rolled)] },

  // ── Elemental ──
  { id: 'l_element_tyranny',   range: { min: 100, max: 250 }, description: (v) => `${v}% more Elemental Damage. Can only equip Elemental Techniques.`,
    effects: [stat('elemental_damage', MOD.MORE, 'rolled_as_mult'), spec('only_elemental_techniques')] },

  { id: 'l_volatile_chi',      range: { min: 80,  max: 180 }, description: (v) => `${v}% more Elemental Damage. ${v}% more Elemental Damage Taken.`,
    effects: [stat('elemental_damage', MOD.MORE, 'rolled_as_mult'), stat('elem_dmg_taken', MOD.MORE, 'rolled_as_mult')] },

  { id: 'l_element_conversion',range: { min: 40,  max: 100 }, description: (v) => `${v}% of Physical Damage converted to your Law's Element.`,
    effects: [conv('physical_damage', 'elemental_damage', rolled)] },

  { id: 'l_elemental_symphony',range: { min: 15,  max: 40  }, description: (v) => `${v}% increased Damage per unique element among equipped Techniques.`,
    effects: [stat('damage_all', MOD.INCREASED, 'rolled_per_unique_tech_element')] },

  { id: 'l_burning_path',      range: { min: 30,  max: 80  }, description: (v) => `(Fire Law) ${v}% increased Damage. 10% of overkill damage carries to next enemy.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, { type: 'law_element_is', value: 'Fire' }), spec('overkill_carry_pct', 10)] },

  { id: 'l_frozen_path',       range: { min: 30,  max: 80  }, description: (v) => `(Frost Law) ${v}% increased Damage. Frost techniques stun enemies for 1s.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, { type: 'law_element_is', value: 'Frost' }), spec('frost_stun_sec', 1)] },

  { id: 'l_lightning_path',    range: { min: 30,  max: 80  }, description: (v) => `(Lightning Law) ${v}% increased Damage. Damage is halved or doubled at random.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, { type: 'law_element_is', value: 'Lightning' }), spec('damage_is_wild')] },

  { id: 'l_void_path',         range: { min: 30,  max: 80  }, description: (v) => `(Void Law) ${v}% increased Damage. Attacks ignore 25% Defense.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, { type: 'law_element_is', value: 'Void' }), stat('ignore_enemy_defense_pct', MOD.FLAT, 25)] },

  { id: 'l_stone_path',        range: { min: 30,  max: 80  }, description: (v) => `(Stone Law) ${v}% increased Defense. Reflect 10% of Physical Damage.`,
    effects: [stat('defense', MOD.INCREASED, rolled, { type: 'law_element_is', value: 'Stone' }), stat('reflect_phys_pct', MOD.FLAT, 10)] },

  // ── Speed ──
  { id: 'l_quickened_steps',   range: { min: 25,  max: 40  }, description: (v) => `${v}% reduced Cooldowns. 25% less Maximum Health.`,
    effects: [stat('cooldown_duration', MOD.REDUCED, rolled), stat('health', MOD.MORE, 0.75)] },

  { id: 'l_lightning_reflexes',range: { min: 20,  max: 50  }, description: (v) => `${v}% increased Dodge Chance. 50% less Defense.`,
    effects: [stat('dodge_chance', MOD.INCREASED, rolled), stat('defense', MOD.MORE, 0.5)] },

  { id: 'l_hummingbird_heart', range: { min: 30,  max: 40  }, description: (v) => `${v}% reduced Cooldowns. 30% reduced Pill Duration.`,
    effects: [stat('cooldown_duration', MOD.REDUCED, rolled), stat('pill_duration', MOD.REDUCED, 0.3)] },

  { id: 'l_blink_path',        range: { min: 5,   max: 15  }, description: (v) => `Restore ${v}% Health on successful dodge.`,
    effects: [trig('on_dodge', { type: 'heal_pct', value: rolled })] },

  { id: 'l_perpetual_motion',  range: { min: 5,   max: 15  }, description: (v) => `${v}% increased Damage per second since combat started (caps at 100%).`,
    effects: [stack('damage_all', MOD.INCREASED, rolled, 20, 'tick_sec')] },

  { id: 'l_swallow_strike',    range: { min: 30,  max: 40  }, description: (v) => `${v}% reduced Attack Cooldowns. 25% less Damage.`,
    effects: [stat('cooldown_duration_attack', MOD.REDUCED, rolled), stat('damage_all', MOD.MORE, 0.75)] },

  { id: 'l_sonic_step',        range: { min: 20,  max: 60  }, description: (v) => `${v}% reduced Cooldowns for 2s after dodging.`,
    effects: [stat('cooldown_duration', MOD.REDUCED, rolled, cRecentDodge(2))] },

  { id: 'l_river_flow',        range: { min: 1,   max: 4   }, description: (v) => `Restore ${v}% Health per cooldown reset.`,
    effects: [trig('on_cooldown_reset', { type: 'heal_pct', value: rolled })] },

  { id: 'l_unyielding_pace',   range: { min: 30,  max: 70  }, description: (v) => `${v}% reduced Cooldowns while no Damage taken in last 5s.`,
    effects: [stat('cooldown_duration', MOD.REDUCED, rolled, cNoDmgFor(5))] },

  { id: 'l_blade_dance',       range: { min: 5,   max: 15  }, description: (v) => `Each consecutive attack deals ${v}% more Damage (max 10 stacks, resets on hit taken).`,
    effects: [stack('damage_all', MOD.MORE, rolled, 10, 'on_hit_dealt', 'on_hit_taken')] },

  // ── Tank ──
  { id: 'l_unmovable_mountain',range: { min: 30,  max: 50  }, description: (v) => `${v}% less Damage Taken. ${v}% less Damage Dealt.`,
    effects: [stat('dmg_taken_all', MOD.MORE, 'rolled_as_less'), stat('damage_all', MOD.MORE, 'rolled_as_less')] },

  { id: 'l_reflecting_pool',   range: { min: 15,  max: 40  }, description: (v) => `Reflect ${v}% of Damage Taken to attacker.`,
    effects: [stat('reflect_pct', MOD.FLAT, rolled)] },

  { id: 'l_living_shield',     range: { min: 5,   max: 15  }, description: (v) => `${v}% of Maximum Health added to Defense.`,
    effects: [conv('health', 'defense', rolled)] },

  { id: 'l_bonecage',          range: { min: 50,  max: 70  }, description: (v) => `${v}% increased Defense. Cannot dodge.`,
    effects: [stat('defense', MOD.INCREASED, rolled), spec('cannot_dodge')] },

  { id: 'l_shell_path',        range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Defense during first 2s of combat.`,
    effects: [stat('defense', MOD.INCREASED, rolled, cCombatBelow(2))] },

  { id: 'l_immortal_will',     range: { min: 0,   max: 0   }, description: () => `Survive lethal damage with 1 Health. Once per fight.`,
    effects: [once({ event: 'lethal_damage' }, { type: 'survive_1hp' })] },

  { id: 'l_passive_resistance',range: { min: 20,  max: 50  }, description: (v) => `${v}% increased to all Elemental Defenses.`,
    effects: [stat('all_elem_defenses', MOD.INCREASED, rolled)] },

  { id: 'l_perfect_form_tank', range: { min: 5,   max: 12  }, description: (v) => `${v}% increased Defense per major realm.`,
    effects: [stat('defense', MOD.INCREASED, 'rolled_per_major_realm')] },

  { id: 'l_stalwart_oath',     range: { min: 10,  max: 30  }, description: (v) => `Regenerate ${v}% Maximum Health per second.`,
    effects: [regen('hp', 'rolled_as_pct')] },

  // ── Glass Cannon ──
  { id: 'l_razors_edge',       range: { min: 60,  max: 100 }, description: (v) => `${v}% increased Damage. 50% less Defense.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled), stat('defense', MOD.MORE, 0.5)] },

  { id: 'l_all_in',            range: { min: 50,  max: 100 }, description: (v) => `${v}% increased Damage. Cannot exceed 50% Maximum Health.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled), spec('hp_cap_pct', 50)] },

  { id: 'l_blood_for_power',   range: { min: 20,  max: 40  }, description: (v) => `${v}% increased Damage per 10% missing Health.`,
    effects: [stat('damage_all', MOD.INCREASED, 'rolled_per_10pct_missing_hp')] },

  { id: 'l_overcharged',       range: { min: 40,  max: 100 }, description: (v) => `${v}% increased Damage. Each attack drains 10% of current Health.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled), trig('on_hit_dealt', { type: 'self_damage_pct_current', value: 0.1 })] },

  { id: 'l_unstable_essence',  range: { min: 60,  max: 140 }, description: (v) => `${v}% increased Elemental Damage. ${v}/2% chance to self-damage on hit.`,
    effects: [stat('elemental_damage', MOD.INCREASED, rolled), trig('on_hit_dealt', { type: 'chance_self_damage_pct', chance: 'rolled_half_pct', value: 0.05 })] },

  { id: 'l_executioner_path',  range: { min: 100, max: 200 }, description: (v) => `${v}% increased Damage against enemies below 50% Health.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cEnemyHpBelow(50))] },

  { id: 'l_blade_of_chaos',    range: { min: 30,  max: 80  }, description: (v) => `${v}% increased Crit Damage. Crits cost 5% Health.`,
    effects: [stat('crit_damage', MOD.INCREASED, rolled), trig('on_crit', { type: 'self_damage_pct_max', value: 0.05 })] },

  { id: 'l_sacred_offering',   range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Damage while below 25% Health.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cHpBelow(25))] },

  { id: 'l_nuclear_path',      range: { min: 100, max: 200 }, description: (v) => `${v}% increased Damage. Cannot heal.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled), spec('cannot_heal')] },

  // ── Sustain ──
  { id: 'l_eternal_spring',    range: { min: 50,  max: 120 }, description: (v) => `${v}% increased Healing Received. 25% less Damage Dealt.`,
    effects: [stat('healing_received', MOD.INCREASED, rolled), stat('damage_all', MOD.MORE, 0.75)] },

  { id: 'l_vampiric_path',     range: { min: 5,   max: 20  }, description: (v) => `${v}% of Damage Dealt restored as Health.`,
    effects: [stat('lifesteal', MOD.FLAT, rolled)] },

  { id: 'l_self_renewal',      range: { min: 10,  max: 20  }, description: (v) => `${v}% of Maximum Health regenerated per second.`,
    effects: [regen('hp', 'rolled_as_pct')] },

  { id: 'l_phoenix_path',      range: { min: 20,  max: 30  }, description: (v) => `Restore ${v}% Health if dropped below 50%. Once per fight.`,
    effects: [once({ event: 'hp_dropped_below_pct', value: 50 }, { type: 'heal_pct', value: rolled })] },

  { id: 'l_blood_pact',        range: { min: 20,  max: 60  }, description: (v) => `${v}% more Healing while below 50% Health.`,
    effects: [stat('healing_received', MOD.MORE, 'rolled_as_more', cHpBelow(50))] },

  { id: 'l_qi_circulation',    range: { min: 2,   max: 3   }, description: (v) => `${v}% of Maximum Health regenerated per second per active Pill.`,
    effects: [regen('hp', 'rolled_as_pct_per_pill')] },

  { id: 'l_undying_will',      range: { min: 30,  max: 70  }, description: (v) => `${v}% more Healing Effectiveness.`,
    effects: [stat('healing_received', MOD.MORE, 'rolled_as_more')] },

  // ── Crit / Lucky ──
  { id: 'l_lucky_star',        range: { min: 20,  max: 50  }, description: (v) => `${v}% increased Crit Chance. ${v}/2% chance to deal half damage.`,
    effects: [stat('crit_chance', MOD.INCREASED, rolled), spec('chance_half_damage_pct', 'rolled_half')] },

  { id: 'l_fortunes_favor',    range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Harvest and Mining Luck. 25% less Defense.`,
    effects: [stat('harvest_luck', MOD.INCREASED, rolled), stat('mining_luck', MOD.INCREASED, rolled), stat('defense', MOD.MORE, 0.75)] },

  { id: 'l_perfect_strike',    range: { min: 30,  max: 80  }, description: (v) => `Crits deal ${v}% more Damage.`,
    effects: [stat('crit_damage', MOD.INCREASED, rolled)] },

  { id: 'l_crit_storm',        range: { min: 20,  max: 60  }, description: (v) => `${v}% increased Crit Chance for 5s after a Crit.`,
    effects: [stat('crit_chance', MOD.INCREASED, rolled, { type: 'recent_crit_sec', sec: 5 })] },

  { id: 'l_executioner_eye',   range: { min: 30,  max: 80  }, description: (v) => `${v}% increased Crit Chance against enemies above 80% Health.`,
    effects: [stat('crit_chance', MOD.INCREASED, rolled, cEnemyHpAbove(80))] },

  { id: 'l_lethal_focus',      range: { min: 1,   max: 5   }, description: (v) => `${v}% increased Crit Chance per active Pill.`,
    effects: [stat('crit_chance', MOD.INCREASED, 'rolled_per_active_pill')] },

  { id: 'l_god_of_chance',     range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Crit Damage. ${v}/3% chance to miss.`,
    effects: [stat('crit_damage', MOD.INCREASED, rolled), stat('miss_chance', MOD.FLAT, 'rolled_third')] },

  { id: 'l_assassin_creed',    range: { min: 100, max: 200 }, description: (v) => `${v}% increased Crit Damage on first attack.`,
    effects: [stat('crit_damage', MOD.INCREASED, rolled, cFirstAttack())] },

  { id: 'l_blood_in_water',    range: { min: 5,   max: 15  }, description: (v) => `Crit Chance increased with missing Health %, up to ${v}%.`,
    effects: [stat('crit_chance', MOD.FLAT, 'rolled_scaled_by_missing_hp')] },

  // ── Conversion / Hybrid ──
  { id: 'l_body_to_soul',      range: { min: 30,  max: 80  }, description: (v) => `${v}% of Body counted as Soul.`,
    effects: [conv('body', 'soul', rolled)] },

  { id: 'l_soul_to_body',      range: { min: 30,  max: 80  }, description: (v) => `${v}% of Soul counted as Body.`,
    effects: [conv('soul', 'body', rolled)] },

  { id: 'l_tri_harmony',       range: { min: 20,  max: 40  }, description: (v) => `${v}% increased All Stats while Essence/Soul/Body are within 10% of each other.`,
    effects: [stat('all_stats', MOD.INCREASED, rolled, cTriHarmony())] },

  { id: 'l_qi_to_damage',      range: { min: 1,   max: 5   }, description: (v) => `${v}% of current Qi added to Damage per attack.`,
    effects: [stat('damage_all', MOD.FLAT, 'rolled_pct_current_qi')] },

  { id: 'l_essence_to_health', range: { min: 5,   max: 15  }, description: (v) => `${v}% of Essence converted to Maximum Health.`,
    effects: [conv('essence', 'health', rolled)] },

  { id: 'l_defense_to_damage', range: { min: 10,  max: 30  }, description: (v) => `${v}% of Defense added as flat Physical Damage.`,
    effects: [conv('defense', 'physical_damage', rolled)] },

  { id: 'l_dao_consumption',   range: { min: 5,   max: 10  }, description: (v) => `${v}% of Qi/sec converted to Health/sec.`,
    effects: [conv('qi_speed', 'hp_regen', rolled)] },

  // ── Realm-scaling ──
  { id: 'l_realm_ascension',   range: { min: 5,   max: 15  }, description: (v) => `${v}% increased Damage per major realm.`,
    effects: [stat('damage_all', MOD.INCREASED, 'rolled_per_major_realm')] },

  { id: 'l_late_bloomer',      range: { min: 10,  max: 30  }, description: (v) => `${v}% increased All Stats per realm above Saint.`,
    effects: [stat('all_stats', MOD.INCREASED, 'rolled_per_realm_above_saint')] },

  { id: 'l_slow_burn_realm',   range: { min: 1,   max: 2   }, description: (v) => `${v}% increased Qi per minute cultivating without breakthrough.`,
    effects: [stack('qi_speed', MOD.INCREASED, rolled, 120, 'tick_min', 'on_breakthrough')] },

  { id: 'l_path_of_kings',     range: { min: 100, max: 150 }, description: (v) => `${v}% increased All Stats at Peak realm.`,
    effects: [stat('all_stats', MOD.INCREASED, rolled, cAtPeak())] },

  { id: 'l_first_steps',       range: { min: 50,  max: 150 }, description: (v) => `${v}% increased All Stats while below Saint.`,
    effects: [stat('all_stats', MOD.INCREASED, rolled, cRealmBelow(SAINT_INDEX))] },

  { id: 'l_immortal_legacy',   range: { min: 5,   max: 15  }, description: (v) => `${v}% Lifesteal per realm above Saint.`,
    effects: [stat('lifesteal', MOD.FLAT, 'rolled_per_realm_above_saint')] },

  { id: 'l_eternal_pupil',     range: { min: 50,  max: 70  }, description: (v) => `${v}% increased Qi/sec per realm.`,
    effects: [stat('qi_speed', MOD.INCREASED, 'rolled_per_major_realm')] },

  { id: 'l_seekers_path',      range: { min: 3,   max: 5   }, description: (v) => `${v}% reduced Crafting Cost per realm.`,
    effects: [stat('crafting_cost', MOD.REDUCED, 'rolled_per_major_realm')] },

  // ── Conditional / trigger ──
  { id: 'l_predator_patience', range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Damage while no Damage taken in last 10s.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cNoDmgFor(10))] },

  { id: 'l_berserker_resolve', range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Damage while below 50% Health.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cHpBelow(50))] },

  { id: 'l_first_strike',      range: { min: 100, max: 300 }, description: (v) => `${v}% increased Damage on first attack after combat starts.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cFirstAttack())] },

  { id: 'l_last_stand',        range: { min: 100, max: 300 }, description: (v) => `${v}% increased Damage while below 25% Health.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cHpBelow(25))] },

  { id: 'l_calm_water',        range: { min: 80,  max: 100 }, description: (v) => `${v}% increased Defense while at full Health.`,
    effects: [stat('defense', MOD.INCREASED, rolled, cHpFull())] },

  { id: 'l_deadly_focus',      range: { min: 60,  max: 80  }, description: (v) => `${v}% increased Crit Chance for 3s after dodging.`,
    effects: [stat('crit_chance', MOD.INCREASED, rolled, cRecentDodge(3))] },

  { id: 'l_quiet_mind',        range: { min: 80,  max: 100 }, description: (v) => `${v}% more Healing Effectiveness if no Techniques used in last 3s.`,
    effects: [stat('healing_received', MOD.MORE, 'rolled_as_more', cNoTechFor(3))] },

  // ── Anti-synergy / cost ──
  { id: 'l_heavy_burden',      range: { min: 30,  max: 80  }, description: (v) => `${v}% increased All Stats. 50% increased Cooldowns.`,
    effects: [stat('all_stats', MOD.INCREASED, rolled), stat('cooldown_duration', MOD.INCREASED, 0.5)] },

  { id: 'l_reckless',          range: { min: 40,  max: 100 }, description: (v) => `${v}% increased Damage. ${v}% increased Damage Taken.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled), stat('dmg_taken_all', MOD.INCREASED, rolled)] },

  { id: 'l_chained_will',      range: { min: 50,  max: 100 }, description: (v) => `${v}% increased All Stats. Cannot consume Pills.`,
    effects: [stat('all_stats', MOD.INCREASED, rolled), spec('cannot_pills')] },

  { id: 'l_stubborn_path',     range: { min: 100, max: 200 }, description: (v) => `${v}% increased Damage. Cannot heal.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled), spec('cannot_heal')] },

  { id: 'l_cursed_inheritance',range: { min: 100, max: 300 }, description: (v) => `${v}% increased Crit Damage. 50% less Normal Damage.`,
    effects: [stat('crit_damage', MOD.INCREASED, rolled), stat('non_crit_damage', MOD.MORE, 0.5)] },

  { id: 'l_oath_of_silence',   range: { min: 30,  max: 80  }, description: (v) => `${v}% increased Qi Cultivation Speed. Cannot use Techniques in combat.`,
    effects: [stat('qi_speed', MOD.INCREASED, rolled), spec('cannot_techniques')] },

  { id: 'l_blood_chains',      range: { min: 50,  max: 100 }, description: (v) => `${v}% increased Defense. Cannot dodge.`,
    effects: [stat('defense', MOD.INCREASED, rolled), spec('cannot_dodge')] },

  { id: 'l_sealed_path',       range: { min: 50,  max: 100 }, description: (v) => `${v}% increased Body. Cannot equip rings.`,
    effects: [stat('body', MOD.INCREASED, rolled), spec('cannot_rings')] },

  { id: 'l_burdened_soul',     range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Soul. 50% reduced Pill Duration.`,
    effects: [stat('soul', MOD.INCREASED, rolled), stat('pill_duration', MOD.REDUCED, 0.5)] },

  // ── Crafting / utility ──
  { id: 'l_master_smith',      range: { min: 10,  max: 20  }, description: (v) => `${v}% reduced Crafting Cost.`,
    effects: [stat('crafting_cost', MOD.REDUCED, rolled)] },

  { id: 'l_alchemist_path',    range: { min: 20,  max: 30  }, description: (v) => `${v}% increased Pill Effects.`,
    effects: [stat('pill_effect', MOD.INCREASED, rolled)] },

  { id: 'l_lucky_gather',      range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Harvest Speed.`,
    effects: [stat('harvest_speed', MOD.INCREASED, rolled)] },

  { id: 'l_deep_miner',        range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Mining Speed.`,
    effects: [stat('mining_speed', MOD.INCREASED, rolled)] },

  { id: 'l_pill_hoarder',      range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Pill Duration.`,
    effects: [stat('pill_duration', MOD.INCREASED, rolled)] },

  { id: 'l_treasure_finder',   range: { min: 30,  max: 80  }, description: (v) => `${v}% increased Harvest and Mining Luck.`,
    effects: [stat('harvest_luck', MOD.INCREASED, rolled), stat('mining_luck', MOD.INCREASED, rolled)] },

  { id: 'l_dual_brew',         range: { min: 50,  max: 50  }, description: () => `50% chance for Alchemy to produce 1 extra pill.`,
    effects: [spec('dual_brew_chance', 50)] },

  { id: 'l_artisan_path',      range: { min: 10,  max: 20  }, description: (v) => `${v}% reduced Transmutation Cost.`,
    effects: [stat('transmutation_cost', MOD.REDUCED, rolled)] },

  // ── Hybrid / Misc ──
  { id: 'l_balanced_dao',      range: { min: 10,  max: 20  }, description: (v) => `${v}% increased All Stats.`,
    effects: [stat('all_stats', MOD.INCREASED, rolled)] },

  { id: 'l_chaos_path',        range: { min: 50,  max: 200 }, description: (v) => `A random stat receives ${v}% bonus, rerolled at combat start.`,
    effects: [spec('random_stat_combat', rolled)] },

  { id: 'l_combo_strike',      range: { min: 5,   max: 20  }, description: (v) => `Each Technique used adds ${v}% increased Damage to the next.`,
    effects: [stack('damage_all', MOD.INCREASED, rolled, 10, 'on_technique_used', 'on_combat_end')] },

  { id: 'l_forgotten_form',    range: { min: 2000,max: 6000}, description: (v) => `${v}% increased Damage while no Artefacts are equipped.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cNoArtefacts())] },

  { id: 'l_naked_path',        range: { min: 200, max: 500 }, description: (v) => `${v}% increased All Stats while no Artefacts are equipped.`,
    effects: [stat('all_stats', MOD.INCREASED, rolled, cNoArtefacts())] },

  { id: 'l_no_fingers',        range: { min: 50,  max: 150 }, description: (v) => `${v}% increased Damage while ring slots are empty.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cNoRings())] },

  { id: 'l_dao_chain',         range: { min: 100, max: 200 }, description: (v) => `${v}% increased Damage while Law element matches all equipped Technique elements.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cAllTechMatchLaw())] },

  // ── Time / Tempo ──
  { id: 'l_time_dilation',     range: { min: 30,  max: 60  }, description: (v) => `${v}% reduced Cooldowns during first second of combat.`,
    effects: [stat('cooldown_duration', MOD.REDUCED, rolled, cCombatBelow(1))] },

  { id: 'l_quick_kill',        range: { min: 50,  max: 150 }, description: (v) => `Gain ${v} Qi on killing an enemy within 3s of its spawn.`,
    effects: [trig('on_kill', { type: 'grant_qi_flat', value: rolled, condition: cEnemyJustSpawned(3) })] },

  { id: 'l_slow_burn_combat',  range: { min: 300, max: 500 }, description: (v) => `${v}% increased Damage after 15s in combat.`,
    effects: [stat('damage_all', MOD.INCREASED, rolled, cCombatAbove(15))] },

  { id: 'l_time_master',       range: { min: 20,  max: 40  }, description: (v) => `${v}% increased Buff Durations.`,
    effects: [stat('buff_duration', MOD.INCREASED, rolled)] },
];

// ─── Pool assignments ────────────────────────────────────────────────────────
// Thematic uniques get a specific pool; everything else falls back to
// `general` (the default assigned below). Edit this map to re-bucket — the
// designer's Law Uniques viewer reads straight from the assigned pool.
const POOL_ASSIGNMENTS = {
  // Fire
  l_burning_path:       'fire',
  l_phoenix_path:       'fire',
  l_nuclear_path:       'fire',
  // Water
  l_frozen_path:        'water',
  l_river_flow:         'water',
  l_qi_spring:          'water',
  l_calm_water:         'water',
  l_eternal_spring:     'water',
  l_reflecting_pool:    'water',
  // Earth
  l_stone_path:         'earth',
  l_unmovable_mountain: 'earth',
  l_shell_path:         'earth',
  l_living_fortress:    'earth',
  l_patient_mountain:   'earth',
  // Void
  l_void_path:          'void',
  l_inner_void:         'void',
  // Physical (Body martial)
  l_diamond_body:       'physical',
  l_iron_marrow:        'physical',
  l_mountain_stance:    'physical',
  l_titan_blood:        'physical',
  l_reincarnated_titan: 'physical',
  l_warrior_pulse:      'physical',
  l_berserker_resolve:  'physical',
  l_last_stand:         'physical',
  l_reckless:           'physical',
  l_stubborn_path:      'physical',
  l_bonecage:           'physical',
  // Sword
  l_blade_dance:        'sword',
  l_razors_edge:        'sword',
  l_blade_of_chaos:     'sword',
  l_executioner_path:   'sword',
  // Fist
  l_swallow_strike:     'fist',
  // Spirit
  l_thoughtless_state:  'spirit',
  l_quiet_mind:         'spirit',
  l_meditation_path:    'spirit',
  l_oath_of_silence:    'spirit',
  l_immortal_will:      'spirit',
  l_undying_will:       'spirit',
  l_chained_will:       'spirit',
  l_burdened_soul:      'spirit',
  l_sacred_offering:    'spirit',
  // Dao
  l_dao_consumption:    'dao',
  l_dao_chain:          'dao',
  l_dao_hunger:         'dao',
  l_balanced_dao:       'dao',
  l_tri_harmony:        'dao',
};

// Apply pools in place — every unique gets one.
for (const u of LAW_UNIQUES) {
  u.pool = POOL_ASSIGNMENTS[u.id] ?? 'general';
}

export const LAW_UNIQUES_BY_ID = Object.fromEntries(LAW_UNIQUES.map(u => [u.id, u]));

/** Roll a value for a given unique (Math.floor for integer display). */
export function rollUniqueValue(uniqueId) {
  const u = LAW_UNIQUES_BY_ID[uniqueId];
  if (!u) return 0;
  const { min, max } = u.range;
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Pick a random unique for the given law.
 *
 * Uniques are drawn from: (law.types ?? []) ∪ ['general'] — i.e. the law's
 * declared pools plus the shared general pool. Any ids already assigned
 * elsewhere on the law are excluded.
 *
 * Backward-compatible: when called with an array (the legacy signature),
 * pools are ignored and all uniques are candidates. Call sites should
 * migrate to passing the law object.
 *
 * @param {object|string[]} lawOrExcludeIds — full law { types?: string[] }
 *                                            or an excludeIds array (legacy).
 * @param {string[]} [excludeIds] — ids already on the law, skipped in the draw.
 */
export function pickRandomUnique(lawOrExcludeIds, excludeIds) {
  // Legacy signature: pickRandomUnique(excludeIds)
  let types = null;
  let exclude;
  if (Array.isArray(lawOrExcludeIds)) {
    exclude = lawOrExcludeIds;
  } else {
    types   = lawOrExcludeIds?.types ?? null;
    exclude = excludeIds ?? [];
  }
  const allowedPools = types && types.length
    ? new Set([...types, 'general'])
    : null; // null = no filter (legacy behaviour)
  const pool = LAW_UNIQUES.filter(u =>
    !exclude.includes(u.id) && (!allowedPools || allowedPools.has(u.pool ?? 'general'))
  );
  if (pool.length === 0) return null;
  const u = pool[Math.floor(Math.random() * pool.length)];
  return { id: u.id, value: rollUniqueValue(u.id) };
}

/** Get a unique's display description given its rolled value. */
export function formatUniqueDescription(uniqueId, value) {
  const u = LAW_UNIQUES_BY_ID[uniqueId];
  if (!u) return '';
  return u.description(value);
}
