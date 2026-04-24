/**
 * artefactUniqueEffects.js — declarative mapping from each artefact unique
 * modifier id to the concrete runtime effects it produces.
 *
 * Each entry is a list of effect objects. Supported shapes:
 *
 *   { kind: 'stat', stat, mod, value }
 *     Contributes to the stat bundle fed to computeAllStats / collapsePct.
 *     - mod: one of MOD.INCREASED / MOD.FLAT / MOD.MORE / MOD.BASE_FLAT
 *     - value: number (literal) | 'rolled' (pct → fraction) | 'rolled_pct' (keep as 0–100 number)
 *              | 'rolled_half' | 'rolled_third' | 'rolled_neg' | number-based ops
 *
 *   { kind: 'flag', flag, value }
 *     Writes a scalar or boolean into the `artefactFlags` bag returned by the
 *     engine. Combat/cultivation consumers read these directly.
 *
 *   { kind: 'trigger', event, action }
 *     NOT used yet by runtime; reserved for future on-event hooks.
 *
 * Rolled values arrive as 0–100 percent numbers on the instance. The engine
 * converts them according to the `value` spec at apply time.
 *
 * The goal is 100% coverage of ARTEFACT_UNIQUES — every id has an entry so
 * no equipped unique is a dead affix.
 */

import { MOD } from './stats';

const I = MOD.INCREASED;
const F = MOD.FLAT;
const M = MOD.MORE;

export const ARTEFACT_UNIQUE_EFFECTS = {
  // ─── Weapon ────────────────────────────────────────────────────────────────
  a_keen_edge:        [{ kind: 'stat', stat: 'exploit_chance',       mod: F, value: 'rolled_pct' }],
  a_blood_drinker:    [{ kind: 'stat', stat: 'lifesteal',            mod: F, value: 'rolled_pct' }],
  a_executioner:      [{ kind: 'flag', flag: 'executeBonusPct',      value: 'rolled_pct' }],
  a_void_cleaver:     [{ kind: 'stat', stat: 'ignore_defense_pct',   mod: F, value: 'rolled_pct' }],
  a_perfect_balance:  [{ kind: 'flag', flag: 'damagePerArtefactPct', value: 'rolled_pct' }],
  a_phantom_edge:     [{ kind: 'stat', stat: 'technique_cd_reduction', mod: F, value: 'rolled' }],
  a_void_pierce:      [{ kind: 'stat', stat: 'ignore_defense_chance', mod: F, value: 'rolled_pct' }],
  a_savage_grip:      [{ kind: 'stat', stat: 'physical_damage',     mod: I, value: 'rolled' }],
  a_ethereal_blade:   [{ kind: 'stat', stat: 'elemental_damage',    mod: I, value: 'rolled' }],
  a_sky_breaker:      [{ kind: 'flag', flag: 'damagePerMajorRealmPct', value: 'rolled_pct' }],
  a_combo_blade:      [{ kind: 'flag', flag: 'comboDamagePerHitPct', value: 'rolled_pct' }],

  // ─── Head ──────────────────────────────────────────────────────────────────
  a_clear_mind:        [{ kind: 'stat', stat: 'technique_cd_reduction', mod: F, value: 'rolled' }],
  a_focused_will:      [{ kind: 'stat', stat: 'exploit_chance',         mod: F, value: 'rolled_pct' }],
  a_serene_face:       [{ kind: 'stat', stat: 'healing_received',       mod: F, value: 'rolled' }],
  // a_warmind: retuned in stage 16 — legacy effect keyed off soul > body.
  // New payload: flat crit_chance bonus (similar power curve).
  a_warmind:           [{ kind: 'stat', stat: 'crit_chance',           mod: F, value: 'rolled_pct' }],
  a_seeker_eye:        [{ kind: 'stat', stat: 'exploit_attack_mult',    mod: F, value: 'rolled_pct' }],
  a_oracles_insight:   [{ kind: 'stat', stat: 'dodge_fatal_chance',     mod: F, value: 'rolled_pct' }],
  a_clarity_storm:     [{ kind: 'flag', flag: 'postDodgeCdReductionPct', value: 'rolled_pct' }],
  a_crown_focus:       [{ kind: 'stat', stat: 'crit_twice_chance',      mod: F, value: 'rolled_pct' }],
  a_inner_eye:         [{ kind: 'stat', stat: 'tech_free_cast_chance',  mod: F, value: 'rolled_pct' }],
  a_visionary_mind:    [{ kind: 'stat', stat: 'offline_qi_mult',        mod: I, value: 'rolled' }],
  a_warmask:           [{ kind: 'flag', flag: 'damageIf3TechsPct',      value: 'rolled_pct' }],
  a_silent_crown:      [{ kind: 'flag', flag: 'firstAttackGuaranteedCrit', value: true }],
  a_dao_helm:          [{ kind: 'stat', stat: 'qi_speed',               mod: M, value: 'rolled_as_more' }],

  // ─── Body ──────────────────────────────────────────────────────────────────
  a_titan_chest:       [{ kind: 'stat', stat: 'health',                 mod: I, value: 'rolled' }],
  a_living_armor:      [{ kind: 'stat', stat: 'hp_regen_in_combat',     mod: F, value: 'rolled' }],
  a_reflective_skin:   [{ kind: 'stat', stat: 'reflect_pct',            mod: F, value: 'rolled_pct' }],
  a_phoenix_robe:      [{ kind: 'flag', flag: 'phoenixRevivePct',       value: 'rolled_pct' }],
  a_void_cloak:        [{ kind: 'stat', stat: 'dodge_chance',           mod: F, value: 'rolled_pct' }],
  a_blessed_robe:      [{ kind: 'stat', stat: 'healing_received',       mod: F, value: 'rolled' }],
  a_chain_armor:       [{ kind: 'flag', flag: 'defPerMissingTenthHpPct', value: 'rolled_pct' }],
  a_warlords_mantle:   [
    { kind: 'stat', stat: 'damage_all', mod: I, value: 'rolled' },
    { kind: 'stat', stat: 'defense',    mod: I, value: 'rolled_half' },
  ],
  a_silken_robe:       [
    { kind: 'stat', stat: 'elemental_damage', mod: I, value: 'rolled' },
    { kind: 'stat', stat: 'defense',          mod: I, value: -0.05 },
  ],
  a_iron_carapace_pro: [
    { kind: 'stat', stat: 'defense',    mod: I, value: 'rolled' },
    { kind: 'stat', stat: 'damage_all', mod: I, value: -0.10 },
  ],
  // a_ancestral_robe: legacy flag scaled all primary stats per major realm.
  // Remapped to the same damagePerMajorRealmPct flag that a_sky_breaker uses.
  a_ancestral_robe:    [{ kind: 'flag', flag: 'damagePerMajorRealmPct', value: 'rolled_pct' }],
  a_battle_mail:       [{ kind: 'flag', flag: 'damageFirst10sPct',      value: 'rolled_pct' }],
  a_serpent_skin:      [
    { kind: 'stat', stat: 'dodge_chance', mod: F, value: 'rolled_pct' },
    { kind: 'flag', flag: 'healOnDodgePct', value: 'rolled_pct' },
  ],
  a_unyielding_garb:   [{ kind: 'flag', flag: 'hpFloorPct',             value: 'rolled_pct' }],
  a_blossoming_robe:   [{ kind: 'flag', flag: 'regenAtFullHpPct',       value: 'rolled_pct' }],

  // ─── Hands ─────────────────────────────────────────────────────────────────
  a_dragon_claws:      [{ kind: 'stat', stat: 'crit_damage',           mod: F, value: 'rolled_pct' }],
  a_qi_channeler:      [{ kind: 'stat', stat: 'elemental_damage',      mod: I, value: 'rolled' }],
  a_void_grip:         [{ kind: 'stat', stat: 'ignore_defense_pct',    mod: F, value: 'rolled_pct' }],
  a_blood_palms:       [{ kind: 'stat', stat: 'lifesteal',             mod: F, value: 'rolled_pct' }],
  a_smith_hands:       [{ kind: 'stat', stat: 'crafting_cost_reduction', mod: F, value: 'rolled' }],
  a_alchemist_hands:   [{ kind: 'stat', stat: 'pill_effect_mult',      mod: F, value: 'rolled' }],
  a_combo_grip:        [{ kind: 'flag', flag: 'comboDamagePerHitPct',  value: 'rolled_pct' }],
  a_warriors_grip:     [
    { kind: 'stat', stat: 'damage_all', mod: I, value: 'rolled' },
    { kind: 'stat', stat: 'defense',    mod: I, value: 'rolled' },
  ],
  a_qi_palms:          [{ kind: 'stat', stat: 'qi_speed',              mod: M, value: 'rolled_as_more' }],
  a_destruction_grip:  [{ kind: 'stat', stat: 'damage_all',            mod: I, value: 'rolled_quarter' }],
  a_phoenix_palms:     [{ kind: 'flag', flag: 'fireHealPct',           value: 'rolled_pct' }],

  // ─── Waist ─────────────────────────────────────────────────────────────────
  a_qi_storage:        [{ kind: 'stat', stat: 'qi_speed',              mod: M, value: 'rolled_as_more' }],
  a_sage_belt:         [{ kind: 'stat', stat: 'pill_effect_mult',      mod: F, value: 'rolled' }],
  // a_essence_belt: legacy body→essence conversion flag. Retuned in
  // stage 16 to a straight increased elemental_damage bonus.
  a_essence_belt:      [{ kind: 'stat', stat: 'elemental_damage',    mod: I, value: 'rolled' }],
  a_battle_sash:       [{ kind: 'flag', flag: 'damagePerKill5sPct',    value: 'rolled_pct' }],
  a_eternal_sash:      [{ kind: 'stat', stat: 'hp_regen_in_combat',    mod: F, value: 'rolled' }],
  a_iron_belt:         [
    { kind: 'stat', stat: 'defense',    mod: I, value: 'rolled' },
    { kind: 'stat', stat: 'damage_all', mod: I, value: 'rolled' },
  ],
  a_lifebinder:        [{ kind: 'stat', stat: 'healing_received',      mod: F, value: 'rolled' }],
  a_cursed_belt:       [
    { kind: 'stat', stat: 'damage_all', mod: I, value: 'rolled' },
    { kind: 'stat', stat: 'defense',    mod: M, value: 0.75 },
  ],
  a_blessed_belt:      [{ kind: 'stat', stat: 'damage_all',            mod: I, value: 'rolled' }],
  // a_emperor_belt: legacy allStatsPerRealmPct flag → share damagePerRealmPct
  // with the emperor amulet/ring so there's a single realm-scaling hook.
  a_emperor_belt:      [{ kind: 'flag', flag: 'damagePerRealmPct',     value: 'rolled_pct' }],
  a_thirsty_belt:      [{ kind: 'stat', stat: 'lifesteal',             mod: F, value: 'rolled_pct' }],
  a_assassin_belt:     [{ kind: 'stat', stat: 'crit_chance',           mod: F, value: 'rolled_pct' }],

  // ─── Feet ──────────────────────────────────────────────────────────────────
  a_swift_boots:       [{ kind: 'stat', stat: 'dodge_chance',          mod: F, value: 'rolled_pct' }],
  a_iron_greaves:      [{ kind: 'stat', stat: 'defense',               mod: I, value: 'rolled' }],
  a_phoenix_boots:     [{ kind: 'stat', stat: 'hp_regen_in_combat',    mod: F, value: 'rolled' }],
  a_dancers_boots:     [{ kind: 'flag', flag: 'damagePostDodgePct',    value: 'rolled_pct' }],
  a_voidstep:          [{ kind: 'flag', flag: 'voidstepCdReset',       value: true }],
  a_dragon_treaders:   [{ kind: 'stat', stat: 'physical_damage',      mod: I, value: 'rolled' }],
  a_silent_steps:      [{ kind: 'flag', flag: 'firstAttackGuaranteedCrit', value: true }],
  a_iron_treads:       [
    { kind: 'stat', stat: 'defense', mod: I, value: 'rolled' },
    { kind: 'stat', stat: 'health',  mod: I, value: 'rolled' },
  ],
  a_warriors_boots:    [{ kind: 'stat', stat: 'physical_damage',       mod: I, value: 'rolled' }],
  a_eternal_treads:    [{ kind: 'stat', stat: 'hp_regen_out_combat',   mod: F, value: 'rolled' }],

  // ─── Neck ──────────────────────────────────────────────────────────────────
  a_jade_pendant:      [{ kind: 'stat', stat: 'elemental_damage',     mod: I, value: 'rolled' }],
  a_dragon_amulet:     [{ kind: 'stat', stat: 'damage_all',            mod: I, value: 'rolled' }],
  a_seer_locket:       [{ kind: 'stat', stat: 'all_loot_bonus',        mod: F, value: 'rolled' }],
  a_void_pendant:      [{ kind: 'stat', stat: 'ignore_defense_pct',    mod: F, value: 'rolled_pct' }],
  a_blood_amulet:      [{ kind: 'stat', stat: 'lifesteal',             mod: F, value: 'rolled_pct' }],
  a_qi_amulet:         [{ kind: 'stat', stat: 'qi_speed',              mod: M, value: 'rolled_as_more' }],
  a_warlords_amulet:   [
    { kind: 'stat', stat: 'damage_all', mod: I, value: 'rolled' },
    { kind: 'stat', stat: 'defense',    mod: I, value: 'rolled' },
  ],
  a_oracle_amulet:     [{ kind: 'stat', stat: 'dodge_fatal_chance',    mod: F, value: 'rolled_pct' }],
  a_assassin_pendant:  [{ kind: 'stat', stat: 'crit_chance',           mod: F, value: 'rolled_pct' }],
  a_emperor_amulet:    [{ kind: 'flag', flag: 'damagePerRealmPct',     value: 'rolled_pct' }],
  a_eternal_amulet:    [{ kind: 'stat', stat: 'healing_received',      mod: F, value: 'rolled' }],
  a_speed_amulet:      [{ kind: 'stat', stat: 'cooldown_reduction_all', mod: F, value: 'rolled' }],
  a_combat_amulet:     [{ kind: 'flag', flag: 'damageFirst5sPct',      value: 'rolled_pct' }],

  // ─── Ring ──────────────────────────────────────────────────────────────────
  a_essence_ring:      [{ kind: 'stat', stat: 'elemental_damage',      mod: I, value: 'rolled' }],
  a_soul_ring:         [{ kind: 'stat', stat: 'elemental_defense',     mod: I, value: 'rolled' }],
  a_body_ring:         [{ kind: 'stat', stat: 'physical_damage',       mod: I, value: 'rolled' }],
  a_crit_ring:         [{ kind: 'stat', stat: 'crit_chance',           mod: F, value: 'rolled_pct' }],
  a_speed_ring:        [{ kind: 'stat', stat: 'cooldown_reduction_all', mod: F, value: 'rolled' }],
  a_blood_ring:        [{ kind: 'stat', stat: 'lifesteal',             mod: F, value: 'rolled_pct' }],
  a_void_ring:         [{ kind: 'stat', stat: 'ignore_defense_pct',    mod: F, value: 'rolled_pct' }],
  a_dragon_ring:       [{ kind: 'stat', stat: 'damage_all',            mod: I, value: 'rolled' }],
  a_iron_ring:         [{ kind: 'stat', stat: 'defense',               mod: I, value: 'rolled' }],
  a_emperor_ring:      [{ kind: 'flag', flag: 'damagePerRealmPct',     value: 'rolled_pct' }],
  a_combo_ring:        [{ kind: 'flag', flag: 'comboDamagePerHitPct',  value: 'rolled_pct' }],
  a_lucky_ring:        [{ kind: 'stat', stat: 'loot_luck',             mod: F, value: 'rolled_pct' }],
  a_warrior_ring:      [{ kind: 'stat', stat: 'physical_damage',       mod: I, value: 'rolled' }],
  a_mage_ring:         [{ kind: 'stat', stat: 'elemental_damage',      mod: I, value: 'rolled' }],
  a_eternal_ring:      [{ kind: 'stat', stat: 'healing_received',      mod: F, value: 'rolled' }],
  a_harvest_ring:      [{ kind: 'stat', stat: 'harvest_speed',         mod: I, value: 'rolled' }],
  a_mining_ring:       [{ kind: 'stat', stat: 'mining_speed',          mod: I, value: 'rolled' }],
  a_alchemy_ring:      [{ kind: 'stat', stat: 'pill_effect_mult',      mod: F, value: 'rolled' }],
};

/** Resolve an effect `value` spec against a rolled 0–100 number. */
export function resolveUniqueValue(spec, rolled) {
  if (typeof spec === 'number') return spec;
  const r = typeof rolled === 'number' ? rolled : 0;
  switch (spec) {
    case 'rolled':          return r / 100;           // 30 → 0.30
    case 'rolled_pct':      return r;                 // 30 → 30 (kept as percent number)
    case 'rolled_half':     return r / 200;           // 30 → 0.15
    case 'rolled_third':    return r / 300;
    case 'rolled_quarter':  return r / 400;
    case 'rolled_neg':      return -r / 100;
    case 'rolled_as_more':  return 1 + r / 100;
    default:                return 0;
  }
}
