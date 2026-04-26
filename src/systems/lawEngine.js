/**
 * lawEngine.js — Evaluate active law uniques against game state.
 *
 * Given an active law (with rolled uniques), the engine returns:
 *   - stat modifiers (to feed into computeAllStats)
 *   - special flags (for cannot_dodge, cannot_heal, hp_cap_pct, etc.)
 *   - trigger handlers (to call on combat events)
 *   - regen effects (for HP/Qi regen per second)
 *   - conversion specs (for stat conversions)
 *
 * Most effects evaluate to ZERO contribution until their condition is met.
 * The engine is called every frame of the combat tick OR whenever stats are
 * computed, so conditions re-evaluate live.
 */

import { LAW_UNIQUES_BY_ID } from '../data/lawUniques';
import { MOD } from '../data/stats';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Walk an active law's uniques and collect structured output.
 * @param {object} law     — the active law with `uniques: { Iron: {id, value}, ... }`
 * @param {object} ctx     — current game context (see `buildContext` below)
 * @returns { statMods, flags, conversions, regen, triggers, stacks }
 */
export function evaluateLawUniques(law, ctx) {
  const result = {
    statMods: {},      // { statName: [{type, value}] }
    flags: {},         // { flagName: value }
    conversions: [],   // [{ from, to, pct }]
    regen: [],         // [{ resource, perSec }]
    triggers: [],      // [{ event, action }]
    stacks: [],        // [{ stat, mod, perStack, max, gainOn, resetOn }]
    cdTypeMults: {},   // { Heal: 2.0, Defend: 0.8, ... } per-tech-type CD scaler
    setCountBonus: {}, // { setId: amount } — law uniques that "count as +1 piece"
  };
  if (!law || !law.uniques) return result;

  for (const tier of Object.keys(law.uniques)) {
    const entry = law.uniques[tier];
    if (!entry) continue;
    const unique = LAW_UNIQUES_BY_ID[entry.id];
    if (!unique) continue;
    const rolledValue = entry.value;

    for (const effect of unique.effects) {
      applyEffect(effect, rolledValue, ctx, result, entry.id);
    }
  }

  return result;
}

/**
 * Build a minimal ctx object from whatever is handy. Callers fill in what
 * they know. Missing fields are treated as "unknown" → conditions that
 * reference them evaluate to false (so the effect is inactive).
 */
export function buildContext({
  hpPct, hpFull, enemyHpPct, inCombat, combatTimeSec, lastDamageAt, lastTechAt,
  lastKillAt, lastDodgeAt, lastExploitAt, firstAttackFired,
  lawElement, techElements,
  realmIndex, isAtPeak, activePillCount, equippedArtefactCount,
  equippedRingCount, focusing, currentQi,
  // ── Added 2026-04-27 (element-themed laws + set bonuses) ───────────────
  equippedArtefactsByElement,
  equippedTechsByType,
  equippedSetCounts,
  dodgeStacks,
  currentDodgeChance,
  outOfCombatDefense,
  damageMultiplier,
  healingMultiplier,
  exploitChancePct,
} = {}) {
  return {
    hpPct,
    hpFull,
    enemyHpPct,
    inCombat,
    combatTimeSec,
    lastDamageAt,
    lastTechAt,
    lastKillAt,
    lastDodgeAt,
    lastExploitAt,
    firstAttackFired,
    lawElement,
    techElements: techElements || [],
    realmIndex: realmIndex ?? 0,
    isAtPeak: isAtPeak ?? false,
    activePillCount: activePillCount ?? 0,
    equippedArtefactCount: equippedArtefactCount ?? 0,
    equippedRingCount: equippedRingCount ?? 0,
    focusing: focusing ?? false,
    currentQi: currentQi ?? 0,
    equippedArtefactsByElement: equippedArtefactsByElement ?? { fire: 0, water: 0, earth: 0, wood: 0, metal: 0 },
    equippedTechsByType: equippedTechsByType ?? { Attack: 0, Heal: 0, Defend: 0, Dodge: 0, Expose: 0 },
    equippedSetCounts: equippedSetCounts ?? {},
    dodgeStacks: dodgeStacks ?? 0,
    currentDodgeChance: currentDodgeChance ?? 0,
    outOfCombatDefense: outOfCombatDefense ?? 0,
    damageMultiplier: damageMultiplier ?? 1,
    healingMultiplier: healingMultiplier ?? 1,
    exploitChancePct: exploitChancePct ?? 0,
    nowSec: (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000,
  };
}

// ─── Effect dispatch ─────────────────────────────────────────────────────────

function applyEffect(effect, rolledValue, ctx, result, sourceId) {
  switch (effect.kind) {
    case 'stat':      return applyStat(effect, rolledValue, ctx, result);
    case 'trigger':   return result.triggers.push({ ...effect, rolledValue, sourceId });
    case 'conversion':return applyConversion(effect, rolledValue, result);
    case 'regen':     return applyRegen(effect, rolledValue, ctx, result);
    case 'special':   return applySpecial(effect, rolledValue, ctx, result);
    case 'stack':     return result.stacks.push({ ...effect, rolledValue, sourceId });
    case 'once':      return result.triggers.push({ ...effect, rolledValue, sourceId, oncePerFight: true });
    case 'cd_mult':   return applyCdMult(effect, result);
    case 'set_count_bonus': return applySetCountBonus(effect, result);
  }
}

/**
 * Inflate the equipped-piece count for a specific set.
 *   { kind: 'set_count_bonus', setId: 'set_fire_1', amount: 1 }
 * Accumulates so multiple sources can stack.
 */
function applySetCountBonus(effect, result) {
  const sid = effect.setId;
  if (!sid) return;
  result.setCountBonus[sid] = (result.setCountBonus[sid] ?? 0) + (effect.amount ?? 1);
}

/**
 * Per-technique-type cooldown multiplier. Stacks multiplicatively when
 * multiple sources target the same techType.
 *   { kind: 'cd_mult', techType: 'Heal', mult: 2.0 }    → Heal CDs ×2
 *   { kind: 'cd_mult', techType: 'Dodge', mult: 0.8 }   → Dodge CDs ×0.8
 */
function applyCdMult(effect, result) {
  const t = effect.techType;
  const m = typeof effect.mult === 'number' ? effect.mult : 1;
  if (!t) return;
  result.cdTypeMults[t] = (result.cdTypeMults[t] ?? 1) * m;
}

function resolveValue(spec, rolledValue, ctx) {
  if (typeof spec === 'number') return spec;
  if (spec === 'rolled') return rolledValue / 100; // % → fraction
  if (spec === 'rolled_as_mult') return 1 + rolledValue / 100;
  if (spec === 'rolled_as_more') return 1 + rolledValue / 100;
  if (spec === 'rolled_as_less') return 1 - rolledValue / 100;
  if (spec === 'rolled_as_pct')  return rolledValue / 100;
  if (spec === 'rolled_half') return rolledValue / 2;
  if (spec === 'rolled_third') return rolledValue / 3;
  if (spec === 'rolled_half_pct') return rolledValue / 200;
  if (spec === 'rolled_per_major_realm') {
    // Each major realm counts as roughly 3 indices (average sub-stage count).
    const majorRealm = Math.floor((ctx.realmIndex ?? 0) / 3);
    return (rolledValue / 100) * majorRealm;
  }
  if (spec === 'rolled_per_realm_above_saint') {
    const delta = Math.max(0, (ctx.realmIndex ?? 0) - 24);
    return (rolledValue / 100) * delta;
  }
  if (spec === 'rolled_per_active_pill')   return (rolledValue / 100) * (ctx.activePillCount ?? 0);
  if (spec === 'rolled_per_10pct_missing_hp') {
    const missing = Math.max(0, 1 - (ctx.hpPct ?? 1));
    return (rolledValue / 100) * (missing * 10);
  }
  if (spec === 'rolled_per_unique_tech_element') {
    const elems = new Set((ctx.techElements || []).filter(Boolean));
    return (rolledValue / 100) * elems.size;
  }
  if (spec === 'rolled_pct_current_qi') {
    return (rolledValue / 100) * (ctx.currentQi ?? 0);
  }
  if (spec === 'rolled_scaled_by_missing_hp') {
    const missing = Math.max(0, 1 - (ctx.hpPct ?? 1));
    return (rolledValue / 100) * missing;
  }
  if (spec === 'rolled_as_pct_per_pill') {
    return (rolledValue / 100) * (ctx.activePillCount ?? 0);
  }
  // ── Added 2026-04-27 for element-themed laws ─────────────────────────────
  // FRACTION resolvers (return 0..1 floats; suitable for INCREASED/MORE/PCT stats).
  if (spec === 'rolled_per_fire_artefact')   return (rolledValue / 100) * (ctx.equippedArtefactsByElement?.fire   ?? 0);
  if (spec === 'rolled_per_water_artefact')  return (rolledValue / 100) * (ctx.equippedArtefactsByElement?.water  ?? 0);
  if (spec === 'rolled_per_earth_artefact')  return (rolledValue / 100) * (ctx.equippedArtefactsByElement?.earth  ?? 0);
  if (spec === 'rolled_per_metal_artefact')  return (rolledValue / 100) * (ctx.equippedArtefactsByElement?.metal  ?? 0);
  if (spec === 'rolled_per_wood_artefact')   return (rolledValue / 100) * (ctx.equippedArtefactsByElement?.wood   ?? 0);
  if (spec === 'rolled_per_expose_tech_equipped') return (rolledValue / 100) * (ctx.equippedTechsByType?.Expose ?? 0);
  if (spec === 'rolled_pct_max_hp')          return rolledValue / 100;
  if (spec === 'rolled_pct_damage_mult')     return (rolledValue / 100) * Math.max(0, (ctx.damageMultiplier ?? 1) - 1);
  if (spec === 'rolled_pct_healing_mult')    return (rolledValue / 100) * Math.max(0, (ctx.healingMultiplier ?? 1) - 1);
  if (spec === 'rolled_pct_exploit_chance')  return (rolledValue / 100) * (ctx.exploitChancePct ?? 0) / 100;
  if (spec === 'rolled_pct_out_of_combat_defense') return (rolledValue / 100) * (ctx.outOfCombatDefense ?? 0);
  if (spec === 'rolled_per_dodge_stack')     return (rolledValue / 100) * (ctx.dodgeStacks ?? 0);
  // RAW-% resolvers (return raw % numbers; suitable for FLAT on stats stored
  // as 0–100 raw %, e.g. dodge_chance, exploit_chance, technique_cd_reduction).
  if (spec === 'rolled_x_per_wood_artefact')  return rolledValue * (ctx.equippedArtefactsByElement?.wood   ?? 0);
  if (spec === 'rolled_x_per_metal_artefact') return rolledValue * (ctx.equippedArtefactsByElement?.metal  ?? 0);
  if (spec === 'rolled_x_per_expose_tech_equipped') return rolledValue * (ctx.equippedTechsByType?.Expose ?? 0);
  return 0;
}

function applyStat(effect, rolledValue, ctx, result) {
  if (effect.condition && !evaluateCondition(effect.condition, ctx)) return;
  const numeric = resolveValue(effect.value, rolledValue, ctx);
  if (!numeric && numeric !== 0) return;
  if (!result.statMods[effect.stat]) result.statMods[effect.stat] = [];
  result.statMods[effect.stat].push({ type: effect.mod, value: numeric });
}

function applyConversion(effect, rolledValue, result) {
  const pct = typeof effect.pct === 'number' ? effect.pct / 100 : rolledValue / 100;
  result.conversions.push({ from: effect.from, to: effect.to, pct });
}

function applyRegen(effect, rolledValue, ctx, result) {
  if (effect.condition && !evaluateCondition(effect.condition, ctx)) return;
  const perSec = resolveValue(effect.perSec, rolledValue, ctx);
  result.regen.push({ resource: effect.resource, perSec });
}

function applySpecial(effect, rolledValue, ctx, result) {
  // String specs route through resolveValue so context-aware scalers
  // (rolled_pct_max_hp, rolled_per_fire_artefact, …) can be used as flag
  // payloads, not just stat-mod values.
  const val = effect.value === undefined ? true
    : effect.value === 'rolled' ? rolledValue
    : effect.value === 'rolled_half' ? rolledValue / 2
    : typeof effect.value === 'string' ? resolveValue(effect.value, rolledValue, ctx)
    : effect.value;
  result.flags[effect.flag] = val;
}

// ─── Condition evaluation ───────────────────────────────────────────────────

export function evaluateCondition(cond, ctx) {
  if (!cond) return true;
  switch (cond.type) {
    case 'hp_below_pct':       return ctx.hpPct !== undefined && ctx.hpPct < cond.value / 100;
    case 'hp_above_pct':       return ctx.hpPct !== undefined && ctx.hpPct > cond.value / 100;
    case 'hp_full':            return ctx.hpPct !== undefined && ctx.hpPct >= 0.99;
    case 'enemy_hp_below_pct': return ctx.enemyHpPct !== undefined && ctx.enemyHpPct < cond.value / 100;
    case 'enemy_hp_above_pct': return ctx.enemyHpPct !== undefined && ctx.enemyHpPct > cond.value / 100;
    case 'in_combat':          return !!ctx.inCombat;
    case 'out_of_combat':      return !ctx.inCombat;
    case 'in_combat_idle':     return !!ctx.inCombat && ctx.lastTechAt && (ctx.nowSec - ctx.lastTechAt) > 0.5;
    case 'no_combat_for_sec':  return !ctx.inCombat && ctx.nowSec - (ctx.lastCombatEndAt || 0) > cond.sec;
    case 'no_damage_for_sec':  return ctx.lastDamageAt !== undefined && ctx.nowSec - ctx.lastDamageAt > cond.sec;
    case 'no_technique_for_sec': return ctx.lastTechAt !== undefined && ctx.nowSec - ctx.lastTechAt > cond.sec;
    case 'recent_kill_sec':    return ctx.lastKillAt !== undefined && ctx.nowSec - ctx.lastKillAt < cond.sec;
    case 'recent_dodge_sec':   return ctx.lastDodgeAt !== undefined && ctx.nowSec - ctx.lastDodgeAt < cond.sec;
    case 'recent_exploit_sec':    return ctx.lastExploitAt !== undefined && ctx.nowSec - ctx.lastExploitAt < cond.sec;
    case 'first_attack':       return !ctx.firstAttackFired;
    // Primary-stat (essence/soul/body) conditions removed 2026-04-27 — those
    // stats no longer exist in the engine. body_gt_soul / soul_gt_body /
    // body_gt_essence_plus_soul / tri_harmony_10 went with them.
    case 'realm_below':        return (ctx.realmIndex ?? 0) < cond.index;
    case 'realm_above':        return (ctx.realmIndex ?? 0) > cond.index;
    case 'at_peak_realm':      return !!ctx.isAtPeak;
    case 'no_artefacts':       return (ctx.equippedArtefactCount ?? 0) === 0;
    case 'no_rings':           return (ctx.equippedRingCount ?? 0) === 0;
    case 'all_tech_elements_match_law': {
      const elems = ctx.techElements || [];
      if (elems.length === 0) return false;
      return elems.every(e => e === ctx.lawElement);
    }
    case 'combat_time_below':  return (ctx.combatTimeSec ?? 0) < cond.sec;
    case 'combat_time_above':  return (ctx.combatTimeSec ?? 0) > cond.sec;
    case 'focusing':           return !!ctx.focusing;
    case 'not_focusing':       return !ctx.focusing;
    case 'law_element_is':     return ctx.lawElement === cond.value;
    default:                   return true;
  }
}

// ─── Trigger dispatch (called from combat loop) ──────────────────────────────

/**
 * Check if a trigger should fire for a given event, return its action.
 * @param {object} trigger — { event, action, rolledValue, sourceId, oncePerFight? }
 * @param {string} eventType — the event that just occurred
 * @param {object} ctx
 * @param {Set}    usedOncePerFight — set of sourceIds that have already fired
 */
export function shouldFireTrigger(trigger, eventType, ctx, usedOncePerFight) {
  if (trigger.event?.event) {
    // `once` trigger wraps its inner trigger shape
    if (trigger.event.event !== eventType) return false;
  } else if (trigger.event !== eventType) {
    return false;
  }
  if (trigger.oncePerFight && usedOncePerFight.has(trigger.sourceId)) return false;
  if (trigger.action?.condition && !evaluateCondition(trigger.action.condition, ctx)) return false;
  return true;
}
