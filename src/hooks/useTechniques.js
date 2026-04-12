import { useState, useEffect, useCallback } from 'react';
import { saveTechniques, loadTechniques, saveOwnedTechniques, loadOwnedTechniques } from '../systems/save';
import { getTechnique } from '../data/techniques';

const SLOT_COUNT = 3;
export const MAX_TECHNIQUES = 100;

export default function useTechniques() {
  const [slots, setSlots] = useState(() => {
    const saved = loadTechniques();
    return Array.from({ length: SLOT_COUNT }, (_, i) => saved?.[i] ?? null);
  });

  // { [id]: techniqueObj } — techniques acquired through drops
  const [ownedTechniques, setOwned] = useState(() => loadOwnedTechniques());

  useEffect(() => {
    saveOwnedTechniques(ownedTechniques);
  }, [ownedTechniques]);

  /** Add a dropped technique to the owned collection. Silently ignored when full. */
  const addOwnedTechnique = useCallback((tech) => {
    setOwned(prev => {
      if (Object.keys(prev).length >= MAX_TECHNIQUES) return prev;
      return { ...prev, [tech.id]: tech };
    });
  }, []);

  /** Look up a technique by id — static catalogue first, then owned drops. */
  const getTechById = useCallback((id) => {
    if (!id) return null;
    return getTechnique(id) ?? ownedTechniques[id] ?? null;
  }, [ownedTechniques]);

  const equip = useCallback((slotIndex, techniqueId) => {
    setSlots(prev => {
      const next = [...prev];
      if (techniqueId === null) {
        next[slotIndex] = null;
      } else {
        // Remove the same technique from any other slot first
        for (let i = 0; i < next.length; i++) {
          if (i !== slotIndex && next[i] === techniqueId) next[i] = null;
        }
        next[slotIndex] = techniqueId;
      }
      saveTechniques(next);
      return next;
    });
  }, []);

  const unequip = useCallback((slotIndex) => {
    setSlots(prev => {
      const next = [...prev];
      next[slotIndex] = null;
      saveTechniques(next);
      return next;
    });
  }, []);

  return {
    slots,
    ownedTechniques,                          // { [id]: techniqueObj }
    equippedTechniques: slots.map(getTechById),
    addOwnedTechnique,
    equip,
    unequip,
  };
}
