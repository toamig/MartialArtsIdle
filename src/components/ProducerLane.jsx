import { useMemo, useRef, useEffect, useState } from 'react';
import { fmt, fmtRate } from '../utils/format';
import { getSpriteTier } from '../data/producers';

/** Visible-unit cap in the sprite stack. Mobile gets fewer via CSS-only path
 *  (the overflow `+N` chip shifts left automatically when stack overflows). */
const MAX_VISIBLE_UNITS = 20;

/**
 * One Cookie-Clicker-style lane in the CultivationScreen producer list.
 *
 * Layout (left → right):
 *   [Leader sprite] [Name + meta + tier badge] [Sprite stack with overflow] [Buy button]
 *
 * The leader sprite + every unit in the stack swap to a tier-specific sprite
 * variant when ownership crosses 10 / 25 / 100 (see SPRITE_TIERS in producers.js).
 * CSS class `pl-tier-<bronze|silver|gold|mythic>` drives the glow escalation.
 *
 * A short celebration animation plays on threshold crossings via the
 * `pl-celebrate` class — the lane briefly scales + pulses gold/violet.
 */
export default function ProducerLane({
  producer,
  owned,
  unlocked,
  buyMode,
  qi,
  producers,
  onBuy,
}) {
  // Resolve current tier + sprite. Tier null when 0 owned.
  const tier = unlocked ? getSpriteTier(owned) : null;
  const spriteIdx = tier?.idx ?? 0;
  const sprite = producer.sprites?.[spriteIdx] ?? producer.sprites?.[0] ?? '◆';

  // Threshold-crossing celebration. Watch tier transitions; on change, briefly
  // toggle the `.pl-celebrate` class so CSS plays the burst animation. The
  // ref tracks the last tier name so we don't fire on every render.
  const prevTierNameRef = useRef(tier?.name ?? null);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    const next = tier?.name ?? null;
    const prev = prevTierNameRef.current;
    // Only fire on upward transitions (null→bronze, bronze→silver, etc.).
    const ranks = ['bronze', 'silver', 'gold', 'mythic'];
    const prevRank = ranks.indexOf(prev);
    const nextRank = ranks.indexOf(next);
    if (nextRank > prevRank && next != null) {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 1400);
      prevTierNameRef.current = next;
      return () => clearTimeout(t);
    }
    prevTierNameRef.current = next;
  }, [tier?.name]);

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

  // Locked state — render a muted placeholder with the unlock hint.
  if (!unlocked) {
    const minRealm = producer.unlock?.minRealmIndex ?? '?';
    return (
      <div className="pl-lane pl-locked" aria-disabled="true">
        <div className="pl-leader">
          <span className="pl-leader-sprite" aria-hidden="true">🔒</span>
        </div>
        <div className="pl-info">
          <div className="pl-name pl-name-locked">??? Locked</div>
          <div className="pl-meta">Unlocks at realm {minRealm}</div>
        </div>
        <div className="pl-stack pl-stack-empty" aria-hidden="true"></div>
        <div className="pl-buy-zone pl-buy-zone-locked">Locked</div>
      </div>
    );
  }

  const affordable = resolvedCount > 0 && qi >= displayCost;
  const totalQiPerSec = owned * producer.startQiPerSec;
  const tierClass = tier ? `pl-tier-${tier.name}` : 'pl-tier-empty';

  // Stack — visible units cap. When owned > MAX_VISIBLE_UNITS, the rest is
  // surfaced as an overflow chip ("+18", "+198") on the right edge.
  const visible = Math.min(owned, MAX_VISIBLE_UNITS);
  const overflow = owned - visible;

  return (
    <div className={`pl-lane ${tierClass}${celebrating ? ' pl-celebrate' : ''}`}>
      <div className="pl-leader">
        <span className="pl-leader-sprite" aria-hidden="true">{sprite}</span>
      </div>

      <div className="pl-info">
        <div className="pl-name">{producer.name}</div>
        <div className="pl-meta">
          <span className="pl-owned">×{owned}</span>
          {owned > 0 && (
            <>
              <span className="pl-sep">·</span>
              <span className="pl-rate">{fmtRate(totalQiPerSec)} Qi/s</span>
            </>
          )}
          {tier && (
            <span className={`pl-badge pl-badge-${tier.name}`}>{tier.label}</span>
          )}
        </div>
      </div>

      <div className="pl-stack">
        {Array.from({ length: visible }).map((_, i) => (
          <span key={i} className="pl-unit" aria-hidden="true">{sprite}</span>
        ))}
        {overflow > 0 && (
          <div className="pl-overflow">+{overflow}</div>
        )}
      </div>

      <button
        className={`pl-buy${affordable ? '' : ' pl-buy-disabled'}`}
        onClick={() => onBuy(producer.id, resolvedCount)}
        disabled={!affordable}
      >
        <span className="pl-buy-count">
          {buyMode === 'max'
            ? (resolvedCount > 0 ? `×${resolvedCount}` : '×0')
            : `×${buyMode}`}
        </span>
        <span className="pl-buy-cost">{fmt(displayCost)} Qi</span>
      </button>
    </div>
  );
}
