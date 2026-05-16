import { useState, useEffect, useRef, useCallback } from 'react';
import PRODUCERS, { PRODUCERS_BY_ID } from '../data/producers';

const SAVE_KEY = 'mai_producers';

// ── Persistence ───────────────────────────────────────────────────────────────

function loadOwned() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveOwned(owned) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(owned)); } catch {}
}

// The offline-rate snapshot (`mai_producers_rate_snapshot`) is written by
// App.jsx — it needs to fold in per-producer upgrade multipliers which this
// hook intentionally doesn't know about. See the mirror effect in App.jsx
// that triggers on producers.owned OR upgrades.owned change.

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useProducers — owns the {[producerId]: ownedCount} map.
 *
 * Cost / max-affordable / rate are pure derivations from `owned`. The hook
 * deliberately does NOT touch qi — callers must spend qi through
 * `cultivation.spendQi(amount)` before calling `buy(id, n)`.
 *
 * Wiring: App.jsx mirrors `getRate()` into useCultivation's `producerRateRef`
 * each render; that ref is folded into the rAF rate formula.
 */
export default function useProducers() {
  const [owned, setOwned] = useState(loadOwned);
  const ownedRef = useRef(owned);

  useEffect(() => {
    ownedRef.current = owned;
    saveOwned(owned);
  }, [owned]);

  // Convenience accessor — owned count for a producer.
  const getOwned = useCallback((id) => owned[id] ?? 0, [owned]);

  /**
   * Geometric-sum cost for buying `n` units of `id` starting from the current
   * owned count. Formula: startCost × scaling^owned × (scaling^n − 1) / (scaling − 1).
   * Returns 0 for unknown ids or non-positive n.
   */
  const getCost = useCallback((id, n = 1) => {
    const p = PRODUCERS_BY_ID[id];
    if (!p || n <= 0) return 0;
    const o = owned[id] ?? 0;
    const s = p.costScaling;
    const geomSum = (Math.pow(s, n) - 1) / (s - 1);
    return Math.ceil(p.startCost * Math.pow(s, o) * geomSum);
  }, [owned]);

  /**
   * Max units of `id` purchasable with `qi`. Solves the cost-sum inequality:
   *   startCost × s^owned × (s^n − 1) / (s − 1)  ≤  qi
   * → n ≤ log( 1 + qi × (s−1) / (startCost × s^owned) ) / log(s)
   */
  const getMaxAffordable = useCallback((id, qi) => {
    const p = PRODUCERS_BY_ID[id];
    if (!p || qi <= 0) return 0;
    const o = owned[id] ?? 0;
    const s = p.costScaling;
    const rhs = 1 + (qi * (s - 1)) / (p.startCost * Math.pow(s, o));
    if (rhs <= 1) return 0;
    return Math.max(0, Math.floor(Math.log(rhs) / Math.log(s)));
  }, [owned]);

  /**
   * Sum of per-unit qi/sec × owned, across all producers.
   *
   * Optional `extraMult` callback returns a per-producer multiplier — used
   * by App.jsx to fold in the per-producer doubling upgrades from
   * useUpgrades.getProducerMult. Passing nothing returns the un-modified
   * producer sum (used by the offline-rate snapshot, which intentionally
   * excludes mutable upgrade state).
   */
  const getRate = useCallback((extraMult) => {
    const mult = typeof extraMult === 'function' ? extraMult : null;
    let rate = 0;
    for (const p of PRODUCERS) {
      const o = owned[p.id] ?? 0;
      if (o > 0) {
        const m = mult ? mult(p.id) : 1;
        rate += o * p.startQiPerSec * m;
      }
    }
    return rate;
  }, [owned]);

  /** Unlock predicate against current realm index. */
  const isUnlocked = useCallback((id, realmIndex) => {
    const p = PRODUCERS_BY_ID[id];
    if (!p) return false;
    const u = p.unlock ?? { type: 'always' };
    if (u.type === 'always') return true;
    if (u.type === 'realm')  return realmIndex >= u.minRealmIndex;
    return false;
  }, []);

  /**
   * Adds `n` units of producer `id`. CALLER must have already deducted the qi
   * via cultivation.spendQi(getCost(id, n)). Returns true on success.
   */
  const buy = useCallback((id, n = 1) => {
    if (n <= 0) return false;
    if (!PRODUCERS_BY_ID[id]) return false;
    setOwned(prev => ({ ...prev, [id]: (prev[id] ?? 0) + n }));
    return true;
  }, []);

  /**
   * Reincarnation reset — retain a fractional portion of each producer's
   * level (driven by Eternal Tree's `keepProducerLevelsFrac` modifier).
   * Default 0 = full wipe.
   */
  const resetToFraction = useCallback((frac = 0) => {
    setOwned(prev => {
      if (frac <= 0) return {};
      const out = {};
      for (const id of Object.keys(prev)) {
        const next = Math.floor((prev[id] ?? 0) * frac);
        if (next > 0) out[id] = next;
      }
      return out;
    });
  }, []);

  return {
    owned,
    ownedRef,
    getOwned,
    getCost,
    getMaxAffordable,
    getRate,
    isUnlocked,
    buy,
    resetToFraction,
  };
}
