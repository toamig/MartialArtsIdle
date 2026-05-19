import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import UPGRADES, { UPGRADES_BY_ID } from '../data/upgrades';

const SAVE_KEY = 'mai_upgrades';

// ── Persistence ───────────────────────────────────────────────────────────────

function loadOwnedSet() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveOwnedSet(set) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify([...set])); } catch {}
}

// ── Unlock + visibility ──────────────────────────────────────────────────────

/**
 * Test an upgrade's unlock condition against current state.
 * ctx: { realmIndex, crystalLevel, getProducerOwned(id), getMechanicTier(id) }
 */
function isUnlocked(upgrade, ctx) {
  return evalGate(upgrade.unlock, ctx);
}

function evalGate(gate, ctx) {
  if (!gate) return true;
  switch (gate.type) {
    case 'realm':         return ctx.realmIndex   >= gate.minRealmIndex;
    case 'crystal_level': return ctx.crystalLevel >= gate.min;
    case 'producer':      return ctx.getProducerOwned(gate.producerId) >= gate.min;
    // Round 3 — mechanic-tier upgrades unlock once the previous tier of that
    // mechanic is owned (granted by crystal evolution for T1, by buying the
    // prior u_<mechanic>_tN entry for T2-T5).
    case 'mechanic_tier': return (ctx.getMechanicTier?.(gate.mechanicId) ?? 0) >= gate.min;
    // Composite — every sub-gate must pass. Used by crystal_tap upgrades
    // to require both a crystal-level milestone AND the Crystal Reservoir
    // mechanic being unlocked (so "double the tap-empty-reservoir reward"
    // upgrades don't appear before the player has a reservoir to tap).
    case 'all':           return (gate.gates ?? []).every(g => evalGate(g, ctx));
    case 'any':           return (gate.gates ?? []).some(g  => evalGate(g, ctx));
    default:              return true;
  }
}

/**
 * Visibility tease — show locked upgrade if the player is at ≥50% of the
 * gating producer count. Avoids wall-of-grey on fresh saves but lets the
 * player see the next horizon when they're close. For realm/crystal-level
 * gates we don't tease (the player can see the realm progress on Home).
 * Mechanic-tier upgrades only appear once the previous tier is owned —
 * no tease, since the player won't recognise a name they've never seen.
 */
function isVisible(upgrade, ctx) {
  if (isUnlocked(upgrade, ctx)) return true;
  const u = upgrade.unlock;
  if (u?.type === 'producer') {
    return ctx.getProducerOwned(u.producerId) >= Math.ceil(u.min / 2);
  }
  return false;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useUpgrades — owns the Set of purchased upgrade ids.
 *
 * Effect aggregation is pure-derived from `owned`:
 *   - getProducerMult(producerId)  — product of all owned producer_double mults for that id
 *   - getProducerMultAll()         — product of producer_double mults that target ALL producers
 *                                    (currently none, but the hook supports it for future "global" upgrades)
 *   - getCrystalTapMult()          — product of crystal_tap mults
 *   - getFocusMultAdd()            — sum of focus_mult adds (percentage points)
 *
 * App.jsx mirrors these into useCultivation refs / useQiSparks refs.
 */
export default function useUpgrades() {
  const [owned, setOwned] = useState(loadOwnedSet);
  const ownedRef = useRef(owned);

  useEffect(() => {
    ownedRef.current = owned;
    saveOwnedSet(owned);
  }, [owned]);

  const isOwned = useCallback((id) => owned.has(id), [owned]);

  // ── Aggregations (memoised so App.jsx mirror effects only fire on change) ──

  const producerMults = useMemo(() => {
    const out = {};
    for (const id of owned) {
      const u = UPGRADES_BY_ID[id];
      if (!u || u.category !== 'producer_double') continue;
      const pid = u.effect.producerId;
      out[pid] = (out[pid] ?? 1) * u.effect.mult;
    }
    return out;
  }, [owned]);

  const crystalTapMult = useMemo(() => {
    let m = 1;
    for (const id of owned) {
      const u = UPGRADES_BY_ID[id];
      if (u?.category === 'crystal_tap') m *= u.effect.mult;
    }
    return m;
  }, [owned]);

  const focusMultAdd = useMemo(() => {
    let s = 0;
    for (const id of owned) {
      const u = UPGRADES_BY_ID[id];
      if (u?.category === 'focus_mult') s += u.effect.add;
    }
    return s;
  }, [owned]);

  // Additive bonuses to the offline accrual rate and cap. The base values
  // (0.20 and 8 h) live in useCultivation / autoFarm; these stack on top.
  // Offline calc runs pre-React-mount, so it reads upgrades from localStorage
  // directly (see the helper below) rather than depending on this hook.
  const offlineRateAdd = useMemo(() => {
    let s = 0;
    for (const id of owned) {
      const u = UPGRADES_BY_ID[id];
      if (u?.category === 'offline_rate') s += u.effect.add;
    }
    return s;
  }, [owned]);
  const offlineCapAddHours = useMemo(() => {
    let s = 0;
    for (const id of owned) {
      const u = UPGRADES_BY_ID[id];
      if (u?.category === 'offline_cap') s += u.effect.addHours;
    }
    return s;
  }, [owned]);

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Lookup the per-producer output mult applied by upgrades (1 if none owned). */
  const getProducerMult = useCallback(
    (producerId) => producerMults[producerId] ?? 1,
    [producerMults],
  );

  const getCrystalTapMult  = useCallback(() => crystalTapMult,  [crystalTapMult]);
  const getFocusMultAdd    = useCallback(() => focusMultAdd,    [focusMultAdd]);
  const getOfflineRateAdd     = useCallback(() => offlineRateAdd,     [offlineRateAdd]);
  const getOfflineCapAddHours = useCallback(() => offlineCapAddHours, [offlineCapAddHours]);

  /**
   * The average per-producer multiplier weighted by current rate
   * contribution — useful as a single scalar for the cultivation rate-formula
   * `upgradeProducerMultRef`. Because producer-double upgrades are PER-
   * PRODUCER, the single global mult is approximated by computing the weighted
   * mean across producers when the rate calculation reads it. For simplicity
   * Phase D mirrors getProducerMult(id) per-producer at the source (in
   * useProducers.getRate) rather than at the consumer; this helper returns 1
   * and exists as a hook surface for future "all producers ×2" capstones.
   */
  const getGlobalProducerMult = useCallback(() => 1, []);

  /**
   * Buy an upgrade. CALLER must have already deducted cost via cultivation.spendQi.
   * Returns true on success, false if already owned or unknown id.
   */
  const buy = useCallback((id) => {
    if (!UPGRADES_BY_ID[id]) return false;
    if (ownedRef.current.has(id)) return false;
    setOwned(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    return true;
  }, []);

  /** Filter the canonical UPGRADES list by visibility for a given context. */
  const getVisible = useCallback((ctx) => UPGRADES.filter(u => isVisible(u, ctx)), []);

  /** Predicate forwarders so consumers don't import from data/upgrades. */
  const checkUnlocked = useCallback((upgrade, ctx) => isUnlocked(upgrade, ctx), []);

  /** Reincarnation reset — upgrades wipe entirely (per design). */
  const reset = useCallback(() => setOwned(new Set()), []);

  return {
    owned,
    ownedRef,
    isOwned,
    buy,
    getVisible,
    checkUnlocked,
    getProducerMult,
    getGlobalProducerMult,
    getCrystalTapMult,
    getFocusMultAdd,
    getOfflineRateAdd,
    getOfflineCapAddHours,
    reset,
  };
}
