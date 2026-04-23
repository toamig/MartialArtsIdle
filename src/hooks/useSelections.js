import { useState, useEffect, useRef, useCallback } from 'react';
import REALMS, { lawOfferRaritiesForRealm } from '../data/realms';
import {
  SELECTION_BY_ID,
  SELECTION_POOL,
  MINOR_WEIGHTS,
  BREAKTHROUGH_WEIGHTS,
  rollOptions,
} from '../data/selections';
import { MOD } from '../data/stats';
import { generateLaw } from '../data/affixPools';
import { addBloodLotus, spendBloodLotus, getBloodLotusBalance, BLOOD_LOTUS_COSTS } from '../systems/bloodLotus';

const PENDING_KEY = 'mai_pending_selections';
const ACTIVE_KEY  = 'mai_active_selections';

// ── Persistence ───────────────────────────────────────────────────────────────

function loadPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function savePending(list) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)); } catch {}
}

function loadActive() {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveActive(obj) {
  try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(obj)); } catch {}
}

// ── Breakthrough detection ────────────────────────────────────────────────────

function isBreakthrough(prevIndex, currIndex) {
  const prev = REALMS[prevIndex];
  const curr = REALMS[currIndex];
  return !!prev && !!curr && prev.name !== curr.name;
}

/**
 * Roll three generator laws for a major-breakthrough law offer, drawing
 * rarities uniformly from the realm's band (lawOfferRaritiesForRealm).
 * Always returns exactly THREE_LAW_OFFERS distinct law objects.
 */
const THREE_LAW_OFFERS = 3;
function rollLawOffers(realmIndex) {
  const band = lawOfferRaritiesForRealm(realmIndex);
  const offers = [];
  for (let i = 0; i < THREE_LAW_OFFERS; i++) {
    const rarity = band[Math.floor(Math.random() * band.length)];
    offers.push(generateLaw(rarity, realmIndex));
  }
  return offers;
}

let selCounter = 0;

// ── Hook ──────────────────────────────────────────────────────────────────────

export default function useSelections({ cultivation, optionCount = 3 }) {
  const [pending, setPending] = useState(loadPending);
  const [active,  setActive]  = useState(loadActive);
  // Mirror of pending used to read current state outside setPending updaters.
  // Side effects (spendBloodLotus, random generation) must NOT live inside
  // setPending(prev => …) because React 18 Strict Mode double-invokes those
  // updaters in development to detect impurity.
  const pendingRef = useRef(pending);
  const [bloodLotusBalance, setBloodLotusBalance] = useState(() => {
    try { return getBloodLotusBalance(); } catch { return 0; }
  });

  const prevRealmIndex = useRef(cultivation.realmIndex);

  // Persist on change and keep ref in sync
  useEffect(() => { savePending(pending); pendingRef.current = pending; }, [pending]);
  useEffect(() => { saveActive(active);   }, [active]);

  // Keep balance in sync — bloodLotus.js fires 'blood-lotus-changed' on every add/spend.
  useEffect(() => {
    const handler = (e) => setBloodLotusBalance(e.detail);
    window.addEventListener('blood-lotus-changed', handler);
    return () => window.removeEventListener('blood-lotus-changed', handler);
  }, []);

  const refreshBloodLotus = useCallback(() => {
    try { setBloodLotusBalance(getBloodLotusBalance()); } catch {}
  }, []);

  // Detect level-ups and generate selections
  useEffect(() => {
    const prev = prevRealmIndex.current;
    const curr = cultivation.realmIndex;
    if (curr === prev) return;
    prevRealmIndex.current = curr;

    const isMajor = isBreakthrough(prev, curr);
    const tier    = isMajor ? 'breakthrough' : 'minor';

    const realmLabel = REALMS[curr]
      ? (REALMS[curr].stage
          ? `${REALMS[curr].name} — ${REALMS[curr].stage}`
          : REALMS[curr].name)
      : '';

    if (isMajor) {
      // Major breakthrough: law selection is the sole reward — no regular perk card.
      // Still award any blood_lotus_per_breakthrough bonuses from active perks.
      const bloodLotusBonus = Object.entries(active).reduce((total, [optId, stacks]) => {
        const opt = SELECTION_BY_ID[optId];
        if (!opt) return total;
        return total + opt.effects
          .filter(e => e.type === 'special' && e.key === 'blood_lotus_per_breakthrough')
          .reduce((s, e) => s + e.value * stacks, 0);
      }, 0);
      if (bloodLotusBonus > 0) {
        addBloodLotus(Math.floor(bloodLotusBonus));
        refreshBloodLotus();
      }

      const isFirst = (cultivation.ownedLaws?.length ?? 0) === 0;
      const lawEntry = {
        id:          `sel-law-${++selCounter}-${curr}`,
        kind:        'law',
        realmIndex:  curr,
        realmLabel,
        tier:        'breakthrough',
        lawOptions:  isFirst
          // First offer always rolls pure Iron — introduces the system at
          // the lowest tier so the player learns before the rarity band
          // broadens.
          ? Array.from({ length: THREE_LAW_OFFERS }, () => generateLaw('Iron', curr))
          : rollLawOffers(curr),
        isFirst,
        freeRerolls: 1,
        rerollsUsed: 0,
      };
      setPending(prev => [...prev, lawEntry]);
    } else {
      // Minor realm stage: regular perk selection.
      const options = rollOptions(curr, active, tier, optionCount);
      if (options.length === 0) return;
      const entry = {
        id:          `sel-${++selCounter}-${curr}`,
        realmIndex:  curr,
        realmLabel,
        tier,
        options,
        freeRerolls: 0,
        rerollsUsed: 0,
      };
      setPending(prev => [...prev, entry]);
    }
  }, [cultivation.realmIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Player picks an option from the first pending entry. */
  const pickOption = useCallback((selectionId, optionId) => {
    setActive(prev => {
      const next = { ...prev, [optionId]: (prev[optionId] ?? 0) + 1 };
      saveActive(next);
      return next;
    });
    setPending(prev => prev.filter(s => s.id !== selectionId));
  }, []);

  /** Add the chosen law to the library. Never auto-equips. */
  const pickLaw = useCallback((selectionId, lawIndex) => {
    setPending(prev => {
      const entry = prev.find(s => s.id === selectionId);
      if (!entry || entry.kind !== 'law') return prev;
      const law = entry.lawOptions?.[lawIndex];
      if (law) cultivation.addOwnedLaw?.(law);
      return prev.filter(s => s.id !== selectionId);
    });
  }, [cultivation]);

  /** Skip a law offer. Blocked for the first-ever offer. */
  const skipLaw = useCallback((selectionId) => {
    setPending(prev => {
      const entry = prev.find(s => s.id === selectionId);
      if (!entry || entry.kind !== 'law' || entry.isFirst) return prev;
      return prev.filter(s => s.id !== selectionId);
    });
  }, []);

  /** Reroll all 3 law offers. Free first time, then BLOOD_LOTUS_COSTS.reroll_law_extra. */
  const rerollLaw = useCallback((selectionId) => {
    // Side effects (spend + random generation) must live outside setPending so
    // React 18 Strict Mode's double-invocation of updaters doesn't double-spend.
    const sel = pendingRef.current.find(s => s.id === selectionId && s.kind === 'law');
    if (!sel) return;
    const hasFree = sel.rerollsUsed < sel.freeRerolls;
    if (!hasFree) {
      if (!spendBloodLotus(BLOOD_LOTUS_COSTS.reroll_law_extra)) return;
      refreshBloodLotus();
    }
    const fresh = sel.isFirst
      ? Array.from({ length: THREE_LAW_OFFERS }, () => generateLaw('Iron', sel.realmIndex))
      : rollLawOffers(sel.realmIndex);
    setPending(prev => prev.map(s => {
      if (s.id !== selectionId || s.kind !== 'law') return s;
      return { ...s, lawOptions: fresh, rerollsUsed: s.rerollsUsed + 1 };
    }));
  }, [refreshBloodLotus]);

  /** Reroll a single law offer at cardIndex. Shares the same free-reroll counter. */
  const rerollLawOne = useCallback((selectionId, cardIndex) => {
    const sel = pendingRef.current.find(s => s.id === selectionId && s.kind === 'law');
    if (!sel) return;
    const hasFree = sel.rerollsUsed < sel.freeRerolls;
    if (!hasFree) {
      if (!spendBloodLotus(BLOOD_LOTUS_COSTS.reroll_law_extra)) return;
      refreshBloodLotus();
    }
    const band = lawOfferRaritiesForRealm(sel.realmIndex);
    const rarity = sel.isFirst ? 'Iron' : band[Math.floor(Math.random() * band.length)];
    const freshLaw = generateLaw(rarity, sel.realmIndex);
    setPending(prev => prev.map(s => {
      if (s.id !== selectionId || s.kind !== 'law') return s;
      const newOptions = s.lawOptions.map((l, i) => i === cardIndex ? freshLaw : l);
      return { ...s, lawOptions: newOptions, rerollsUsed: s.rerollsUsed + 1 };
    }));
  }, [refreshBloodLotus]);

  /** Reroll the options for a selection. Costs Blood Lotus unless free rerolls remain. */
  const rerollOptions = useCallback((selectionId) => {
    const sel = pendingRef.current.find(s => s.id === selectionId);
    if (!sel) return;
    const hasFree = sel.rerollsUsed < sel.freeRerolls;
    if (!hasFree) {
      const cost = sel.tier === 'breakthrough' ? BLOOD_LOTUS_COSTS.reroll_extra : BLOOD_LOTUS_COSTS.reroll_minor;
      if (!spendBloodLotus(cost)) return;
      refreshBloodLotus();
    }
    const newOptions = rollOptions(cultivation.realmIndex, active, sel.tier, optionCount);
    setPending(prev => prev.map(s => {
      if (s.id !== selectionId) return s;
      return { ...s, options: newOptions, rerollsUsed: s.rerollsUsed + 1 };
    }));
  }, [cultivation.realmIndex, active, refreshBloodLotus]);

  // ── Stat modifiers ────────────────────────────────────────────────────────

  /**
   * Returns a modifier bundle compatible with mergeModifiers / computeAllStats.
   * Only stat_mod effects are included; special effects are handled per-system.
   */
  const getStatModifiers = useCallback(() => {
    const bundle = {};
    for (const [optId, stacks] of Object.entries(active)) {
      const opt = SELECTION_BY_ID[optId];
      if (!opt) continue;
      for (const eff of opt.effects) {
        if (eff.type !== 'stat_mod') continue;
        const modType = eff.mod === 'flat'      ? MOD.FLAT
                      : eff.mod === 'increased' ? MOD.INCREASED
                      : eff.mod === 'more'      ? MOD.MORE
                      : null;
        if (!modType) continue;
        if (!bundle[eff.stat]) bundle[eff.stat] = [];
        // Stack the modifier: flat stacks additively, increased/more multiply by stacks
        bundle[eff.stat].push({ type: modType, value: eff.value * stacks });
      }
    }
    return bundle;
  }, [active]);

  /**
   * Returns the combined multiplier for base qi speed from special qi_speed_mult effects.
   * Multiply the cultivation BASE_RATE by this value.
   * e.g. 2 stacks of +20% → returns 1.40
   */
  const getQiSpeedMult = useCallback(() => {
    let mult = 1;
    for (const [optId, stacks] of Object.entries(active)) {
      const opt = SELECTION_BY_ID[optId];
      if (!opt) continue;
      for (const eff of opt.effects) {
        if (eff.type === 'special' && eff.key === 'qi_speed_mult') {
          mult += eff.value * stacks;
        }
      }
    }
    return mult;
  }, [active]);

  /**
   * Returns the combined offline qi multiplier from special offline_qi_mult effects.
   * e.g. 1 stack of +30% → returns 1.30
   */
  const getOfflineQiMult = useCallback(() => {
    let mult = 1;
    for (const [optId, stacks] of Object.entries(active)) {
      const opt = SELECTION_BY_ID[optId];
      if (!opt) continue;
      for (const eff of opt.effects) {
        if (eff.type === 'special' && eff.key === 'offline_qi_mult') {
          mult += eff.value * stacks;
        }
      }
    }
    return mult;
  }, [active]);

  /** Reroll a single card at optionIndex, keeping the other two. */
  const rerollOne = useCallback((selectionId, optionIndex) => {
    const sel = pendingRef.current.find(s => s.id === selectionId);
    if (!sel) return;
    const hasFree = sel.rerollsUsed < sel.freeRerolls;
    if (!hasFree) {
      const cost = sel.tier === 'breakthrough' ? BLOOD_LOTUS_COSTS.reroll_extra : BLOOD_LOTUS_COSTS.reroll_minor;
      if (!spendBloodLotus(cost)) return;
      refreshBloodLotus();
    }
    const weights  = sel.tier === 'breakthrough' ? BREAKTHROUGH_WEIGHTS : MINOR_WEIGHTS;
    const keep     = sel.options.filter((_, i) => i !== optionIndex);
    const eligible = SELECTION_POOL.filter(opt => {
      const stacks = active[opt.id] ?? 0;
      return (
        cultivation.realmIndex >= opt.minRealmIndex &&
        stacks < opt.maxStacks &&
        !keep.includes(opt.id)
      );
    });
    let replacement = keep[0]; // fallback
    if (eligible.length > 0) {
      const total = eligible.reduce((s, o) => s + (weights[o.rarity] ?? 10), 0);
      let r = Math.random() * total;
      for (const opt of eligible) {
        r -= weights[opt.rarity] ?? 10;
        if (r <= 0) { replacement = opt.id; break; }
      }
      if (replacement === keep[0]) replacement = eligible[eligible.length - 1].id;
    }
    setPending(prev => prev.map(s => {
      if (s.id !== selectionId) return s;
      const newOptions = [...s.options];
      newOptions[optionIndex] = replacement;
      return { ...s, options: newOptions, rerollsUsed: s.rerollsUsed + 1 };
    }));
  }, [cultivation.realmIndex, active, refreshBloodLotus]);

  return {
    pending,
    active,
    pendingCount: pending.length,
    bloodLotusBalance,
    pickOption,
    rerollOptions,
    rerollOne,
    pickLaw,
    skipLaw,
    rerollLaw,
    rerollLawOne,
    getStatModifiers,
    getQiSpeedMult,
    getOfflineQiMult,
    refreshBloodLotus,
  };
}
