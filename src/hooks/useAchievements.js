import { useState, useCallback, useMemo, useRef } from 'react';
import { ACHIEVEMENTS, CATEGORY_REQUIRES } from '../data/achievements';
import { FEATURES } from '../data/featureFlags';

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

// True if an achievement's category requires a feature that's currently off.
// Hidden achievements don't appear in the displayed list and aren't checked
// (so a stray combat-era snapshot can't silently fire one that the player
// will never see). Previously-unlocked achievements stay in the save —
// they reappear in the modal when the gating flag flips on in v2.
function isHiddenInBuild(achievement) {
  const req = CATEGORY_REQUIRES[achievement.category] ?? null;
  if (!req) return false;
  return !FEATURES[req];
}

export default function useAchievements({ onUnlock } = {}) {
  const [unlocked, setUnlocked] = useState(load);
  const unlockedRef = useRef(unlocked);

  // The filtered list visible & checkable in this build. Memoised once —
  // FEATURES is a frozen build-time const, so this never re-computes.
  const visible = useMemo(
    () => ACHIEVEMENTS.filter(a => !isHiddenInBuild(a)),
    [],
  );

  const check = useCallback((snapshot) => {
    const newly = [];
    for (const a of visible) {
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
  }, [onUnlock, visible]);

  return {
    unlocked,
    // Visible (unlocked count + total) reflect the FEATURE-filtered set so
    // a v1 player doesn't see "7 / 23" with 16 unreachable entries — they
    // see "0 / 7" (or however many cultivation achievements they've earned).
    unlockedCount: visible.filter(a => unlocked.has(a.id)).length,
    totalCount:    visible.length,
    visible,
    isUnlocked:    (id) => unlocked.has(id),
    check,
  };
}
