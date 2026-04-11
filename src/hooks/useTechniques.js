import { useState, useCallback } from 'react';
import { saveTechniques, loadTechniques } from '../systems/save';
import { getTechnique } from '../data/techniques';

const SLOT_COUNT = 3;

export default function useTechniques() {
  const [slots, setSlots] = useState(() => {
    const saved = loadTechniques();
    return Array.from({ length: SLOT_COUNT }, (_, i) => saved?.[i] ?? null);
  });

  // equip by technique ID (null = unequip)
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
    slots,                                              // string|null per slot
    equippedTechniques: slots.map(id => getTechnique(id)), // full objects (null if empty)
    equip,
    unequip,
  };
}
