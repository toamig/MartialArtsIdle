import { useState, useEffect, useRef, useCallback } from 'react';
import REALMS, { getMajorBreakthroughRate, isMajorTransition } from '../data/realms';
import AudioManager from '../audio/AudioManager';
import { DEFAULT_LAW, THREE_HARMONY_MANUAL, LAW_RARITY } from '../data/laws';
import { saveGame, loadGame } from '../systems/save';
import { rollLawMult } from '../data/affixPools';
import { pickRandomUnique, rollUniqueValue } from '../data/lawUniques';
import { evaluateLawUniques, buildContext } from '../systems/lawEngine';
import { computeStat, MOD } from '../data/stats';

const OWNED_LAWS_KEY   = 'mai_owned_laws';
const ACTIVE_LAW_KEY   = 'mai_active_law';
export const MAX_LAWS = 100;

export const LAW_NEXT_RARITY = {
  Iron:   'Bronze',
  Bronze: 'Silver',
  Silver: 'Gold',
  Gold:   'Transcendent',
};

function loadOwnedLaws() {
  try {
    const raw = localStorage.getItem(OWNED_LAWS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [THREE_HARMONY_MANUAL];
}

const BASE_RATE       = 1; // qi per second at 1x
const BOOST_MULTIPLIER = 3; // legacy fallback when focusMult ref isn't wired
const AD_BOOST_MULT   = 2; // rewarded-ad cultivation boost
const MIN_OFFLINE_SEC = 5 * 60; // only show offline popup after 5 min away

const label = (r) => (r.stage ? `${r.name} - ${r.stage}` : r.name);

export default function useCultivation() {
  const saved = loadGame();
  const [realmIndex, setRealmIndex] = useState(saved?.realmIndex ?? 0);
  const [boosting, setBoosting] = useState(false);
  // Transient event set whenever a MAJOR realm transition fires — the home
  // screen renders a celebratory banner keyed on this id. Null otherwise.
  const [majorBreakthrough, setMajorBreakthrough] = useState(null);
  const [adBoostEndsAt, setAdBoostEndsAt] = useState(() => {
    const endsAt = saved?.adBoostEndsAt ?? 0;
    return endsAt > Date.now() ? endsAt : 0;
  });
  const [ownedLaws, setOwnedLaws] = useState(loadOwnedLaws);
  const [activeLawId, setActiveLawIdRaw] = useState(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_LAW_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null; // will fall back to first owned law
  });

  useEffect(() => {
    try { localStorage.setItem(OWNED_LAWS_KEY, JSON.stringify(ownedLaws)); } catch {}
  }, [ownedLaws]);

  useEffect(() => {
    try { localStorage.setItem(ACTIVE_LAW_KEY, JSON.stringify(activeLawId)); } catch {}
  }, [activeLawId]);

  const setActiveLaw = useCallback((lawId) => {
    setActiveLawIdRaw(lawId);
  }, []);

  // Derive active law from ownedLaws + activeLawId
  const activeLaw = ownedLaws.find(l => l.id === activeLawId) || ownedLaws[0] || DEFAULT_LAW;

  const addOwnedLaw = useCallback((law) => {
    setOwnedLaws(prev => {
      if (prev.length >= MAX_LAWS) return prev;
      if (prev.some(l => l.id === law.id)) return prev;
      return [...prev, law];
    });
  }, []);

  const upgradeLaw = useCallback((lawId) => {
    setOwnedLaws(prev => prev.map(law => {
      if (law.id !== lawId) return law;
      const next = LAW_NEXT_RARITY[law.rarity];
      if (!next) return law;
      return { ...law, rarity: next };
    }));
  }, []);

  /** Re-roll one law multiplier within the rarity range. */
  const honeLawMult = useCallback((lawId, multKey) => {
    setOwnedLaws(prev => prev.map(law => {
      if (law.id !== lawId) return law;
      const newVal = rollLawMult(multKey, law.rarity);
      return { ...law, [multKey]: newVal };
    }));
  }, []);

  /** Replace the unique modifier at a given tier with a different one. */
  const replaceLawUnique = useCallback((lawId, tier) => {
    setOwnedLaws(prev => prev.map(law => {
      if (law.id !== lawId) return law;
      const uniques = law.uniques ?? {};
      const currentIds = Object.values(uniques).filter(Boolean).map(u => u.id);
      const newUnique = pickRandomUnique(currentIds);
      if (!newUnique) return law;
      return { ...law, uniques: { ...uniques, [tier]: newUnique } };
    }));
  }, []);

  /** Re-roll the value of an existing unique at a given tier. */
  const honeLawUnique = useCallback((lawId, tier) => {
    setOwnedLaws(prev => prev.map(law => {
      if (law.id !== lawId) return law;
      const uniques = law.uniques ?? {};
      const current = uniques[tier];
      if (!current) return law;
      const newValue = rollUniqueValue(current.id);
      return { ...law, uniques: { ...uniques, [tier]: { ...current, value: newValue } } };
    }));
  }, []);

  const [offlineEarnings, setOfflineEarnings] = useState(() => {
    // Calculate qi earned while the app was closed
    if (!saved?.lastSeen || saved?.realmIndex === undefined) return 0;
    const now = Date.now();
    const awaySeconds = (now - saved.lastSeen) / 1000;
    if (awaySeconds < MIN_OFFLINE_SEC) return 0;
    const realm = REALMS[saved.realmIndex];
    if (!realm || !REALMS[saved.realmIndex + 1]) return 0; // maxed

    // Use the active law if available, otherwise fall back to first owned
    const allLaws = loadOwnedLaws();
    let offlineLaw;
    try {
      const activeLawIdRaw = localStorage.getItem(ACTIVE_LAW_KEY);
      const activeLawIdSaved = activeLawIdRaw ? JSON.parse(activeLawIdRaw) : null;
      offlineLaw = (activeLawIdSaved && allLaws.find(l => l.id === activeLawIdSaved))
        ?? allLaws[0] ?? DEFAULT_LAW;
    } catch {
      offlineLaw = allLaws[0] ?? DEFAULT_LAW;
    }

    const lawMult = saved.realmIndex >= offlineLaw.realmRequirement
      ? offlineLaw.cultivationSpeedMult : 1;

    // Apply offline_qi unique modifier (Seasoned Cultivator and similar)
    let offlineQiMult = 1;
    if (offlineLaw.uniques) {
      const ctx = buildContext({ inCombat: false, realmIndex: saved.realmIndex, focusing: false });
      const bundle = evaluateLawUniques(offlineLaw, ctx);
      const offlineQiMods = bundle.statMods.offline_qi ?? [];
      if (offlineQiMods.length > 0) offlineQiMult = computeStat(1, offlineQiMods);
    }

    // Permanent pill qi_speed bonus (always active — no expiry)
    let pillQiSpeedBonus = 0;
    try {
      const permStatsRaw = localStorage.getItem('mai_permanent_pill_stats');
      if (permStatsRaw) {
        pillQiSpeedBonus = JSON.parse(permStatsRaw).qi_speed ?? 0;
      }
    } catch {}

    const baseRate = BASE_RATE * lawMult * offlineQiMult * (1 + pillQiSpeedBonus);
    const total = baseRate * awaySeconds;

    return Math.floor(total);
  });

  const activeLawRef = useRef(activeLaw);
  useEffect(() => { activeLawRef.current = activeLaw; }, [activeLaw]);

  const pillQiMultRef      = useRef(1);
  const selectionQiMultRef = useRef(1);
  // Crystal flat qi/sec bonus — written by App.jsx from useQiCrystal.crystalQiBonus
  const crystalQiBonusRef  = useRef(0);
  // Hold-to-cultivate boost multiplier (qi_focus_mult stat, expressed as %).
  // Default 300% = the legacy 3× behavior; App.jsx writes the player's actual
  // focus mult into this ref each second.
  const focusMultRef = useRef(300);
  const boostRef    = useRef(false);
  const adBoostRef  = useRef(
    (saved?.adBoostEndsAt ?? 0) > Date.now() ? AD_BOOST_MULT : 1
  );
  const lastTickRef = useRef(performance.now());

  // Mutable refs — updated every tick, no React re-render needed
  const qiRef      = useRef(saved?.qi ?? 0);
  const costRef    = useRef(REALMS[saved?.realmIndex ?? 0].cost);
  const maxedRef   = useRef(!REALMS[(saved?.realmIndex ?? 0) + 1]);
  const indexRef   = useRef(saved?.realmIndex ?? 0);
  // Live cultivation rate (qi/s) — updated every tick for the HUD readout.
  const rateRef    = useRef(0);
  // When the player is qi-capped waiting for enough qi/s to ascend between
  // MAJOR realms, this holds { required, current }. Null otherwise. Read by
  // the UI via rAF to render the gate indicator without React re-renders.
  const gateRef    = useRef(null);

  // Keep cost/maxed refs in sync whenever realmIndex state changes
  useEffect(() => {
    const realm = REALMS[realmIndex];
    costRef.current  = realm.cost;
    maxedRef.current = !REALMS[realmIndex + 1];
    indexRef.current = realmIndex;
  }, [realmIndex]);

  // Single game loop — level-up handled here so it uses current refs
  useEffect(() => {
    let raf;
    const tick = (now) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (!maxedRef.current) {
        const law = activeLawRef.current;
        const lawMult = indexRef.current >= law.realmRequirement
          ? law.cultivationSpeedMult
          : 1;
        // Apply law-unique qi_speed modifiers (INCREASED, MORE, REDUCED, etc.)
        let qiUniqueMult = 1;
        if (law.uniques) {
          const ctx = buildContext({
            inCombat: false,
            realmIndex: indexRef.current,
            focusing: boostRef.current,
          });
          const bundle = evaluateLawUniques(law, ctx);
          const qiMods = bundle.statMods.qi_speed ?? [];
          qiUniqueMult = computeStat(1, qiMods);
        }
        // Boost multiplier: focusMult is in %, fall back to legacy 3× if unset.
        const boostMult = boostRef.current
          ? Math.max(1, (focusMultRef.current ?? 300) / 100)
          : 1;
        const rate = (BASE_RATE + crystalQiBonusRef.current) * lawMult * qiUniqueMult *
          boostMult *
          adBoostRef.current * pillQiMultRef.current * selectionQiMultRef.current;
        rateRef.current = rate;
        qiRef.current += rate * dt;

        if (qiRef.current >= costRef.current) {
          const requiredRate = getMajorBreakthroughRate(indexRef.current);
          if (requiredRate > 0 && rate < requiredRate) {
            // Major-realm gate: hold qi at cost until sustained qi/s is enough.
            qiRef.current = costRef.current;
            gateRef.current = { required: requiredRate, current: rate };
          } else {
            qiRef.current -= costRef.current;
            const fromIndex = indexRef.current;
            const nextIndex = fromIndex + 1;
            const isMajor = isMajorTransition(fromIndex);
            indexRef.current  = nextIndex;
            costRef.current   = REALMS[nextIndex].cost;
            maxedRef.current  = !REALMS[nextIndex + 1];
            gateRef.current = null;
            setRealmIndex(nextIndex);
            if (isMajor) {
              try { AudioManager.playSfx('cult_breakthrough'); } catch {}
              setMajorBreakthrough({ id: Date.now(), label: REALMS[nextIndex].name });
            }
          }
        } else if (gateRef.current) {
          gateRef.current = null;
        }
      } else {
        rateRef.current = 0;
        gateRef.current = null;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // runs once — reads everything via refs

  // Auto-save every 2 seconds
  const adBoostEndsAtRef = useRef(adBoostEndsAt);
  useEffect(() => { adBoostEndsAtRef.current = adBoostEndsAt; }, [adBoostEndsAt]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveGame({
        realmIndex:    indexRef.current,
        qi:            Math.floor(qiRef.current),
        adBoostEndsAt: adBoostEndsAtRef.current,
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const startBoost = useCallback(() => { boostRef.current = true;  setBoosting(true);  }, []);
  const stopBoost  = useCallback(() => { boostRef.current = false; setBoosting(false); }, []);

  /** Called when the player earns the rewarded ad boost. */
  const activateAdBoost = useCallback((durationMs = 30 * 60 * 1000) => {
    const endsAt = Date.now() + durationMs;
    adBoostRef.current = AD_BOOST_MULT;
    setAdBoostEndsAt(endsAt);
    // Auto-expire
    setTimeout(() => {
      adBoostRef.current = 1;
      setAdBoostEndsAt(0);
    }, durationMs);
  }, []);

  /** Called when the player collects offline earnings (optionally doubled by ad). */
  const collectOfflineEarnings = useCallback((multiplier = 1) => {
    if (offlineEarnings <= 0) return;
    qiRef.current += offlineEarnings * multiplier;
    setOfflineEarnings(0);
  }, [offlineEarnings]);

  const realm     = REALMS[realmIndex];
  const nextRealm = REALMS[realmIndex + 1] ?? null;

  return {
    realmIndex,
    realmName:     label(realm),
    realmMajor:    realm.name,
    realmStage:    realm.stage,
    nextRealmName: nextRealm ? label(nextRealm) : 'Peak',
    maxed:         !nextRealm,
    boosting,
    startBoost,
    stopBoost,
    totalRealms:   REALMS.length,
    // Refs for direct DOM updates — avoids React render lag on the progress bar
    qiRef,
    costRef,
    indexRef,
    rateRef,
    gateRef,
    majorBreakthrough,
    clearMajorBreakthrough: () => setMajorBreakthrough(null),
    setRealmIndex,
    activeLaw,
    setActiveLaw,
    isLawUnlocked: realmIndex >= activeLaw.realmRequirement,
    ownedLaws,
    addOwnedLaw,
    upgradeLaw,
    honeLawMult,
    replaceLawUnique,
    honeLawUnique,
    // Pill qi multiplier ref — updated by App.jsx
    pillQiMultRef,
    // Selection qi speed multiplier ref — updated by App.jsx
    selectionQiMultRef,
    // QI Crystal flat bonus ref — updated by App.jsx from useQiCrystal
    crystalQiBonusRef,
    // Focus multiplier ref (qi_focus_mult, in %) — updated by App.jsx every second
    focusMultRef,
    // Ads
    activateAdBoost,
    adBoostActive:  adBoostEndsAt > Date.now(),
    adBoostEndsAt,
    // Offline earnings
    offlineEarnings,
    collectOfflineEarnings,
  };
}
