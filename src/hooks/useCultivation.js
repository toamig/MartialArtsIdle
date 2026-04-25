import { useState, useEffect, useRef, useCallback } from 'react';
import REALMS, { getMajorBreakthroughRate, getPeakBreakthroughRate, isMajorTransition, isPeakTransition } from '../data/realms';
import AudioManager from '../audio/AudioManager';
// DEFAULT_LAW / THREE_HARMONY_MANUAL no longer auto-seed the library.
// Laws enter via major-breakthrough selections (see useSelections).
import { saveGame, loadGame } from '../systems/save';
import { evaluateLawUniques, buildContext } from '../systems/lawEngine';
import { computeStat, MOD } from '../data/stats';

const OWNED_LAWS_KEY   = 'mai_owned_laws';
const ACTIVE_LAW_KEY   = 'mai_active_law';
export const MAX_LAWS = 100;

function loadOwnedLaws() {
  try {
    const raw = localStorage.getItem(OWNED_LAWS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Fresh saves start EMPTY. The first major-realm breakthrough fires a
  // dedicated "First Law" selection that seeds the library. Existing
  // saves (with a serialised mai_owned_laws key) are untouched.
  return [];
}

const BASE_RATE       = 1; // qi per second at 1x
const BOOST_MULTIPLIER = 3; // legacy fallback when focusMult ref isn't wired
const AD_BOOST_MULT   = 2; // rewarded-ad cultivation boost
const MIN_OFFLINE_SEC = 5 * 60; // only show offline popup after 5 min away

const label = (r) => (r.stage ? `${r.name} - ${r.stage}` : r.name);

export default function useCultivation() {
  const saved = loadGame();
  const savedIndex = Math.min(
    Math.max(0, saved?.realmIndex ?? 0),
    REALMS.length - 1,
  );
  const [realmIndex, setRealmIndex] = useState(savedIndex);
  const [boosting, setBoosting] = useState(false);
  // Transient event set whenever a MAJOR realm transition fires — the home
  // screen renders a celebratory banner keyed on this id. Null otherwise.
  const [majorBreakthrough, setMajorBreakthrough] = useState(null);
  // Set permanently after the final breakthrough (Open Heaven Layer 6 filled).
  // Qi accumulates freely from 0 with no ceiling after this point.
  const [ascended, setAscended] = useState(() => saved?.ascended ?? false);
  const ascendedRef = useRef(saved?.ascended ?? false);
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

  // Derive active law from ownedLaws + activeLawId.
  // Unequipped state is legal: when the library is empty OR the player
  // hasn't picked an active id, activeLaw is null. Combat / cultivation
  // code handles null by falling back to small hard-coded baselines.
  const activeLaw = ownedLaws.find(l => l.id === activeLawId) || null;

  const addOwnedLaw = useCallback((law) => {
    setOwnedLaws(prev => {
      if (prev.length >= MAX_LAWS) return prev;
      if (prev.some(l => l.id === law.id)) return prev;
      return [...prev, law];
    });
  }, []);

  /**
   * Dismantle an owned law. Refuses if it's the currently active law
   * (unequip it first). Returns the rarity on success so the caller
   * can grant the matching mineral.
   */
  const dismantleLaw = useCallback((lawId) => {
    if (lawId === activeLawId) return null;
    // cb_pt Phase Technique — soul-bound, never dismantle.
    if (lawId === 'phase_technique') return null;
    let rarity = null;
    setOwnedLaws(prev => {
      const law = prev.find(l => l.id === lawId);
      if (!law) return prev;
      rarity = law.rarity ?? 'Iron';
      return prev.filter(l => l.id !== lawId);
    });
    return rarity;
  }, [activeLawId]);

  const [offlineEarnings, setOfflineEarnings] = useState(() => {
    // Calculate qi earned while the app was closed
    if (!saved?.lastSeen || saved?.realmIndex === undefined) return 0;
    const now = Date.now();
    const awaySeconds = (now - saved.lastSeen) / 1000;
    if (awaySeconds < MIN_OFFLINE_SEC) return 0;
    const realm = REALMS[saved.realmIndex];
    if (!realm || !REALMS[saved.realmIndex + 1]) return 0; // maxed

    // Use the active law if one is equipped; otherwise accrue offline qi
    // at base rate (no law-driven multipliers).
    const allLaws = loadOwnedLaws();
    let offlineLaw = null;
    try {
      const activeLawIdRaw = localStorage.getItem(ACTIVE_LAW_KEY);
      const activeLawIdSaved = activeLawIdRaw ? JSON.parse(activeLawIdRaw) : null;
      offlineLaw = activeLawIdSaved
        ? allLaws.find(l => l.id === activeLawIdSaved) ?? null
        : null;
    } catch {
      offlineLaw = null;
    }

    const lawMult = (offlineLaw && saved.realmIndex >= (offlineLaw.realmRequirement ?? 0))
      ? (offlineLaw.cultivationSpeedMult ?? 1)
      : 1;

    // Apply offline_qi unique modifier (Seasoned Cultivator and similar)
    let offlineQiMult = 1;
    if (offlineLaw?.uniques) {
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

    // Artefact `offline_qi_mult` (a_visionary_mind). Stored under its own
    // localStorage snapshot so offline calc (which runs before React mounts)
    // can still read it — see App.jsx where it mirrors the scalar.
    let artefactOfflineMult = 1;
    try {
      const raw = localStorage.getItem('mai_artefact_offline_snapshot');
      if (raw) artefactOfflineMult = JSON.parse(raw).offlineQiMult ?? 1;
    } catch {}

    const baseRate = BASE_RATE * lawMult * offlineQiMult * artefactOfflineMult * (1 + pillQiSpeedBonus);
    const total = baseRate * awaySeconds;

    return Math.floor(total);
  });

  const activeLawRef = useRef(activeLaw);
  useEffect(() => { activeLawRef.current = activeLaw; }, [activeLaw]);

  const pillQiMultRef      = useRef(1);
  const selectionQiMultRef = useRef(1);
  // Reincarnation-tree multipliers — written by App.jsx from useReincarnationTree.
  // `treeQiMultRef` always multiplies cultivation rate; `treeHeavenlyMultRef`
  // only applies while the ad (heavenly) boost is active.
  const treeQiMultRef       = useRef(1);
  const treeHeavenlyMultRef = useRef(1);
  // Crystal flat qi/sec bonus — written by App.jsx from useQiCrystal.crystalQiBonus
  const crystalQiBonusRef  = useRef(0);
  // Artefact-derived qi_speed multiplier — written by App.jsx from the
  // merged artefact bundle (FLAT/BASE_FLAT/INCREASED/MORE collapsed through
  // the five-layer formula with base=1). 1 = inactive.
  const artefactQiMultRef  = useRef(1);
  // Heavenly QI multiplier from artefacts (and any future modifier source).
  // Decimal: 0.30 = +30% on top of the ad boost. Only applies while the ad
  // boost is live. Stacks multiplicatively with the reincarnation tree node.
  const heavenlyQiMultRef  = useRef(0);
  // yy_2 Yin Reservoir — fraction of the next-realm qi cost auto-credited
  // every time the player breaks through into a new realm. App.jsx writes
  // this from `tree.modifiers.qiOnEveryRealmFrac`.
  const qiOnRealmFracRef   = useRef(0);
  // al_k Living Memory — extra cultivation-rate multiplier active while a
  // post-rebirth buff is live (1-hour ×2 buff). 1 means inactive.
  const rebirthCultBuffRef = useRef(1);
  // Debug-only multiplier — set via gd.setQiRate(n) in the browser console.
  const debugQiMultRef = useRef(1);
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
  const costRef    = useRef(REALMS[savedIndex].cost);
  const maxedRef   = useRef(!REALMS[savedIndex + 1]);
  const indexRef   = useRef(savedIndex);
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

      // Rate calculation runs in all states — qi always accumulates.
      const law = activeLawRef.current;
      // Unequipped laws cultivate at base rate — no law multiplier, no
      // unique modifiers, no realm-requirement gate.
      const lawMult = (law && indexRef.current >= (law.realmRequirement ?? 0))
        ? (law.cultivationSpeedMult ?? 1)
        : 1;
      // Apply law-unique qi_speed modifiers (INCREASED, MORE, REDUCED, etc.)
      let qiUniqueMult = 1;
      if (law?.uniques) {
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
      // Heavenly QI extras — only apply while the ad boost is live. Two
      // independent multiplicative sources: the reincarnation tree node
      // and the artefact heavenly_qi_mult stat.
      const heavenlyTree = adBoostRef.current > 1 ? treeHeavenlyMultRef.current : 1;
      const heavenlyArt  = adBoostRef.current > 1 ? (1 + heavenlyQiMultRef.current) : 1;
      const rate = (BASE_RATE + crystalQiBonusRef.current) * lawMult * qiUniqueMult *
        artefactQiMultRef.current *
        boostMult *
        adBoostRef.current * heavenlyTree * heavenlyArt *
        pillQiMultRef.current * selectionQiMultRef.current *
        treeQiMultRef.current * rebirthCultBuffRef.current *
        debugQiMultRef.current;
      rateRef.current = rate;
      qiRef.current += rate * dt;

      if (ascendedRef.current) {
        // Post-ascension free mode: qi grows without bound — nothing to check.
      } else if (maxedRef.current) {
        // Final realm: fill to cost, then fire the last ever breakthrough.
        if (qiRef.current >= costRef.current) {
          qiRef.current = 0;
          ascendedRef.current = true;
          setAscended(true);
          try { AudioManager.playSfx('cult_breakthrough'); } catch {}
          setMajorBreakthrough({
            id:      Date.now(),
            label:   REALMS[indexRef.current].name,
            isFinal: true,
          });
        }
      } else {
        // Normal realm progression.
        if (qiRef.current >= costRef.current) {
          const majorRate    = getMajorBreakthroughRate(indexRef.current);
          const requiredRate = majorRate > 0 ? majorRate : getPeakBreakthroughRate(indexRef.current);
          if (requiredRate > 0 && rate < requiredRate) {
            // Major-realm gate: hold qi at cost until sustained qi/s is enough.
            qiRef.current = costRef.current;
            gateRef.current = { required: requiredRate, current: rate };
          } else {
            qiRef.current -= costRef.current;
            const fromIndex = indexRef.current;
            const nextIndex = fromIndex + 1;
            const isMajor = isMajorTransition(fromIndex);
            const isPeak  = !isMajor && isPeakTransition(fromIndex);
            indexRef.current  = nextIndex;
            costRef.current   = REALMS[nextIndex].cost;
            maxedRef.current  = !REALMS[nextIndex + 1];
            gateRef.current = null;
            // yy_2 Yin Reservoir — every realm starts with a fraction of its
            // breakthrough qi cost already accumulated. Reservoir adds on top
            // of any leftover qi from the previous realm.
            const reservoir = qiOnRealmFracRef.current;
            if (reservoir > 0) {
              qiRef.current += costRef.current * reservoir;
            }
            setRealmIndex(nextIndex);
            if (isMajor || isPeak) {
              try { AudioManager.playSfx('cult_breakthrough'); } catch {}
              setMajorBreakthrough({
                id:    Date.now(),
                label: isPeak
                  ? `${REALMS[nextIndex].name} — ${REALMS[nextIndex].stage}`
                  : REALMS[nextIndex].name,
                isPeak,
              });
            }
          }
        } else if (gateRef.current) {
          gateRef.current = null;
        }
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
        ascended:      ascendedRef.current,
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
    ascended,
    isInPeakStage: !!(REALMS[realmIndex]?.stage?.includes('Peak')) || !REALMS[realmIndex + 1],
    setRealmIndex,
    activeLaw,
    setActiveLaw,
    isLawUnlocked: !!activeLaw && realmIndex >= (activeLaw.realmRequirement ?? 0),
    ownedLaws,
    addOwnedLaw,
    dismantleLaw,
    // Pill qi multiplier ref — updated by App.jsx
    pillQiMultRef,
    // Selection qi speed multiplier ref — updated by App.jsx
    selectionQiMultRef,
    // QI Crystal flat bonus ref — updated by App.jsx from useQiCrystal
    crystalQiBonusRef,
    // Artefact qi_speed aggregate ref — updated by App.jsx each second
    artefactQiMultRef,
    // Artefact heavenly_qi_mult ref — updated by App.jsx from getFullStats
    heavenlyQiMultRef,
    // Reincarnation tree refs — updated by App.jsx each render
    treeQiMultRef,
    treeHeavenlyMultRef,
    qiOnRealmFracRef,
    rebirthCultBuffRef,
    // Focus multiplier ref (qi_focus_mult, in %) — updated by App.jsx every second
    focusMultRef,
    // Debug qi rate multiplier — written by gd.setQiRate()
    debugQiMultRef,
    // Ads
    activateAdBoost,
    adBoostActive:  adBoostEndsAt > Date.now(),
    adBoostEndsAt,
    // Offline earnings
    offlineEarnings,
    collectOfflineEarnings,
  };
}
