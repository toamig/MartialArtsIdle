import { useState, useEffect } from 'react';
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
import BuildScreen from './screens/BuildScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';
import useCultivation from './hooks/useCultivation';
import useInventory   from './hooks/useInventory';
import useTechniques  from './hooks/useTechniques';
import useCombat      from './hooks/useCombat';
import useArtefacts   from './hooks/useArtefacts';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParam,   setScreenParam]   = useState(null);

  useEffect(() => { initAds(); }, []);

  const cultivation = useCultivation();
  const inventory   = useInventory();
  const techniques  = useTechniques();
  const combat      = useCombat();
  const artefacts   = useArtefacts();

  // Navigate to a screen, optionally carrying a parameter (e.g. region data).
  const navigate = (screen, param = null) => {
    setCurrentScreen(screen);
    setScreenParam(param);
  };

  const goBack = () => navigate('combat');

  const screens = {
    home:      <HomeScreen cultivation={cultivation} />,
    training:  <TrainingScreen />,
    // Worlds hub — the NavBar "Worlds" tab always lands here
    combat:    <WorldsScreen cultivation={cultivation} onNavigate={navigate} />,
    // Sub-screens launched from the Worlds hub
    'combat-arena': <CombatScreen
                      cultivation={cultivation}
                      techniques={techniques}
                      combat={combat}
                      region={screenParam?.region ?? null}
                      onBack={goBack}
                    />,
    gathering: screenParam?.region
                 ? <GatheringScreen region={screenParam.region} onBack={goBack} />
                 : null,
    mining:    screenParam?.region
                 ? <MiningScreen    region={screenParam.region} onBack={goBack} />
                 : null,
    build:     <BuildScreen  cultivation={cultivation} techniques={techniques} artefacts={artefacts} />,
    shop:      <ShopScreen />,
    inventory: <InventoryScreen inventory={inventory} />,
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
