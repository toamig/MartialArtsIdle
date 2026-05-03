/**
 * usePills.js — Pill consumption hook (permanent stat improvements).
 *
 * Pills are no longer temporary buffs — consuming one permanently and
 * irreversibly adds its stat bonuses to the character.
 *
 * State:
 *   ownedPills      { [pillId]: count }  — persisted to 'mai_pills'
 *   consumedPills   { [pillId]: count }  — persisted to 'mai_pills_consumed'
 *   permanentStats  { [statId]: value }  — persisted to 'mai_permanent_pill_stats'
 *
 * `usePill(pillId)` returns an array of { stat, value } deltas so the UI
 * can display a floating stat-gain animation. Returns null if the pill
 * is not owned or does not exist.
 *
 * Diminishing returns: each consumption of a given pill scales its effect
 * by 0.98^N where N is the number of pills of that id consumed BEFORE this
 * one. Integer-valued stats are rounded to nearest int; qi_speed (Dao pills)
 * skips DR entirely so its sub-1 values do not collapse to zero.
 *
 * `getStatModifiers()` and `getQiMult()` maintain the same external interface
 * as before (both now read from permanentStats instead of active pills).
 */

import { useState, useEffect, useCallback } from 'react';
import { PILLS_BY_ID } from '../data/pills';
import { trackPillConsumed, trackPillCrafted, trackPillDiscovered, trackFirstTime } from '../analytics';
import AudioManager from '../audio/AudioManager';

const SAVE_KEY = 'mai_pills';
const PERM_KEY = 'mai_permanent_pill_stats';
const DISC_KEY = 'mai_discovered_pills';
const PIN_KEY  = 'mai_pinned_recipes';
const CONS_KEY = 'mai_pills_consumed';

// Stats that contribute as INCREASED (percentage) type mods.
// All other stats contribute as FLAT.
const INCREASED_STATS = new Set(['harvest_speed', 'mining_speed']);

// Diminishing-returns base. Effective value = base * DR_BASE^N where N is
// the count of this pill already consumed. qi_speed is exempt — see
// scaledEffectValue below.
const DR_BASE = 0.96;

/** Stats that bypass diminishing-returns rounding (kept at raw float value). */
const DR_EXEMPT_STATS = new Set(['qi_speed']);

/**
 * Compute the effect value the player should receive for the (priorCount + 1)-th
 * consumption of a pill. Integer stats are rounded; qi_speed bypasses DR so its
 * 0.05 / 0.10 base values do not round to 0.
 */
export function scaledEffectValue(stat, baseValue, priorCount) {
  if (DR_EXEMPT_STATS.has(stat)) return baseValue;
  return Math.round(baseValue * Math.pow(DR_BASE, priorCount));
}

function loadOwned() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function loadPermanentStats() {
  try {
    const raw = localStorage.getItem(PERM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

// Legacy saves predate the consumed counter. They start at {} — DR begins
// applying to consumptions made AFTER the update; historical consumptions
// already baked into permanentStats are grandfathered.
function loadConsumed() {
  try {
    const raw = localStorage.getItem(CONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function loadPinned() {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function loadDiscovered() {
  try {
    const raw = localStorage.getItem(DISC_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Legacy save: if the player already owns pills from before this feature,
  // treat those as discovered so the recipe list isn't regressed.
  try {
    const ownedRaw = localStorage.getItem(SAVE_KEY);
    if (ownedRaw) {
      const owned = JSON.parse(ownedRaw);
      const seeded = {};
      for (const id of Object.keys(owned)) seeded[id] = true;
      return seeded;
    }
  } catch {}
  return {};
}

export default function usePills() {
  const [ownedPills,      setOwnedPills]      = useState(loadOwned);
  const [permanentStats,  setPermanentStats]   = useState(loadPermanentStats);
  const [discoveredPills, setDiscoveredPills]  = useState(loadDiscovered);
  const [pinnedRecipes,   setPinnedRecipes]   = useState(loadPinned);
  const [consumedPills,   setConsumedPills]   = useState(loadConsumed);

  // Persist owned pills
  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(ownedPills)); } catch {}
  }, [ownedPills]);

  // Persist permanent stats
  useEffect(() => {
    try { localStorage.setItem(PERM_KEY, JSON.stringify(permanentStats)); } catch {}
  }, [permanentStats]);

  // Persist discovered pills
  useEffect(() => {
    try { localStorage.setItem(DISC_KEY, JSON.stringify(discoveredPills)); } catch {}
  }, [discoveredPills]);

  // Persist pinned recipes
  useEffect(() => {
    try { localStorage.setItem(PIN_KEY, JSON.stringify(pinnedRecipes)); } catch {}
  }, [pinnedRecipes]);

  // Persist consumed counter (diminishing-returns input)
  useEffect(() => {
    try { localStorage.setItem(CONS_KEY, JSON.stringify(consumedPills)); } catch {}
  }, [consumedPills]);

  const craftPill = useCallback((pillId, n = 1) => {
    if (n <= 0) return;
    setOwnedPills(prev => ({
      ...prev,
      [pillId]: (prev[pillId] || 0) + n,
    }));
    setDiscoveredPills(prev => {
      if (prev[pillId]) return prev;
      try { trackPillDiscovered(pillId); } catch {}
      return { ...prev, [pillId]: true };
    });
    try { trackPillCrafted(pillId, n); } catch {}
    try { AudioManager.playSfx('item_craft'); } catch {}
  }, []);

  const isDiscovered = useCallback((pillId) => !!discoveredPills[pillId], [discoveredPills]);

  const isPinned = useCallback(
    (recipeKey) => pinnedRecipes.includes(recipeKey),
    [pinnedRecipes],
  );

  const togglePin = useCallback((recipeKey) => {
    setPinnedRecipes(prev =>
      prev.includes(recipeKey)
        ? prev.filter(k => k !== recipeKey)
        : [...prev, recipeKey],
    );
  }, []);

  /**
   * Consume one pill permanently.
   * @returns {Array<{stat: string, value: number}>} stat deltas for animation,
   *          or null if pill not owned / not found.
   */
  const usePill = useCallback((pillId) => {
    const pill = PILLS_BY_ID[pillId];
    if (!pill) return null;

    let didConsume = false;
    setOwnedPills(prev => {
      const current = prev[pillId] || 0;
      if (current <= 0) return prev;
      didConsume = true;
      return { ...prev, [pillId]: current - 1 };
    });

    if (!didConsume) return null;

    try { AudioManager.playSfx('item_pill_use'); } catch {}
    try {
      trackPillConsumed(pillId, pill.effects?.length ?? 0);
      trackFirstTime('PillConsumed');
    } catch {}

    // DR uses the count BEFORE this consumption — the first pill of an id
    // gets full value (0.98^0 = 1).
    const priorCount = consumedPills[pillId] || 0;
    const scaledEffects = pill.effects.map(eff => ({
      stat:  eff.stat,
      value: scaledEffectValue(eff.stat, eff.value, priorCount),
    }));

    // Accumulate stats permanently
    setPermanentStats(prev => {
      const next = { ...prev };
      for (const eff of scaledEffects) {
        next[eff.stat] = (next[eff.stat] ?? 0) + eff.value;
      }
      return next;
    });

    // Bump the consumed counter for next-time DR
    setConsumedPills(prev => ({
      ...prev,
      [pillId]: (prev[pillId] || 0) + 1,
    }));

    // Return scaled deltas for floating animation
    return scaledEffects;
  }, [ownedPills, consumedPills]); // eslint-disable-line react-hooks/exhaustive-deps

  const getOwnedCount = useCallback((pillId) => {
    return ownedPills[pillId] || 0;
  }, [ownedPills]);

  const consumeAll = useCallback((pillIds) => {
    const toConsume = pillIds.filter(id => (ownedPills[id] || 0) > 0);
    if (!toConsume.length) return;
    setOwnedPills(prev => {
      const next = { ...prev };
      for (const id of toConsume) next[id] = 0;
      return next;
    });
    // DR is per-pill: each individual pill in the qty stack uses its own
    // priorCount, so bulk consumption produces the same stats as consuming
    // them one-by-one.
    setPermanentStats(prev => {
      const next = { ...prev };
      for (const id of toConsume) {
        const pill = PILLS_BY_ID[id];
        if (!pill) continue;
        const qty = ownedPills[id] || 0;
        const startCount = consumedPills[id] || 0;
        for (const eff of pill.effects) {
          let acc = 0;
          for (let i = 0; i < qty; i++) {
            acc += scaledEffectValue(eff.stat, eff.value, startCount + i);
          }
          next[eff.stat] = (next[eff.stat] ?? 0) + acc;
        }
      }
      return next;
    });
    setConsumedPills(prev => {
      const next = { ...prev };
      for (const id of toConsume) {
        next[id] = (next[id] || 0) + (ownedPills[id] || 0);
      }
      return next;
    });
  }, [ownedPills, consumedPills]);

  /**
   * Returns { [stat]: [{type, value}] } for permanent pill stats.
   * qi_speed is excluded (handled via getQiMult).
   */
  const getStatModifiers = useCallback(() => {
    const mods = {};
    for (const [stat, total] of Object.entries(permanentStats)) {
      if (stat === 'qi_speed') continue;
      if (!total) continue;
      const modType = INCREASED_STATS.has(stat) ? 'increased' : 'flat';
      mods[stat] = [{ type: modType, value: total }];
    }
    return mods;
  }, [permanentStats]);

  /**
   * Returns additive qi multiplier: 1 + accumulated qi_speed value.
   */
  const getQiMult = useCallback(() => {
    return 1 + (permanentStats.qi_speed ?? 0);
  }, [permanentStats]);

  return {
    ownedPills,
    permanentStats,
    discoveredPills,
    pinnedRecipes,
    consumedPills,
    craftPill,
    usePill,
    consumeAll,
    getOwnedCount,
    isDiscovered,
    isPinned,
    togglePin,
    getStatModifiers,
    getQiMult,
    scaledEffectValue,
  };
}
