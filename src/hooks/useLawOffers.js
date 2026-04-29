import { useState, useEffect, useRef, useCallback } from 'react';
import REALMS, { lawOfferRaritiesForRealm } from '../data/realms';
import { generateLaw } from '../data/affixPools';
import { addBloodLotus, spendBloodLotus, getBloodLotusBalance, BLOOD_LOTUS_COSTS } from '../systems/bloodLotus';
import { trackLawPicked, trackLawSkipped } from '../analytics';

const PENDING_KEY = 'mai_pending_selections';

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

// ── Major-realm detection ───────────────────────────────────────────────────

function isMajorRealmChange(prevIndex, currIndex) {
  const prev = REALMS[prevIndex];
  const curr = REALMS[currIndex];
  return !!prev && !!curr && prev.name !== curr.name;
}

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

/**
 * useLawOffers — pick-3 law-offer flow that fires on major-realm transitions.
 *
 * Was previously combined with a broad-buff "minor selection" pool covering
 * cultivation/combat/gathering/mining/economy. That pool was removed in favor
 * of the Qi Sparks system; this hook now handles laws only.
 */
export default function useLawOffers({ cultivation }) {
  const [pending, setPending] = useState(loadPending);
  // Mirror of pending used to read current state outside setPending updaters.
  // Side effects (spendBloodLotus, random generation) must NOT live inside
  // setPending(prev => …) because React 18 Strict Mode double-invokes those
  // updaters in development to detect impurity.
  const pendingRef = useRef(pending);
  const [bloodLotusBalance, setBloodLotusBalance] = useState(() => {
    try { return getBloodLotusBalance(); } catch { return 0; }
  });

  const prevRealmIndex = useRef(cultivation.realmIndex);

  useEffect(() => { savePending(pending); pendingRef.current = pending; }, [pending]);

  // Keep balance in sync — bloodLotus.js fires 'blood-lotus-changed' on every add/spend.
  useEffect(() => {
    const handler = (e) => setBloodLotusBalance(e.detail);
    window.addEventListener('blood-lotus-changed', handler);
    return () => window.removeEventListener('blood-lotus-changed', handler);
  }, []);

  const refreshBloodLotus = useCallback(() => {
    try { setBloodLotusBalance(getBloodLotusBalance()); } catch {}
  }, []);

  // Detect realm changes; only fire law offers on MAJOR realm transitions.
  useEffect(() => {
    const prev = prevRealmIndex.current;
    const curr = cultivation.realmIndex;
    if (curr === prev) return;
    prevRealmIndex.current = curr;

    if (!isMajorRealmChange(prev, curr)) return;

    const realmLabel = REALMS[curr]
      ? (REALMS[curr].stage
          ? `${REALMS[curr].name} — ${REALMS[curr].stage}`
          : REALMS[curr].name)
      : '';

    const isFirst = (cultivation.ownedLaws?.length ?? 0) === 0;
    const lawEntry = {
      id:          `sel-law-${++selCounter}-${curr}`,
      kind:        'law',
      realmIndex:  curr,
      realmLabel,
      tier:        'breakthrough',
      // First offer always rolls pure Iron — introduces the system at the
      // lowest tier so the player learns before the rarity band broadens.
      lawOptions:  isFirst
        ? Array.from({ length: THREE_LAW_OFFERS }, () => generateLaw('Iron', curr))
        : rollLawOffers(curr),
      isFirst,
      freeRerolls: 1,
      rerollsUsed: 0,
    };
    setPending(prev => [...prev, lawEntry]);
  }, [cultivation.realmIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Add the chosen law to the library. Never auto-equips. */
  const pickLaw = useCallback((selectionId, lawIndex) => {
    setPending(prev => {
      const entry = prev.find(s => s.id === selectionId);
      if (!entry || entry.kind !== 'law') return prev;
      const law = entry.lawOptions?.[lawIndex];
      if (law) {
        cultivation.addOwnedLaw?.(law);
        try { trackLawPicked(law.id ?? 'unknown', law.element, cultivation.realmIndex); } catch {}
      }
      return prev.filter(s => s.id !== selectionId);
    });
  }, [cultivation]);

  /** Skip a law offer. Blocked for the first-ever offer. */
  const skipLaw = useCallback((selectionId) => {
    setPending(prev => {
      const entry = prev.find(s => s.id === selectionId);
      if (!entry || entry.kind !== 'law' || entry.isFirst) return prev;
      try { trackLawSkipped(cultivation.realmIndex); } catch {}
      return prev.filter(s => s.id !== selectionId);
    });
  }, [cultivation.realmIndex]);

  /** Reroll all 3 law offers. Free first time, then BLOOD_LOTUS_COSTS.reroll_law_extra. */
  const rerollLaw = useCallback((selectionId) => {
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

  return {
    pending,
    pendingCount: pending.length,
    bloodLotusBalance,
    pickLaw,
    skipLaw,
    rerollLaw,
    rerollLawOne,
    refreshBloodLotus,
  };
}
