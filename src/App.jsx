import { useState } from 'react';
import NavBar from './components/NavBar';
import HomeScreen from './screens/HomeScreen';
import TrainingScreen from './screens/TrainingScreen';
import CombatScreen from './screens/CombatScreen';
import ShopScreen from './screens/ShopScreen';
import InventoryScreen from './screens/InventoryScreen';
import StatsScreen from './screens/StatsScreen';
import useCultivation from './hooks/useCultivation';
import useInventory from './hooks/useInventory';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const cultivation = useCultivation();
  const inventory = useInventory();

  const screens = {
    home: <HomeScreen cultivation={cultivation} />,
    training: <TrainingScreen />,
    combat: <CombatScreen />,
    shop: <ShopScreen />,
    inventory: <InventoryScreen inventory={inventory} />,
    stats: <StatsScreen />,
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
