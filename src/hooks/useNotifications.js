import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import WORLDS from '../data/worlds';
import { RECIPE_MAP } from '../data/pills';

const SEEN_WORLDS_KEY = 'mai_seen_worlds';

function loadSeenWorlds(realmIndex) {
  try {
    const raw = localStorage.getItem(SEEN_WORLDS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  // First load — treat all currently unlocked worlds as already seen
  // so the badge only fires for genuinely new unlocks going forward.
  return new Set(
    WORLDS.filter(w => realmIndex >= w.minRealmIndex).map(w => w.id)
  );
}

function saveSeenWorlds(set) {
  try {
    localStorage.setItem(SEEN_WORLDS_KEY, JSON.stringify([...set]));
  } catch {}
}

/** Returns true if the player can brew at least one pill right now. */
function canBrewAnyPill(getQuantity) {
  return Object.keys(RECIPE_MAP).some(key => {
    const herbs = key.split('|');
    const needed = {};
    for (const h of herbs) needed[h] = (needed[h] ?? 0) + 1;
    return Object.entries(needed).every(([id, qty]) => getQuantity(id) >= qty);
  });
}

let toastCounter = 0;

export default function useNotifications({ cultivation, inventory }) {
  const [seenWorlds, setSeenWorlds] = useState(() =>
    loadSeenWorlds(cultivation.realmIndex)
  );
  const [toastQueue, setToastQueue] = useState([]);
  const prevRealmIndex = useRef(cultivation.realmIndex);

  useEffect(() => {
    saveSeenWorlds(seenWorlds);
  }, [seenWorlds]);

  // Detect realm index jumps → fire toast for newly unlocked worlds
  useEffect(() => {
    const prev = prevRealmIndex.current;
    const curr = cultivation.realmIndex;
    if (curr === prev) return;
    prevRealmIndex.current = curr;

    const newlyUnlocked = WORLDS.filter(
      w => w.minRealmIndex > 0 && curr >= w.minRealmIndex && prev < w.minRealmIndex
    );

    if (newlyUnlocked.length === 0) return;

    setToastQueue(q => [
      ...q,
      ...newlyUnlocked.map(w => ({
        id: `world-${w.id}-${++toastCounter}`,
        message: `New World Unlocked: ${w.name}`,
        targetScreen: 'worlds',
        targetParam: { expandWorldId: w.id },
        duration: 6000,
      })),
    ]);
  }, [cultivation.realmIndex]);

  // Badge: Worlds tab — any unlocked world the player hasn't visited yet
  const combatBadge = useMemo(() =>
    WORLDS.some(w => cultivation.realmIndex >= w.minRealmIndex && !seenWorlds.has(w.id)),
    [cultivation.realmIndex, seenWorlds]
  );

  // Badge: Production tab — any pill recipe brewable right now
  const productionBadge = useMemo(() =>
    canBrewAnyPill(inventory.getQuantity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventory.inventory]
  );

  const badges = { worlds: combatBadge, production: productionBadge };

  /** Call when the player navigates to a tab to clear its badge. */
  const clearBadge = useCallback((screen) => {
    if (screen === 'worlds') {
      setSeenWorlds(prev => {
        const next = new Set(prev);
        WORLDS.forEach(w => {
          if (cultivation.realmIndex >= w.minRealmIndex) next.add(w.id);
        });
        return next;
      });
    }
    // production badge is purely derived — clears automatically once ingredients are used
  }, [cultivation.realmIndex]);

  const dismissToast = useCallback((id) => {
    setToastQueue(q => q.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    setToastQueue(q => [...q, { id: `ext-${++toastCounter}`, ...toast }]);
  }, []);

  return { badges, toastQueue, clearBadge, dismissToast, addToast };
}
