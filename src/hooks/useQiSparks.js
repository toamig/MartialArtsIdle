/**
 * useQiSparks — pick-1-of-2 card flow that fires on every layer breakthrough.
 *
 * Phase 1 scope:
 *  - 6 common temporary qi buffs (see data/qiSparks.js)
 *  - Free reroll + paid reroll (Blood Lotus, escalating cost)
 *  - Pity timer (10 offers without rare → guarantee one rare next; inert in
 *    Phase 1 since the pool only has commons, but wired for Phase 3+)
 *  - Persistence: active sparks + pending offer survive page reload;
 *    reset on reincarnation via `clearAll()`
 *
 * Exposes refs that App.jsx wires into useCultivation's rate calc:
 *   qiMultRef          — multiplicative buff to qi/s (1.0 baseline)
 *   focusMultBonusRef  — additive bonus to focus multiplier (0 baseline)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { QI_SPARKS, QI_SPARK_BY_ID, drawOffer } from '../data/qiSparks';
import { spendBloodLotus, getBloodLotusBalance } from '../systems/bloodLotus';

const ACTIVE_KEY  = 'mai_qi_sparks_active';
const PENDING_KEY = 'mai_qi_sparks_pending';
const PITY_KEY    = 'mai_qi_sparks_pity';

// Reroll costs (escalating per offer)
const PAID_REROLL_COSTS = [3, 6, 12];

let instanceCounter = 0;

// ── Persistence ───────────────────────────────────────────────────────────────

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export default function useQiSparks({ cultivation }) {
  const [activeSparks, setActiveSparks] = useState(() => loadJSON(ACTIVE_KEY, []));
  const [pendingOffer, setPendingOffer] = useState(() => loadJSON(PENDING_KEY, null));
  const [pityCounter,  setPityCounter]  = useState(() => loadJSON(PITY_KEY, 0));
  const [bloodLotusBalance, setBloodLotusBalance] = useState(() => {
    try { return getBloodLotusBalance(); } catch { return 0; }
  });

  // Refs read by useCultivation rate calc each tick
  const qiMultRef         = useRef(1);
  const focusMultBonusRef = useRef(0);

  const prevRealmIndexRef = useRef(cultivation.realmIndex);

  // Persist
  useEffect(() => { saveJSON(ACTIVE_KEY,  activeSparks); }, [activeSparks]);
  useEffect(() => { saveJSON(PENDING_KEY, pendingOffer); }, [pendingOffer]);
  useEffect(() => { saveJSON(PITY_KEY,    pityCounter);  }, [pityCounter]);

  // Keep BL balance in sync
  useEffect(() => {
    const handler = (e) => setBloodLotusBalance(e.detail);
    window.addEventListener('blood-lotus-changed', handler);
    return () => window.removeEventListener('blood-lotus-changed', handler);
  }, []);

  // ── Compute multipliers from active sparks ─────────────────────────────
  // Recomputed any time activeSparks changes; refs are read each tick by
  // useCultivation. Timed sparks expire via the interval below; we recompute
  // there too so refs stay live without triggering React re-renders.
  const recomputeRefs = useCallback((sparks) => {
    let qiMult = 1;
    let focusBonus = 0;
    const now = Date.now();
    for (const s of sparks) {
      if (s.expiresAt && s.expiresAt <= now) continue;
      const card = QI_SPARK_BY_ID[s.sparkId];
      if (!card) continue;
      const eff = card.effect;
      if (!eff) continue;
      if (eff.type === 'qi_mult')         qiMult     *= (1 + eff.value);
      if (eff.type === 'focus_mult_bonus') focusBonus += eff.value;
    }
    qiMultRef.current         = qiMult;
    focusMultBonusRef.current = focusBonus;
  }, []);

  useEffect(() => { recomputeRefs(activeSparks); }, [activeSparks, recomputeRefs]);

  // ── Expiry tick — runs every second to prune timed sparks ───────────────
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setActiveSparks(prev => {
        const filtered = prev.filter(s => !s.expiresAt || s.expiresAt > now);
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Layer breakthrough hooks ────────────────────────────────────────────
  // Fires on every realmIndex change. Decrements event_count sparks,
  // removes until_breakthrough sparks, and rolls a fresh offer.
  useEffect(() => {
    const prev = prevRealmIndexRef.current;
    const curr = cultivation.realmIndex;
    if (curr === prev) return;
    prevRealmIndexRef.current = curr;

    // Cleanup pass
    setActiveSparks(prevList => {
      const next = [];
      for (const s of prevList) {
        const card = QI_SPARK_BY_ID[s.sparkId];
        if (!card) continue;
        if (card.kind === 'until_breakthrough') continue; // remove
        if (card.kind === 'event_count') {
          const remaining = (s.breakthroughsRemaining ?? card.breakthroughs) - 1;
          if (remaining > 0) {
            next.push({ ...s, breakthroughsRemaining: remaining });
          }
          continue;
        }
        next.push(s);
      }
      return next;
    });

    // Roll a new offer if none is pending. If one is pending (player took too
    // long on the previous breakthrough), auto-resolve it to the leftmost so
    // it doesn't pile up.
    setPendingOffer(prev => {
      if (prev) {
        // Auto-resolve previous offer to leftmost; this is rare in practice
        // because the modal is blocking, but covers the gd debug edge case.
        // We fall through and roll a new one below.
        const leftmostId = prev.cards?.[0];
        if (leftmostId) {
          // Apply leftmost in a deferred microtask to avoid double-setState in render
          queueMicrotask(() => applySparkChoice(leftmostId));
        }
      }
      const cards = drawOffer(2);
      if (cards.length === 0) return null;
      return {
        id:               `qs-offer-${++instanceCounter}-${curr}`,
        cards,
        rerollsUsed:      0,
        freeRerollsLeft:  1,
        rolledAtRealm:    curr,
      };
    });

    // Pity counter increments on every offer. Resets when a rare draws.
    // Phase 1 has no rares so this just climbs harmlessly until rare cards
    // are added.
    setPityCounter(c => {
      const cards = pendingRollPreviewRef.current;
      const containsRare = cards?.some(id => QI_SPARK_BY_ID[id]?.rarity === 'rare');
      return containsRare ? 0 : c + 1;
    });
  }, [cultivation.realmIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stash the most-recently-rolled cards so the pity-counter effect above can
  // peek at them without depending on pendingOffer (which would race with the
  // setPendingOffer call earlier in the same effect).
  const pendingRollPreviewRef = useRef(null);
  useEffect(() => { pendingRollPreviewRef.current = pendingOffer?.cards ?? null; }, [pendingOffer]);

  // ── Apply a chosen card ─────────────────────────────────────────────────
  const applySparkChoice = useCallback((sparkId) => {
    const card = QI_SPARK_BY_ID[sparkId];
    if (!card) return;

    // Instant cards apply immediately, no active spark added.
    if (card.kind === 'instant' && card.effect?.type === 'qi_seconds') {
      const rate = cultivation.rateRef?.current ?? 1;
      const grant = rate * card.effect.value;
      if (cultivation.qiRef) cultivation.qiRef.current += grant;
      return;
    }

    // All other kinds add an active spark with kind-specific state.
    const now = Date.now();
    const instance = {
      instanceId: ++instanceCounter,
      sparkId:    card.id,
    };
    if (card.kind === 'timed' || card.kind === 'lingering_focus_flag') {
      instance.expiresAt = now + card.duration;
    }
    if (card.kind === 'event_count') {
      instance.breakthroughsRemaining = card.breakthroughs;
    }
    setActiveSparks(prev => [...prev, instance]);
  }, [cultivation.rateRef, cultivation.qiRef]);

  // ── Player actions ──────────────────────────────────────────────────────

  const choose = useCallback((sparkId) => {
    setPendingOffer(prev => {
      if (!prev || !prev.cards.includes(sparkId)) return prev;
      applySparkChoice(sparkId);
      return null;
    });
  }, [applySparkChoice]);

  /**
   * Rerolls all cards in the offer.
   * - First reroll is free (`freeRerollsLeft` decrements)
   * - Subsequent rerolls cost escalating Blood Lotus (3, 6, 12; cap at 12)
   * - Returns true if reroll happened, false if blocked by cost.
   */
  const reroll = useCallback(() => {
    let result = false;
    setPendingOffer(prev => {
      if (!prev) return prev;
      const isFree = (prev.freeRerollsLeft ?? 0) > 0;
      let nextFreeLeft = prev.freeRerollsLeft ?? 0;
      let nextRerollsUsed = prev.rerollsUsed ?? 0;

      if (isFree) {
        nextFreeLeft = nextFreeLeft - 1;
      } else {
        const paidIdx = Math.min(
          (prev.rerollsUsed - (prev.freeRerollsLeft === undefined ? 1 : 0)),
          PAID_REROLL_COSTS.length - 1,
        );
        const cost = PAID_REROLL_COSTS[Math.max(0, paidIdx)];
        if (!spendBloodLotus(cost)) return prev;
        try { setBloodLotusBalance(getBloodLotusBalance()); } catch {}
      }
      const fresh = drawOffer(2);
      if (fresh.length === 0) return prev;
      result = true;
      return {
        ...prev,
        cards:           fresh,
        rerollsUsed:     nextRerollsUsed + 1,
        freeRerollsLeft: nextFreeLeft,
      };
    });
    return result;
  }, []);

  /**
   * Cost of the next reroll. Returns 0 if a free reroll is available, else
   * the next escalating BL cost.
   */
  const nextRerollCost = useCallback(() => {
    if (!pendingOffer) return 0;
    if ((pendingOffer.freeRerollsLeft ?? 0) > 0) return 0;
    // After the free is spent, paid index = (rerollsUsed - 1) so first paid is index 0
    const paidIdx = Math.min(
      Math.max(0, (pendingOffer.rerollsUsed ?? 0) - 1),
      PAID_REROLL_COSTS.length - 1,
    );
    return PAID_REROLL_COSTS[paidIdx];
  }, [pendingOffer]);

  /**
   * Discard the current offer without picking. Used by the modal's auto-
   * timeout when the player ignores the choice.
   */
  const skip = useCallback(() => {
    setPendingOffer(prev => {
      if (!prev) return null;
      // Auto-resolve to leftmost so the player isn't punished for ignoring
      const leftmostId = prev.cards?.[0];
      if (leftmostId) applySparkChoice(leftmostId);
      return null;
    });
  }, [applySparkChoice]);

  /** Wipe everything — call on reincarnation reset. */
  const clearAll = useCallback(() => {
    setActiveSparks([]);
    setPendingOffer(null);
    setPityCounter(0);
  }, []);

  return {
    activeSparks,
    pendingOffer,
    bloodLotusBalance,
    qiMultRef,
    focusMultBonusRef,
    choose,
    reroll,
    nextRerollCost,
    skip,
    clearAll,
  };
}
