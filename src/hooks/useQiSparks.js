/**
 * useQiSparks — pick-1-of-2 card flow that fires on every layer breakthrough.
 *
 * Live tiers:
 *  - Common (Phase 1):   8 temporary qi buffs (timed / event-count / flag)
 *  - Uncommon (Phase 2): 6 permanent run buffs that stack additively
 *  - Rare (Phase 3):     not yet implemented (pool weight reserved)
 *
 * Other features:
 *  - Free reroll + paid reroll (Blood Lotus, escalating cost)
 *  - Pity timer (10 offers without rare → guarantee one rare next; inert
 *    until rare cards ship)
 *  - Persistence: active sparks + pending offer survive page reload;
 *    reset on reincarnation via `clearAll()`
 *  - Heaven's Bond (uncommon) mirrors its offline-qi multiplier to
 *    localStorage so the pre-mount offline calc can pick it up
 *
 * Exposes refs that App.jsx wires into useCultivation's rate calc:
 *   qiMultRef          — multiplicative buff to qi/s (1.0 baseline)
 *   qiFlatRef          — additive flat qi/s (0 baseline; folded into BASE_RATE)
 *   focusMultBonusRef  — additive bonus to focus multiplier (0 baseline)
 *   gateReductionRef   — fraction subtracted from major-realm qi/s gate
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { QI_SPARKS, QI_SPARK_BY_ID, drawOffer } from '../data/qiSparks';
import { spendBloodLotus, getBloodLotusBalance } from '../systems/bloodLotus';

const ACTIVE_KEY           = 'mai_qi_sparks_active';
const PENDING_KEY          = 'mai_qi_sparks_pending';
const PITY_KEY             = 'mai_qi_sparks_pity';
// Mirrored to localStorage so the offline qi calc (which runs in a useState
// initializer before React mounts) can pick up the Heaven's Bond bonus.
const OFFLINE_SNAPSHOT_KEY = 'mai_qi_sparks_offline_snapshot';

// Cap on the major-realm gate reduction from Patience of Stone stacks.
// Keeps the gate from collapsing entirely with extreme stacking.
const GATE_REDUCTION_CAP = 0.9;

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

export default function useQiSparks({ cultivation, isFeatureUnlocked }) {
  // Stable ref so drawOffer can read the latest gate state without forcing
  // the breakthrough effect to re-subscribe.
  const isFeatureUnlockedRef = useRef(isFeatureUnlocked);
  useEffect(() => { isFeatureUnlockedRef.current = isFeatureUnlocked; }, [isFeatureUnlocked]);
  const [activeSparks, setActiveSparks] = useState(() => {
    // Reassign every instanceId on rehydrate. Older saves can contain
    // duplicate ids (the counter used to reset to 0 on reload), and the
    // ids are only used as React keys + within-list lookups — safe to
    // renumber. This guarantees uniqueness for both the initial render
    // and any sparks added later in the session.
    const loaded = loadJSON(ACTIVE_KEY, []);
    return loaded.map(s => ({ ...s, instanceId: ++instanceCounter }));
  });
  const [pendingOffer, setPendingOffer] = useState(() => loadJSON(PENDING_KEY, null));
  const [pityCounter,  setPityCounter]  = useState(() => loadJSON(PITY_KEY, 0));
  const [bloodLotusBalance, setBloodLotusBalance] = useState(() => {
    try { return getBloodLotusBalance(); } catch { return 0; }
  });

  // Refs read by useCultivation rate calc each tick
  const qiMultRef                = useRef(1);
  const focusMultBonusRef        = useRef(0);
  // Permanent (uncommon) buffs — additive across stacks.
  // qiFlatRef adds to BASE_RATE; gateReductionRef shrinks the major-realm
  // qi/s gate; offlineQiMultRef mirrors to localStorage for offline calc.
  const qiFlatRef                = useRef(0);
  const gateReductionRef         = useRef(0);
  // True iff a 'next_breakthrough_flag' (painless ascension) is currently
  // active. useCultivation reads this when about to drain qi at breakthrough.
  const painlessActiveRef        = useRef(false);
  // Lingering Focus state — when active, useCultivation sustains a fraction
  // of the focus boost for `residualDurationMs` after release.
  const lingeringActiveRef       = useRef(false);
  const lingeringResidualMsRef   = useRef(0);
  const lingeringResidualMultRef = useRef(0);
  // Consecutive Focus mechanic — every tier the player has unlocked adds
  // a (holdMs, bonus) rung on top of the previous tiers. Exposed as a
  // sorted ladder so cultivation tick can sum every met threshold.
  // Empty array means the mechanic isn't unlocked. `deep` flag tracks T5.
  const consecutiveFocusLadderRef = useRef([]);
  const consecutiveFocusDeepRef   = useRef(false);

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
    // Temp (timed/event) buffs combine multiplicatively into qiMult and
    // additively into focusBonus, matching the original Phase 1 behavior.
    let qiMult = 1;
    let focusBonus = 0;
    // Permanent (uncommon) sums — additive across all stacks across all
    // permanent cards. Folded into the same final refs at the bottom so
    // useCultivation only sees one number per axis.
    let permQiMultBonus = 0;
    let permQiFlat      = 0;
    let permGateReduce  = 0;
    let permOfflineMult = 0;
    let painless = false;
    let lingering = false;
    let lingeringMs = 0;
    let lingeringMult = 0;
    // Consecutive Focus — collect the highest active tier; we'll build the
    // full T1..currentTier ladder from QI_SPARKS at the end.
    let consecutiveTier = 0;
    const now = Date.now();
    for (const s of sparks) {
      if (s.expiresAt && s.expiresAt <= now) continue;
      const card = QI_SPARK_BY_ID[s.sparkId];
      if (!card) continue;
      if (card.kind === 'next_breakthrough_flag') {
        painless = true;
        continue;
      }
      if (card.kind === 'lingering_focus_flag') {
        lingering = true;
        lingeringMs = card.residualDurationMs ?? 0;
        lingeringMult = card.residualMult ?? 0;
        continue;
      }
      if (card.kind === 'mechanic' && card.mechanicId === 'consecutive_focus') {
        if (card.tier > consecutiveTier) consecutiveTier = card.tier;
        continue;
      }
      if (card.kind === 'permanent') {
        const stacks = s.stacks ?? 1;
        const eff = card.effect;
        if (!eff) continue;
        if (eff.type === 'qi_flat_per_stack')          permQiFlat      += eff.value * stacks;
        if (eff.type === 'qi_mult_per_stack')          permQiMultBonus += eff.value * stacks;
        if (eff.type === 'focus_mult_bonus_per_stack') focusBonus      += eff.value * stacks;
        if (eff.type === 'gate_reduction_per_stack')   permGateReduce  += eff.value * stacks;
        if (eff.type === 'offline_qi_mult_per_stack')  permOfflineMult += eff.value * stacks;
        if (eff.type === 'qi_mult_per_breakthrough_per_stack') {
          // Resonant Soul: contribution scales with breakthroughs accrued
          // since this instance was picked. Per-instance counter is bumped
          // by the breakthrough effect below.
          permQiMultBonus += eff.value * stacks * (s.breakthroughsAccrued ?? 0);
        }
        continue;
      }
      const eff = card.effect;
      if (!eff) continue;
      if (eff.type === 'qi_mult')         qiMult     *= (1 + eff.value);
      if (eff.type === 'focus_mult_bonus') focusBonus += eff.value;
    }
    // Permanents stack additively with each other; the combined permanent
    // bonus then multiplies with the temp-buff product.
    qiMultRef.current                = qiMult * (1 + permQiMultBonus);
    qiFlatRef.current                = permQiFlat;
    gateReductionRef.current         = Math.min(GATE_REDUCTION_CAP, permGateReduce);
    focusMultBonusRef.current        = focusBonus;
    painlessActiveRef.current        = painless;
    lingeringActiveRef.current       = lingering;
    lingeringResidualMsRef.current   = lingeringMs;
    lingeringResidualMultRef.current = lingeringMult;
    // Build the cumulative ladder from every Consecutive Focus tier the
    // player has unlocked (T1..currentTier). Sorted by holdMs so the tick
    // can early-out when it hits an unmet threshold.
    if (consecutiveTier > 0) {
      const ladder = [];
      for (const c of QI_SPARKS) {
        if (c.kind !== 'mechanic') continue;
        if (c.mechanicId !== 'consecutive_focus') continue;
        if ((c.tier ?? 0) > consecutiveTier) continue;
        ladder.push({ holdMs: c.holdMs ?? 0, bonus: c.bonus ?? 0 });
      }
      ladder.sort((a, b) => a.holdMs - b.holdMs);
      consecutiveFocusLadderRef.current = ladder;
    } else {
      consecutiveFocusLadderRef.current = [];
    }
    // Deep meditation only fires once T5 is reached.
    consecutiveFocusDeepRef.current = consecutiveTier >= 5;
    // Offline calc runs before React mounts, so mirror its inputs to
    // localStorage every time the spark set changes.
    saveJSON(OFFLINE_SNAPSHOT_KEY, { offlineQiMult: 1 + permOfflineMult });
  }, []);

  useEffect(() => { recomputeRefs(activeSparks); }, [activeSparks, recomputeRefs]);

  // Latest active sparks mirrored into a ref so drawOffer (called from the
  // realmIndex-only breakthrough effect) can gate by current mechanic tier
  // without re-subscribing on every spark change.
  const activeSparksRef = useRef(activeSparks);
  useEffect(() => { activeSparksRef.current = activeSparks; }, [activeSparks]);

  const drawOfferCtx = useCallback(() => ({
    activeSparks:      activeSparksRef.current,
    isFeatureUnlocked: isFeatureUnlockedRef.current,
  }), []);

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
        // Resonant Soul accrues +1 breakthrough each layer-up; the qi/s
        // bonus per stack scales with this counter (see recomputeRefs).
        if (card.kind === 'permanent'
            && card.effect?.type === 'qi_mult_per_breakthrough_per_stack') {
          next.push({ ...s, breakthroughsAccrued: (s.breakthroughsAccrued ?? 0) + 1 });
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
      const cards = drawOffer(2, drawOfferCtx());
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

    // Permanent cards merge into a single per-id instance with a stacks
    // counter so the chip UI can render "Card ×N" instead of N chips.
    if (card.kind === 'permanent') {
      setActiveSparks(prev => {
        const existing = prev.find(p => p.sparkId === card.id);
        if (existing) {
          return prev.map(p => (
            p.instanceId === existing.instanceId
              ? { ...p, stacks: (p.stacks ?? 1) + 1 }
              : p
          ));
        }
        return [...prev, {
          instanceId: ++instanceCounter,
          sparkId:    card.id,
          stacks:     1,
          // Resonant Soul tracks breakthroughs accrued since this card was
          // first picked. Other permanents leave the field unset.
          breakthroughsAccrued: 0,
        }];
      });
      return;
    }

    // Mechanic cards: one instance per mechanicId. Higher-tier picks REPLACE
    // the existing entry in place so the chip just shows the latest tier.
    if (card.kind === 'mechanic') {
      setActiveSparks(prev => {
        const existing = prev.find(p => {
          const c = QI_SPARK_BY_ID[p.sparkId];
          return c?.kind === 'mechanic' && c.mechanicId === card.mechanicId;
        });
        if (existing) {
          return prev.map(p => (
            p.instanceId === existing.instanceId
              ? { ...p, sparkId: card.id }
              : p
          ));
        }
        return [...prev, {
          instanceId: ++instanceCounter,
          sparkId:    card.id,
        }];
      });
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
      const fresh = drawOffer(2, drawOfferCtx());
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
    // Reset the mirrored offline-qi multiplier so the next run starts at 1×
    // even if the page is reloaded before any new permanent draws.
    saveJSON(OFFLINE_SNAPSHOT_KEY, { offlineQiMult: 1 });
  }, []);

  // Listen for painless-consumed event from useCultivation. Removes the
  // active painless spark so a fresh card is needed for the next free
  // breakthrough.
  useEffect(() => {
    const handler = () => {
      setActiveSparks(prev => prev.filter(s => {
        const card = QI_SPARK_BY_ID[s.sparkId];
        return !card || card.kind !== 'next_breakthrough_flag';
      }));
    };
    window.addEventListener('mai:painless-consumed', handler);
    return () => window.removeEventListener('mai:painless-consumed', handler);
  }, []);

  return {
    activeSparks,
    pendingOffer,
    bloodLotusBalance,
    qiMultRef,
    qiFlatRef,
    gateReductionRef,
    focusMultBonusRef,
    painlessActiveRef,
    lingeringActiveRef,
    lingeringResidualMsRef,
    lingeringResidualMultRef,
    consecutiveFocusLadderRef,
    consecutiveFocusDeepRef,
    choose,
    reroll,
    nextRerollCost,
    skip,
    clearAll,
    // Direct-apply for debug bridges — bypasses the offer modal flow.
    applySpark: applySparkChoice,
  };
}
