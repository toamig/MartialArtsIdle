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
import { NODES, NODES_BY_ID, MAIN_KEYSTONES, RETIRED_NODE_IDS } from '../data/reincarnationTree';

const SAVE_KEY = 'mai_reincarnation_tree';

function loadPurchased() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      // One-shot migration: drop any node IDs that no longer exist in the
      // current tree (e.g. the old `yy_5` 6th-step node, or any legacy
      // connector that has been removed). Karma is NOT auto-refunded — the
      // player keeps whatever they spent under the old costs; they get the
      // new effects on the IDs that still exist for free.
      return new Set(arr.filter(id => NODES_BY_ID[id] && !RETIRED_NODE_IDS.includes(id)));
    }
  } catch { /* ignore parse errors — start with empty set */ }
  return new Set();
}

function persist(set) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify([...set])); }
  catch { /* localStorage unavailable / quota — non-fatal */ }
}

export default function useReincarnationTree({ karma, spendKarma, lives = 0 } = {}) {
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
   * Derived modifier bundle — consumed by cultivation, combat, autoFarm,
   * App.jsx getFullStats, and the alchemy / crafting screens.
   *
   * Backward-compat names used by App.jsx + useCultivation:
   *   cultivSpeedMult — fed into cultivation.treeQiMultRef (qi/s `more` mod)
   *   damageMult      — fed into combat.s.stats.damageMult
   */
  const modifiers = useMemo(() => {
    // Wisdom of Lives — +5% per completed life, capped at +50% (10 lives).
    const wolStacks = Math.min(10, Math.max(0, lives));
    const wolMult   = purchased.has('yy_1') ? (1 + 0.05 * wolStacks) : 1;

    return {
      // ── Ancestor's Legacy ─────────────────────────────────────────
      cultivSpeedMult:    purchased.has('al_1') ? 1.25 : 1,   // al_1 +25% qi/s
      keepRecipes:        purchased.has('al_2'),              // al_2 carry recipes
      offlineCapHours:    purchased.has('al_3') ? 16 : 8,     // al_3 8→16h
      bloodLotusOnRebirth: purchased.has('al_4') ? 50 : 0,    // al_4 +50 Blood Lotus
      bankedRerollOnRebirth: purchased.has('al_4') ? 1 : 0,
      cultBuffOnRebirthSec:  purchased.has('al_k') ? 3600 : 0, // al_k 1h ×2 buff

      // ── Martial Dao ───────────────────────────────────────────────
      cooldownMult:       purchased.has('md_1') ? 0.90 : 1,   // md_1 -10% CDs
      exploitChanceFlat:  purchased.has('md_2') ? 20   : 0,   // md_2 +20% (units: %)
      extraTechSlot:      purchased.has('md_3'),              // md_3 +1 slot
      // TODO: redesign — refining removed in 2026-04-26 secret-tech overhaul.
      // md_4 Veteran's Eye no longer has anywhere to apply (it bumped the
      // quality of refined techniques; refining is gone). Keep the node
      // purchasable so saved trees don't break, but the modifier is a no-op
      // until the node is repurposed.
      craftedTechQualityBump: 0,
      killingStride:      purchased.has('md_k'),              // md_k post-kill exploit

      // ── Fate's Path ───────────────────────────────────────────────
      // fp_1 Lucky Star — still applies to ALCHEMY crafts (chance to bump
      // the brewed pill's rarity). Refining no longer exists, so the node's
      // surface area is narrower than originally designed.
      craftRarityUpChance:purchased.has('fp_1') ? 0.10 : 0,
      gatherMineRarityUpChance: purchased.has('fp_2') ? 0.10 : 0,
      // fp_3 is currently a placeholder — no modifier wired.
      selectionOptionCount: purchased.has('fp_4') ? 4 : 3,
      dualAutoFarm:       purchased.has('fp_k'),              // fp_k twofold path

      // ── Heavenly Will ─────────────────────────────────────────────
      // hw_1 / hw_2 / hw_4 / hw_k flow through getStatModifiers below.
      undyingResolve:     purchased.has('hw_3'),
      pillEffectMult:     purchased.has('hw_4') ? 1.25 : 1,
      hwKeystoneMore:     purchased.has('hw_k') ? 1.25 : 1,   // multiplicative more

      // ── Yin Yang ──────────────────────────────────────────────────
      // yy_1 contributes via wolMult (more on damage_all + health, see stat-mods).
      damageMult:         wolMult,                            // yy_1 (also pipes into combat)
      hpMoreFromLives:    wolMult,                            // yy_1 also bumps HP
      qiOnEveryRealmFrac: purchased.has('yy_2') ? 0.20 : 0,
      hpRegenPerSec:      purchased.has('yy_3') ? 0.05 : 0,   // yy_3 +5%/s above 50%
      freeCastEvery:      purchased.has('yy_4') ? 5 : 0,      // yy_4 every 5th free
      artefactValueMult:  purchased.has('yy_k') ? 1.10 : 1,   // yy_k +10% to all artefact affix values

      // ── Cross-Branch Connectors ───────────────────────────────────
      // cb_is now contributes via default_attack_damage (see getStatModifiers).
      regionKillBonus:    purchased.has('cb_ts'),             // cb_ts 10-kill +1 rarity gather/mine
      phaseTechniqueOwned:purchased.has('cb_pt'),             // cb_pt grants the Phase Technique law
    };
  }, [purchased, lives]);

  /** Stat-bundle modifiers fed into computeAllStats via mergeModifiers. */
  const getStatModifiers = useCallback(() => {
    const mods = {};

    // md_1 Steady Hands — 10% reduction on cooldowns. We expose this as a
    // "more" mod on a synthetic `cooldown_mult` stat the combat hook can
    // pick up. Combat reads it directly off `tree.modifiers.cooldownMult`.
    // (No stat-bundle entry needed; consumer reads the modifier struct.)

    // md_2 Combat Instinct — +20% exploit chance.
    if (modifiers.exploitChanceFlat > 0) {
      mods.exploit_chance = [{ type: 'flat', value: modifiers.exploitChanceFlat }];
    }

    // hw_1 Soul Tempering — formerly +20% all primary stats. Primary-stat
    // layer retired in stage 15; the node now grants +20% damage_all.
    // hw_k Heavenly Constitution — formerly +25% MORE all primary stats;
    // now +25% MORE damage_all.
    const dmgMods = [];
    if (purchased.has('hw_1')) dmgMods.push({ type: 'increased', value: 0.20 });
    if (purchased.has('hw_k')) dmgMods.push({ type: 'more',      value: 1.25 });
    if (dmgMods.length) (mods.damage_all ??= []).push(...dmgMods);

    // hw_2 Iron Will — +50% max HP.
    // hw_k Heavenly Constitution — +25% MORE Health.
    // yy_1 Wisdom of Lives — `more` on health from completed lives.
    const hpMods = [];
    if (purchased.has('hw_2')) hpMods.push({ type: 'increased', value: 0.50 });
    if (purchased.has('hw_k')) hpMods.push({ type: 'more',      value: 1.25 });
    if (purchased.has('yy_1') && modifiers.hpMoreFromLives > 1) {
      hpMods.push({ type: 'more', value: modifiers.hpMoreFromLives });
    }
    if (hpMods.length) mods.health = hpMods;

    // cb_is Inherited Strength — +25% basic-attack damage (post-Stage 4).
    if (purchased.has('cb_is')) {
      mods.default_attack_damage = [{ type: 'flat', value: 0.25 }];
    }

    return mods;
  }, [modifiers, purchased]);

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
