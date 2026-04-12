import { useState, useEffect, useCallback } from 'react';
import { PILLS_BY_ID } from '../data/pills';

const SAVE_KEY   = 'mai_pills';
const ACTIVE_KEY = 'mai_active_pills';

function loadOwned() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function loadActive() {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export default function usePills() {
  const [ownedPills, setOwnedPills]   = useState(loadOwned);
  const [activePills, setActivePills] = useState(loadActive);

  // Persist owned pills
  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(ownedPills)); } catch {}
  }, [ownedPills]);

  // Persist active pills
  useEffect(() => {
    try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(activePills)); } catch {}
  }, [activePills]);

  // Auto-expire: 1s interval that filters expired pills
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePills(prev => {
        const now = Date.now();
        const filtered = prev.filter(p => p.expiresAt > now);
        if (filtered.length !== prev.length) return filtered;
        return prev; // no change — avoid re-render
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const craftPill = useCallback((pillId) => {
    setOwnedPills(prev => ({
      ...prev,
      [pillId]: (prev[pillId] || 0) + 1,
    }));
  }, []);

  const usePill = useCallback((pillId) => {
    const pill = PILLS_BY_ID[pillId];
    if (!pill) return;
    setOwnedPills(prev => {
      const current = prev[pillId] || 0;
      if (current <= 0) return prev;
      return { ...prev, [pillId]: current - 1 };
    });
    setActivePills(prev => [
      ...prev,
      { pillId, expiresAt: Date.now() + pill.duration * 1000 },
    ]);
  }, []);

  const getOwnedCount = useCallback((pillId) => {
    return ownedPills[pillId] || 0;
  }, [ownedPills]);

  /**
   * Returns { [stat]: [{type, value}] } for all active (non-expired) pill effects,
   * EXCLUDING qi_speed effects (those are handled by getQiMult).
   */
  const getStatModifiers = useCallback(() => {
    const now = Date.now();
    const mods = {};
    for (const active of activePills) {
      if (active.expiresAt <= now) continue;
      const pill = PILLS_BY_ID[active.pillId];
      if (!pill) continue;
      for (const eff of pill.effects) {
        if (eff.stat === 'qi_speed') continue;
        if (!mods[eff.stat]) mods[eff.stat] = [];
        mods[eff.stat].push({ type: eff.type, value: eff.value });
      }
    }
    return mods;
  }, [activePills]);

  /**
   * Returns additive qi multiplier: 1 + sum of all active qi_speed values.
   */
  const getQiMult = useCallback(() => {
    const now = Date.now();
    let sum = 0;
    for (const active of activePills) {
      if (active.expiresAt <= now) continue;
      const pill = PILLS_BY_ID[active.pillId];
      if (!pill) continue;
      for (const eff of pill.effects) {
        if (eff.stat === 'qi_speed') sum += eff.value;
      }
    }
    return 1 + sum;
  }, [activePills]);

  return {
    ownedPills,
    activePills,
    craftPill,
    usePill,
    getOwnedCount,
    getStatModifiers,
    getQiMult,
  };
}
