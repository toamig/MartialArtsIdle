import { useState, useEffect, useRef, useCallback } from 'react';
import REALMS, { getMajorBreakthroughRate, getPeakBreakthroughRate, isMajorTransition, isPeakTransition } from '../data/realms';
import AudioManager from '../audio/AudioManager';
// DEFAULT_LAW / THREE_HARMONY_MANUAL no longer auto-seed the library.
// Laws enter via major-breakthrough offers (see useLawOffers).
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

    // Heaven's Bond (Qi Spark) — same snapshot pattern as artefacts. Mirrored
    // by useQiSparks every time the active spark set changes.
    let sparkOfflineMult = 1;
    try {
      const raw = localStorage.getItem('mai_qi_sparks_offline_snapshot');
      if (raw) sparkOfflineMult = JSON.parse(raw).offlineQiMult ?? 1;
    } catch {}

    const baseRate = BASE_RATE * lawMult * offlineQiMult * artefactOfflineMult * sparkOfflineMult * (1 + pillQiSpeedBonus);
    const total = baseRate * awaySeconds;

    // Crystal Click offline reservoir fill — silently updates localStorage so
    // the crystalReservoirRef useRef below reads the already-accrued value.
    try {
      const snapRaw = localStorage.getItem('mai_crystal_click_snapshot');
      if (snapRaw) {
        const snap = JSON.parse(snapRaw);
        if (snap.rate > 0 && snap.capMin > 0) {
          const cap = snap.capMin * 60 * baseRate;
          const stored = parseFloat(localStorage.getItem('mai_crystal_reservoir')) || 0;
          const accrued = baseRate * snap.rate * awaySeconds;
          const filled = Math.min(cap, stored + accrued);
          localStorage.setItem('mai_crystal_reservoir', String(filled));
        }
      }
    } catch {}

    return Math.floor(total);
  });

  const activeLawRef = useRef(activeLaw);
  useEffect(() => { activeLawRef.current = activeLaw; }, [activeLaw]);

  const pillQiMultRef      = useRef(1);
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
  // Qi Sparks — temporary buffs from the per-breakthrough card-pick system.
  // sparkQiMultRef multiplies cultivation rate (e.g. 1.5 = +50%);
  // sparkFocusMultBonusRef multiplies the focus boost mult (e.g. 0.3 = +30% on top).
  const sparkQiMultRef               = useRef(1);
  const sparkFocusMultBonusRef       = useRef(0);
  // Permanent (uncommon) Qi Spark buffs:
  //  sparkQiFlatRef        — adds to BASE_RATE (Steady Cultivation × stacks)
  //  sparkGateReductionRef — fraction subtracted from major-realm gate rate (Patience of Stone)
  const sparkQiFlatRef               = useRef(0);
  const sparkGateReductionRef        = useRef(0);
  // Painless Ascension — when true, the next breakthrough doesn't drain qi.
  // Consumed (set false) by the tick when a breakthrough fires; the hook
  // listens for the 'mai:painless-consumed' event to remove the spark.
  const sparkPainlessRef             = useRef(false);
  // Lingering Focus — sustains a fraction of the focus boost for `residualMs`
  // after the player releases focus. focusReleaseTimeRef tracks the moment
  // boost transitioned true→false.
  const sparkLingeringActiveRef      = useRef(false);
  const sparkLingeringResidualMsRef  = useRef(0);
  const sparkLingeringResidualMultRef = useRef(0);
  const focusReleaseTimeRef          = useRef(0);
  // Divine Qi mechanic — temporary multiplier applied when the player
  // collects both T5 orbs. Written by the 'mai:divine-qi-buff' event handler
  // below; resets to 1 after rateBuffMs via a clearTimeout.
  const divineQiMultRef = useRef(1);

  // Crystal Click mechanic — rate/cap mirrored from useQiSparks by App.jsx.
  // crystalReservoirRef holds the accumulated qi waiting to be collected.
  const sparkCrystalClickRateRef   = useRef(0);
  const sparkCrystalClickCapMinRef = useRef(0);
  const crystalReservoirRef = useRef((() => {
    try {
      const v = parseFloat(localStorage.getItem('mai_crystal_reservoir'));
      return Number.isFinite(v) && v > 0 ? v : 0;
    } catch { return 0; }
  })());
  const prevBoostStateRef            = useRef(false);
  // Consecutive Focus mechanic — every unlocked tier adds a rung to a
  // cumulative ladder of (holdMs, bonus). Each tick sums every met rung
  // into the qi/s mult so the player feels stepped gains as they hold
  // longer. Empty array = mechanic not unlocked.
  const sparkConsecutiveLadderRef    = useRef([]);
  const sparkConsecutiveDeepRef      = useRef(false);
  const boostStartTimeRef            = useRef(0);
  // Debug-only — when true, Consecutive Focus skips the hold-duration
  // check so the bonus applies the instant boost is held.
  const debugConsecutiveBypassRef    = useRef(false);
  // Last rung depth (count of met thresholds) emitted by the tick. Used
  // to fire `mai:cf-rung` only on edges so listeners aren't event-stormed.
  const consecutiveRungRef           = useRef(0);
  // Live qi/s bonus from Consecutive Focus this frame (0 when not held or
  // no rungs met). UI reads it to fold into the multiplier badge.
  const sparkConsecutiveCurrentBonusRef = useRef(0);
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
      // Qi Spark "Focus Surge" cards layer additively on top via sparkFocusMultBonusRef.
      const baseFocusMult = (focusMultRef.current ?? 300) / 100;
      const focusMultWithSpark = baseFocusMult * (1 + sparkFocusMultBonusRef.current);

      // Record every focus release time. Cheap, and lets Lingering Focus
      // pick up a release that happened just before the spark was activated
      // (e.g. when a layer-breakthrough modal interrupted the player's hold).
      if (prevBoostStateRef.current && !boostRef.current) {
        focusReleaseTimeRef.current = now;
      }
      // Record every focus press time — Consecutive Focus rewards holding
      // boost continuously past `holdMs`.
      if (!prevBoostStateRef.current && boostRef.current) {
        boostStartTimeRef.current = now;
      }
      prevBoostStateRef.current = boostRef.current;

      // Consecutive Focus bonus — only active while boost is held AND has
      // been held for at least `holdMs`. Folded into the final rate as a
      // multiplier alongside the focus boost.
      // Sum every Consecutive Focus ladder rung whose threshold is met.
      // Ladder is sorted ascending by holdMs in useQiSparks so we can early-
      // out the moment we hit an unmet threshold (or always, when bypassed).
      let consecutiveBonus = 0;
      let consecutiveRung  = 0;
      const ladder = sparkConsecutiveLadderRef.current;
      if (boostRef.current && ladder.length > 0) {
        const heldMs = now - boostStartTimeRef.current;
        const bypass = debugConsecutiveBypassRef.current;
        for (const step of ladder) {
          if (bypass || heldMs >= step.holdMs) {
            consecutiveBonus += step.bonus;
            consecutiveRung++;
          } else break;
        }
      }
      const consecutiveMult = 1 + consecutiveBonus;
      // Mirror the running bonus so the qi/s readout can fold it into the
      // displayed multiplier badge each frame.
      sparkConsecutiveCurrentBonusRef.current = consecutiveBonus;
      // Edge-only event: rung depth changed. UI listens to drive the per-
      // rung aura/glow escalation + the upward "pop" transient.
      if (consecutiveRung !== consecutiveRungRef.current) {
        const prev = consecutiveRungRef.current;
        consecutiveRungRef.current = consecutiveRung;
        try {
          window.dispatchEvent(new CustomEvent('mai:cf-rung', {
            detail: {
              rung:     consecutiveRung,
              prevRung: prev,
              total:    consecutiveBonus,
              deep:     !!sparkConsecutiveDeepRef.current && consecutiveRung >= 5,
              upward:   consecutiveRung > prev,
            },
          }));
        } catch {}
      }

      let boostMult;
      if (boostRef.current) {
        boostMult = Math.max(1, focusMultWithSpark);
      } else if (
        sparkLingeringActiveRef.current
        && focusReleaseTimeRef.current > 0
        && (now - focusReleaseTimeRef.current) < sparkLingeringResidualMsRef.current
      ) {
        // Lingering Focus residual — apply a fraction of the focus mult while
        // the player is no longer holding, for `residualMs` after release.
        boostMult = Math.max(1, focusMultWithSpark * sparkLingeringResidualMultRef.current);
      } else {
        boostMult = 1;
      }
      // Heavenly QI extras — only apply while the ad boost is live. Two
      // independent multiplicative sources: the reincarnation tree node
      // and the artefact heavenly_qi_mult stat.
      const heavenlyTree = adBoostRef.current > 1 ? treeHeavenlyMultRef.current : 1;
      const heavenlyArt  = adBoostRef.current > 1 ? (1 + heavenlyQiMultRef.current) : 1;
      const rate = (BASE_RATE + crystalQiBonusRef.current + sparkQiFlatRef.current) * lawMult * qiUniqueMult *
        artefactQiMultRef.current *
        boostMult * consecutiveMult *
        adBoostRef.current * heavenlyTree * heavenlyArt *
        pillQiMultRef.current * sparkQiMultRef.current *
        treeQiMultRef.current * rebirthCultBuffRef.current *
        divineQiMultRef.current *
        debugQiMultRef.current;
      rateRef.current = rate;
      qiRef.current += rate * dt;

      // Crystal Click reservoir accrual — fill at (rate × clickRate) per second
      // up to (capMinutes × 60 × rate). Paused when mechanic is not unlocked.
      if (sparkCrystalClickRateRef.current > 0) {
        const cap = sparkCrystalClickCapMinRef.current * 60 * rate;
        const prev = crystalReservoirRef.current;
        if (prev < cap) {
          crystalReservoirRef.current = Math.min(cap, prev + rate * sparkCrystalClickRateRef.current * dt);
        }
      }

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
          const baseRequired = majorRate > 0 ? majorRate : getPeakBreakthroughRate(indexRef.current);
          // Patience of Stone (Qi Spark) shrinks the gate requirement.
          const requiredRate = baseRequired * (1 - sparkGateReductionRef.current);
          if (requiredRate > 0 && rate < requiredRate) {
            // Major-realm gate: hold qi at cost until sustained qi/s is enough.
            qiRef.current = costRef.current;
            gateRef.current = { required: requiredRate, current: rate };
          } else {
            // Painless Ascension spark — when active, skip the qi drain and
            // notify useQiSparks to consume the spark.
            if (sparkPainlessRef.current) {
              sparkPainlessRef.current = false;
              try { window.dispatchEvent(new CustomEvent('mai:painless-consumed')); } catch {}
            } else {
              qiRef.current -= costRef.current;
            }
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

  // Divine Qi T5 rate buff — fired by HomeScreen when both orbs are collected.
  // Multiplier applies for `durationMs`; stacking restarts the timer.
  useEffect(() => {
    let resetTimer = null;
    const onBuff = (e) => {
      const { mult = 1.5, durationMs = 30_000 } = e.detail ?? {};
      divineQiMultRef.current = mult;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { divineQiMultRef.current = 1; }, durationMs);
    };
    window.addEventListener('mai:divine-qi-buff', onBuff);
    return () => {
      window.removeEventListener('mai:divine-qi-buff', onBuff);
      clearTimeout(resetTimer);
    };
  }, []);

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
      // Crystal reservoir persisted separately — not part of the main save blob.
      try {
        localStorage.setItem('mai_crystal_reservoir', String(crystalReservoirRef.current));
      } catch {}
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

  /** Tap the crystal — dump everything in the reservoir into qi. */
  const collectCrystalReservoir = useCallback(() => {
    const amount = crystalReservoirRef.current;
    if (amount <= 0) return;
    qiRef.current += amount;
    crystalReservoirRef.current = 0;
    try { localStorage.setItem('mai_crystal_reservoir', '0'); } catch {}
  }, []);

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
    // True only at the very final realm (Open Heaven Layer 6) so peak-stage
    // bar treatment is reserved for the actual endgame pinnacle. Per-realm
    // Peak X sub-stages are still announced by the breakthrough banner when
    // entered — they don't need persistent bar styling on top of that.
    isInPeakStage: !REALMS[realmIndex + 1],
    setRealmIndex,
    activeLaw,
    setActiveLaw,
    isLawUnlocked: !!activeLaw && realmIndex >= (activeLaw.realmRequirement ?? 0),
    ownedLaws,
    addOwnedLaw,
    dismantleLaw,
    // Pill qi multiplier ref — updated by App.jsx
    pillQiMultRef,
    // Qi Sparks refs — updated by App.jsx from useQiSparks
    sparkQiMultRef,
    sparkFocusMultBonusRef,
    sparkQiFlatRef,
    sparkGateReductionRef,
    sparkPainlessRef,
    sparkLingeringActiveRef,
    sparkLingeringResidualMsRef,
    sparkLingeringResidualMultRef,
    sparkConsecutiveLadderRef,
    sparkConsecutiveDeepRef,
    sparkConsecutiveCurrentBonusRef,
    // Divine Qi rate-buff ref — written by the mai:divine-qi-buff event listener
    divineQiMultRef,
    // Crystal Click refs — rate/cap written by App.jsx, reservoir updated each tick
    sparkCrystalClickRateRef,
    sparkCrystalClickCapMinRef,
    crystalReservoirRef,
    collectCrystalReservoir,
    // Exposed for debug bridges — production code should treat both as
    // private to the cultivation tick.
    boostStartTimeRef,
    debugConsecutiveBypassRef,
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
