import { useState, useEffect, useCallback } from 'react';
import { saveTechniques, loadTechniques, saveOwnedTechniques, loadOwnedTechniques } from '../systems/save';
import { getTechnique } from '../data/techniques';

// One-shot save migration flag. The 2026-04-26 secret-tech overhaul switched
// the technique system from procedural generation + passive pool to a fixed
// unique catalogue. Old `mai_owned_techniques` entries reference random ids
// + display-only passives that no longer exist; wipe them once on first load
// and stamp this flag so we don't re-wipe on every mount.
const MIGRATION_FLAG_KEY = 'mai_techniques_pool_v2';

// Base slot count is 3; the reincarnation tree node `md_3` (The Fourth
// Form) raises it to 4. Hook accepts an `extraSlots` arg from App.jsx so
// the base value lives here and the augment lives in the tree hook.
const SLOT_COUNT = 3;
export const MAX_SLOT_COUNT = 4;
export const MAX_TECHNIQUES = 100;

function loadOwnedWithMigration() {
  try {
    if (!localStorage.getItem(MIGRATION_FLAG_KEY)) {
      // Drop any pre-overhaul drops + clear all equipped slots, then stamp
      // the flag. localStorage.setItem handles the slot wipe via the same
      // empty array the load helper would return.
      saveOwnedTechniques({});
      saveTechniques(Array.from({ length: MAX_SLOT_COUNT }, () => null));
      localStorage.setItem(MIGRATION_FLAG_KEY, '1');
      return {};
    }
  } catch { /* localStorage unavailable — fall through to load */ }
  return loadOwnedTechniques();
}

export default function useTechniques({ extraSlots = 0 } = {}) {
  const totalSlots = Math.min(MAX_SLOT_COUNT, SLOT_COUNT + extraSlots);
  const [slots, setSlots] = useState(() => {
    const saved = loadTechniques();
    return Array.from({ length: MAX_SLOT_COUNT }, (_, i) => saved?.[i] ?? null);
  });

  // { [id]: techniqueObj } — all acquired techniques (drops only, no starter seeding)
  const [ownedTechniques, setOwned] = useState(() => loadOwnedWithMigration());

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

  /** Look up a technique by id — the owned (drop-instance) entry first, then
   *  the static catalogue (so legacy ids without the drop suffix still resolve). */
  const getTechById = useCallback((id) => {
    if (!id) return null;
    return ownedTechniques[id] ?? getTechnique(id) ?? null;
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

  /**
   * Dismantle an owned technique. Refuses if it's currently equipped in
   * any slot. Returns the quality on success (so caller can grant the
   * matching mineral) or null if it's locked / missing.
   */
  const dismantleTechnique = useCallback((id) => {
    // Equipped check — can't dismantle while slotted.
    if (slots.includes(id)) return null;
    let quality = null;
    setOwned(prev => {
      const tech = prev[id];
      if (!tech) return prev;
      quality = tech.quality ?? 'Iron';
      const next = { ...prev };
      delete next[id];
      return next;
    });
    return quality;
  }, [slots]);

  // Slice both `slots` and `equippedTechniques` to `totalSlots` so the
  // UI / combat loops that consume them see only the unlocked ones.
  // Underlying state always carries MAX_SLOT_COUNT positions so a player
  // who unlocks the 4th slot mid-life keeps any tech they had stored
  // there (e.g. via debug commands) without losing it.
  const visibleSlots = slots.slice(0, totalSlots);
  return {
    slots: visibleSlots,
    slotCount: totalSlots,
    ownedTechniques,
    equippedTechniques: visibleSlots.map(getTechById),
    addOwnedTechnique,
    dismantleTechnique,
    equip,
    unequip,
  };
}
