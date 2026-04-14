import { useState, useEffect, useRef } from 'react';
import NavBar from './components/NavBar';
import HomeScreen from './screens/HomeScreen';
import { initAds } from './ads/adService';
import TrainingScreen from './screens/TrainingScreen';
import CombatScreen from './screens/CombatScreen';
import WorldsScreen from './screens/WorldsScreen';
import GatheringScreen from './screens/GatheringScreen';
import MiningScreen from './screens/MiningScreen';
import ShopScreen from './screens/ShopScreen';
import InventoryScreen from './screens/InventoryScreen';
import ProductionScreen from './screens/ProductionScreen';
import BuildScreen from './screens/BuildScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';
import useCultivation from './hooks/useCultivation';
import useInventory   from './hooks/useInventory';
import useTechniques  from './hooks/useTechniques';
import useCombat      from './hooks/useCombat';
import useArtefacts   from './hooks/useArtefacts';
import usePills       from './hooks/usePills';
import useAutoFarm    from './hooks/useAutoFarm';
import WORLDS         from './data/worlds';
import { initDebug } from './debug/gameDebug';
import { preloadImages, PLAYER_SPRITE_SRCS } from './utils/preload';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParam,   setScreenParam]   = useState(null);

  useEffect(() => { initAds(); }, []);
  useEffect(() => { preloadImages(PLAYER_SPRITE_SRCS); }, []);

  const cultivation = useCultivation();
  const inventory   = useInventory();
  const techniques  = useTechniques();
  const combat      = useCombat();
  const artefacts   = useArtefacts();
  const pills       = usePills();

  // Keep pill qi multiplier in sync with cultivation game loop
  const pillQiMult = pills.getQiMult();
  useEffect(() => {
    cultivation.pillQiMultRef.current = pillQiMult;
  }, [pillQiMult, cultivation.pillQiMultRef]);

  // Auto-farm — stat getters read live refs so the hook never triggers re-renders
  const autoFarm = useAutoFarm({
    worlds: WORLDS,
    getStats: () => {
      const qi  = cultivation.qiRef.current;
      const law = cultivation.activeLaw;
      return {
        essence:    Math.floor(qi * (law.essenceMult ?? 0.34)),
        soul:       Math.floor(qi * (law.soulMult    ?? 0.33)),
        body:       Math.floor(qi * (law.bodyMult    ?? 0.33)),
        lawElement: law.element ?? 'Normal',
      };
    },
    getEquippedTechs: () => techniques.equippedTechniques,
  });

  // Keep a live ref to all hooks so debug commands always see fresh state.
  const hooksRef = useRef({});
  hooksRef.current = { cultivation, inventory, techniques, combat, artefacts, pills, autoFarm };
  useEffect(() => { initDebug(hooksRef); }, []);

  // Navigate to a screen, optionally carrying a parameter (e.g. region data).
  const navigate = (screen, param = null) => {
    setCurrentScreen(screen);
    setScreenParam(param);
  };

  const goBack = () => navigate('combat');

  const screens = {
    home:      <HomeScreen cultivation={cultivation} pills={pills} inventory={inventory} />,
    training:  <TrainingScreen />,
    // Worlds hub — the NavBar "Worlds" tab always lands here
    combat:    <WorldsScreen cultivation={cultivation} onNavigate={navigate} />,
    // Sub-screens launched from the Worlds hub
    'combat-arena': <CombatScreen
                      cultivation={cultivation}
                      techniques={techniques}
                      combat={combat}
                      inventory={inventory}
                      region={screenParam?.region ?? null}
                      onBack={goBack}
                    />,
    gathering: screenParam?.region
                 ? <GatheringScreen region={screenParam.region} inventory={inventory} onBack={goBack} />
                 : null,
    mining:    screenParam?.region
                 ? <MiningScreen    region={screenParam.region} inventory={inventory} onBack={goBack} />
                 : null,
    build:     <BuildScreen  cultivation={cultivation} techniques={techniques} artefacts={artefacts} />,
    shop:      <ShopScreen />,
    inventory:  <InventoryScreen  inventory={inventory} artefacts={artefacts} techniques={techniques} cultivation={cultivation} />,
    production: <ProductionScreen inventory={inventory} artefacts={artefacts} techniques={techniques} cultivation={cultivation} pills={pills} />,
    stats:     <StatsScreen cultivation={cultivation} artefacts={artefacts} />,
    settings:  <SettingsScreen />,
  };

  return (
    <div className="app">
      <NavBar
        currentScreen={currentScreen}
        onNavigate={(screen) => navigate(screen)}
      />
      <main className="screen-container">
        {screens[currentScreen]}
      </main>
    </div>
  );
}

export default App;
