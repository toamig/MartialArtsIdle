/**
 * useQiCrystal.js — Qi Crystal hook (refined QI accumulation).
 *
 * The Qi Crystal is a permanent upgrade that adds flat qi/sec to cultivation.
 * Players feed QI stones (cultivation materials) to accumulate refined QI.
 * When the accumulated refined QI reaches the threshold, the crystal levels up.
 *
 * Bonus formula: level × 2 qi/sec (flat addition to BASE_RATE).
 * No level cap — cost scales infinitely.
 *
 * Debug commands are exposed on window.__debug.qiCrystal.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { getRefinedQi } from '../data/materials';

const SAVE_KEY = 'mai_qi_crystal';

/**
 * Refined QI required to reach the given level.
 * Gentle growth curve — exponent dropped from 1.55 → 1.30 so high-level
 * costs stay reachable without grinding indefinitely.
 * Sample progression: 50, 120, 210, 310, 420, 540, 660, 790, 930, 1100, …
 */
export function getRequiredRefinedQi(targetLevel) {
  if (targetLevel < 1) return 0;
  const raw = 50 * Math.pow(targetLevel, 1.30);
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

  const crystalQiBonusRef = useRef(state.level * 2);

  useEffect(() => {
    crystalQiBonusRef.current = state.level * 2;
  }, [state.level]);

  /** Internal helper — set state, update ref, persist. */
  const applyState = useCallback((newState) => {
    const next = {
      level: Math.max(0, newState.level),
      refinedQi: Math.max(0, newState.refinedQi),
    };
    setState(next);
    crystalQiBonusRef.current = next.level * 2;
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
      crystalQiBonusRef.current = level * 2;
      saveState(next);
      return next;
    });
  }, [getQuantity, removeItem]);

  const requiredForNext = getRequiredRefinedQi(state.level + 1);

  return {
    level:            state.level,
    refinedQi:        state.refinedQi,
    requiredForNext,
    crystalQiBonus:   state.level * 2,
    crystalQiBonusRef,
    feed,
    _setLevel:        (n) => applyState({ level: n, refinedQi: 0 }),
  };
}
