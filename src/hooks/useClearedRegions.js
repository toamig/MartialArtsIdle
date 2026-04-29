import { useState, useCallback, useRef } from 'react';
import { trackRegionCleared } from '../analytics';

const KEY = 'mai_cleared_regions';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function persist(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {}
}

/**
 * Tracks which regions the player has won at least one fight in.
 * Persisted in localStorage under mai_cleared_regions.
 *
 * Returns:
 *   clearedRegions    — Set<string> of region names (React state, triggers re-renders)
 *   clearRegion(name) — marks a region cleared; returns true if it was NEW this call
 */
export default function useClearedRegions() {
  const ref = useRef(load());
  const [clearedRegions, setClearedRegions] = useState(() => ref.current);

  const clearRegion = useCallback((name) => {
    if (!name || ref.current.has(name)) return false;
    const next = new Set(ref.current);
    next.add(name);
    ref.current = next;
    persist(next);
    setClearedRegions(next);
    try { trackRegionCleared(name); } catch {}
    return true;
  }, []);

  return { clearedRegions, clearRegion };
}
