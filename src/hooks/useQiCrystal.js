/**
 * useQiCrystal.js — Qi Crystal hook (refined QI accumulation).
 *
 * The Qi Crystal is a permanent upgrade that adds flat qi/sec to cultivation.
 * Players feed QI stones (cultivation materials) to accumulate refined QI.
 * When the accumulated refined QI reaches the threshold, the crystal levels up.
 *
 * Bonus formula: each level L adds (L + 1) qi/sec, so the cumulative bonus at
 * level N is N·(N+3)/2 qi/sec. Per-level gains scale 2, 3, 4, 5, … to keep
 * upgrades feeling meaningful at high levels.
 * No level cap — cost scales infinitely.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { getRefinedQi } from '../data/materials';

const SAVE_KEY = 'mai_qi_crystal';

/**
 * Visual tier thresholds — the level at which the crystal evolves to a new
 * sprite (tier 2 = L10, tier 3 = L25, …). Kept in sync with the copies in
 * HomeScreen.jsx and CrystalFeedModal.jsx.
 */
const CRYSTAL_TIER_THRESHOLDS = [1000, 750, 500, 350, 200, 100, 50, 25, 10, 1];
const CRYSTAL_TIER_VALUES     = [  10,   9,   8,   7,   6,   5,  4,  3,  2, 1];

/** Visual tier (1–10) for a given crystal level. Level 0 returns 0. */
export function getCrystalTier(level) {
  if (level <= 0) return 0;
  for (let i = 0; i < CRYSTAL_TIER_THRESHOLDS.length; i++) {
    if (level >= CRYSTAL_TIER_THRESHOLDS[i]) return CRYSTAL_TIER_VALUES[i];
  }
  return 1;
}

/**
 * Refined QI required to reach the given level.
 * Gentle growth curve — exponent 1.30, base halved from 50 → 25 so early
 * upgrades stay brisk and high-level costs don't require indefinite grinding.
 * Sample progression: 25, 60, 105, 155, 210, 270, 330, 395, 465, 550, …
 */
export function getRequiredRefinedQi(targetLevel) {
  if (targetLevel < 1) return 0;
  const raw = 25 * Math.pow(targetLevel, 1.30);
  // Round to a clean step that scales with magnitude (keeps ~2 significant digits)
  const step = Math.pow(10, Math.max(1, Math.floor(Math.log10(raw)) - 1));
  return Math.round(raw / step) * step;
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        level: data.level ?? 0,
        refinedQi: data.refinedQi ?? 0,
      };
    }
  } catch {}
  return { level: 0, refinedQi: 0 };
}

function saveState({ level, refinedQi }) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ level, refinedQi })); } catch {}
}

/**
 * @param {{ getQuantity: (id: string) => number, removeItem: (id: string, qty: number) => void }} param
 */
export default function useQiCrystal({ getQuantity, removeItem } = {}) {
  const [state, setState] = useState(loadState);

  const crystalQiBonusRef = useRef((state.level * (state.level + 3)) / 2);

  useEffect(() => {
    crystalQiBonusRef.current = (state.level * (state.level + 3)) / 2;
  }, [state.level]);

  /** Internal helper — set state, update ref, persist. */
  const applyState = useCallback((newState) => {
    const next = {
      level: Math.max(0, newState.level),
      refinedQi: Math.max(0, newState.refinedQi),
    };
    setState(next);
    crystalQiBonusRef.current = (next.level * (next.level + 3)) / 2;
    saveState(next);
  }, []);

  /**
   * Feed QI stones to the crystal.
   * @param {string} itemId - cultivation stone item ID
   * @param {number} qty - number of stones to consume
   */
  const feed = useCallback((itemId, qty) => {
    const rqi = getRefinedQi(itemId);
    if (rqi <= 0 || qty <= 0) return;

    const owned = getQuantity?.(itemId) ?? 0;
    const actualQty = Math.min(qty, owned);
    if (actualQty <= 0) return;

    removeItem?.(itemId, actualQty);

    setState(prev => {
      let { level, refinedQi } = prev;
      refinedQi += actualQty * rqi;

      // Auto-level when threshold crossed (no cap)
      while (true) {
        const needed = getRequiredRefinedQi(level + 1);
        if (refinedQi >= needed) {
          refinedQi -= needed;
          level += 1;
        } else {
          break;
        }
      }

      const next = { level, refinedQi };
      crystalQiBonusRef.current = (level * (level + 3)) / 2;
      saveState(next);
      return next;
    });
  }, [getQuantity, removeItem]);

  /**
   * Feed multiple stone types in a single atomic operation.
   * Used by the redesigned feed modal that lets the player set an RQI target
   * and auto-consumes stones (cheapest-first) to hit it.
   *
   * Consumes the full RQI and levels up all the way — the player always gets
   * every level they paid for. If ANY visual-tier boundary was crossed in the
   * process, the returned info describes the START → END tier jump so the
   * caller can play one evolution overlay (even when multiple tiers were
   * crossed in a single feed).
   *
   * @param {Array<{id: string, qty: number}>} plan
   * @returns {{ tierChanged: boolean, previousTier: number, newTier: number, newLevel: number }}
   */
  const feedMultiple = useCallback((plan) => {
    const empty = { tierChanged: false, previousTier: 0, newTier: 0, newLevel: 0 };
    if (!Array.isArray(plan) || plan.length === 0) return empty;

    // Remove items from inventory and tally the RQI gain
    let totalRqi = 0;
    for (const { id, qty } of plan) {
      const rqi   = getRefinedQi(id);
      if (rqi <= 0 || qty <= 0) continue;
      const owned = getQuantity?.(id) ?? 0;
      const used  = Math.min(qty, owned);
      if (used <= 0) continue;
      removeItem?.(id, used);
      totalRqi += used * rqi;
    }
    if (totalRqi <= 0) return empty;

    // Compute the transition eagerly from current state so the return value is
    // populated before this function returns (setState updaters are not
    // guaranteed to run synchronously).
    let level       = state.level;
    let refinedQi   = state.refinedQi + totalRqi;
    // Treat locked (tier 0) as tier 1 for evolution purposes — the locked sprite
    // is effectively the tier-1 crystal dimmed, so unlocking isn't a true tier jump.
    const startTier = Math.max(getCrystalTier(level), 1);
    while (true) {
      const needed = getRequiredRefinedQi(level + 1);
      if (refinedQi < needed) break;
      refinedQi -= needed;
      level += 1;
    }
    const endTier = getCrystalTier(level);
    const result  = endTier !== startTier
      ? { tierChanged: true, previousTier: startTier, newTier: endTier, newLevel: level }
      : empty;
    applyState({ level, refinedQi });
    return result;
  }, [state.level, state.refinedQi, getQuantity, removeItem, applyState]);

  const requiredForNext = getRequiredRefinedQi(state.level + 1);

  return {
    level:            state.level,
    refinedQi:        state.refinedQi,
    requiredForNext,
    crystalQiBonus:   (state.level * (state.level + 3)) / 2,
    crystalQiBonusRef,
    feed,
    feedMultiple,
    _setLevel:        (n) => applyState({ level: n, refinedQi: 0 }),
  };
}
