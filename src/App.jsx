import { useState, useEffect, useRef, useCallback } from 'react';
import NavBar from './components/NavBar';
import HomeScreen from './screens/HomeScreen';
import { initAds } from './ads/adService';
import TrainingScreen from './screens/TrainingScreen';
import CombatScreen from './screens/CombatScreen';
import WorldsScreen from './screens/WorldsScreen';
import GatheringScreen from './screens/GatheringScreen';
import MiningScreen from './screens/MiningScreen';
import ShopScreen from './screens/ShopScreen';
import CharacterScreen from './screens/CharacterScreen';
import CollectionScreen from './screens/CollectionScreen';
import ProductionScreen from './screens/ProductionScreen';
import SettingsScreen from './screens/SettingsScreen';
import useCultivation from './hooks/useCultivation';
import useInventory   from './hooks/useInventory';
import useTechniques  from './hooks/useTechniques';
import useCombat      from './hooks/useCombat';
import useArtefacts   from './hooks/useArtefacts';
import usePills       from './hooks/usePills';
import useAutoFarm    from './hooks/useAutoFarm';
import WORLDS         from './data/worlds';
import { computeAllStats, mergeModifiers } from './data/stats';
import { evaluateLawUniques, buildContext } from './systems/lawEngine';
import { initDebug } from './debug/gameDebug';
import { preloadImages, PLAYER_SPRITE_SRCS } from './utils/preload';
import useNotifications from './hooks/useNotifications';
import useSelections from './hooks/useSelections';
import useClearedRegions from './hooks/useClearedRegions';
import useFeatureFlags from './hooks/useFeatureFlags';
import ToastStack from './components/ToastStack';
import SelectionModal from './components/SelectionModal';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParam,   setScreenParam]   = useState(null);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);

  useEffect(() => { initAds(); }, []);
  useEffect(() => { preloadImages(PLAYER_SPRITE_SRCS); }, []);

  const cultivation     = useCultivation();
  const inventory       = useInventory();
  const techniques      = useTechniques();
  const combat          = useCombat();
  const artefacts       = useArtefacts();
  const pills           = usePills();
  const selections      = useSelections({ cultivation });
  const { clearedRegions, clearRegion } = useClearedRegions();

  // Keep pill qi multiplier in sync with cultivation game loop
  const pillQiMult = pills.getQiMult();
  useEffect(() => {
    cultivation.pillQiMultRef.current = pillQiMult;
  }, [pillQiMult, cultivation.pillQiMultRef]);

  // Open selection modal on level-up only when already on home screen.
  // currentScreen is intentionally excluded from deps — we want this to fire
  // only when pendingCount increases, not when the player navigates to home.
  useEffect(() => {
    if (selections.pendingCount > 0 && currentScreen === 'home') {
      setSelectionModalOpen(true);
    }
  }, [selections.pendingCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selection qi speed mult in sync with cultivation game loop
  useEffect(() => {
    if (!cultivation.selectionQiMultRef) return;
    cultivation.selectionQiMultRef.current = selections.getQiSpeedMult();
  }, [selections, cultivation.selectionQiMultRef]);


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

    const mergedMods = mergeModifiers(
      artefacts?.getStatModifiers?.(),
      pills?.getStatModifiers?.(),
      lawBundle.statMods,
      selections?.getStatModifiers?.(),
    );

    const bundle = computeAllStats(qi, law, realmIndex, mergedMods);
    return {
      // Combat-shaped (existing fields)
      essence:    bundle.primary.essence,
      soul:       bundle.primary.soul,
      body:       bundle.primary.body,
      lawElement: law?.element ?? 'Normal',
      // Activity stats — needed by autoFarm + Gathering/Mining screens
      harvestSpeed: bundle.activity.harvestSpeed,
      harvestLuck:  bundle.activity.harvestLuck,
      miningSpeed:  bundle.activity.miningSpeed,
      miningLuck:   bundle.activity.miningLuck,
      focusMult:    bundle.activity.focusMult,
      // Combat-only
      exploitChance: bundle.combat.exploitChance,
      exploitMult:   bundle.combat.exploitMult,
    };
  }, [cultivation, artefacts, pills, selections]);

  // Mirror focusMult into a ref the cultivation tick reads directly so
  // boost speed reflects equipment / pill modifiers.
  useEffect(() => {
    if (!cultivation.focusMultRef) return;
    const id = setInterval(() => {
      cultivation.focusMultRef.current = getFullStats().focusMult;
    }, 1000);
    return () => clearInterval(id);
  }, [cultivation.focusMultRef, getFullStats]);

  // Auto-farm — stat getter reads live refs so the hook never triggers re-renders
  const autoFarm = useAutoFarm({
    worlds: WORLDS,
    getStats: getFullStats,
    getEquippedTechs: () => techniques.equippedTechniques,
  });

  const notifications = useNotifications({ cultivation, inventory });

  const featureFlags = useFeatureFlags({
    cultivation,
    clearedRegions,
    inventory,
    onUnlock: (featureId, msg) => notifications.addToast({
      message: msg,
      targetScreen: featureId === 'combat' || featureId === 'gathering' || featureId === 'mining'
        ? 'combat' : featureId,
    }),
  });

  // Keep a live ref to all hooks so debug commands always see fresh state.
  const hooksRef = useRef({});
  hooksRef.current = { cultivation, inventory, techniques, combat, artefacts, pills, autoFarm };
  useEffect(() => { initDebug(hooksRef); }, []);

  // Navigate to a screen, optionally carrying a parameter (e.g. region data).
  const navigate = (screen, param = null) => {
    setCurrentScreen(screen);
    setScreenParam(param);
    setSelectionModalOpen(false);
    notifications.clearBadge(screen);
  };

  const goBack = () => navigate('combat', {
    expandWorldId: screenParam?.worldId ?? null,
    activeTab:     screenParam?.fromTab  ?? null,
  });

  const screens = {
    home:      <HomeScreen cultivation={cultivation} pills={pills} inventory={inventory} selections={selections} onOpenSelections={() => setSelectionModalOpen(true)} />,
    training:  <TrainingScreen />,
    // Worlds hub — the NavBar "Worlds" tab always lands here
    combat:    <WorldsScreen cultivation={cultivation} onNavigate={navigate} expandWorldId={screenParam?.expandWorldId ?? null} activeTab={screenParam?.activeTab ?? null} clearedRegions={clearedRegions} />,
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
    gathering: screenParam?.region
                 ? <GatheringScreen region={screenParam.region} inventory={inventory} onBack={goBack} getFullStats={getFullStats} />
                 : null,
    mining:    screenParam?.region
                 ? <MiningScreen    region={screenParam.region} inventory={inventory} onBack={goBack} getFullStats={getFullStats} />
                 : null,
    character:  <CharacterScreen cultivation={cultivation} techniques={techniques} artefacts={artefacts} selections={selections} />,
    shop:       <ShopScreen />,
    collection: <CollectionScreen inventory={inventory} artefacts={artefacts} techniques={techniques} cultivation={cultivation} />,
    production: <ProductionScreen inventory={inventory} artefacts={artefacts} techniques={techniques} cultivation={cultivation} pills={pills} />,
    settings:   <SettingsScreen />,
  };

  return (
    <div className="app">
      <NavBar
        currentScreen={currentScreen}
        onNavigate={(screen) => navigate(screen)}
        badges={{ ...notifications.badges, home: selections.pendingCount > 0 }}
        isUnlocked={featureFlags.isUnlocked}
        getHint={featureFlags.getHint}
      />
      <main className="screen-container">
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
          jadeBalance={selections.jadeBalance}
          onPick={selections.pickOption}
          onReroll={selections.rerollOptions}
          onClose={() => setSelectionModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
