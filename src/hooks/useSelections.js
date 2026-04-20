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
import { addJade } from '../systems/jade';
import { spendJade, JADE_COSTS } from '../systems/jade';

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
  const [jadeBalance, setJadeBalance] = useState(() => {
    try { return parseInt(localStorage.getItem('mai_jade') || '0', 10); } catch { return 0; }
  });

  const prevRealmIndex = useRef(cultivation.realmIndex);

  // Persist on change
  useEffect(() => { savePending(pending); }, [pending]);
  useEffect(() => { saveActive(active);   }, [active]);

  // Sync jade balance display when localStorage changes
  const refreshJade = useCallback(() => {
    try {
      setJadeBalance(parseInt(localStorage.getItem('mai_jade') || '0', 10));
    } catch {}
  }, []);

  // Detect level-ups and generate selections
  useEffect(() => {
    const prev = prevRealmIndex.current;
    const curr = cultivation.realmIndex;
    if (curr === prev) return;
    prevRealmIndex.current = curr;

    const tier = isBreakthrough(prev, curr) ? 'breakthrough' : 'minor';
    const options = rollOptions(curr, active, tier, optionCount);
    if (options.length === 0) return;

    const realmLabel = REALMS[curr]
      ? (REALMS[curr].stage
          ? `${REALMS[curr].name} — ${REALMS[curr].stage}`
          : REALMS[curr].name)
      : '';

    const entry = {
      id:          `sel-${++selCounter}-${curr}`,
      realmIndex:  curr,
      realmLabel,
      tier,
      options,
      freeRerolls: tier === 'breakthrough' ? 1 : 0,
      rerollsUsed: 0,
    };

    // Award jade_per_breakthrough perk on breakthroughs
    if (tier === 'breakthrough') {
      const jadeBonus = Object.entries(active).reduce((total, [optId, stacks]) => {
        const opt = SELECTION_BY_ID[optId];
        if (!opt) return total;
        return total + opt.effects
          .filter(e => e.type === 'special' && e.key === 'jade_per_breakthrough')
          .reduce((s, e) => s + e.value * stacks, 0);
      }, 0);
      if (jadeBonus > 0) {
        addJade(Math.floor(jadeBonus));
        refreshJade();
      }
    }

    setPending(prev => [...prev, entry]);

    // ── Law track (major breakthroughs only) ──────────────────────────────
    // Every major-realm transition also offers 3 law choices. The very
    // first one (when the library is empty) is the unlock-the-mechanic
    // beat and can't be skipped. Later offers are skippable.
    if (tier === 'breakthrough') {
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

  /** Reroll all 3 law offers. Free first time, then JADE_COSTS.reroll_law_extra. */
  const rerollLaw = useCallback((selectionId) => {
    setPending(prev => prev.map(sel => {
      if (sel.id !== selectionId || sel.kind !== 'law') return sel;
      const hasFree = sel.rerollsUsed < sel.freeRerolls;
      if (!hasFree) {
        if (!spendJade(JADE_COSTS.reroll_law_extra)) return sel;
        refreshJade();
      }
      const fresh = sel.isFirst
        ? Array.from({ length: THREE_LAW_OFFERS }, () => generateLaw('Iron', sel.realmIndex))
        : rollLawOffers(sel.realmIndex);
      return { ...sel, lawOptions: fresh, rerollsUsed: sel.rerollsUsed + 1 };
    }));
  }, [refreshJade]);

  /** Reroll the options for a selection. Costs Jade unless free rerolls remain. */
  const rerollOptions = useCallback((selectionId) => {
    setPending(prev => prev.map(sel => {
      if (sel.id !== selectionId) return sel;

      const hasFree = sel.rerollsUsed < sel.freeRerolls;
      if (!hasFree) {
        const cost = sel.tier === 'breakthrough' ? JADE_COSTS.reroll_extra : JADE_COSTS.reroll_minor;
        if (!spendJade(cost)) return sel; // not enough jade
        refreshJade();
      }

      const newOptions = rollOptions(cultivation.realmIndex, active, sel.tier, optionCount);
      return {
        ...sel,
        options:     newOptions,
        rerollsUsed: sel.rerollsUsed + 1,
      };
    }));
  }, [cultivation.realmIndex, active, refreshJade]);

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
    setPending(prev => prev.map(sel => {
      if (sel.id !== selectionId) return sel;

      const hasFree = sel.rerollsUsed < sel.freeRerolls;
      if (!hasFree) {
        const cost = sel.tier === 'breakthrough' ? JADE_COSTS.reroll_extra : JADE_COSTS.reroll_minor;
        if (!spendJade(cost)) return sel;
        refreshJade();
      }

      const weights = sel.tier === 'breakthrough' ? BREAKTHROUGH_WEIGHTS : MINOR_WEIGHTS;
      const keep    = sel.options.filter((_, i) => i !== optionIndex);
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

      const newOptions = [...sel.options];
      newOptions[optionIndex] = replacement;
      return { ...sel, options: newOptions, rerollsUsed: sel.rerollsUsed + 1 };
    }));
  }, [cultivation.realmIndex, active, refreshJade]);

  return {
    pending,
    active,
    pendingCount: pending.length,
    jadeBalance,
    pickOption,
    rerollOptions,
    rerollOne,
    pickLaw,
    skipLaw,
    rerollLaw,
    getStatModifiers,
    getQiSpeedMult,
    getOfflineQiMult,
    refreshJade,
  };
}
