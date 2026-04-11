import { useState } from 'react';
import NavBar from './components/NavBar';
import HomeScreen from './screens/HomeScreen';
import TrainingScreen from './screens/TrainingScreen';
import CombatScreen from './screens/CombatScreen';
import ShopScreen from './screens/ShopScreen';
import InventoryScreen from './screens/InventoryScreen';
import BuildScreen from './screens/BuildScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';
import useCultivation from './hooks/useCultivation';
import useInventory   from './hooks/useInventory';
import useTechniques  from './hooks/useTechniques';
import useCombat      from './hooks/useCombat';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const cultivation = useCultivation();
  const inventory   = useInventory();
  const techniques  = useTechniques();
  const combat      = useCombat();

  const screens = {
    home: <HomeScreen cultivation={cultivation} />,
    training: <TrainingScreen />,
    combat: <CombatScreen cultivation={cultivation} techniques={techniques} combat={combat} />,
    build:  <BuildScreen  cultivation={cultivation} techniques={techniques} />,
    shop: <ShopScreen />,
    inventory: <InventoryScreen inventory={inventory} />,
    stats:    <StatsScreen cultivation={cultivation} />,
    settings: <SettingsScreen />,
  };

  return (
    <div className="app">
      <NavBar currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      <main className="screen-container">
        {screens[currentScreen]}
      </main>
    </div>
  );
}

export default App;
