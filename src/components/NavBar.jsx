const BASE = import.meta.env.BASE_URL;

const SCREENS = [
  { id: 'home',      label: 'Home'   },
  { id: 'combat',    label: 'Worlds' },
  { id: 'build',     label: 'Equip'  },
  { id: 'shop',      label: 'Shop'   },
  { id: 'inventory', label: 'Items'  },
  { id: 'stats',     label: 'Stats'  },
  { id: 'settings',  label: 'Config', emoji: '⚙' },
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
          {screen.emoji ? (
            <span className="nav-icon-emoji">{screen.emoji}</span>
          ) : (
            <img
              src={`${BASE}sprites/nav/${screen.id}.png`}
              alt={screen.label}
              className="nav-icon-img"
            />
          )}
          <span className="nav-label">{screen.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default NavBar;
