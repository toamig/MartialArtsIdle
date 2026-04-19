/**
 * useReincarnationTree.js — purchased node set + derived modifier bundle.
 *
 * Purchases persist in 'mai_reincarnation_tree' and survive reincarnation.
 *
 * prereqMode handling:
 *   'or'       — any one prereq satisfies
 *   'and'      — every prereq must be satisfied (sequential + cross-branch)
 *   'yyUnlock' — ≥ 2 of the 4 main keystones must be purchased
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NODES, NODES_BY_ID, MAIN_KEYSTONES } from '../data/reincarnationTree';

const SAVE_KEY = 'mai_reincarnation_tree';

function loadPurchased() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function persist(set) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify([...set])); } catch {}
}

export default function useReincarnationTree({ karma, spendKarma }) {
  const [purchased, setPurchased] = useState(loadPurchased);

  useEffect(() => { persist(purchased); }, [purchased]);

  const isPurchased = useCallback((id) => purchased.has(id), [purchased]);

  const isAvailable = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node || purchased.has(id)) return false;

    if (node.prereqMode === 'yyUnlock') {
      return MAIN_KEYSTONES.filter(k => purchased.has(k)).length >= 2;
    }
    if (node.prereqs.length === 0) return true;
    if (node.prereqMode === 'and') {
      return node.prereqs.every(pid => purchased.has(pid));
    }
    return node.prereqs.some(pid => purchased.has(pid));
  }, [purchased]);

  const canBuy = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node) return false;
    return isAvailable(id) && karma >= node.cost;
  }, [isAvailable, karma]);

  const buy = useCallback((id) => {
    const node = NODES_BY_ID[id];
    if (!node || !isAvailable(id)) return false;
    const ok = spendKarma(node.cost);
    if (!ok) return false;
    setPurchased(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    return true;
  }, [isAvailable, spendKarma]);

  /**
   * Derived modifier bundle — consumed by cultivation, combat, and stat systems.
   * Old modifier names kept at neutral values so existing consumers don't crash.
   * New names carry the actual effects from the original design.
   */
  const modifiers = useMemo(() => ({
    // ── Backward-compat stubs (old node IDs gone; set neutral) ──
    qiMult:        1,
    damageMult:    1,
    pillMult:      1,
    crystalMult:   1,
    miningMult:    1,
    gatheringMult: 1,
    focusMult:     1,
    heavenlyMult:  1,
    statsFlat:     0,

    // ── Ancestor's Legacy ─────────────────────────────────────────
    cultivSpeedMult: purchased.has('al_1') ? 1.10 : 1,  // +10% qi/s
    offlineCapHours: purchased.has('al_4') ? 12   : 8,
    lawCarryForward: purchased.has('al_k'),

    // ── Martial Dao ───────────────────────────────────────────────
    exploitChanceFlat: purchased.has('md_3') ? 0.03 : 0,  // +3%

    // ── Heavenly Will ─────────────────────────────────────────────
    maxHpMult:         purchased.has('hw_2') ? 1.10 : 1,
    undyingResolve:    purchased.has('hw_3'),
    exploitMultBonus:  purchased.has('hw_4') ? 0.10 : 0,  // +10%

    // ── Yin Yang ──────────────────────────────────────────────────
    yangExploitMult:   purchased.has('yy_3') ? 2.5  : 1.5,
  }), [purchased]);

  /** Stat-bundle modifiers fed into computeAllStats via mergeModifiers. */
  const getStatModifiers = useCallback(() => {
    const mods = {};
    if (modifiers.exploitChanceFlat > 0) {
      mods.exploit_chance = [{ type: 'flat', value: modifiers.exploitChanceFlat }];
    }
    if (modifiers.exploitMultBonus > 0) {
      mods.exploit_mult = [{ type: 'increased', value: modifiers.exploitMultBonus }];
    }
    return mods;
  }, [modifiers]);

  const _reset = useCallback(() => setPurchased(new Set()), []);

  return {
    purchased,
    isPurchased,
    isAvailable,
    canBuy,
    buy,
    modifiers,
    getStatModifiers,
    nodes: NODES,
    _reset,
  };
}
