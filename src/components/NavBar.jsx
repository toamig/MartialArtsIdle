// 16x16 pixel art SVG icons for nav tabs
function PixelIcon({ paths, color = 'currentColor' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill={color} style={{ imageRendering: 'pixelated' }}>
      {paths.map((d, i) => <rect key={i} x={d[0]} y={d[1]} width={d[2] || 1} height={d[3] || 1} />)}
    </svg>
  );
}

// Home icon (simple house)
const homePixels = [
  [7,1],[8,1],[6,2],[9,2],[5,3],[10,3],[4,4],[11,4],[3,5],[12,5],
  [2,6],[13,6],[3,7,10,1],[3,8,1,7],[12,8,1,7],[4,8,8,1],
  [4,15,8,1],[4,9,1,6],[11,9,1,6],[7,10,2,1],[7,11,2,4],
];

// Training icon (crossed swords)
const trainPixels = [
  [3,2],[12,2],[4,3],[11,3],[5,4],[10,4],[6,5],[9,5],[7,6],[8,6],
  [7,7],[8,7],[6,8],[9,8],[5,9],[10,9],[4,10],[11,10],[3,11],[12,11],
  [2,12],[13,12],[3,13],[12,13],[7,3,2,1],[7,4,2,1],
];

// Combat icon (fist)
const combatPixels = [
  [5,3,6,1],[4,4,1,3],[5,4,2,1],[8,4,3,1],[5,5,1,2],[7,5,1,2],
  [9,5,2,1],[10,5,1,2],[11,6,1,3],[4,7,7,1],[3,8,1,5],[4,8,1,1],
  [11,8,1,1],[4,9,8,1],[4,12,1,1],[11,10,1,3],[4,13,8,1],
  [12,9,1,4],
];

// Shop icon (bag/pouch)
const shopPixels = [
  [6,2,4,1],[5,3,1,2],[10,3,1,2],[6,3,1,1],[9,3,1,1],
  [4,5,8,1],[3,6,1,8],[12,6,1,8],[4,6,8,1],[4,14,8,1],
  [7,7,2,1],[6,8,1,2],[9,8,1,2],[7,10,2,1],
];

// Inventory icon (backpack/chest)
const itemsPixels = [
  [4,2,8,1],[3,3,1,11],[12,3,1,11],[4,3,8,1],[4,14,8,1],
  [6,5,4,1],[5,6,1,3],[10,6,1,3],[6,9,4,1],[7,7,2,1],
];

// Stats icon (scroll/chart)
const statsPixels = [
  [4,2,8,1],[3,3,1,11],[12,3,1,11],[4,3,8,1],[4,14,8,1],
  [5,5,6,1],[5,7,4,1],[5,9,5,1],[5,11,3,1],
];

const ICONS = {
  home: homePixels,
  training: trainPixels,
  combat: combatPixels,
  shop: shopPixels,
  inventory: itemsPixels,
  stats: statsPixels,
};

const SCREENS = [
  { id: 'home', label: 'Home' },
  { id: 'training', label: 'Train' },
  { id: 'combat', label: 'Combat' },
  { id: 'shop', label: 'Shop' },
  { id: 'inventory', label: 'Items' },
  { id: 'stats', label: 'Stats' },
];

function NavBar({ currentScreen, onNavigate }) {
  return (
    <nav className="navbar">
      {SCREENS.map((screen) => (
        <button
          key={screen.id}
          className={`nav-btn ${currentScreen === screen.id ? 'active' : ''}`}
          onClick={() => onNavigate(screen.id)}
        >
          <span className="nav-icon">
            <PixelIcon paths={ICONS[screen.id]} />
          </span>
          <span className="nav-label">{screen.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default NavBar;
