/**
 * useReincarnationTree — Plan B V1 hook (2026-05-21).
 *
 * Sits on top of the new tree data structure in `src/data/reincarnationTree.js`.
 * In V1 there is only one branch (Producer Evolution); the hook walks every
 * purchased node, sums their effects, and exposes the result through two
 * shapes:
 *
 *   modifiers         — the legacy interface consumed across the codebase
 *                       (cultivSpeedMult, crystalTapMult, offlineCapHours,
 *                        combat flags, ...). In V1 every legacy modifier
 *                       defaults to its identity value (1 / 0 / false / 8h)
 *                       because no V1 nodes touch them. Future branches
 *                       (Cultivation, Combat, Offline...) will set them.
 *
 *                       The V1-NEW modifier keys are also exposed here:
 *                         tierUpResonanceBase           (number)
 *                         tierUpResonancePerProducer    ({ [pid]: number })
 *                       Consumed by useTierUpResonance.
 *
 *   Compatibility methods — canBuy / buy / isAvailable / isPurchased —
 *   preserved 1:1 from the old hook so the EXISTING `EternalTreeScreen.jsx`
 *   keeps compiling/rendering in V1.2. The screen itself is replaced in
 *   V1.3 with an Idle Slayer-inspired layout.
 *
 *   New API for V1.3 — same methods exposed under modern names too:
 *     purchase(id) / isUnlocked(id)
 *
 * Save key: `mai_reincarnation_tree`. Stored as JSON array of purchased
 * node ids. Migration from old ids (al_*, md_*, etc.) is handled by
 * `src/systems/treeMigration.js` at module load — wipes old purchases and
 * refunds karma to the player's total earnings.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { NODES, NODES_BY_ID, TREE_TOTAL_COST, BRANCHES } from '../data/reincarnationTree';

const SAVE_KEY = 'mai_reincarnation_tree';

function loadPurchased() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out ids that don't exist in the new tree (defensive — in
        // case the migration script missed a stray entry).
        const valid = parsed.filter(id => typeof id === 'string' && !!NODES_BY_ID[id]);
        return new Set(valid);
      }
    }
  } catch { /* corrupt — ignore */ }
  return new Set();
}

function savePurchased(set) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(Array.from(set))); } catch {}
}

/**
 * Build the legacy modifier map. Every key returns its "no tree" identity
 * value in V1 because no V1 nodes touch combat / offline / cultivation
 * modifiers. The Producer Evolution branch only sets two NEW keys
 * (`tierUpResonanceBase` and `tierUpResonancePerProducer`).
 *
 * Future branches re-introduce the legacy modifiers by adding effect types
 * that this function reads — same shape, different data.
 */
function computeModifiers(purchased) {
  let tierUpBase = 0;
  const tierUpPerProducer = {};
  let karmaSpent = 0;

  for (const id of purchased) {
    const node = NODES_BY_ID[id];
    if (!node) continue;
    karmaSpent += node.cost ?? 0;
    const eff = node.effect;
    if (!eff) continue;
    if (eff.type === 'tier_up_base') {
      tierUpBase += eff.value ?? 0;
    } else if (eff.type === 'tier_up_per_producer') {
      const pid = eff.producerId;
      if (pid) {
        tierUpPerProducer[pid] = (tierUpPerProducer[pid] ?? 0) + (eff.value ?? 0);
      }
    }
    // V7+ effect types will be added here as further branches land.
  }

  return {
    // ── V1 NEW modifiers ──
    tierUpResonanceBase:        tierUpBase,
    tierUpResonancePerProducer: tierUpPerProducer,

    // ── Bookkeeping ──
    karmaSpent,
    treeQiMult: 1,           // tracked separately by older code; identity in V1
    perKarmaQiPct: 0,         // legacy field — formula removed with the rework

    // ── Legacy modifier interface — identity values until future
    // branches re-introduce these axes. Keeping the keys lets existing
    // consumers (App.jsx, useCombat, etc.) run without per-call defensive
    // defaults.
    cultivSpeedMult:           1,
    crystalTapMult:            1,
    producerOutputMult:        1,
    offlineCapHours:           8,
    cooldownMult:              1,
    damageMult:                1,
    qiOnEveryRealmFrac:        0,
    hpRegenPerSec:             0,
    freeCastEvery:             0,
    gatherMineRarityUpChance:  0,
    cultBuffOnRebirthSec:      0,
    bloodLotusOnRebirth:       0,
    bankedRerollOnRebirth:     0,
    keepProducerLevelsFrac:    0,
    extraTechSlot:             false,
    phaseTechniqueOwned:       false,
    undyingResolve:            false,
    killingStride:             false,
    regionKillBonus:           false,
    keepRecipes:               false,
    dualAutoFarm:              false,
  };
}

/**
 * @param {object} args
 * @param {number}   args.karma       Current karma balance (from useReincarnationKarma).
 * @param {Function} args.spendKarma  (cost, nodeId) => boolean. Deducts karma on success.
 * @param {number}   [args.lives]     Not used in V1 (was Wisdom of Lives input). Kept
 *                                    in the signature so the existing call site doesn't
 *                                    need to change.
 */
export default function useReincarnationTree({ karma, spendKarma, lives = 0 } = {}) {
  const [purchased, setPurchased] = useState(() => loadPurchased());

  useEffect(() => { savePurchased(purchased); }, [purchased]);

  const modifiers = useMemo(() => computeModifiers(purchased), [purchased]);

  /** Has this node been purchased? */
  const isPurchased = useCallback((id) => purchased.has(id), [purchased]);

  /** Are all prereqs of this node satisfied (i.e. can it be displayed
   *  as available-to-purchase)? Returns false if already owned. */
  const isAvailable = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node) return false;
    if (purchased.has(id)) return false;
    for (const req of (node.requires ?? [])) {
      if (!purchased.has(req)) return false;
    }
    return true;
  }, [purchased]);

  /** Can the player AFFORD this node right now (prereqs + karma)? */
  const canBuy = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node) return false;
    if (!isAvailable(id)) return false;
    return (karma ?? 0) >= (node.cost ?? 0);
  }, [karma, isAvailable]);

  /** Attempt to purchase a node. Returns true on success. */
  const buy = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node) return false;
    if (!isAvailable(id)) return false;
    if ((karma ?? 0) < (node.cost ?? 0)) return false;
    const ok = spendKarma?.(node.cost, id);
    if (!ok) return false;
    setPurchased(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    return true;
  }, [karma, spendKarma, isAvailable]);

  /** Refund every owned node. Returns the karma amount that should be
   *  returned to the player. Caller is responsible for crediting it back
   *  (we don't have an `addKarma` directly — caller does it via save). */
  const refund = useCallback(() => {
    const refundAmount = Array.from(purchased).reduce(
      (s, id) => s + (NODES_BY_ID[id]?.cost ?? 0),
      0,
    );
    setPurchased(new Set());
    return refundAmount;
  }, [purchased]);

  return {
    // Data
    purchased,
    nodes:     NODES,
    branches:  BRANCHES,
    totalCost: TREE_TOTAL_COST,

    // Modifiers (legacy interface + V1 new)
    modifiers,

    // Compatibility methods (consumed by the existing EternalTreeScreen until
    // V1.3 ships the new UI).
    canBuy,
    buy,
    isAvailable,
    isPurchased,

    // Modern aliases for the V1.3 UI.
    purchase: buy,
    isUnlocked: isAvailable,

    // Refund — used during reincarnation flow or save migration.
    refund,
  };
}
