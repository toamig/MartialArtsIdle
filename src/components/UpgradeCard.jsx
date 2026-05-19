import { fmt } from '../utils/format';
import { upgradeIconSrc } from '../utils/upgradeIcons';

const BASE = import.meta.env.BASE_URL ?? '/';
const PLACEHOLDER_SRC = `${BASE}ui/upgrade_default.png`;

// Swap broken icons to the transparent placeholder so missing art never shows
// a broken-image glyph. Self-resets the handler so we don't loop if the
// placeholder itself is missing.
function handleIconError(e) {
  if (e.currentTarget.src.endsWith('/upgrade_default.png')) return;
  e.currentTarget.src = PLACEHOLDER_SRC;
}

/**
 * One card in the CultivationScreen upgrades grid.
 *
 * Owned upgrades render in a separate compact section at the bottom of the
 * upgrades tab (Cookie Clicker pattern — keeps the buyable list scannable),
 * so this component only renders unowned variants. Owned entries are drawn
 * by `OwnedUpgradeChip` below.
 *
 * Icon source comes from utils/upgradeIcons — producer-doubles reuse the
 * producer sprite; the rest map to a category/mechanic icon under public/ui/.
 *
 * Props:
 *   - upgrade:    upgrade definition (from data/upgrades.js)
 *   - unlocked:   purchase condition met?
 *   - qi:         live qi snapshot (display-only)
 *   - onBuy:      (id) => void — caller must atomically spend qi and call upgrades.buy
 */
export default function UpgradeCard({ upgrade, unlocked, qi, onBuy }) {
  const affordable = unlocked && qi >= upgrade.cost;

  return (
    <div className={`cs-up-card${unlocked ? '' : ' cs-up-card-locked'}`}>
      <img className="cs-up-icon" src={upgradeIconSrc(upgrade)} alt="" draggable="false" onError={handleIconError} />
      <div className="cs-up-name">{upgrade.name}</div>
      <div className="cs-up-desc">{upgrade.desc}</div>
      <button
        className={`cs-up-buy${affordable ? '' : ' cs-up-buy-disabled'}`}
        onClick={() => onBuy(upgrade.id)}
        disabled={!affordable}
      >
        {unlocked ? `${fmt(upgrade.cost)} Qi` : 'Locked'}
      </button>
    </div>
  );
}

/**
 * Compact owned-upgrade chip — name only, with the description in a native
 * tooltip (title attribute). Lets the Purchased section pack many upgrades
 * into a few rows without occupying the visual budget the buyable cards need.
 */
export function OwnedUpgradeChip({ upgrade }) {
  return (
    <div
      className="cs-up-chip"
      title={upgrade.desc}
      aria-label={`${upgrade.name} — ${upgrade.desc}`}
    >
      <img className="cs-up-chip-icon" src={upgradeIconSrc(upgrade)} alt="" draggable="false" onError={handleIconError} />
      <span className="cs-up-chip-check">✓</span>
      <span className="cs-up-chip-name">{upgrade.name}</span>
    </div>
  );
}
