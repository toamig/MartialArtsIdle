import { useMemo } from 'react';
import { fmt, fmtRate } from '../utils/format';

/**
 * One row in the CultivationScreen producer list.
 *
 * Props:
 *   - producer:    the producer definition (from data/producers.js)
 *   - owned:       current owned count
 *   - unlocked:    realm gate satisfied?
 *   - buyMode:     1 | 10 | 'max' — the active buy-amount chip
 *   - qi:          live qi snapshot (display-only — re-reads cultivation.qiRef at buy time)
 *   - onBuy:       (id, count) => void
 *
 * Buy buttons are disabled when the player can't afford the resolved count.
 * The cost label shows the geometric-sum cost for the active buyMode.
 */
export default function ProducerRow({
  producer,
  owned,
  unlocked,
  buyMode,
  qi,
  producers,
  onBuy,
}) {
  // Resolve the effective buy count for the active mode.
  const resolvedCount = useMemo(() => {
    if (!unlocked) return 0;
    if (buyMode === 'max') return producers.getMaxAffordable(producer.id, qi);
    return buyMode;
  }, [buyMode, qi, producer.id, producers, unlocked]);

  const displayCost = useMemo(() => {
    if (!unlocked) return 0;
    const n = Math.max(1, resolvedCount);
    return producers.getCost(producer.id, n);
  }, [producer.id, producers, resolvedCount, unlocked]);

  if (!unlocked) {
    const minRealm = producer.unlock?.minRealmIndex ?? '?';
    return (
      <div className="cs-row cs-row-locked" aria-disabled="true">
        <div className="cs-row-left">
          <div className="cs-row-name cs-row-name-locked">??? Locked ???</div>
          <div className="cs-row-meta">Unlocks at realm {minRealm}</div>
        </div>
      </div>
    );
  }

  const affordable = resolvedCount > 0 && qi >= displayCost;
  const totalQiPerSec = owned * producer.startQiPerSec;

  return (
    <div className="cs-row">
      <div className="cs-row-left">
        <div className="cs-row-name">{producer.name}</div>
        <div className="cs-row-meta">
          <span className="cs-row-owned">×{owned}</span>
          <span className="cs-row-sep">·</span>
          <span className="cs-row-unit">+{fmtRate(producer.startQiPerSec)} Qi/s each</span>
          {owned > 0 && (
            <>
              <span className="cs-row-sep">·</span>
              <span className="cs-row-total">{fmtRate(totalQiPerSec)} Qi/s total</span>
            </>
          )}
        </div>
        <div className="cs-row-desc">{producer.desc}</div>
      </div>
      <div className="cs-row-right">
        <button
          className={`cs-buy-btn${affordable ? '' : ' cs-buy-btn-disabled'}`}
          onClick={() => onBuy(producer.id, resolvedCount)}
          disabled={!affordable}
        >
          <span className="cs-buy-count">
            {buyMode === 'max'
              ? (resolvedCount > 0 ? `×${resolvedCount}` : '×0')
              : `×${buyMode}`}
          </span>
          <span className="cs-buy-cost">{fmt(displayCost)} Qi</span>
        </button>
      </div>
    </div>
  );
}
