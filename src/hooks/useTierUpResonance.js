/**
 * useTierUpResonance — Plan B V1 mechanic.
 *
 * Tracks the highest sprite tier each producer has reached during the
 * current life. When a producer crosses a sprite tier (Bronze → Silver →
 * Gold → Mythic), its per-unit qi/s gains a permanent (this-run) bonus.
 *
 * The bonus value is composed of two sources:
 *   1. A baseline value applied to ALL producers (granted by the
 *      `pe_root` Eternal Tree node when V1.2 lands).
 *   2. A per-producer amplifier applied only to a specific producer
 *      (granted by the per-producer leaf nodes — `pe_disciple_resonance`,
 *      etc.).
 *
 * V1.1 (this file): mechanic only. The tree isn't wired yet, so both
 * sources default to 0. A debug bridge (`gd.setTierUpBonus(...)` and
 * `gd.simulateTierUp(...)` in `src/debug/gameDebug.js`) lets us validate
 * end-to-end before the tree data structure exists.
 *
 * V1.4 (later): the bonus values are sourced from the new Eternal Tree
 * via `tree.tierUpResonanceBase` and `tree.tierUpResonancePerProducer`.
 *
 * Reset: per-run state — cleared on reincarnation by `clearAll()` (called
 * from `App.jsx.handleReincarnate`).
 *
 * Storage: `mai_tier_up_resonance` localStorage key. Persists across
 * reload so the bonus survives F5 mid-run, but is wiped by reincarnation.
 * `wipeSave` removes it (added in V1.2 alongside the tree wipe).
 */

import { useEffect, useRef, useCallback } from 'react';
import { SPRITE_TIERS, getSpriteTier } from '../data/producers';

const STORAGE_KEY = 'mai_tier_up_resonance';

/** Lookup table from tier name to its `idx` (0..3). */
const TIER_IDX_BY_NAME = Object.freeze(
  Object.fromEntries(SPRITE_TIERS.map(t => [t.name, t.idx]))
);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch { /* corrupt JSON — ignore and start fresh */ }
  return {};
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

/**
 * @param {object} args
 * @param {object} args.producers  useProducers() return value (we read .owned)
 * @param {object} [args.tree]     Future tree hook. When present, expected to
 *                                 expose `tierUpResonanceBase: number` and
 *                                 `tierUpResonancePerProducer: {[pid]: number}`.
 */
export default function useTierUpResonance({ producers, tree } = {}) {
  // Ref-only state — per-producer highest tier idx reached this run.
  // Shape: { [producerId]: tierIdx (0..3) }. Absent = none reached yet.
  const highestTierRef = useRef(loadState());

  // Debug overrides — set via gd.setTierUpBonus(...). When non-null,
  // these are used instead of (or in addition to) the tree's values.
  // Lets us test the mechanic before the tree is wired in V1.4.
  const debugBaseRef    = useRef(0);
  const debugPerProdRef = useRef({}); // { [pid]: number }

  // Watch producers.owned and bump the highest-tier-reached map.
  // Storage is updated in the same effect so a reload mid-run preserves
  // tier progress. Only writes when a tier actually changes (avoids
  // localStorage churn on every owned-count tick).
  useEffect(() => {
    const owned = producers?.owned ?? {};
    let dirty = false;
    for (const pid of Object.keys(owned)) {
      const count = owned[pid] ?? 0;
      const currentTier = getSpriteTier(count);
      const currentIdx  = currentTier ? currentTier.idx : -1;
      const storedIdx   = highestTierRef.current[pid] ?? -1;
      if (currentIdx > storedIdx) {
        highestTierRef.current[pid] = currentIdx;
        dirty = true;
      }
    }
    if (dirty) saveState(highestTierRef.current);
  }, [producers?.owned]);

  /**
   * Per-producer flat qi/s bonus from Tier-Up Resonance.
   *
   * Formula:
   *   tiersCrossed = highestTierIdx + 1   (Bronze=1, Silver=2, Gold=3, Mythic=4)
   *   bonus = tiersCrossed × (baseValue + perProducerValue)
   *
   * Where baseValue and perProducerValue come from the tree (V1.4) plus
   * any debug overrides. Returns 0 when the producer hasn't reached any
   * sprite tier yet OR when both tree and debug values are 0.
   */
  const getTierUpBonus = useCallback((pid) => {
    if (!pid) return 0;
    const idx = highestTierRef.current[pid] ?? -1;
    if (idx < 0) return 0;
    const tiersCrossed = idx + 1;

    const treeBase = tree?.tierUpResonanceBase ?? 0;
    const treePerProd = tree?.tierUpResonancePerProducer?.[pid] ?? 0;
    const debugBase = debugBaseRef.current ?? 0;
    const debugPerProd = debugPerProdRef.current?.[pid] ?? 0;

    const baseValue = treeBase + debugBase;
    const perProdValue = treePerProd + debugPerProd;

    return tiersCrossed * (baseValue + perProdValue);
  }, [tree]);

  /** Wipe the per-run highest-tier map. Called on reincarnation. */
  const clearAll = useCallback(() => {
    highestTierRef.current = {};
    saveState({});
  }, []);

  /**
   * Debug: force a producer's highest tier to the given level.
   * Used to test bonus math without grinding 100 producers manually.
   * tierName: 'bronze' | 'silver' | 'gold' | 'mythic'
   */
  const debugSetTier = useCallback((pid, tierName) => {
    const idx = TIER_IDX_BY_NAME[tierName];
    if (idx === undefined) return false;
    highestTierRef.current[pid] = idx;
    saveState(highestTierRef.current);
    return true;
  }, []);

  /**
   * Debug: set the bonus values that would normally come from the tree.
   * @param {number} base                Baseline per-tier-up bonus (all producers)
   * @param {Object<string,number>} perProducer  Per-producer amplifier
   */
  const debugSetBonus = useCallback((base = 0, perProducer = {}) => {
    debugBaseRef.current = Number(base) || 0;
    debugPerProdRef.current = perProducer && typeof perProducer === 'object'
      ? { ...perProducer }
      : {};
  }, []);

  /** Read-only access for debug introspection. */
  const debugReadState = useCallback(() => ({
    highest:   { ...highestTierRef.current },
    debugBase: debugBaseRef.current,
    debugPerProd: { ...debugPerProdRef.current },
  }), []);

  return {
    /** Per-producer flat qi/s bonus — read by App.jsx producer-rate effect. */
    getTierUpBonus,
    /** Reset state on reincarnation. */
    clearAll,
    /** Debug bridges for V1.1 testing before tree wiring lands in V1.4. */
    debugSetTier,
    debugSetBonus,
    debugReadState,
    /** Ref exposed for advanced debug / introspection. */
    highestTierRef,
  };
}
