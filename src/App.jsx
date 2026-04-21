import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import NavBar from './components/NavBar';
import TopBar from './components/TopBar';
import HomeScreen from './screens/HomeScreen';
import BloodLotusShopModal from './components/BloodLotusShopModal';
import { addBloodLotus as addBloodLotusBalance } from './systems/bloodLotus';
import AchievementsModal from './components/AchievementsModal';
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
import { initDebug } from './debug/gameDebug';
import { preloadImages, PLAYER_SPRITE_SRCS } from './utils/preload';
import { loadGraphics, applyGraphics } from './systems/graphics';
import useNotifications from './hooks/useNotifications';
import useSelections from './hooks/useSelections';
import useClearedRegions from './hooks/useClearedRegions';
import useFeatureFlags from './hooks/useFeatureFlags';
import useAchievements from './hooks/useAchievements';
import ToastStack from './components/ToastStack';
import SelectionModal from './components/SelectionModal';
import { AudioManager } from './audio';
import './App.css';

function App() {
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

  // Auto-open daily bonus popup on login if uncollected
  useEffect(() => {
    if (dailyBonus.isAvailable) setActiveModal('daily');
  }, []);

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
  const crystal         = useQiCrystal({ getQuantity: inventory.getQuantity, removeItem: inventory.removeItem });
  const { clearedRegions, clearRegion } = useClearedRegions();
  const selections      = useSelections({ cultivation, optionCount: tree.modifiers.selectionOptionCount });

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

  // Auto-open selection modal only when pendingCount increases mid-session
  // (i.e. a real level-up just happened). Skip on load so players aren't
  // greeted by the modal immediately — the notification badge is enough.
  const prevPendingRef = useRef(null);
  useEffect(() => {
    const prev = prevPendingRef.current;
    prevPendingRef.current = selections.pendingCount;
    if (prev === null) return; // first render — treat as load, don't open
    if (selections.pendingCount > prev && currentScreen === 'home') {
      setSelectionModalOpen(true);
    }
  }, [selections.pendingCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selection qi speed mult in sync with cultivation game loop
  useEffect(() => {
    if (!cultivation.selectionQiMultRef) return;
    cultivation.selectionQiMultRef.current = selections.getQiSpeedMult();
  }, [selections, cultivation.selectionQiMultRef]);

  // Keep QI crystal bonus in sync with cultivation game loop.
  useEffect(() => {
    if (!cultivation.crystalQiBonusRef) return;
    cultivation.crystalQiBonusRef.current = crystal.crystalQiBonus;
  }, [crystal.crystalQiBonus, cultivation.crystalQiBonusRef]);


  // ── Centralised stat getter ─────────────────────────────────────────────
  // Builds the FULL computeAllStats bundle including modifier contributions
  // from artefacts, pills, and law uniques. Used by autoFarm (gather/mine
  // speed + luck), combat (exploit chance/mult), and cultivation (focus mult).
  // Called per-tick from autoFarm and per-fight from CombatScreen — kept
  // pure / read-only so it never triggers React renders.
  const getFullStats = useCallback(() => {
    const qi         = cultivation.qiRef.current;
    const law        = cultivation.activeLaw;
    const realmIndex = cultivation.indexRef.current;

    const lawCtx    = buildContext({
      inCombat: false,
      realmIndex,
      lawElement: law?.element,
      isAtPeak: realmIndex >= 46,
    });
    const lawBundle = evaluateLawUniques(law, lawCtx);

    // hw_4 Soul Crucible — multiply every pill-derived mod value by 1.25.
    // Multiplies the raw flat / increased / more values themselves so the
    // scaling shows up as a simple post-roll boost on the existing pill mods.
    const pillMult = tree?.modifiers?.pillEffectMult ?? 1;
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
    const scaledArtefactMods = scaleArtefactBundle(artefacts?.getStatModifiers?.() ?? {});
    // Collapse artefact-only qi_speed mods into a single multiplier fed to
    // the cultivation tick. Law-unique qi_speed is handled inside cultivation
    // directly, so it is NOT included here (double-count guard).
    const artefactQiMods = scaledArtefactMods.qi_speed ?? [];
    const artefactQiMult = artefactQiMods.length > 0
      ? computeStat(1, artefactQiMods)
      : 1;

    // cb_is Inherited Strength — +25% to the active law's typeMults. Mutates
    // a shallow clone so the real law definition isn't touched.
    const typeMultsBonus = tree?.modifiers?.typeMultsBonus ?? 0;
    const lawForCompute = (typeMultsBonus > 0 && law?.typeMults)
      ? { ...law, typeMults: {
          essence: (law.typeMults.essence ?? 0) * (1 + typeMultsBonus),
          body:    (law.typeMults.body    ?? 0) * (1 + typeMultsBonus),
          soul:    (law.typeMults.soul    ?? 0) * (1 + typeMultsBonus),
        } }
      : law;

    const mergedMods = mergeModifiers(
      scaledArtefactMods,
      scaledPillMods,
      lawBundle.statMods,
      selections?.getStatModifiers?.(),
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

    // Per-pool damage flats (each pool stat goes through the same 5-layer
    // pipeline — the result is the additive flat each pool contributes
    // when its share of the law's types resolves in calcDamage).
    const POOL_KEYS = [
      'physical', 'sword', 'fist',
      'fire', 'water', 'earth',
      'spirit', 'void', 'dao',
    ];
    const poolDamage = {};
    for (const k of POOL_KEYS) poolDamage[k] = collapseFlat(`dmg_${k}`);

    return {
      // Combat-shaped (existing fields)
      essence:    bundle.primary.essence,
      soul:       bundle.primary.soul,
      body:       bundle.primary.body,
      lawElement: law?.element ?? 'Normal',
      // Full active law — calcDamage reads law.types to split damage
      // between categories (physical / elemental / psychic). Pass the
      // cb_is-scaled clone so the +25% typeMults bonus reaches combat.
      law: lawForCompute,
      // Flat damage bonuses + pool-specific bonuses + the source-gated
      // multipliers, all consumed by calcDamage and useCombat's basic-attack.
      damageStats: {
        physical:               bundle.combat.physDmg,
        elemental:              bundle.combat.elemDmg,
        psychic:                bundle.combat.psychDmg,
        damage_all:             collapseFlat('damage_all'),
        secret_technique_damage: collapsePct('secret_technique_damage'),
        default_attack_damage:  collapsePct('default_attack_damage'),
        pools:                  poolDamage,
      },
      // Activity stats — needed by autoFarm + Gathering/Mining screens
      harvestSpeed: bundle.activity.harvestSpeed,
      harvestLuck:  bundle.activity.harvestLuck,
      miningSpeed:  bundle.activity.miningSpeed,
      miningLuck:   bundle.activity.miningLuck,
      focusMult:    bundle.activity.focusMult,
      // Combat-only
      exploitChance: bundle.combat.exploitChance,
      exploitMult:   bundle.combat.exploitMult,
      // Defence stats — useCombat picks the one matching the enemy's damage
      // type when computing mitigation.
      defense:          bundle.combat.defense,
      elementalDefense: bundle.combat.elemDef,
      soulToughness:    bundle.combat.soulTough,
      // Scales the attack-count of Defend / Dodge buffs at cast time.
      buffDurationMult: 1 + collapsePct('buff_duration'),
      // Scales magnitude (defMult / dodgeChance) at cast time.
      buffEffectMult:   collapsePct('buff_effect'),
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
    onUnlock: (featureId, msg) => notifications.addToast({
      message: msg,
      targetScreen: featureId === 'worlds' ? 'worlds' : featureId,
    }),
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
    home:   <HomeScreen cultivation={cultivation} pills={pills} inventory={inventory} selections={selections} onOpenSelections={() => setSelectionModalOpen(true)} onNavigate={navigate} crystal={crystal} isCrystalUnlocked={featureFlags.isUnlocked('qi_crystal')} dailyBonus={dailyBonus} onOpenDailyBonus={() => setActiveModal('daily')} lastIdleAssignment={autoFarm.lastIdleAssignment} />,
    worlds: <WorldsScreen cultivation={cultivation} onNavigate={navigate} expandWorldId={screenParam?.expandWorldId ?? null} activeTab={screenParam?.activeTab ?? null} clearedRegions={clearedRegions} idleAssignment={idleAssignment} lastIdleAssignment={autoFarm.lastIdleAssignment} onSetIdle={(act, w, r) => autoFarm.setIdleActivity(act, w, r, !!tree.modifiers.dualAutoFarm)} pendingGains={autoFarm.pendingGains} hasPendingGains={autoFarm.hasPendingGains} onCollectGains={(applyFn) => autoFarm.collectGains(applyFn)} inventory={inventory} techniques={techniques} />,
    // Sub-screens launched from the Worlds hub
    'combat-arena': <CombatScreen
                      cultivation={cultivation}
                      techniques={techniques}
                      combat={combat}
                      inventory={inventory}
                      region={screenParam?.region ?? null}
                      onBack={goBack}
                      getFullStats={getFullStats}
                      onRegionCleared={clearRegion}
                    />,
    character:  <CharacterScreen cultivation={cultivation} techniques={techniques} artefacts={artefacts} selections={selections} pills={pills} />,
    collection: <CollectionScreen inventory={inventory} artefacts={artefacts} techniques={techniques} cultivation={cultivation} />,
    production: <ProductionScreen inventory={inventory} artefacts={artefacts} techniques={techniques} cultivation={cultivation} pills={pills} tree={tree} isUnlocked={featureFlags.isUnlocked} getHint={featureFlags.getHint} getDesc={featureFlags.getDesc} />,
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
        <div
          className="app-bg"
          style={{ '--app-bg-url': `url(${BASE}backgrounds/default_bg.png)` }}
        />
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
      {selectionModalOpen && selections.pending[0] && currentScreen === 'home' && (
        <SelectionModal
          selection={selections.pending[0]}
          bloodLotusBalance={selections.bloodLotusBalance}
          onPick={selections.pickOption}
          onRerollOne={selections.rerollOne}
          onPickLaw={selections.pickLaw}
          onSkipLaw={selections.skipLaw}
          onRerollLaw={selections.rerollLaw}
          ownedLaws={cultivation.ownedLaws}
          activeLawId={cultivation.activeLaw?.id ?? null}
          onDismantleLaw={(lawId) => {
            const r = cultivation.dismantleLaw(lawId);
            if (r) inventory.addItem(mineralForRarity(r), 1);
          }}
          onClose={() => setSelectionModalOpen(false)}
        />
      )}
      {activeModal === 'settings'     && <SettingsScreen onClose={() => { AudioManager.playSfx('ui_close'); setActiveModal(null); }} />}
      {activeModal === 'shop'         && <BloodLotusShopModal  onClose={() => { AudioManager.playSfx('ui_close'); setActiveModal(null); }} onBalanceChange={null} />}
      {activeModal === 'journey'      && <JourneyModal   realmIndex={cultivation.realmIndex} onClose={() => { AudioManager.playSfx('ui_close'); setActiveModal(null); }} />}
      {activeModal === 'achievements' && achievements && <AchievementsModal achievements={achievements} onClose={() => { AudioManager.playSfx('ui_close'); setActiveModal(null); }} />}
      {activeModal === 'daily' && (
        <DailyBonusModal
          streak={dailyBonus.streak}
          todayReward={dailyBonus.todayReward}
          isAvailable={dailyBonus.isAvailable}
          onCollect={() => { AudioManager.playSfx('ui_confirm'); dailyBonus.collect(); }}
          onClose={() => { AudioManager.playSfx('ui_close'); setActiveModal(null); }}
        />
      )}
    </div>
  );
}

export default App;
