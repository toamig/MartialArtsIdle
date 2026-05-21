/**
 * useQiCrystal.js — Qi Crystal hook.
 *
 * The Qi Crystal is a permanent GLOBAL multiplier on cultivation rate.
 * Players spend qi (Round 3 — qi-fed) to accumulate refined QI; thresholds
 * trigger a level-up which raises the multiplier and unlocks mechanic-tier
 * sparks at visual evolutions (L10, L25, L50, L100 — see `crystalMechanicGrants.js`).
 *
 * 2026-05-21 Dial-5 rebalance: the crystal is now a CAPPED, COMPLETABLE
 * subsystem (max L100). Players max it in the Saint band and the long-term
 * progression moves to Eternal Tree + future content. Eliminates the "1000+
 * crystal levels of grind" fatigue.
 *
 * Multiplier formula (post-Dial-5):
 *   crystalQiMult = 1 + level × 0.02         (linear, ×3.0 at L100 cap)
 *
 * Cost formula:
 *   cost(n) = 1000 × n³  rounded to ~2 sig figs
 *   L1 = 1K, L10 = 1M, L25 = 15.6M, L50 = 125M, L100 = 1B
 *
 * L100 is reachable around Saint Middle/Late (650M-3B qi), so the player
 * naturally maxes the crystal as they approach the rebirth-loop wall.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { getRefinedQi } from '../data/materials';
import { trackCrystalFed } from '../analytics';

const SAVE_KEY = 'mai_qi_crystal';

/**
 * Hard level cap. Crystal is a capped-completable subsystem (Dial-5).
 * Once a player hits L100 they've maxed the crystal — no further grind.
 * Long-term progression continues via Eternal Tree + future content.
 */
export const MAX_CRYSTAL_LEVEL = 100;

/**
 * Visual tier thresholds — the level at which the crystal evolves to a new
 * sprite. Re-distributed for the L100 cap (Dial-5):
 *   T1 = L1, T2 = L10, T3 = L25, T4 = L50, T5 = L75, T6 = L100.
 * T2-T5 grant mechanic-tier sparks (see crystalMechanicGrants.js).
 * T6 is the "max crystal" visual milestone — no spark grant, just glow.
 * Kept in sync with the copies in HomeScreen.jsx and CrystalFeedModal.jsx.
 */
const CRYSTAL_TIER_THRESHOLDS = [100, 75, 50, 25, 10, 1];
const CRYSTAL_TIER_VALUES     = [  6,  5,  4,  3,  2, 1];

/** Visual tier for a given crystal level. Level 0 returns 0. */
export function getCrystalTier(level) {
  if (level <= 0) return 0;
  for (let i = 0; i < CRYSTAL_TIER_THRESHOLDS.length; i++) {
    if (level >= CRYSTAL_TIER_THRESHOLDS[i]) return CRYSTAL_TIER_VALUES[i];
  }
  return 1;
}

/** Multiplier per crystal level. Linear +2% per level up to the cap.
 *  Kept as a named export so any consumers can compute marginal gains. */
export const CRYSTAL_MULT_PER_LEVEL = 0.02;

/**
 * Total cultivation rate multiplier from owning a crystal at `level`.
 * Clamped to MAX_CRYSTAL_LEVEL — once you max, the mult is fixed at ×3.0.
 */
export function getCrystalQiMult(level) {
  if (level <= 0) return 1;
  const clamped = Math.min(level, MAX_CRYSTAL_LEVEL);
  return 1 + clamped * CRYSTAL_MULT_PER_LEVEL;
}

/**
 * Refined QI required to reach the given level.
 *
 * 2026-05-21 Dial-5: base 100 chosen so total cumulative L0→L100 cost
 * ≈ 2.5B qi (sum of n³ × 100 from 1 to 100 = ~2.55B), pacing the crystal
 * max-out to land around Saint Middle (realm 25, 1.4B cost) → Saint Late
 * (realm 26, 3.0B cost). Players naturally finish the crystal as they
 * approach the rebirth-loop wall.
 *
 * Sample progression:
 *   L1 = 100 qi          (instant)
 *   L10 = 100K qi        (~Qi Transform Late, ~Crystal Reservoir unlock)
 *   L25 = 1.56M qi       (~True Element Late, ~Consecutive Focus)
 *   L50 = 12.5M qi       (~Separation 1st, ~Divine Qi)
 *   L75 = 42.2M qi       (~Immortal Ascension, ~Saint Early)
 *   L100 = 100M qi       (~Saint Middle — Tracing Meridians + max)
 *
 * Targets above MAX_CRYSTAL_LEVEL still compute a cost (used by UI to
 * show "max reached") — actual level-up logic clamps the cap.
 */
export function getRequiredRefinedQi(targetLevel) {
  if (targetLevel < 1) return 0;
  const raw = 100 * Math.pow(targetLevel, 3.00);
  // Round to a clean step that scales with magnitude (keeps ~2 significant digits)
  const step = Math.pow(10, Math.max(1, Math.floor(Math.log10(raw)) - 1));
  return Math.round(raw / step) * step;
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // 2026-05-21 Dial-5: clamp legacy saves above the new cap. Players
      // with pre-cap crystals at L1000+ snap to L100 (mult ×3.0). RQI is
      // also zeroed so the "level up" UI doesn't show progress against a
      // cap they can't pass.
      const level     = Math.max(0, Math.min(MAX_CRYSTAL_LEVEL, data.level ?? 0));
      const refinedQi = level >= MAX_CRYSTAL_LEVEL ? 0 : Math.max(0, data.refinedQi ?? 0);
      return { level, refinedQi };
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

  /** Internal helper — set state, update ref, persist. Clamps to cap. */
  const applyState = useCallback((newState) => {
    const level = Math.max(0, Math.min(MAX_CRYSTAL_LEVEL, newState.level));
    const next = {
      level,
      refinedQi: level >= MAX_CRYSTAL_LEVEL ? 0 : Math.max(0, newState.refinedQi),
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

      // Auto-level when threshold crossed — clamped at MAX_CRYSTAL_LEVEL.
      while (level < MAX_CRYSTAL_LEVEL) {
        const needed = getRequiredRefinedQi(level + 1);
        if (refinedQi >= needed) {
          refinedQi -= needed;
          level += 1;
        } else {
          break;
        }
      }
      // Once at cap, excess RQI is discarded (no point banking it).
      if (level >= MAX_CRYSTAL_LEVEL) refinedQi = 0;

      const next = { level, refinedQi };
      crystalQiBonusRef.current = getCrystalQiMult(level);
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
    while (level < MAX_CRYSTAL_LEVEL) {
      const needed = getRequiredRefinedQi(level + 1);
      if (refinedQi < needed) break;
      refinedQi -= needed;
      level += 1;
    }
    if (level >= MAX_CRYSTAL_LEVEL) refinedQi = 0;
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
    while (level < MAX_CRYSTAL_LEVEL) {
      const needed = getRequiredRefinedQi(level + 1);
      if (refinedQi < needed) break;
      refinedQi -= needed;
      level += 1;
    }
    if (level >= MAX_CRYSTAL_LEVEL) refinedQi = 0;
    const endTier = getCrystalTier(level);
    const result  = endTier !== startTier
      ? { tierChanged: true, previousTier: startTier, newTier: endTier, newLevel: level }
      : { tierChanged: false, previousTier: startTier, newTier: endTier, newLevel: level };
    applyState({ level, refinedQi });
    try { trackCrystalFed(level, result.tierChanged, endTier); } catch {}
    return result;
  }, [state.level, state.refinedQi, applyState]);

  // 2026-05-21 Dial-5: at max level requiredForNext = 0, so the refine UI
  // (which gates on `cost > 0`) automatically hides the upgrade affordance.
  const isMaxed = state.level >= MAX_CRYSTAL_LEVEL;
  const requiredForNext = isMaxed ? 0 : getRequiredRefinedQi(state.level + 1);

  // Rebalance (2026-05-17): expose the multiplier directly. Keep the legacy
  // `crystalQiBonus` field name so any UI consumer that hasn't migrated still
  // resolves something (it now reads as the multiplier — UI re-labels needed).
  const crystalQiMult = getCrystalQiMult(state.level);
  return {
    level:            state.level,
    refinedQi:        state.refinedQi,
    requiredForNext,
    isMaxed,
    maxLevel:         MAX_CRYSTAL_LEVEL,
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
