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
import CombatScreen from './screens/CombatScreen';
import WorldsScreen from './screens/WorldsScreen';
import CharacterScreen from './screens/CharacterScreen';
import CollectionScreen from './screens/CollectionScreen';
import ProductionScreen from './screens/ProductionScreen';
import SettingsScreen from './screens/SettingsScreen';
import useReincarnationKarma from './hooks/useReincarnationKarma';
import useReincarnationTree  from './hooks/useReincarnationTree';
import { wipeReincarnation }  from './systems/save';
import useCultivation from './hooks/useCultivation';
import useInventory   from './hooks/useInventory';
import useTechniques  from './hooks/useTechniques';
import useCombat      from './hooks/useCombat';
import useArtefacts   from './hooks/useArtefacts';
import usePills       from './hooks/usePills';
import useQiCrystal  from './hooks/useQiCrystal';
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
import ToastStack from './components/ToastStack';
import SelectionModal from './components/SelectionModal';
import QiSparkChoiceModal from './components/QiSparkChoiceModal';
import { AudioManager } from './audio';
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
      if (prev === key) { AudioManager.playSfx('ui_close'); return null; }
      AudioManager.playSfx('ui_open');
      if (sideEffect) sideEffect();
      return key;
    });
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
  useEffect(() => { preloadImages(PLAYER_SPRITE_SRCS); }, []);
  useEffect(() => { applyGraphics(loadGraphics()); }, []);

  // Apply saved resolution preset on desktop startup
  useEffect(() => {
    if (!window.electronBridge?.setResolution) return;
    const saved = localStorage.getItem('resolution') ?? 'mobile';
    window.electronBridge.setResolution(saved);
  }, []);

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
  const { clearedRegions, clearRegion } = useClearedRegions();
  const selections      = useLawOffers({ cultivation });
  const qiSparks        = useQiSparks({ cultivation });

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
  }, [tree.modifiers, cultivation.treeQiMultRef, cultivation.treeHeavenlyMultRef, cultivation.qiOnRealmFracRef]);

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

  // Mirror Qi Sparks multipliers into cultivation refs each render. Cheap;
  // runs only when activeSparks identity changes (the hook returns the same
  // array reference when no expiry happened).
  useEffect(() => {
    if (cultivation.sparkQiMultRef) {
      cultivation.sparkQiMultRef.current = qiSparks.qiMultRef.current;
    }
    if (cultivation.sparkFocusMultBonusRef) {
      cultivation.sparkFocusMultBonusRef.current = qiSparks.focusMultBonusRef.current;
    }
  }, [qiSparks.activeSparks, cultivation.sparkQiMultRef, cultivation.sparkFocusMultBonusRef, qiSparks.qiMultRef, qiSparks.focusMultBonusRef]);


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
      cultivation.focusMultRef.current = full.focusMult;
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

  const achievements = useAchievements({
    onUnlock: (a) => notifications.addToast({ message: `🏆 Achievement: ${a.title}` }),
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

  // Keep a live ref to all hooks so debug commands always see fresh state.
  const hooksRef = useRef({});
  hooksRef.current = { cultivation, inventory, techniques, combat, artefacts, pills, autoFarm, crystal };
  useEffect(() => { initDebug(hooksRef); }, []);

  // Preload both BGM tracks once on mount so crossfades are instant
  useEffect(() => {
    AudioManager.preloadBgm(['cultivation', 'combat']);
    AudioManager.playBgm('cultivation');
  }, []);

  // BGM: combat screen uses combat track; everything else uses cultivation
  useEffect(() => {
    const track = currentScreen === 'combat-arena' ? 'combat' : 'cultivation';
    AudioManager.playBgm(track);
  }, [currentScreen]);

  // Navigate to a screen, optionally carrying a parameter (e.g. region data).
  const navigate = (screen, param = null) => {
    AudioManager.playSfx('ui_click');
    setCurrentScreen(screen);
    setScreenParam(param);
    setSelectionModalOpen(false);
    notifications.clearBadge(screen);
  };

  const handleReincarnate = useCallback(() => {
    // Safety net — the button is already disabled below Saint, but we
    // refuse here too so any future callsite can't bypass the gate.
    if (cultivation.realmIndex < 24) return;
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

    // Give React a tick to flush the karma state to localStorage before we
    // wipe the rest of the save + hard-reload.
    setTimeout(() => {
      wipeReincarnation();

      // Restore al_2 Echo of Mastery snapshot.
      if (recipeSnapshot != null) {
        try { localStorage.setItem('mai_discovered_pills', recipeSnapshot); } catch {}
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
    AudioManager.playSfx('ui_close');
    navigate('worlds', {
      expandWorldId: screenParam?.worldId ?? null,
      activeTab:     screenParam?.fromTab  ?? null,
    });
  };

  const reincarnationUnlocked = karma.unlocked;

  const screens = {
    home:   <HomeScreen cultivation={cultivation} inventory={inventory} onOpenPills={() => openModal('pills')} totalOwnedPills={totalOwnedPills} selections={selections} onOpenSelections={() => setSelectionModalOpen(true)} onNavigate={navigate} crystal={crystal} isCrystalUnlocked={featureFlags.isUnlocked('qi_crystal')} dailyBonus={dailyBonus} onOpenDailyBonus={() => setActiveModal('daily')} lastIdleAssignment={autoFarm.lastIdleAssignment} openCrystal={screenParam?.openCrystal ?? false} />,
    worlds: <WorldsScreen cultivation={cultivation} onNavigate={navigate} expandWorldId={screenParam?.expandWorldId ?? null} activeTab={screenParam?.activeTab ?? null} clearedRegions={clearedRegions} idleAssignment={idleAssignment} lastIdleAssignment={autoFarm.lastIdleAssignment} onSetIdle={(act, w, r) => autoFarm.setIdleActivity(act, w, r, !!tree.modifiers.dualAutoFarm)} pendingGains={autoFarm.pendingGains} hasPendingGains={autoFarm.hasPendingGains} onCollectGains={(applyFn) => autoFarm.collectGains(applyFn)} inventory={inventory} techniques={techniques} getFullStats={getFullStats} />,
    // Sub-screens launched from the Worlds hub
    'combat-arena': <CombatScreen
                      cultivation={cultivation}
                      techniques={techniques}
                      combat={combat}
                      inventory={inventory}
                      artefacts={artefacts}
                      region={screenParam?.region ?? null}
                      onBack={goBack}
                      getFullStats={getFullStats}
                      onRegionCleared={clearRegion}
                    />,
    character:  <CharacterScreen cultivation={cultivation} techniques={techniques} artefacts={artefacts} pills={pills} tree={tree} />,
    collection: <CollectionScreen inventory={inventory} artefacts={artefacts} techniques={techniques} cultivation={cultivation} />,
    production: <ProductionScreen inventory={inventory} pills={pills} tree={tree} />,
    settings:   null,
    reincarnation: <EternalTreeScreen
                     karma={karma.karma}
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
        realmName={cultivation.realmName}
        realmStage={cultivation.realmStage}
      />
      <NavBar
        currentScreen={currentScreen}
        onNavigate={(screen) => navigate(screen)}
        badges={{ ...notifications.badges, home: selections.pendingCount > 0, worlds: notifications.badges.worlds || autoFarm.hasPendingGains }}
        isUnlocked={featureFlags.isUnlocked}
        getHint={featureFlags.getHint}
        getDesc={featureFlags.getDesc}
      />
      <main className={`screen-container${(currentScreen === 'home' || currentScreen === 'reincarnation') ? ' sc-fullbleed' : ''}`}>
        {screens[currentScreen]}
      </main>
      <ToastStack
        toasts={notifications.toastQueue}
        onDismiss={notifications.dismissToast}
        onNavigate={navigate}
      />
      {selectionModalOpen && selections.pending[0] && currentScreen === 'home' &&
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
          nextRerollCost={qiSparks.nextRerollCost()}
          onChoose={qiSparks.choose}
          onReroll={qiSparks.reroll}
          onSkip={qiSparks.skip}
        />
      )}
      {activeModal === 'settings'     && <SettingsScreen onClose={() => { AudioManager.playSfx('ui_close'); setActiveModal(null); }} />}
      {activeModal === 'shop'         && <BloodLotusShopModal  onClose={() => { AudioManager.playSfx('ui_close'); setActiveModal(null); }} onBalanceChange={null} />}
      {activeModal === 'journey'      && <JourneyModal   realmIndex={cultivation.realmIndex} onClose={() => { AudioManager.playSfx('ui_close'); setActiveModal(null); }} />}
      {activeModal === 'achievements' && achievements && <AchievementsModal achievements={achievements} onClose={() => { AudioManager.playSfx('ui_close'); setActiveModal(null); }} />}
      {activeModal === 'pills'        && pills        && <PillDrawer open pills={pills} onClose={() => { AudioManager.playSfx('ui_close'); setActiveModal(null); }} />}
      {(activeModal === 'daily' || currentEvent?.kind === 'daily-bonus') && (
        <DailyBonusModal
          streak={dailyBonus.streak}
          todayReward={dailyBonus.todayReward}
          isAvailable={dailyBonus.isAvailable}
          onCollect={() => { AudioManager.playSfx('ui_confirm'); dailyBonus.collect(); }}
          onClose={() => {
            AudioManager.playSfx('ui_close');
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
