import { useState, useEffect, useRef, useCallback } from 'react';
import { saveTechniques, loadTechniques, saveOwnedTechniques, loadOwnedTechniques } from '../systems/save';
import { getTechnique, getTechniqueBaseId } from '../data/techniques';

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

  // Synchronous shadow of `ownedTechniques`. The dedupe in addOwnedTechnique
  // needs an up-to-date view in the same tick: in combat, drops happen one
  // per kill so the React closure is fresh, but in tight debug loops (e.g.
  // gd.giveTechniques(15)) every call shares the same stale closure and
  // every drop reads as "not owned yet". Mutating + reading the ref keeps
  // dedupe correct for both paths without changing the caller API.
  const ownedRef = useRef(ownedTechniques);
  useEffect(() => { ownedRef.current = ownedTechniques; }, [ownedTechniques]);

  useEffect(() => {
    saveOwnedTechniques(ownedTechniques);
  }, [ownedTechniques]);

  /**
   * Add a dropped technique to the owned collection.
   *
   * Returns `{ added, duplicate, baseId, quality }`:
   *   - `duplicate: true`  — the catalogue entry is already owned (any drop
   *     instance with a matching base id). Caller is expected to refund the
   *     equivalent dismantle mineral and surface the auto-dismantle in the
   *     combat log. State is not mutated.
   *   - `added: true`      — successfully added (was not a duplicate).
   *   - `added: false, duplicate: false` — capped at MAX_TECHNIQUES, dropped on the floor.
   */
  const addOwnedTechnique = useCallback((tech) => {
    const baseId = getTechniqueBaseId(tech.id);
    const current = ownedRef.current;
    const isDuplicate = Object.values(current)
      .some(t => getTechniqueBaseId(t.id) === baseId);
    if (isDuplicate) {
      return { added: false, duplicate: true, baseId, quality: tech.quality ?? 'Iron' };
    }
    if (Object.keys(current).length >= MAX_TECHNIQUES) {
      return { added: false, duplicate: false, baseId, quality: tech.quality ?? 'Iron' };
    }
    const next = { ...current, [tech.id]: tech };
    ownedRef.current = next;  // sync update so subsequent calls in this tick see the addition
    setOwned(next);
    return { added: true, duplicate: false, baseId, quality: tech.quality ?? 'Iron' };
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
    const tech = ownedRef.current[id];
    if (!tech) return null;
    const quality = tech.quality ?? 'Iron';
    const next = { ...ownedRef.current };
    delete next[id];
    ownedRef.current = next;
    setOwned(next);
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
