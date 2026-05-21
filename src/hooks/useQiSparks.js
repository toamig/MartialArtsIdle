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
import {
  QI_SPARKS,
  QI_SPARK_BY_ID,
  drawOffer,
  drawSingleCard,                 // legacy — no longer used in reroll path
  TRINITY_SPARK_IDS,
  TRINITY_CONVERGENCE_MULT,
  LEGENDARY_PER_OFFER_CHANCE,
  LEGENDARY_PER_CARD_CHANCE,      // legacy alias of PER_OFFER — kept for back-compat
  LEGENDARY_PITY_THRESHOLD,
} from '../data/qiSparks';
import { isMajorTransition } from '../data/realms';
import { spendBloodLotus, getBloodLotusBalance } from '../systems/bloodLotus';
import { trackSparkPicked, trackSparkRerolled, trackSparkExpired } from '../analytics';

// ── Legendary producer-synergy helpers ─────────────────────────────────────
// Pure functions that compose the per-producer + global multipliers from
// the active spark set + current owned counts. Called from App.jsx every
// time producers.owned or activeSparks changes.

/** Per-producer mult from active legendary sparks. Returns 1 if no sparks apply. */
function computeProducerSparkMult(pid, sparks, owned) {
  let mult = 1;
  for (const s of sparks) {
    const card = QI_SPARK_BY_ID[s.sparkId];
    const eff = card?.effect;
    if (!eff) continue;
    if (eff.type === 'producer_self_mult' && eff.target === pid) {
      mult *= eff.mult;
    } else if (eff.type === 'producer_count_mult' && eff.target === pid) {
      const sourceCount = owned[eff.source] ?? 0;
      mult *= (1 + sourceCount * eff.perEach);
    } else if (eff.type === 'producer_count_threshold_mult' && eff.target === pid) {
      const sourceCount = owned[eff.source] ?? 0;
      if (sourceCount >= eff.threshold) mult *= eff.mult;
    } else if (eff.type === 'producer_pair_synergy' && (eff.producerA === pid || eff.producerB === pid)) {
      const numPairs = Math.min(owned[eff.producerA] ?? 0, owned[eff.producerB] ?? 0);
      // Each pair adds (mult - 1) to the per-producer multiplier additively
      // so 3 pairs at mult=2 → ×(1 + 3×1) = ×4 (not ×8).
      if (numPairs > 0) mult *= (1 + numPairs * (eff.mult - 1));
    } else if (eff.type === 'phoenix_reborn' && pid !== 'p_phoenix') {
      // Phoenix Reborn: every major realm transition since this spark was
      // drawn adds +50% (Dial-4.1 2026-05-21 — was ×2/stack exponential).
      // Hard exponential was wildly game-breaking: 10 majors = ×1024 on
      // every non-Phoenix producer. Additive caps the runaway:
      //   10 majors = ×6, 20 majors = ×11. Still legendary-tier impact.
      const stacks = s.phoenixRebornStacks ?? 0;
      if (stacks > 0) mult *= (1 + 0.5 * stacks);
    }
  }
  return mult;
}

/** Global mult from active legendary sparks: trinity convergence + pair-global. */
function computeGlobalSparkMult(sparks, owned) {
  let mult = 1;
  // Trinity Convergence — all 3 beast sparks simultaneously → +500% global.
  const activeIds = new Set(sparks.map(s => s.sparkId));
  if (TRINITY_SPARK_IDS.every(id => activeIds.has(id))) {
    mult *= TRINITY_CONVERGENCE_MULT;
  }
  for (const s of sparks) {
    const eff = QI_SPARK_BY_ID[s.sparkId]?.effect;
    if (eff?.type === 'producer_pair_global_mult') {
      const numPairs = Math.min(owned[eff.producerA] ?? 0, owned[eff.producerB] ?? 0);
      if (numPairs > 0) mult *= (1 + numPairs * (eff.mult - 1));
    }
  }
  return mult;
}

/** True iff Phoenix Reborn (E2) is active in the spark set. */
function isPhoenixRebornActive(sparks) {
  return sparks.some(s => QI_SPARK_BY_ID[s.sparkId]?.effect?.type === 'phoenix_reborn');
}

/** True iff any id in `ids` is a legendary spark. Used by pity reset. */
function containsLegendary(ids) {
  return (ids ?? []).some(id => QI_SPARK_BY_ID[id]?.rarity === 'legendary');
}

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

export default function useQiSparks({ cultivation, isFeatureUnlocked, producerUnlocked }) {
  // Stable refs so drawOffer can read the latest gate state without forcing
  // the breakthrough effect to re-subscribe.
  const isFeatureUnlockedRef = useRef(isFeatureUnlocked);
  useEffect(() => { isFeatureUnlockedRef.current = isFeatureUnlocked; }, [isFeatureUnlocked]);
  // Producer-unlock gate (legendary producer-synergy sparks). The callback
  // identity churns on realmIndex change — that's fine, the effect just
  // resyncs the ref. drawOffer reads via the ref so it always sees current.
  const producerUnlockedRef  = useRef(producerUnlocked);
  useEffect(() => { producerUnlockedRef.current = producerUnlocked; }, [producerUnlocked]);
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
  // Crystal Click mechanic — fill rate (fraction of qi/s) and cap (minutes).
  // Both are 0 when the mechanic isn't unlocked.
  const crystalClickRateRef       = useRef(0);
  const crystalClickCapMinRef     = useRef(0);

  const prevRealmIndexRef = useRef(cultivation.realmIndex);

  // Persist
  useEffect(() => { saveJSON(ACTIVE_KEY,  activeSparks); }, [activeSparks]);
  useEffect(() => { saveJSON(PENDING_KEY, pendingOffer); }, [pendingOffer]);
  useEffect(() => { saveJSON(PITY_KEY,    pityCounter);  }, [pityCounter]);
  // Ref mirror for pity — setState updaters need fresh value (the breakthrough
  // effect calls drawOffer() with forceLegendary based on the current pity).
  const pityCounterRef = useRef(pityCounter);
  useEffect(() => { pityCounterRef.current = pityCounter; }, [pityCounter]);

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
    // Crystal Click — highest active tier drives rate + cap.
    let crystalClickRate   = 0;
    let crystalClickCapMin = 0;
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
      if (card.kind === 'mechanic' && card.mechanicId === 'crystal_click') {
        // Higher tier always supersedes lower (mechanic upgrade replaces in place).
        if ((card.rate ?? 0) > crystalClickRate) {
          crystalClickRate   = card.rate   ?? 0;
          crystalClickCapMin = card.capMinutes ?? 0;
        }
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
    // Crystal Click — expose rate + cap so useCultivation can drive the
    // reservoir each tick without caring about spark internals.
    crystalClickRateRef.current   = crystalClickRate;
    crystalClickCapMinRef.current = crystalClickCapMin;
    // Offline calc runs before React mounts, so mirror its inputs to
    // localStorage every time the spark set changes.
    saveJSON(OFFLINE_SNAPSHOT_KEY, { offlineQiMult: 1 + permOfflineMult });
    // Crystal Click offline snapshot — useCultivation offline init reads this
    // to fill the reservoir for time away.
    saveJSON('mai_crystal_click_snapshot', { rate: crystalClickRate, capMin: crystalClickCapMin });
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
    producerUnlocked:  producerUnlockedRef.current,
  }), []);

  // ── Expiry tick — runs every second to prune timed sparks ───────────────
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setActiveSparks(prev => {
        const filtered = prev.filter(s => !s.expiresAt || s.expiresAt > now);
        if (filtered.length === prev.length) return prev;
        try {
          for (const s of prev) {
            if (s.expiresAt && s.expiresAt <= now) trackSparkExpired(s.sparkId);
          }
        } catch {}
        return filtered;
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
        // Phoenix Reborn (legendary E2) — each MAJOR realm transition between
        // `prev` and `curr` bumps the stack counter (mult = 2^stacks applied
        // to every non-phoenix producer) and fires the reset event so App.jsx
        // can zero out the player's Phoenix count.
        if (card.kind === 'permanent' && card.effect?.type === 'phoenix_reborn') {
          let majorCount = 0;
          for (let i = prev; i < curr; i++) {
            if (isMajorTransition(i)) majorCount++;
          }
          if (majorCount > 0) {
            next.push({ ...s, phoenixRebornStacks: (s.phoenixRebornStacks ?? 0) + majorCount });
            try {
              window.dispatchEvent(new CustomEvent('mai:phoenix-reborn', { detail: { count: majorCount } }));
            } catch {}
          } else {
            next.push(s);
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
      // Pity: if the counter has reached the threshold, force the FIRST
      // card slot to be a legendary on this draw. Counter resets below.
      const pityNow = pityCounterRef.current ?? 0;
      const forceLegendary = pityNow >= LEGENDARY_PITY_THRESHOLD;
      const ctxBase = drawOfferCtx();
      const cards = drawOffer(2, { ...ctxBase, forceLegendary });
      if (cards.length === 0) return null;
      // After draw: reset pity if a legendary appeared (forced or natural),
      // else increment by 1. We do this here (not in a separate setPity call)
      // to make pity advancement deterministic with respect to the draw.
      const sawLegendary = containsLegendary(cards);
      setPityCounter(c => sawLegendary ? 0 : (c + 1));
      return {
        id:                   `qs-offer-${++instanceCounter}-${curr}`,
        cards,
        // 2026-05-21: offer-level reroll state (tier-locked redesign). The
        // player rerolls the WHOLE pair, not individual cards. 1 free
        // reroll per offer, then escalating PAID_REROLL_COSTS.
        offerFreeRerollsLeft: 1,
        offerPaidRerollsUsed: 0,
        // Legacy per-card fields kept zeroed so any in-flight UI that
        // still reads them resolves to "no free rerolls" gracefully.
        cardFreeRerollsLeft:  [0, 0],
        cardPaidRerollsUsed:  [0, 0],
        rolledAtRealm:        curr,
      };
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

    if (card.kind === 'timed' || card.kind === 'lingering_focus_flag') {
      const freshExpiry = now + card.duration;
      setActiveSparks(prev => {
        // If this spark is already active, refresh its timer rather than
        // stacking a second instance. This prevents a race where the old
        // expiring instance is cleaned up at the same tick the new one is
        // added, leaving the player with nothing.
        const existing = prev.find(p => p.sparkId === card.id && p.expiresAt);
        if (existing) {
          return prev.map(p =>
            p.instanceId === existing.instanceId
              ? { ...p, expiresAt: freshExpiry }
              : p
          );
        }
        return [...prev, {
          instanceId: ++instanceCounter,
          sparkId:    card.id,
          expiresAt:  freshExpiry,
        }];
      });
      return;
    }

    if (card.kind === 'event_count') {
      setActiveSparks(prev => [...prev, {
        instanceId:              ++instanceCounter,
        sparkId:                 card.id,
        breakthroughsRemaining:  card.breakthroughs,
      }]);
      return;
    }

    // Fallback for any future kinds
    setActiveSparks(prev => [...prev, {
      instanceId: ++instanceCounter,
      sparkId:    card.id,
    }]);
  }, [cultivation.rateRef, cultivation.qiRef]);

  // ── Player actions ──────────────────────────────────────────────────────

  const choose = useCallback((sparkId) => {
    setPendingOffer(prev => {
      if (!prev || !prev.cards.includes(sparkId)) return prev;
      try { trackSparkPicked(sparkId, prev.cards.length); } catch {}
      applySparkChoice(sparkId);
      return null;
    });
  }, [applySparkChoice]);

  /**
   * Reroll the entire offer (tier-locked model, 2026-05-21 redesign).
   *   - First reroll per offer is free (`offerFreeRerollsLeft` decrements 1→0).
   *   - Subsequent rerolls cost escalating Blood Lotus (PAID_REROLL_COSTS).
   *   - Re-rolls the rarity tier — gamble for higher rarity.
   *   - Pity: if counter has reached threshold, the new offer's tier is
   *     forced to legendary (drawOffer with forceLegendary=true).
   *   - Returns true if reroll happened, false if blocked by cost or no draw.
   */
  const rerollOffer = useCallback(() => {
    let result = false;
    setPendingOffer(prev => {
      if (!prev) return prev;
      const freeLeft = prev.offerFreeRerollsLeft ?? 1;
      const paidUsed = prev.offerPaidRerollsUsed ?? 0;
      const isFree = freeLeft > 0;

      if (!isFree) {
        const paidIdx = Math.min(paidUsed, PAID_REROLL_COSTS.length - 1);
        const cost = PAID_REROLL_COSTS[Math.max(0, paidIdx)];
        if (!spendBloodLotus(cost)) return prev;
        try { setBloodLotusBalance(getBloodLotusBalance()); } catch {}
        try { trackSparkRerolled(false, cost); } catch {}
      } else {
        try { trackSparkRerolled(true, 0); } catch {}
      }

      // Pity-driven force-legendary still applies on the reroll.
      const pityNow = pityCounterRef.current ?? 0;
      const forceLegendary = pityNow >= LEGENDARY_PITY_THRESHOLD;
      const newCards = drawOffer(2, { ...drawOfferCtx(), forceLegendary });
      if (newCards.length === 0) return prev;
      // Reset pity if any card in the new offer is legendary.
      const sawLegendary = containsLegendary(newCards);
      if (sawLegendary) setPityCounter(0);
      result = true;
      return {
        ...prev,
        cards:                  newCards,
        offerFreeRerollsLeft:   isFree ? 0 : freeLeft,
        offerPaidRerollsUsed:   isFree ? paidUsed : paidUsed + 1,
      };
    });
    return result;
  }, []);

  /**
   * Cost of the next reroll (Blood Lotus). 0 if a free reroll is available.
   */
  const nextRerollCost = useCallback(() => {
    if (!pendingOffer) return 0;
    const freeLeft = pendingOffer.offerFreeRerollsLeft ?? 1;
    if (freeLeft > 0) return 0;
    const paidIdx = Math.min(
      Math.max(0, pendingOffer.offerPaidRerollsUsed ?? 0),
      PAID_REROLL_COSTS.length - 1,
    );
    return PAID_REROLL_COSTS[paidIdx];
  }, [pendingOffer]);

  /**
   * Discard the current offer without picking. Used by the modal's auto-
   * timeout when the player ignores the choice. Auto-resolves to the
   * LEFTMOST card so the player isn't punished for ignoring.
   *
   * 2026-05-21 bug-fix: fires a `mai:spark-auto-picked` window event so the
   * UI can surface a toast — previously the modal would just disappear and
   * the player wouldn't know which spark they got.
   */
  const skip = useCallback(() => {
    setPendingOffer(prev => {
      if (!prev) return null;
      const leftmostId = prev.cards?.[0];
      if (leftmostId) {
        applySparkChoice(leftmostId);
        // Notify UI so a toast can confirm the auto-pick.
        try {
          window.dispatchEvent(new CustomEvent('mai:spark-auto-picked', {
            detail: { sparkId: leftmostId },
          }));
        } catch {}
      }
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
    crystalClickRateRef,
    crystalClickCapMinRef,
    choose,
    rerollOffer,                  // 2026-05-21 tier-locked redesign
    rerollCard: rerollOffer,      // legacy alias — old consumers fall through
    nextRerollCost,
    skip,
    clearAll,
    // Pity counter — exposed so the choice modal can show "Pity in N realms".
    pityCounter,
    pityThreshold: LEGENDARY_PITY_THRESHOLD,
    legendaryChance: LEGENDARY_PER_OFFER_CHANCE,
    // Round 3 — bypass the offer flow entirely. `grant` is used by:
    //   - crystal evolution (HomeScreen.handleCrystalEvolve) to unlock
    //     mechanic T1s when the crystal crosses a visual tier
    //   - upgrade-shop purchases (mechanic_tier upgrades grant a T2-T5 spark)
    // Idempotent for mechanics: only fires if the existing active tier is
    // strictly lower than the granted card's tier. No-op otherwise.
    grant: (sparkId) => {
      const card = QI_SPARK_BY_ID[sparkId];
      if (!card) return false;
      if (card.kind === 'mechanic') {
        // Read the current set via the latest activeSparks state — safe because
        // grant runs from event/effect handlers, not inside a setState updater.
        const current = activeSparks.reduce((acc, s) => {
          const c = QI_SPARK_BY_ID[s.sparkId];
          if (c?.kind !== 'mechanic' || c.mechanicId !== card.mechanicId) return acc;
          return Math.max(acc, c.tier ?? 0);
        }, 0);
        if (current >= (card.tier ?? 0)) return false;
      }
      applySparkChoice(sparkId);
      return true;
    },
    /** Highest active tier for a mechanic id, or 0 if none owned. */
    getMechanicTier: (mechanicId) => {
      let max = 0;
      for (const s of activeSparks) {
        const c = QI_SPARK_BY_ID[s.sparkId];
        if (c?.kind === 'mechanic' && c.mechanicId === mechanicId) {
          if ((c.tier ?? 0) > max) max = c.tier ?? 0;
        }
      }
      return max;
    },
    /**
     * Per-producer multiplier composed from active legendary sparks.
     * Caller passes the current owned map (from useProducers). Returns 1
     * when no legendary sparks apply to this producer.
     */
    getProducerSparkMult: (pid, ownedMap) =>
      computeProducerSparkMult(pid, activeSparks, ownedMap ?? {}),
    /**
     * Global multiplier composed from active legendary sparks (trinity
     * convergence + producer-pair global mults). Folded into useCultivation's
     * rate calc via sparkLegendaryGlobalMultRef.
     */
    getGlobalSparkMult: (ownedMap) =>
      computeGlobalSparkMult(activeSparks, ownedMap ?? {}),
    /** True iff Phoenix Reborn is active — App.jsx uses this to gate the reset listener. */
    isPhoenixRebornActive: () => isPhoenixRebornActive(activeSparks),
    // Direct-apply for debug bridges — bypasses the offer modal flow.
    applySpark: applySparkChoice,
  };
}
