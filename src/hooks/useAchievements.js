import { useState, useCallback, useRef } from 'react';
import { ACHIEVEMENTS } from '../data/achievements';

const SAVE_KEY = 'mai_achievements';

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function persist(set) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify([...set]));
  } catch {}
}

export default function useAchievements({ onUnlock } = {}) {
  const [unlocked, setUnlocked] = useState(load);
  const unlockedRef = useRef(unlocked);

  const check = useCallback((snapshot) => {
    const newly = [];
    for (const a of ACHIEVEMENTS) {
      if (unlockedRef.current.has(a.id)) continue;
      try {
        if (a.condition(snapshot)) newly.push(a);
      } catch {}
    }
    if (newly.length === 0) return;
    const next = new Set(unlockedRef.current);
    for (const a of newly) {
      next.add(a.id);
      onUnlock?.(a);
    }
    unlockedRef.current = next;
    persist(next);
    setUnlocked(next);
  }, [onUnlock]);

  return {
    unlocked,
    unlockedCount: unlocked.size,
    totalCount:    ACHIEVEMENTS.length,
    isUnlocked:    (id) => unlocked.has(id),
    check,
  };
}
