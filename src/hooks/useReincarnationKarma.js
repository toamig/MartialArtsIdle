/**
 * useReincarnationKarma.js — tracks karma + the highest realm ever reached.
 *
 * Karma is awarded once per realm (first-time only). Persisted to
 * 'mai_reincarnation' — NOT wiped on reincarnation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  karmaForReachingIndex,
  totalKarmaForPeak,
  SAINT_UNLOCK_INDEX,
  PEAK_INDEX,
} from '../data/reincarnationTree';
import { trackKarmaSource, trackKarmaSink } from '../analytics';

const SAVE_KEY = 'mai_reincarnation';

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        karma:          data.karma          ?? 0,
        highestReached: data.highestReached ?? 0,
        maxAwarded:     data.maxAwarded     ?? 0,
        lives:          data.lives          ?? 0,
      };
    }
  } catch {}
  return { karma: 0, highestReached: 0, maxAwarded: 0, lives: 0 };
}

function persist(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
}

export default function useReincarnationKarma() {
  const [state, setState] = useState(loadState);

  // Persist on every change
  useEffect(() => { persist(state); }, [state]);

  /**
   * Called on every realm breakthrough. Awards karma immediately for any
   * newly-reached realm (first-time-only) so the player can invest in the
   * tree as they progress — no need to wait for a rebirth.
   */
  const noteRealmReached = useCallback((index) => {
    setState(prev => {
      if (index <= prev.maxAwarded && index <= prev.highestReached) return prev;
      let awarded = 0;
      for (let i = prev.maxAwarded + 1; i <= index; i++) {
        awarded += karmaForReachingIndex(i);
      }
      try { if (awarded > 0) trackKarmaSource(awarded, `r${index}`); } catch {}
      return {
        ...prev,
        karma:          prev.karma + awarded,
        maxAwarded:     Math.max(prev.maxAwarded, index),
        highestReached: Math.max(prev.highestReached, index),
      };
    });
  }, []);

  /** Bumps the life counter. Actual save wipe happens in App.jsx. */
  const reincarnate = useCallback(() => {
    setState(prev => ({ ...prev, lives: prev.lives + 1 }));
  }, []);

  /** Spend karma on a tree node. Returns true on success. */
  const spendKarma = useCallback((cost, nodeId = 'unknown') => {
    let ok = false;
    setState(prev => {
      if (prev.karma < cost) return prev;
      ok = true;
      return { ...prev, karma: prev.karma - cost };
    });
    if (ok) { try { trackKarmaSink(cost, nodeId); } catch {} }
    return ok;
  }, []);

  return {
    karma:           state.karma,
    highestReached:  state.highestReached,
    maxAwarded:      state.maxAwarded,
    lives:           state.lives,
    unlocked:        state.highestReached >= SAINT_UNLOCK_INDEX,
    peakKarmaTotal:  totalKarmaForPeak(PEAK_INDEX),
    noteRealmReached,
    reincarnate,
    spendKarma,
  };
}
