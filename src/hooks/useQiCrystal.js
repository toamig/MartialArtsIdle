/**
 * useQiCrystal.js — Qi Crystal hook.
 *
 * The Qi Crystal is a permanent GLOBAL multiplier on cultivation rate.
 * Players spend qi (Round 3 — qi-fed) to accumulate refined QI; thresholds
 * trigger a level-up which raises the multiplier and unlocks mechanic-tier
 * sparks at visual evolutions (L10, L25, L50, L100 — see `crystalMechanicGrants.js`).
 *
 * Multiplier formula (2026-05-17 rebalance):
 *   crystalQiMult = 1 + level × CRYSTAL_MULT_PER_LEVEL  (0.003 → 0.3% / lvl)
 *
 * Designer intent: the crystal is NOT meant to be the primary qi engine.
 * It's a small steady boost that compounds with producers/sparks/laws.
 * Diminishing returns + soft-cap cost growth steer players to stop pursuing
 * levels past ~1000; the real reward for evolution is mechanic discovery.
 *
 * No hard level cap — but cost grows quadratically (n²) while bonus grows
 * linearly (×0.3% per level), so marginal qi/s/qi ratio decays fast enough
 * that grinding past ~1000 is wildly uneconomical compared to producer buys.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { getRefinedQi } from '../data/materials';
import { trackCrystalFed } from '../analytics';

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

/** Multiplier per crystal level. Total mult = 1 + level × this. */
export const CRYSTAL_MULT_PER_LEVEL = 0.003;

/** Total cultivation rate multiplier from owning a crystal at `level`. */
export function getCrystalQiMult(level) {
  if (level <= 0) return 1;
  return 1 + level * CRYSTAL_MULT_PER_LEVEL;
}

/**
 * Refined QI required to reach the given level.
 *
 * Exponent 3.00: cost grows n³ while the multiplier grows linearly. The
 * marginal qi/s gain per qi spent decays ~1/n² so the crystal naturally
 * soft-caps player interest around level 1000-2000 — past that, producer
 * purchases dominate the marginal-return calculation.
 *
 * Design intent: the crystal is for mechanic discovery (T2-T5 evolutions
 * grant mechanic-tier sparks) + a small global qi mult. NOT a primary qi
 * engine. See sim-cultivation.mjs for the optimal-greedy audit.
 *
 * Sample progression: 25, 200, 680, 1600, 3100, 5400, 8600, …
 */
export function getRequiredRefinedQi(targetLevel) {
  if (targetLevel < 1) return 0;
  const raw = 25 * Math.pow(targetLevel, 3.00);
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

  // Rebalance (2026-05-17): the ref now holds the MULTIPLIER (1 + level × 0.003)
  // not the legacy flat bonus. Kept under the old name to avoid touching the
  // many App.jsx mirror points; renamed conceptually via `getCrystalQiMult`.
  const crystalQiBonusRef = useRef(getCrystalQiMult(state.level));

  useEffect(() => {
    crystalQiBonusRef.current = getCrystalQiMult(state.level);
  }, [state.level]);

  /** Internal helper — set state, update ref, persist. */
  const applyState = useCallback((newState) => {
    const next = {
      level: Math.max(0, newState.level),
      refinedQi: Math.max(0, newState.refinedQi),
    };
    setState(next);
    crystalQiBonusRef.current = getCrystalQiMult(next.level);
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
    try { trackCrystalFed(level, result.tierChanged, endTier); } catch {}
    return result;
  }, [state.level, state.refinedQi, getQuantity, removeItem, applyState]);

  /**
   * Feed REFINED QI directly, paid by an arbitrary spend function (typically
   * `cultivation.spendQi`). Used under FEATURES.combat=false where the stone
   * economy is hidden and the crystal levels via qi spend instead.
   *
   * Conversion is 1:1 (1 qi → 1 RQI) — same level curve as stone-feeding so
   * a player who switches between v1 and v2 feels no curve discontinuity.
   *
   * Returns the same {tierChanged, previousTier, newTier, newLevel} shape as
   * feedMultiple so callers can re-use the evolution-overlay handler.
   *
   * @param {number} amount  — qi to spend (validated > 0)
   * @param {(n:number)=>boolean} spendFn — must atomically deduct `amount` and
   *                                        return true on success.
   */
  const feedQi = useCallback((amount, spendFn) => {
    const empty = { tierChanged: false, previousTier: 0, newTier: 0, newLevel: state.level };
    if (!Number.isFinite(amount) || amount <= 0) return empty;
    if (typeof spendFn !== 'function') return empty;
    const ok = spendFn(amount);
    if (!ok) return empty;

    let level     = state.level;
    let refinedQi = state.refinedQi + amount;
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
      : { tierChanged: false, previousTier: startTier, newTier: endTier, newLevel: level };
    applyState({ level, refinedQi });
    try { trackCrystalFed(level, result.tierChanged, endTier); } catch {}
    return result;
  }, [state.level, state.refinedQi, applyState]);

  const requiredForNext = getRequiredRefinedQi(state.level + 1);

  // Rebalance (2026-05-17): expose the multiplier directly. Keep the legacy
  // `crystalQiBonus` field name so any UI consumer that hasn't migrated still
  // resolves something (it now reads as the multiplier — UI re-labels needed).
  const crystalQiMult = getCrystalQiMult(state.level);
  return {
    level:            state.level,
    refinedQi:        state.refinedQi,
    requiredForNext,
    crystalQiMult,
    crystalQiBonus:   crystalQiMult, // legacy alias — soft-deprecated
    crystalQiBonusRef,                // ref now holds the multiplier
    feed,
    feedMultiple,
    // Cookie-Clicker pivot (v1) — qi-fed crystal leveling. See CrystalFeedModal.
    feedQi,
    _setLevel:        (n) => applyState({ level: n, refinedQi: 0 }),
  };
}
