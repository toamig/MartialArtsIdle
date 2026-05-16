import { fmt } from '../utils/format';

/**
 * One card in the CultivationScreen upgrades grid.
 *
 * Props:
 *   - upgrade:    upgrade definition (from data/upgrades.js)
 *   - owned:      already purchased?
 *   - unlocked:   purchase condition met?
 *   - qi:         live qi snapshot (display-only)
 *   - onBuy:      (id) => void — caller must atomically spend qi and call upgrades.buy
 */
export default function UpgradeCard({ upgrade, owned, unlocked, qi, onBuy }) {
  if (owned) {
    return (
      <div className="cs-up-card cs-up-card-owned">
        <div className="cs-up-name">{upgrade.name}</div>
        <div className="cs-up-desc">{upgrade.desc}</div>
        <div className="cs-up-status">Purchased</div>
      </div>
    );
  }

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
