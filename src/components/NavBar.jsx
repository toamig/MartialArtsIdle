function NavBar({ currentScreen, onNavigate }) {
  const screens = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'training', label: 'Train', icon: '⚔️' },
    { id: 'combat', label: 'Combat', icon: '🥊' },
    { id: 'shop', label: 'Shop', icon: '🛒' },
    { id: 'inventory', label: 'Items', icon: '🎒' },
    { id: 'stats', label: 'Stats', icon: '📊' },
  ];

  return (
    <nav className="navbar">
      {screens.map((screen) => (
        <button
          key={screen.id}
          className={`nav-btn ${currentScreen === screen.id ? 'active' : ''}`}
          onClick={() => onNavigate(screen.id)}
        >
          <span className="nav-icon">{screen.icon}</span>
          <span className="nav-label">{screen.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default NavBar;
