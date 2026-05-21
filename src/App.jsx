import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import NavBar from './components/NavBar';
import TopBar from './components/TopBar';
import HomeScreen from './screens/HomeScreen';
import BloodLotusShopModal from './components/BloodLotusShopModal';
import { addBloodLotus as addBloodLotusBalance } from './systems/bloodLotus';
import AchievementsModal from './components/AchievementsModal';
import PillDrawer from './components/PillDrawer';
import JourneyModal from './components/JourneyModal';
import DailyBonusModal from './components/DailyBonusModal';
import { useDailyBonus } from './hooks/useDailyBonus';
import EternalTreeScreen from './components/EternalTreeScreen';
import { initAds } from './ads/adService';
import { restoreResolution } from './systems/desktopResolution';
import {
  initAnalytics,
  trackReincarnation,
  trackAchievementUnlocked,
  trackScreenView,
  trackFirstTime,
} from './analytics';
import CombatScreen from './screens/CombatScreen';
import WorldsScreen from './screens/WorldsScreen';
import CharacterScreen from './screens/CharacterScreen';
import CollectionScreen from './screens/CollectionScreen';
import ProductionScreen from './screens/ProductionScreen';
import CultivationScreen from './screens/CultivationScreen';
import SettingsScreen from './screens/SettingsScreen';
import useReincarnationKarma from './hooks/useReincarnationKarma';
import useReincarnationTree  from './hooks/useReincarnationTree';
import { wipeReincarnation, SAVE_VERSION, SAVE_VERSION_KEY } from './systems/save';
import useCultivation from './hooks/useCultivation';
import useInventory   from './hooks/useInventory';
import useTechniques  from './hooks/useTechniques';
import useCombat      from './hooks/useCombat';
import useArtefacts   from './hooks/useArtefacts';
import usePills       from './hooks/usePills';
import useQiCrystal  from './hooks/useQiCrystal';
import useProducers  from './hooks/useProducers';
import useUpgrades   from './hooks/useUpgrades';
import useAutoFarm    from './hooks/useAutoFarm';
import WORLDS         from './data/worlds';
import { PHASE_TECHNIQUE_LAW, PHASE_TECHNIQUE_ID } from './data/laws';
import { mineralForRarity } from './data/materials';
import { computeAllStats, computeStat, mergeModifiers } from './data/stats';
import { evaluateLawUniques, buildContext } from './systems/lawEngine';
import { getSetBonusModifiers } from './data/artefactSets';
import { initDebug } from './debug/gameDebug';
import { preloadImages, PLAYER_SPRITE_SRCS } from './utils/preload';
import { loadGraphics, applyGraphics } from './systems/graphics';
import useNotifications from './hooks/useNotifications';
import useLawOffers from './hooks/useLawOffers';
import useQiSparks  from './hooks/useQiSparks';
import useClearedRegions from './hooks/useClearedRegions';
import useFeatureFlags from './hooks/useFeatureFlags';
import useAchievements from './hooks/useAchievements';
import { FEATURES } from './data/featureFlags';
import { sparksToGrantOnEvolution } from './data/crystalMechanicGrants';
import { QI_SPARK_BY_ID, QI_SPARKS } from './data/qiSparks';
import { PRODUCERS_BY_ID } from './data/producers';

// Which screens are hidden by which build-time feature flag. Routes to a
// blocked screen are silently rewritten to `home` by navigate() below, so
// stale saves or stray notification deeplinks can't land on a null entry.
const SCREEN_FLAGS = {
  worlds:         'combat',
  'combat-arena': 'combat',
  character:      'combat',
  collection:     'combat',
  production:     'combat',
};
const isScreenAllowed = (screenId) => {
  const flag = SCREEN_FLAGS[screenId];
  return !flag || FEATURES[flag];
};
import ToastStack from './components/ToastStack';
import SelectionModal from './components/SelectionModal';
import QiSparkChoiceModal from './components/QiSparkChoiceModal';
import { AudioManager } from './audio';
import { installGlobalClickSfx } from './audio/clickSfx';
import { EventQueueProvider, useEventQueue, useBlockingPresence } from './contexts/EventQueueContext';
import './App.css';

function AppInner() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParam,   setScreenParam]   = useState(null);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);

  // Single active modal — only one top-bar popup can be open at a time.
  // Toggling the same key closes it; opening a new key replaces the current one.
  const [activeModal, setActiveModal] = useState(null);
  const [hasNewAch,   setHasNewAch]   = useState(false);

  const openModal = useCallback((key, sideEffect) => {
    setActiveModal(prev => {
      if (prev === key) return null;
      if (sideEffect) sideEffect();
      // Broadcast so other modals (ActiveSparksBar, CrystalFeedModal, …) close.
      window.dispatchEvent(new CustomEvent('mai:modal-opened', { detail: { id: key } }));
      return key;
    });
  }, []);

  // Close any app-level modal when an external modal announces itself.
  // We keep a Set of our own ids so we don't react to our own broadcast.
  useEffect(() => {
    const ours = new Set(['settings', 'shop', 'journey', 'achievements', 'pills', 'daily']);
    const handler = (e) => {
      if (!ours.has(e.detail?.id)) setActiveModal(null);
    };
    window.addEventListener('mai:modal-opened', handler);
    return () => window.removeEventListener('mai:modal-opened', handler);
  }, []);

  const dailyBonus = useDailyBonus();

  // Event queue — coordinates spontaneous popups so they don't stack.
  const { enqueue, currentEvent, dismiss } = useEventQueue();

  // Player-driven modals pause the queue while open (Settings, Achievements,
  // Journey, Shop, Pills, Daily Bonus tap-opened, mid-session reward cards
  // tap-opened). Spontaneous events queued behind them wait until they close.
  useBlockingPresence(!!activeModal || selectionModalOpen);

  // Auto-enqueue daily bonus on login if uncollected — the queue presents it
  // when nothing else (offline gains, breakthrough, etc.) is in front.
  useEffect(() => {
    if (dailyBonus.isAvailable) enqueue('daily-bonus', null, { dedupe: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { initAds(); }, []);
  useEffect(() => { initAnalytics(); }, []);
  useEffect(() => { preloadImages(PLAYER_SPRITE_SRCS); }, []);
  useEffect(() => { applyGraphics(loadGraphics()); }, []);

  // Save schema version stamp. Set on first launch (and after any future
  // migrations). On v1 (Cookie-Clicker pivot) no data migration is needed —
  // combat-tied keys are preserved on disk and hidden by FEATURES flags.
  useEffect(() => {
    try {
      const prev = localStorage.getItem(SAVE_VERSION_KEY);
      if (prev !== String(SAVE_VERSION)) {
        localStorage.setItem(SAVE_VERSION_KEY, String(SAVE_VERSION));
      }
    } catch {}
  }, []);

  // Apply saved resolution preset on startup. Works for Steam (Electron IPC
  // resizes the OS window) and for Android-on-PC / browser desktop (CSS
  // body class letterboxes the inner game viewport). See desktopResolution.js.
  useEffect(() => { restoreResolution(); }, []);

  const cultivation     = useCultivation();
  const inventory       = useInventory();
  const karma           = useReincarnationKarma();
  const tree            = useReincarnationTree({ karma: karma.karma, spendKarma: karma.spendKarma, lives: karma.lives });
  // md_3 The Fourth Form — +1 technique slot from the reincarnation tree.
  const techniques      = useTechniques({ extraSlots: tree.modifiers.extraTechSlot ? 1 : 0 });
  const combat          = useCombat();
  const artefacts       = useArtefacts();
  const pills           = usePills();
  const totalOwnedPills = Object.values(pills.ownedPills).reduce((s, n) => s + n, 0);
  const crystal         = useQiCrystal({ getQuantity: inventory.getQuantity, removeItem: inventory.removeItem });
  // Mirror current crystal tier into a body class so the qi-VFX colour
  // bundle (--qi-aura-*, --qi-text-*, --qi-bar-*) cascades from there.
  // App.css `body.crystal-tier-{1..6}` blocks set the palette; aura,
  // floaters, and Qi-bar fill all read from those vars.
  //
  // Tier mapping mirrors useQiCrystal.js (2026-05-21 Dial-5, cap L100):
  //   T1 = L1, T2 = L10, T3 = L25, T4 = L50, T5 = L75, T6 = L100.
  useEffect(() => {
    const TIERS = [
      [100, 6], [75, 5], [50, 4], [25, 3], [10, 2], [1, 1],
    ];
    const level = crystal?.level ?? 0;
    let tier = 1;
    for (const [thresh, t] of TIERS) {
      if (level >= thresh) { tier = t; break; }
    }
    const cls = `crystal-tier-${tier}`;
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [crystal?.level]);
  const producers       = useProducers();
  const upgrades        = useUpgrades();
  const { clearedRegions, clearRegion } = useClearedRegions();
  const selections      = useLawOffers({ cultivation });
  // featureFlags is declared further down — useQiSparks reads its unlock
  // gates via this ref-backed callback to avoid a TDZ on the inline value.
  const featureFlagsRef = useRef(null);
  const isFeatureUnlocked = useCallback(
    (id) => featureFlagsRef.current?.isUnlocked?.(id) ?? false,
    [],
  );
  // Producer-unlock gate for legendary producer-synergy sparks. Cards with
  // `requiresProducers: [...]` are filtered out of the offer pool unless
  // every referenced producer is unlocked. Closes over the latest
  // realmIndex — useQiSparks resyncs its ref on identity change.
  const producerUnlocked = useCallback(
    (pid) => producers.isUnlocked(pid, cultivation.realmIndex),
    [producers, cultivation.realmIndex],
  );
  const qiSparks        = useQiSparks({ cultivation, isFeatureUnlocked, producerUnlocked });

  // Legendary-pool transparency for the choice modal: tells the player how
  // much of the legendary pool is currently in reach AND what to chase next
  // when the pool is partial. Recomputes on realm changes so progress is
  // reflected the instant a producer unlocks.
  const legendaryPoolInfo = useMemo(() => {
    const allLegendary = QI_SPARKS.filter(c => c.rarity === 'legendary');
    const total        = allLegendary.length;
    const eligible     = allLegendary.filter(c =>
      (c.requiresProducers ?? []).every(pid => producers.isUnlocked(pid, cultivation.realmIndex))
    );
    let nextUnlock = null;
    if (eligible.length < total) {
      // For each ineligible legendary, find the BLOCKER producer with the
      // highest unlock-realm requirement (that's what gates it). Then find
      // the legendary whose blocker comes up SOONEST — that's the next
      // unlock the player will see when they progress.
      let bestRealm = Infinity;
      let bestProducer = null;
      for (const card of allLegendary) {
        if ((card.requiresProducers ?? []).every(pid => producers.isUnlocked(pid, cultivation.realmIndex))) continue;
        let highestRealm = -1;
        let highestProducer = null;
        for (const pid of card.requiresProducers ?? []) {
          if (!producers.isUnlocked(pid, cultivation.realmIndex)) {
            const p = PRODUCERS_BY_ID[pid];
            const r = p?.unlock?.minRealmIndex ?? 0;
            if (r > highestRealm) { highestRealm = r; highestProducer = p; }
          }
        }
        if (highestRealm >= 0 && highestRealm < bestRealm) {
          bestRealm = highestRealm;
          bestProducer = highestProducer;
        }
      }
      if (bestProducer) {
        nextUnlock = { producerName: bestProducer.name, realmIndex: bestRealm };
      }
    }
    return { eligibleCount: eligible.length, totalCount: total, nextUnlock };
  }, [producers, cultivation.realmIndex]);

  // Record every new realm reached so karma awards are first-time-only.
  useEffect(() => {
    karma.noteRealmReached(cultivation.realmIndex);
  }, [cultivation.realmIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep pill qi multiplier in sync with cultivation game loop.
  const pillQiMult = pills.getQiMult();
  useEffect(() => {
    cultivation.pillQiMultRef.current = pillQiMult;
  }, [pillQiMult, cultivation.pillQiMultRef]);

  // Push reincarnation-tree cultivation speed bonus into the loop.
  useEffect(() => {
    cultivation.treeQiMultRef.current       = tree.modifiers.cultivSpeedMult ?? 1;
    cultivation.treeHeavenlyMultRef.current = 1; // heavenly mult now at neutral
    if (cultivation.qiOnRealmFracRef) {
      cultivation.qiOnRealmFracRef.current  = tree.modifiers.qiOnEveryRealmFrac ?? 0;
    }
    // Cookie-Clicker pivot — Phase E. The producer/upgrade modifier surface.
    if (cultivation.treeProducerOutputMultRef) {
      cultivation.treeProducerOutputMultRef.current = tree.modifiers.producerOutputMult ?? 1;
    }
  }, [tree.modifiers, cultivation.treeQiMultRef, cultivation.treeHeavenlyMultRef, cultivation.qiOnRealmFracRef, cultivation.treeProducerOutputMultRef]);

  // cb_pt Phase Technique — when the connector is purchased, grant the law
  // (idempotent — addOwnedLaw is a no-op if the id is already in the
  // library). Auto-equip if the player has no active law.
  useEffect(() => {
    if (!tree.modifiers.phaseTechniqueOwned) return;
    const alreadyOwned = cultivation.ownedLaws?.some(l => l.id === PHASE_TECHNIQUE_ID);
    if (!alreadyOwned) {
      cultivation.addOwnedLaw(PHASE_TECHNIQUE_LAW);
    }
    if (!cultivation.activeLaw) {
      cultivation.setActiveLaw(PHASE_TECHNIQUE_ID);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.modifiers.phaseTechniqueOwned, cultivation.ownedLaws.length]);

  // al_k Living Memory — at mount, read the localStorage timestamp set by
  // handleReincarnate; if the buff is still live, set rebirthCultBuffRef to 2
  // and schedule a clear at expiry.
  useEffect(() => {
    if (!cultivation.rebirthCultBuffRef) return;
    let until = 0;
    try {
      until = Number(localStorage.getItem('mai_rebirth_cult_buff_until') ?? 0);
    } catch { /* localStorage unavailable */ }
    const remainingMs = until - Date.now();
    if (remainingMs <= 0) {
      cultivation.rebirthCultBuffRef.current = 1;
      return;
    }
    cultivation.rebirthCultBuffRef.current = 2;
    const id = setTimeout(() => {
      cultivation.rebirthCultBuffRef.current = 1;
      try { localStorage.removeItem('mai_rebirth_cult_buff_until'); }
      catch { /* localStorage unavailable */ }
    }, remainingMs);
    return () => clearTimeout(id);
  }, [cultivation.rebirthCultBuffRef]);

  // Ref updated every render so effects always see the latest breakthrough state
  // without needing it as a dep (avoids stale-closure false-negatives).
  const majorBreakthroughRef = useRef(null);
  majorBreakthroughRef.current = cultivation.majorBreakthrough;

  // Auto-enqueue selection cards when pendingCount increases mid-session
  // (i.e. a real level-up just happened). Skip on load so players aren't
  // greeted by the modal immediately — the notification badge is enough.
  // Major breakthroughs: BreakthroughBanner.onDone enqueues the cards after
  // the animation; suppress here so they don't double-fire.
  const prevPendingRef = useRef(null);
  useEffect(() => {
    const prev = prevPendingRef.current;
    prevPendingRef.current = selections.pendingCount;
    if (prev === null) return; // first render — treat as load, don't enqueue
    // Laws are hidden until combat ships. The hook keeps writing pending
    // offers to localStorage so when FEATURES.laws flips on in v2 the
    // player picks up where they left off; we just don't surface them now.
    if (!FEATURES.laws) return;
    if (selections.pendingCount > prev && currentScreen === 'home') {
      if (!majorBreakthroughRef.current) {
        enqueue('selection-cards', null, { dedupe: true });
      }
    }
  }, [selections.pendingCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-enqueue offline earnings when they appear. High priority so they
  // jump ahead of less-impactful events like the daily bonus.
  useEffect(() => {
    if (cultivation.offlineEarnings > 0) {
      enqueue('offline-earnings', null, { priority: 'high', dedupe: true });
    }
  }, [cultivation.offlineEarnings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror the queue's selection-cards event onto the legacy modal flag so
  // the existing render path stays simple. Player-tap on the rewards chip
  // also flips this flag directly, bypassing the queue.
  useEffect(() => {
    if (!FEATURES.laws) return;
    if (currentEvent?.kind === 'selection-cards') setSelectionModalOpen(true);
  }, [currentEvent]);

  // Once all pending selections are resolved, retire the queue event and
  // collapse the modal flag — covers the "player picked the last reward"
  // path where SelectionModal unmounts on its own without firing onClose.
  useEffect(() => {
    if (selections.pendingCount === 0) {
      if (selectionModalOpen) setSelectionModalOpen(false);
      if (currentEvent?.kind === 'selection-cards') dismiss(currentEvent.id);
    }
  }, [selections.pendingCount, selectionModalOpen, currentEvent, dismiss]);

  // Keep QI crystal bonus in sync with cultivation game loop.
  useEffect(() => {
    if (!cultivation.crystalQiBonusRef) return;
    cultivation.crystalQiBonusRef.current = crystal.crystalQiBonus;
  }, [crystal.crystalQiBonus, cultivation.crystalQiBonusRef]);

  // Mirror the producer-driven qi/sec into the cultivation tick — folding in
  // per-producer "doubling" upgrades at the source. Producer × upgrade-mult is
  // the effective contribution; the global `upgradeProducerMultRef` stays at 1
  // until Eternal-Tree capstones land in Phase E.
  //
  // Also writes the offline-rate snapshot (`mai_producers_rate_snapshot`) so
  // useCultivation's pre-mount offline-earnings calc sees the effective rate
  // (mirrors `mai_crystal_click_snapshot` pattern). Fires on producer OR
  // upgrade change.
  useEffect(() => {
    if (!cultivation.producerRateRef) return;
    // Per-producer multiplier composes the upgrade-doubling mult with the
    // legendary spark per-producer mult (pair synergies, count-based bonuses,
    // single-producer ×N, Phoenix Reborn). Both contribute multiplicatively.
    const ownedMap = producers.owned;
    const perProducer = (pid) =>
      upgrades.getProducerMult(pid) * qiSparks.getProducerSparkMult(pid, ownedMap);
    const effective = producers.getRate(perProducer);
    cultivation.producerRateRef.current = effective;
    // Trinity Convergence + producer_pair_global_mult — global multipliers
    // from legendary sparks, folded into the rate calc downstream.
    if (cultivation.sparkLegendaryGlobalMultRef) {
      cultivation.sparkLegendaryGlobalMultRef.current = qiSparks.getGlobalSparkMult(ownedMap);
    }
    try {
      localStorage.setItem('mai_producers_rate_snapshot', JSON.stringify({ rate: effective }));
    } catch {}
  }, [producers.owned, upgrades.owned, qiSparks.activeSparks, cultivation.producerRateRef, cultivation.sparkLegendaryGlobalMultRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phoenix Reborn (legendary E2) — useQiSparks dispatches this event when
  // a major realm transition fires while the spark is active. Reset the
  // player's Phoenix count to 0 (the permanent +mult bonus on other producers
  // is already accounted for in qiSparks.getProducerSparkMult via the
  // per-instance stack counter).
  useEffect(() => {
    const handler = () => {
      try { producers.setOwnedCount?.('p_phoenix', 0); } catch {}
    };
    window.addEventListener('mai:phoenix-reborn', handler);
    return () => window.removeEventListener('mai:phoenix-reborn', handler);
  }, [producers]);

  // Mirror remaining upgrade effects into cultivation refs. crystal-tap mult
  // is applied inside collectCrystalReservoir; gate-reduction mult into the
  // major-realm gate; focus-mult adder folds into the per-second focusMult
  // interval (see below). Sparks reroll discount is read directly by useQiSparks
  // via the upgrades hook in a separate effect (Phase D TODO).
  useEffect(() => {
    // Crystal-tap mult composes upgrade-driven (Refined Tap I–V) × tree-driven
    // (yy_3 Heart of Stone repurposed) so both contribute multiplicatively.
    if (cultivation.upgradeCrystalTapMultRef) {
      cultivation.upgradeCrystalTapMultRef.current =
        upgrades.getCrystalTapMult() * (tree.modifiers.crystalTapMult ?? 1);
    }
    if (cultivation.upgradeFocusMultAddRef) {
      cultivation.upgradeFocusMultAddRef.current = upgrades.getFocusMultAdd();
    }
  }, [upgrades.owned, tree.modifiers, cultivation.upgradeCrystalTapMultRef, cultivation.upgradeFocusMultAddRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror Qi Sparks multipliers + flags into cultivation refs each render.
  // Cheap; runs only when activeSparks identity changes (the hook returns
  // the same array reference when no expiry happened).
  useEffect(() => {
    if (cultivation.sparkQiMultRef) {
      cultivation.sparkQiMultRef.current = qiSparks.qiMultRef.current;
    }
    if (cultivation.sparkFocusMultBonusRef) {
      cultivation.sparkFocusMultBonusRef.current = qiSparks.focusMultBonusRef.current;
    }
    if (cultivation.sparkQiFlatRef) {
      cultivation.sparkQiFlatRef.current = qiSparks.qiFlatRef.current;
    }
    if (cultivation.sparkGateReductionRef) {
      cultivation.sparkGateReductionRef.current = qiSparks.gateReductionRef.current;
    }
    if (cultivation.sparkPainlessRef) {
      cultivation.sparkPainlessRef.current = qiSparks.painlessActiveRef.current;
    }
    if (cultivation.sparkLingeringActiveRef) {
      cultivation.sparkLingeringActiveRef.current = qiSparks.lingeringActiveRef.current;
    }
    if (cultivation.sparkLingeringResidualMsRef) {
      cultivation.sparkLingeringResidualMsRef.current = qiSparks.lingeringResidualMsRef.current;
    }
    if (cultivation.sparkLingeringResidualMultRef) {
      cultivation.sparkLingeringResidualMultRef.current = qiSparks.lingeringResidualMultRef.current;
    }
    if (cultivation.sparkConsecutiveLadderRef) {
      cultivation.sparkConsecutiveLadderRef.current = qiSparks.consecutiveFocusLadderRef.current;
    }
    if (cultivation.sparkConsecutiveDeepRef) {
      cultivation.sparkConsecutiveDeepRef.current = qiSparks.consecutiveFocusDeepRef.current;
    }
    if (cultivation.sparkCrystalClickRateRef) {
      cultivation.sparkCrystalClickRateRef.current = qiSparks.crystalClickRateRef.current;
    }
    if (cultivation.sparkCrystalClickCapMinRef) {
      cultivation.sparkCrystalClickCapMinRef.current = qiSparks.crystalClickCapMinRef.current;
    }
  }, [qiSparks.activeSparks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Consecutive Focus rung escalation — toggle body classes that CSS keys
  // off to drive per-rung aura/glow/tint + a brief upward "pop" burst.
  // Cultivation tick only dispatches on edges, so this listener is cheap.
  useEffect(() => {
    const RUNG_CLASSES = ['cf-rung-1', 'cf-rung-2', 'cf-rung-3', 'cf-rung-4', 'cf-rung-5'];
    let popTimer = 0;
    const onRung = (e) => {
      const { rung, deep, upward } = e.detail ?? {};
      const body = document.body;
      body.classList.remove(...RUNG_CLASSES);
      if (rung > 0) body.classList.add(`cf-rung-${rung}`);
      body.classList.toggle('deep-meditation', !!deep);

      // Restart the pop animation on every upward edge.
      if (upward) {
        body.classList.remove('cf-rung-pop');
        // Force reflow so the animation can replay back-to-back rung-ups.
        // eslint-disable-next-line no-unused-expressions
        body.offsetWidth;
        body.style.setProperty('--cf-pop-rung', String(rung));
        body.classList.add('cf-rung-pop');
        clearTimeout(popTimer);
        popTimer = setTimeout(() => body.classList.remove('cf-rung-pop'), 800);
      }
    };
    window.addEventListener('mai:cf-rung', onRung);
    return () => {
      window.removeEventListener('mai:cf-rung', onRung);
      clearTimeout(popTimer);
      const body = document.body;
      body.classList.remove(...RUNG_CLASSES, 'cf-rung-pop', 'deep-meditation');
    };
  }, []);


  // ── Centralised stat getter ─────────────────────────────────────────────
  // Builds the FULL computeAllStats bundle including modifier contributions
  // from artefacts, pills, and law uniques. Used by autoFarm (gather/mine
  // speed + luck), combat (exploit chance/mult), and cultivation (focus mult).
  // Called per-tick from autoFarm and per-fight from CombatScreen — kept
  // pure / read-only so it never triggers React renders.
  // Multiplicatively combine per-tech-type CD scalers from law + set sources.
  // e.g. law gives Heal ×2 and a set gives Heal ×0.8 → final Heal ×1.6.
  const mergeCdTypeMults = (a, b) => {
    const out = { ...(a ?? {}) };
    for (const [t, m] of Object.entries(b ?? {})) {
      out[t] = (out[t] ?? 1) * m;
    }
    return out;
  };

  const getFullStats = useCallback(() => {
    const qi         = cultivation.qiRef.current;
    const law        = cultivation.activeLaw;
    const realmIndex = cultivation.indexRef.current;

    // Pre-compute light context fields the new element-themed law uniques
    // need (per-element artefact counts + per-type tech counts). Stat-driven
    // fields (current dodge chance, damage multiplier, etc.) aren't known
    // until *after* stats compute below; lawEngine handles their absence
    // gracefully (resolvers default to 0 → effect contributes nothing).
    const equippedArtefactsByElement = artefacts?.getEquippedArtefactsByElement?.()
      ?? { fire: 0, water: 0, earth: 0, wood: 0, metal: 0 };
    const equippedTechsByType = (() => {
      const out = { Attack: 0, Heal: 0, Defend: 0, Dodge: 0, Expose: 0 };
      for (const t of (techniques?.equippedTechniques ?? [])) {
        if (t?.type && out[t.type] !== undefined) out[t.type] += 1;
      }
      return out;
    })();
    const lawCtx    = buildContext({
      inCombat: false,
      realmIndex,
      lawElement: law?.element,
      isAtPeak: realmIndex >= 46,
      equippedArtefactsByElement,
      equippedTechsByType,
    });
    const lawBundle = evaluateLawUniques(law, lawCtx);

    // hw_4 Soul Crucible — multiply every pill-derived mod value by 1.25.
    // Multiplies the raw flat / increased / more values themselves so the
    // scaling shows up as a simple post-roll boost on the existing pill mods.
    // Artefact uniques (a_alchemist_hands / a_sage_belt / a_alchemy_ring)
    // stack multiplicatively with the tree bonus.
    const artefactMods = artefacts?.getStatModifiers?.() ?? {};
    const artefactPillPct = (artefactMods.pill_effect_mult ?? []).reduce((s, m) => s + (m.value ?? 0), 0);
    const pillMult = (tree?.modifiers?.pillEffectMult ?? 1) * (1 + artefactPillPct);
    const scalePillBundle = (mods) => {
      if (!mods || pillMult === 1) return mods ?? {};
      const out = {};
      for (const [statId, list] of Object.entries(mods)) {
        out[statId] = list.map(m =>
          m.type === 'more'
            ? { ...m, value: 1 + (m.value - 1) * pillMult }
            : { ...m, value: m.value * pillMult }
        );
      }
      return out;
    };
    const scaledPillMods = scalePillBundle(pills?.getStatModifiers?.() ?? {});

    // yy_k Primordial Balance — +10% engine-side multiplier on every artefact
    // affix value the player owns. Same shape as the pill scaler above.
    const artefactMult = tree?.modifiers?.artefactValueMult ?? 1;
    const scaleArtefactBundle = (mods) => {
      if (!mods || artefactMult === 1) return mods ?? {};
      const out = {};
      for (const [statId, list] of Object.entries(mods)) {
        out[statId] = list.map(m =>
          m.type === 'more'
            ? { ...m, value: 1 + (m.value - 1) * artefactMult }
            : { ...m, value: m.value * artefactMult }
        );
      }
      return out;
    };
    const scaledArtefactMods = scaleArtefactBundle(artefactMods);

    // ── Set-bonus aggregation (depends on lawBundle's setCountBonus) ──────
    // Set bonuses can be inflated by law uniques like "<Ember Legacy> counts
    // as +1". Compute once with the law-side count bonus piped in; the
    // statMods stack with artefact + law mods below, while flags + triggers
    // + cdTypeMults attach directly to the combat stats bundle further down.
    const setBundle = getSetBonusModifiers(
      artefacts?.equipped ?? {},
      artefacts?.owned ?? [],
      { hpPct: 1 }, // out-of-combat placeholder ctx; conditional set effects evaluate inactive
      lawBundle?.setCountBonus ?? null,
    );
    // Push set-bonus statMods into the scaledArtefactMods bundle so they
    // flow through the usual merge path below.
    for (const [stat, list] of Object.entries(setBundle.statMods)) {
      (scaledArtefactMods[stat] ??= []).push(...list);
    }
    // Collapse artefact-only qi_speed mods into a single multiplier fed to
    // the cultivation tick. Law-unique qi_speed is handled inside cultivation
    // directly, so it is NOT included here (double-count guard).
    const artefactQiMods = scaledArtefactMods.qi_speed ?? [];
    const artefactQiMult = artefactQiMods.length > 0
      ? computeStat(1, artefactQiMods)
      : 1;

    // typeMults removed in Stage 4 of the Damage & Element Overhaul —
    // basic-attack damage is scaled purely by realm index now (see
    // useCombat's placeholder formula). The cb_is reincarnation node
    // has been retired alongside it.
    const lawForCompute = law;

    const mergedMods = mergeModifiers(
      scaledArtefactMods,
      scaledPillMods,
      lawBundle.statMods,
      tree?.getStatModifiers?.(),
    );

    const bundle = computeAllStats(qi, lawForCompute, realmIndex, mergedMods);

    // Collapse a percentage-style stat into a single scalar via the same
    // 5-layer formula (so artefacts / law uniques / pills / selections all
    // contribute the same way they would for a primary stat).
    const collapsePct = (statId) => {
      const list = mergedMods[statId];
      if (!list || !list.length) return 0;
      return computeStat(0, list);
    };
    const collapseFlat = (statId) => {
      const list = mergedMods[statId];
      if (!list || !list.length) return 0;
      return computeStat(0, list);
    };

    // Per-pool damage flats were read by the 9-pool calcDamage split
    // (removed in Stage 5). The `dmg_<pool>` affixes and STAT_META entries
    // still exist and roll harmlessly until the Stage-6 cleanup; they
    // simply don't feed into damage anymore.

    return {
      // Primary stats (essence/soul/body) were retired stage 15 and stripped
      // from the bundle 2026-04-27 alongside the calcDamage cleanup. The
      // associated lawElement holdover is retained for any law-engine
      // condition that still keys off it.
      health:     bundle.combat.health,
      lawElement: law?.element ?? null,
      law: lawForCompute,
      // Flat damage bonuses + source-gated multipliers, all consumed by
      // calcDamage and useCombat's basic-attack.
      damageStats: {
        physical:                bundle.combat.physDmg,
        elemental:               bundle.combat.elemDmg,
        damage_all:              collapseFlat('damage_all'),
        secret_technique_damage: collapsePct('secret_technique_damage'),
        default_attack_damage:   collapsePct('default_attack_damage'),
      },
      // Activity stats — needed by autoFarm + Gathering/Mining screens.
      // Artefact `loot_luck` (a_lucky_ring) boosts both luck pools equally
      // so one ring covers gather + mine; `all_loot_bonus` (a_seer_locket)
      // feeds into qty multipliers downstream via getAllLootBonus below.
      harvestSpeed: bundle.activity.harvestSpeed,
      harvestLuck:  bundle.activity.harvestLuck   + collapseFlat('loot_luck'),
      miningSpeed:  bundle.activity.miningSpeed,
      miningLuck:   bundle.activity.miningLuck    + collapseFlat('loot_luck'),
      focusMult:    bundle.activity.focusMult,
      // Combat-only
      exploitChance: bundle.combat.exploitChance,
      exploitMult:   bundle.combat.exploitMult,
      // Defence stats — useCombat picks the one matching the enemy's damage
      // type when computing mitigation.
      defense:          bundle.combat.defense,
      elementalDefense: bundle.combat.elemDef,
      // Expose-pipeline stats (added 2026-04-26 secret-tech overhaul).
      defPen:                   bundle.combat.defPen,
      incomingDamageReduction:  bundle.combat.incomingDamageReduction,
      // Scales the attack-count of Defend / Dodge buffs at cast time.
      buffDurationMult: 1 + collapsePct('buff_duration'),
      // Scales magnitude (defMult / dodgeChance) at cast time.
      buffEffectMult:   collapsePct('buff_effect'),
      // ── Artefact-derived extras ───────────────────────────────────────
      // crit_chance / crit_damage / crit_twice_chance were consolidated
      // into exploit_chance / exploit_attack_mult on 2026-04-26.
      lifestealPct:           collapseFlat('lifesteal'),              // 0–100
      dodgeChancePct:         collapseFlat('dodge_chance'),           // 0–100
      dodgeFatalChancePct:    collapseFlat('dodge_fatal_chance'),     // 0–100
      ignoreDefensePct:       collapseFlat('ignore_defense_pct'),     // 0–100
      ignoreDefenseChancePct: collapseFlat('ignore_defense_chance'),  // 0–100
      reflectPct:             collapseFlat('reflect_pct'),            // 0–100
      healingReceivedPct:     collapsePct('healing_received'),        // 0–1 (30% → 0.30)
      cooldownReductionPct:   Math.min(0.8, collapsePct('cooldown_reduction_all')
                                         + collapsePct('technique_cd_reduction')
                                         + collapsePct('attack_cd_reduction')),
      freeCastChancePct:      collapseFlat('tech_free_cast_chance'),  // 0–100
      hpRegenInCombatPct:     collapsePct('hp_regen_in_combat'),      // fraction of maxHP / sec
      hpRegenOutCombatPct:    collapsePct('hp_regen_out_combat'),     // fraction of maxHP / sec
      offlineQiMult:          1 + collapsePct('offline_qi_mult'),     // 1 + 0.30 = 1.30
      pillEffectArtefactMult: 1 + collapsePct('pill_effect_mult'),    // stacked with tree in App
      craftingCostReduction:  Math.min(0.75, collapsePct('crafting_cost_reduction')),
      allLootBonusPct:        collapsePct('all_loot_bonus'),          // 0–1
      lootLuckPct:            collapseFlat('loot_luck'),              // 0–100
      // Set-bonus flags + triggers (the artefact-uniques flag bag was deleted
      // in 2026-04-27 alongside the unique system). setBundle is the
      // law-aware aggregate computed earlier in this same callback.
      setFlags:               setBundle?.flags ?? {},
      setTriggers:            setBundle?.triggers ?? [],
      // Law-unique flags + triggers (sourced from the active law's uniques).
      // Per-tech-type CD multipliers stack across law + set sources.
      lawFlags:               lawBundle?.flags ?? {},
      lawTriggers:            lawBundle?.triggers ?? [],
      lawCdTypeMults:         mergeCdTypeMults(lawBundle?.cdTypeMults, setBundle?.cdTypeMults),
      // Per-element artefact counts (drives per-element scaling laws).
      equippedArtefactsByElement: artefacts?.getEquippedArtefactsByElement?.() ?? { fire: 0, water: 0, earth: 0, wood: 0, metal: 0 },
      // Heavenly QI multiplier (artefact rings) — only applies during ad boost.
      heavenlyQiMult:   collapsePct('heavenly_qi_mult'),
      // Artefact-derived qi_speed aggregate — mirrored to useCultivation so
      // affix rolls affect the live cultivation rate.
      artefactQiMult,
      // Reincarnation tree exposures consumed by autoFarm / combat / selections.
      maxOfflineHours:        tree.modifiers.offlineCapHours,
      cooldownMult:           tree.modifiers.cooldownMult ?? 1,
      undyingResolve:         !!tree.modifiers.undyingResolve,
      killingStride:          !!tree.modifiers.killingStride,
      hpRegenPerSec:          tree.modifiers.hpRegenPerSec ?? 0,
      freeCastEvery:          tree.modifiers.freeCastEvery ?? 0,
      qiOnEveryRealmFrac:     tree.modifiers.qiOnEveryRealmFrac ?? 0,
      gatherMineRarityUpChance: tree.modifiers.gatherMineRarityUpChance ?? 0,
      regionKillBonus:        !!tree.modifiers.regionKillBonus,
      // cb_ts Veteran's Hunt — pending bump *count*. autoFarm decrements
      // it explicitly when it consumes a bump (see useAutoFarm tick).
      huntBumpsPendingRef:    combat.huntBumpsPendingRef,
      damageMult:             tree.modifiers.damageMult ?? 1,
      // Context useCombat needs to evaluate artefact conditional flags.
      realmIndex,
      equippedArtefactCount:  Object.values(artefacts?.equipped ?? {}).filter(Boolean).length,
    };
  }, [cultivation, artefacts, pills, selections, tree]);

  // Mirror focusMult into a ref the cultivation tick reads directly so
  // boost speed reflects equipment / pill modifiers. Same loop also keeps
  // the artefact-derived heavenly_qi multiplier in sync so cultivation
  // sees ring rolls without the cultivation hook needing to know about
  // the artefact layer.
  useEffect(() => {
    if (!cultivation.focusMultRef) return;
    const id = setInterval(() => {
      const full = getFullStats();
      // Deeper Breath upgrades add flat percentage points (50/50/50/100) to
      // the focus mult coming from stats/artefacts/laws. Sourced via a ref so
      // this interval doesn't need to be re-created on every upgrade change.
      const upgradeAdd = cultivation.upgradeFocusMultAddRef?.current ?? 0;
      cultivation.focusMultRef.current = full.focusMult + upgradeAdd;
      if (cultivation.heavenlyQiMultRef) {
        cultivation.heavenlyQiMultRef.current = full.heavenlyQiMult ?? 0;
      }
      if (cultivation.artefactQiMultRef) {
        cultivation.artefactQiMultRef.current = full.artefactQiMult ?? 1;
      }
      // Mirror the artefact offline-qi multiplier to localStorage so that
      // useCultivation's offline bootstrap (runs before React mounts) can
      // still read it. Small snapshot, written once a second.
      try {
        localStorage.setItem('mai_artefact_offline_snapshot',
          JSON.stringify({ offlineQiMult: full.offlineQiMult ?? 1 }));
      } catch {}
    }, 1000);
    return () => clearInterval(id);
  }, [cultivation.focusMultRef, cultivation.heavenlyQiMultRef, cultivation.artefactQiMultRef, getFullStats]);

  // Auto-farm — stat getter reads live refs so the hook never triggers re-renders
  const autoFarm = useAutoFarm({
    worlds: WORLDS,
    getStats: getFullStats,
  });

  // Derive the single active idle assignment from the config
  const idleAssignment = useMemo(() => {
    const cfg = autoFarm.autoFarmConfig;
    for (const activity of ['combat', 'gathering', 'mining']) {
      if (cfg[activity]?.enabled) {
        return {
          activity,
          worldIndex:  cfg[activity].worldIndex,
          regionIndex: cfg[activity].regionIndex,
        };
      }
    }
    return null;
  }, [autoFarm.autoFarmConfig]);

  const notifications = useNotifications({ cultivation, inventory });

  // Round 3 — Crystal Discovery. Subscribes to HomeScreen's tier-crossed
  // window event and grants any mechanic-tier sparks attached to crossed
  // tiers. `qiSparks.grant` is idempotent for mechanics so re-firing is safe.
  // A toast lands per successful grant so the player sees the unlock.
  useEffect(() => {
    const handler = (e) => {
      const { previousTier = 0, newTier = 0 } = e.detail ?? {};
      const ids = sparksToGrantOnEvolution(previousTier, newTier);
      for (const sparkId of ids) {
        const ok = qiSparks?.grant?.(sparkId);
        if (ok) {
          const card = QI_SPARK_BY_ID[sparkId];
          notifications.addToast({
            message: `New mechanic unlocked: ${card?.name ?? sparkId}`,
            duration: 6000,
          });
        }
      }
    };
    window.addEventListener('mai:crystal-tier-crossed', handler);
    return () => window.removeEventListener('mai:crystal-tier-crossed', handler);
  }, [qiSparks, notifications]);

  // 2026-05-21 bug-fix: surface a toast when the spark modal auto-picks the
  // leftmost card on inactivity timeout. Previously the modal would silently
  // vanish and the player wouldn't know which spark they got.
  useEffect(() => {
    const handler = (e) => {
      const { sparkId } = e.detail ?? {};
      const card = QI_SPARK_BY_ID[sparkId];
      notifications.addToast({
        message: `⌛ Auto-selected: ${card?.name ?? 'spark'} (modal timed out)`,
        duration: 7000,
      });
    };
    window.addEventListener('mai:spark-auto-picked', handler);
    return () => window.removeEventListener('mai:spark-auto-picked', handler);
  }, [notifications]);

  // Round 3 — one-shot backfill for combat-alpha saves whose crystal is
  // already past a mechanic-grant threshold but who never rolled the rare
  // spark (now retired). Walks 0→currentTier through CRYSTAL_TIER_GRANTS;
  // `grant` is idempotent so anything already owned is skipped. Gated by a
  // localStorage flag so it runs exactly once per device.
  const backfillRanRef = useRef(false);
  useEffect(() => {
    if (backfillRanRef.current) return;
    if (!qiSparks?.grant) return;
    let seen = null;
    try { seen = localStorage.getItem('mai_v1_3_mechanic_backfill_seen'); } catch {}
    if (seen) { backfillRanRef.current = true; return; }
    // crystal.level is React state; on first render after load it's the
    // saved value. Walk tiers 1..currentTier (CRYSTAL_TIER_GRANTS starts at 2).
    const level = crystal?.level ?? 0;
    if (level > 0) {
      // Map level → visual tier using the same thresholds as useQiCrystal.
      // Inline rather than importing to keep the effect self-contained.
      const TIERS = [
        [1000, 10], [750, 9], [500, 8], [350, 7], [200, 6],
        [100,  5], [ 50, 4], [ 25, 3], [ 10, 2], [  1, 1],
      ];
      let currentTier = 0;
      for (const [thresh, t] of TIERS) {
        if (level >= thresh) { currentTier = t; break; }
      }
      const ids = sparksToGrantOnEvolution(0, currentTier);
      for (const sparkId of ids) qiSparks.grant(sparkId);
    }
    try { localStorage.setItem('mai_v1_3_mechanic_backfill_seen', '1'); } catch {}
    backfillRanRef.current = true;
  }, [qiSparks, crystal?.level]);

  // One-time "Combat returns later" toast. Fires on first launch under
  // FEATURES.combat=false IF the player has combat-era data on disk that
  // would otherwise vanish without explanation. Fresh players don't see
  // it — they have nothing to reassure. Gated via mai_v1_combat_hidden_seen
  // so it only ever fires once per device.
  const combatHiddenToastRanRef = useRef(false);
  useEffect(() => {
    if (combatHiddenToastRanRef.current) return;
    if (FEATURES.combat) return;
    let seen = null;
    try { seen = localStorage.getItem('mai_v1_combat_hidden_seen'); } catch {}
    if (seen) { combatHiddenToastRanRef.current = true; return; }
    let hadCombatData = false;
    try {
      hadCombatData = !!(
        localStorage.getItem('mai_inventory') ||
        localStorage.getItem('mai_owned_laws') ||
        localStorage.getItem('mai_artefacts') ||
        localStorage.getItem('mai_pills')
      );
    } catch {}
    if (hadCombatData) {
      notifications.addToast({
        message: 'Combat returns in a future update — your inventory and laws are preserved.',
        duration: 8000,
      });
    }
    try { localStorage.setItem('mai_v1_combat_hidden_seen', '1'); } catch {}
    combatHiddenToastRanRef.current = true;
  }, [notifications]);

  const achievements = useAchievements({
    onUnlock: (a) => {
      notifications.addToast({ message: `🏆 Achievement: ${a.title}` });
      try { trackAchievementUnlocked(a.id); } catch {}
    },
  });

  const prevAchCountRef = useRef(achievements.unlockedCount);
  useEffect(() => {
    const count = achievements?.unlockedCount ?? 0;
    if (count > prevAchCountRef.current) setHasNewAch(true);
    prevAchCountRef.current = count;
  }, [achievements?.unlockedCount]);

  // Check achievements whenever key progression metrics change.
  useEffect(() => {
    achievements.check({
      realmIndex:            cultivation.realmIndex,
      ownedLawsCount:        cultivation.ownedLaws.length,
      ownedTechniquesCount:  Object.keys(techniques.ownedTechniques).length,
      clearedRegionsCount:   clearedRegions.size,
      ownedArtefactsCount:   artefacts.owned.length,
      discoveredPillsCount:  Object.keys(pills.discoveredPills).length,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cultivation.realmIndex,
    cultivation.ownedLaws.length,
    Object.keys(techniques.ownedTechniques).length,
    clearedRegions.size,
    artefacts.owned.length,
    Object.keys(pills.discoveredPills).length,
  ]);

  // Wired into useQiSparks above via featureFlagsRef so its mechanic-card
  // pool gating (Crystal Click T1 etc.) can query feature unlocks.
  const featureFlags = useFeatureFlags({
    cultivation,
    clearedRegions,
    inventory,
    onUnlock: (featureId, msg) => {
      const SCREEN = {
        worlds: 'worlds', gathering: 'worlds', mining: 'worlds',
        production: 'production', alchemy: 'production',
        character: 'character', collection: 'collection',
        qi_crystal: 'home',
      };
      const targetScreen = SCREEN[featureId] ?? null;
      const targetParam  = featureId === 'qi_crystal' ? { openCrystal: true } : null;
      notifications.addToast({ message: msg, targetScreen, targetParam });
    },
  });
  featureFlagsRef.current = featureFlags;

  // Toast on karma award. The karma hook bumps `lastAwardedVersion` each
  // time a realm grants karma; we watch that and surface the amount.
  useEffect(() => {
    if (!karma.lastAwarded?.amount) return;
    notifications.addToast({
      message: `+${karma.lastAwarded.amount} Karma earned ◈`,
      targetScreen: 'reincarnation',
      duration: 4000,
    });
  }, [karma.lastAwardedVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a live ref to all hooks so debug commands always see fresh state.
  const hooksRef = useRef({});
  hooksRef.current = { cultivation, inventory, techniques, combat, artefacts, pills, autoFarm, crystal, qiSparks };
  useEffect(() => { initDebug(hooksRef); }, []);

  // Audio unlock: browsers block the AudioContext until a user gesture.
  // Defer preload + BGM start until the first pointerdown/keydown so we
  // don't get stuck in a half-suspended state.
  useEffect(() => {
    const onFirstGesture = () => {
      AudioManager.unlock();
      document.removeEventListener('pointerdown', onFirstGesture);
      document.removeEventListener('keydown',     onFirstGesture);
    };
    document.addEventListener('pointerdown', onFirstGesture);
    document.addEventListener('keydown',     onFirstGesture);

    // One global click→ui_click handler for every <button> in the app.
    // Idempotent; safe to call before unlock (playSfx no-ops until unlocked).
    installGlobalClickSfx();

    // Request the initial track now — playBgm buffers it until unlock fires.
    AudioManager.playBgm('cultivation');

    return () => {
      document.removeEventListener('pointerdown', onFirstGesture);
      document.removeEventListener('keydown',     onFirstGesture);
    };
  }, []);

  // BGM: one continuous main track for the whole game; combat-arena swaps to
  // the combat track and we cross-fade back to main on exit. AudioManager's
  // playBgm() early-returns when the requested track is already playing, so
  // navigating between non-combat screens leaves the music untouched.
  useEffect(() => {
    const trackId = currentScreen === 'combat-arena' ? 'combat' : 'cultivation';
    AudioManager.playBgm(trackId);
  }, [currentScreen]);

  // Navigate to a screen, optionally carrying a parameter (e.g. region data).
  // Routes targeting flag-blocked screens silently fall back to home so a
  // stale notification or external nav call can't strand the player on a
  // hidden surface.
  const navigate = (screen, param = null) => {
    const target = isScreenAllowed(screen) ? screen : 'home';
    setCurrentScreen(target);
    setScreenParam(param);
    setSelectionModalOpen(false);
    notifications.clearBadge(target);
    try { trackScreenView(target); } catch {}
  };

  // Cross-component nav events — keeps callsites (like the home sparks chip)
  // decoupled from prop-drilling the navigate fn. ActiveSparksBar dispatches
  // `mai:nav-sparks` when the player taps "View all sparks →"; route them
  // to Cultivation > Sparks tab here.
  useEffect(() => {
    const handler = () => navigate('cultivation', 'sparks');
    window.addEventListener('mai:nav-sparks', handler);
    return () => window.removeEventListener('mai:nav-sparks', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReincarnate = useCallback(() => {
    // Safety net — the button is already disabled below Saint, but we
    // refuse here too so any future callsite can't bypass the gate.
    if (cultivation.realmIndex < 24) return;
    try {
      trackReincarnation(cultivation.realmIndex, (karma.lives ?? 0) + 1);
      trackFirstTime('Reincarnation', cultivation.realmIndex);
    } catch {}
    karma.reincarnate();

    // ─── Reincarnation tree carry-overs (al_2 / al_4 / al_k) ───────────────
    const treeMods = tree.modifiers ?? {};

    // al_2 Echo of Mastery — snapshot discovered-recipe set so the wipe
    // doesn't drop it. Restored after wipeReincarnation re-seeds the laws.
    let recipeSnapshot = null;
    if (treeMods.keepRecipes) {
      try {
        recipeSnapshot = localStorage.getItem('mai_discovered_pills');
      } catch {}
    }

    // Producer-level carryover (Cookie-Clicker pivot — Phase E). Snapshot
    // current owned counts × keepProducerLevelsFrac BEFORE the wipe so the
    // restored counts pick up after wipeReincarnation clears `mai_producers`.
    let producersSnapshot = null;
    const keepFrac = treeMods.keepProducerLevelsFrac ?? 0;
    if (keepFrac > 0) {
      try {
        const rawOwned = localStorage.getItem('mai_producers');
        if (rawOwned) {
          const ownedNow = JSON.parse(rawOwned) ?? {};
          const kept = {};
          for (const [id, count] of Object.entries(ownedNow)) {
            const k = Math.floor((count ?? 0) * keepFrac);
            if (k > 0) kept[id] = k;
          }
          if (Object.keys(kept).length > 0) producersSnapshot = kept;
        }
      } catch {}
    }

    // Give React a tick to flush the karma state to localStorage before we
    // wipe the rest of the save + hard-reload.
    setTimeout(() => {
      wipeReincarnation();

      // Restore al_2 Echo of Mastery snapshot.
      if (recipeSnapshot != null) {
        try { localStorage.setItem('mai_discovered_pills', recipeSnapshot); } catch {}
      }

      // Restore the producer-level carryover. wipeReincarnation must clear
      // the upgrade set entirely (one-time purchases reset by design) — only
      // the owned-count map of producers carries.
      if (producersSnapshot) {
        try { localStorage.setItem('mai_producers', JSON.stringify(producersSnapshot)); } catch {}
      }

      // al_4 Bloodline Vigor — +50 Blood Lotus + 1 banked Selection re-roll.
      if (treeMods.bloodLotusOnRebirth > 0) {
        addBloodLotusBalance(treeMods.bloodLotusOnRebirth);
      }
      if (treeMods.bankedRerollOnRebirth > 0) {
        try {
          const cur = Number(localStorage.getItem('mai_banked_rerolls') ?? 0);
          localStorage.setItem('mai_banked_rerolls', String(cur + treeMods.bankedRerollOnRebirth));
        } catch {}
      }

      // al_k Living Memory — set a 1-hour ×2 cultivation buff that the
      // cultivation tick reads via the existing ad-boost code path.
      if (treeMods.cultBuffOnRebirthSec > 0) {
        try {
          localStorage.setItem('mai_rebirth_cult_buff_until',
            String(Date.now() + treeMods.cultBuffOnRebirthSec * 1000));
        } catch {}
      }

      window.location.reload();
    }, 50);
  }, [karma, cultivation.realmIndex, tree.modifiers]);

  const goBack = () => {
    navigate('worlds', {
      expandWorldId: screenParam?.worldId ?? null,
      activeTab:     screenParam?.fromTab  ?? null,
    });
  };

  const reincarnationUnlocked = karma.unlocked;

  const screens = {
    // Under !FEATURES.laws the SelectionModal is suppressed, so we also drop
    // the Rewards chip on HomeScreen (HomeScreen already null-checks selections).
    home:   <HomeScreen cultivation={cultivation} inventory={inventory} onOpenPills={() => openModal('pills')} totalOwnedPills={totalOwnedPills} selections={FEATURES.laws ? selections : null} onOpenSelections={() => setSelectionModalOpen(true)} onNavigate={navigate} crystal={crystal} isCrystalUnlocked={featureFlags.isUnlocked('qi_crystal')} dailyBonus={dailyBonus} onOpenDailyBonus={() => setActiveModal('daily')} lastIdleAssignment={autoFarm.lastIdleAssignment} openCrystal={screenParam?.openCrystal ?? false} activeSparks={qiSparks.activeSparks} crystalReservoirRef={cultivation.crystalReservoirRef} crystalClickCapMinRef={cultivation.sparkCrystalClickCapMinRef} collectCrystalReservoir={cultivation.collectCrystalReservoir} />,
    // Combat-adjacent screens are mounted only when FEATURES.combat is true.
    // Otherwise they're null and `navigate` rewrites any attempt to land on
    // them to `home` (see the SCREEN_FLAGS guard above).
    worlds: isScreenAllowed('worlds')
      ? <WorldsScreen cultivation={cultivation} onNavigate={navigate} expandWorldId={screenParam?.expandWorldId ?? null} activeTab={screenParam?.activeTab ?? null} clearedRegions={clearedRegions} idleAssignment={idleAssignment} lastIdleAssignment={autoFarm.lastIdleAssignment} onSetIdle={(act, w, r) => autoFarm.setIdleActivity(act, w, r, !!tree.modifiers.dualAutoFarm)} pendingGains={autoFarm.pendingGains} hasPendingGains={autoFarm.hasPendingGains} onCollectGains={(applyFn) => autoFarm.collectGains(applyFn)} inventory={inventory} techniques={techniques} getFullStats={getFullStats} />
      : null,
    // Sub-screens launched from the Worlds hub
    'combat-arena': isScreenAllowed('combat-arena')
      ? <CombatScreen
          cultivation={cultivation}
          techniques={techniques}
          combat={combat}
          inventory={inventory}
          artefacts={artefacts}
          region={screenParam?.region ?? null}
          onBack={goBack}
          getFullStats={getFullStats}
          onRegionCleared={clearRegion}
        />
      : null,
    character:  isScreenAllowed('character')
      ? <CharacterScreen cultivation={cultivation} techniques={techniques} artefacts={artefacts} pills={pills} tree={tree} />
      : null,
    collection: isScreenAllowed('collection')
      ? <CollectionScreen inventory={inventory} artefacts={artefacts} techniques={techniques} cultivation={cultivation} />
      : null,
    production: isScreenAllowed('production')
      ? <ProductionScreen inventory={inventory} pills={pills} tree={tree} />
      : null,
    // The qi-investment shop — main loop of v1, always visible.
    cultivation: <CultivationScreen cultivation={cultivation} producers={producers} upgrades={upgrades} crystal={crystal} qiSparks={qiSparks} initialTab={typeof screenParam === 'string' ? screenParam : null} legendaryPoolInfo={legendaryPoolInfo} />,
    settings:   null,
    reincarnation: <EternalTreeScreen
                     karma={karma.karma}
                     earnedTotal={karma.earnedTotal}
                     tree={tree}
                     lives={karma.lives}
                     highestReached={karma.highestReached}
                     peakKarmaTotal={karma.peakKarmaTotal}
                     realmIndex={cultivation.realmIndex}
                     onReincarnate={handleReincarnate}
                     onClose={() => navigate('home')}
                   />,
  };

  const BASE = import.meta.env.BASE_URL;

  return (
    <div className="app" style={{ '--screen-bg-url': `url(${BASE}backgrounds/ui_screens.png)` }}>
      {currentScreen !== 'home' && (
        <>
          <div
            className="app-bg"
            style={{ '--app-bg-url': `url(${BASE}backgrounds/default_bg.png)` }}
          />
          <div className="app-vignette" />
        </>
      )}
      <TopBar
        bloodLotusBalance={selections.bloodLotusBalance}
        onOpenShop={() => openModal('shop')}
        onOpenJourney={() => openModal('journey')}
        onOpenAchievements={() => openModal('achievements', () => setHasNewAch(false))}
        onOpenSettings={() => openModal('settings')}
        hasNewAchievement={hasNewAch}
        activeModal={activeModal}
        onOpenReincarnation={() => navigate('reincarnation')}
        reincarnationUnlocked={reincarnationUnlocked}
        onOpenCrystal={() => navigate('home', { openCrystal: Date.now() })}
        crystalUnlocked={featureFlags.isUnlocked('qi_crystal')}
        qiRef={cultivation.qiRef}
        karma={karma.karma}
      />
      <NavBar
        currentScreen={currentScreen}
        onNavigate={(screen) => navigate(screen)}
        badges={{ ...notifications.badges, home: FEATURES.laws && selections.pendingCount > 0, worlds: notifications.badges.worlds || autoFarm.hasPendingGains }}
        isUnlocked={featureFlags.isUnlocked}
        isHidden={featureFlags.isHidden}
        getHint={featureFlags.getHint}
        getDesc={featureFlags.getDesc}
      />
      <main className={`screen-container${(currentScreen === 'home' || currentScreen === 'reincarnation') ? ' sc-fullbleed' : ''}`}>
        {/* Safety net: if currentScreen happens to land on a flag-null entry
            (e.g. mid-render after a flag flip) render the home fallback. */}
        {screens[currentScreen] ?? screens.home}
      </main>
      <ToastStack
        toasts={notifications.toastQueue}
        onDismiss={notifications.dismissToast}
        onNavigate={navigate}
      />
      {FEATURES.laws && selectionModalOpen && selections.pending[0] && currentScreen === 'home' &&
       !(cultivation.majorBreakthrough && selections.pending[0]?.kind === 'law') && (
        <SelectionModal
          selection={selections.pending[0]}
          bloodLotusBalance={selections.bloodLotusBalance}
          onPickLaw={selections.pickLaw}
          onSkipLaw={selections.skipLaw}
          onRerollLawOne={selections.rerollLawOne}
          ownedLaws={cultivation.ownedLaws}
          activeLawId={cultivation.activeLaw?.id ?? null}
          onDismantleLaw={(lawId) => {
            const r = cultivation.dismantleLaw(lawId);
            if (r) inventory.addItem(mineralForRarity(r), 1);
          }}
          onClose={() => {
            setSelectionModalOpen(false);
            if (currentEvent?.kind === 'selection-cards') dismiss(currentEvent.id);
          }}
        />
      )}
      {/* Qi Sparks pick-1-of-2 modal — fires on every layer breakthrough.
          Suppressed while higher-priority overlays are showing so it doesn't
          stack with breakthrough banners or law offers. */}
      {qiSparks.pendingOffer
        && !cultivation.majorBreakthrough
        && currentEvent?.kind !== 'breakthrough'
        && currentEvent?.kind !== 'crystal-evolution'
        && currentEvent?.kind !== 'offline-earnings'
        && !(selectionModalOpen && selections.pending[0]?.kind === 'law')
        && (
        <QiSparkChoiceModal
          offer={qiSparks.pendingOffer}
          bloodLotusBalance={qiSparks.bloodLotusBalance}
          nextRerollCostFor={qiSparks.nextRerollCost}
          onChoose={qiSparks.choose}
          onRerollCard={qiSparks.rerollCard}
          onSkip={qiSparks.skip}
          pityCounter={qiSparks.pityCounter}
          pityThreshold={qiSparks.pityThreshold}
          legendaryChance={qiSparks.legendaryChance}
          legendaryPoolInfo={legendaryPoolInfo}
        />
      )}
      {activeModal === 'settings'     && <SettingsScreen onClose={() => setActiveModal(null)} />}
      {activeModal === 'shop'         && <BloodLotusShopModal  onClose={() => setActiveModal(null)} onBalanceChange={null} />}
      {activeModal === 'journey'      && <JourneyModal   realmIndex={cultivation.realmIndex} onClose={() => setActiveModal(null)} />}
      {activeModal === 'achievements' && achievements && <AchievementsModal achievements={achievements} onClose={() => setActiveModal(null)} />}
      {activeModal === 'pills'        && pills        && <PillDrawer open pills={pills} onClose={() => setActiveModal(null)} />}
      {(activeModal === 'daily' || currentEvent?.kind === 'daily-bonus') && (
        <DailyBonusModal
          streak={dailyBonus.streak}
          todayReward={dailyBonus.todayReward}
          isAvailable={dailyBonus.isAvailable}
          onCollect={() => dailyBonus.collect()}
          onClose={() => {
            setActiveModal(null);
            if (currentEvent?.kind === 'daily-bonus') dismiss(currentEvent.id);
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <EventQueueProvider>
      <AppInner />
    </EventQueueProvider>
  );
}

export default App;
