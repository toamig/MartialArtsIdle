import { fmt } from '../utils/format';

/**
 * One card in the CultivationScreen upgrades grid.
 *
 * Owned upgrades render in a separate compact section at the bottom of the
 * upgrades tab (Cookie Clicker pattern — keeps the buyable list scannable),
 * so this component only renders unowned variants. Owned entries are drawn
 * by `OwnedUpgradeChip` below.
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
      <span className="cs-up-chip-check">✓</span>
      <span className="cs-up-chip-name">{upgrade.name}</span>
    </div>
  );
}
