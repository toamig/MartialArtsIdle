import { useMemo, useRef, useEffect, useState } from 'react';
import { fmt, fmtRate } from '../utils/format';
import { getSpriteTier } from '../data/producers';

/** Visible-unit cap in the sprite stack. Mobile gets fewer via CSS-only path
 *  (the overflow `+N` chip shifts left automatically when stack overflows). */
const MAX_VISIBLE_UNITS = 20;

const BASE = import.meta.env.BASE_URL;

/** Render a sprite — handles both emoji placeholders and image paths.
 *  Path detection: strings starting with `/` are treated as `public/`-relative
 *  PNG paths and rendered via <img>. Anything else (emoji glyphs) renders
 *  as text. The global image-rendering CSS rule applies pixelated upscaling
 *  to imgs automatically (see App.css). */
function Sprite({ sprite, className }) {
  if (typeof sprite === 'string' && sprite.startsWith('/')) {
    return (
      <img
        src={`${BASE}${sprite.replace(/^\//, '')}`}
        alt=""
        className={className}
        draggable={false}
      />
    );
  }
  return <span className={className} aria-hidden="true">{sprite}</span>;
}

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
  onShowDetail,
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

  // Locked state — keep the leader as a tap target so the player can still
  // open the details modal and read what they're working toward. Unlock hint
  // takes the spot where the Qi/s rate normally lives in the caption line.
  if (!unlocked) {
    const minRealm = producer.unlock?.minRealmIndex ?? '?';
    return (
      <div className="pl-lane pl-locked" aria-disabled="true">
        <button
          className="pl-leader pl-leader-clickable"
          onClick={() => onShowDetail?.(producer)}
          aria-label={`${producer.name} details`}
          type="button"
        >
          <Sprite sprite="🔒" className="pl-leader-sprite" />
        </button>
        <div className="pl-body">
          <div className="pl-caption">
            <span className="pl-name pl-name-locked">??? Locked</span>
            <span className="pl-sep">·</span>
            <span className="pl-rate">Unlocks at realm {minRealm}</span>
          </div>
          <div className="pl-stack pl-stack-empty" aria-hidden="true"></div>
        </div>
        <div className="pl-buy-zone pl-buy-zone-locked">Locked</div>
      </div>
    );
  }

  const affordable = resolvedCount > 0 && qi >= displayCost;
  const totalQiPerSec = owned * producer.startQiPerSec;
  const tierClass = tier ? `pl-tier-${tier.name}` : 'pl-tier-empty';

  // Visible-units cap — `overflow: hidden` on .pl-stack clips the right side
  // when more sprites fit than the row can hold. The always-visible ×N chip
  // (positioned at the right edge of the stack, z-index above the sprites)
  // carries the real count regardless of how many fit visually.
  const visible = Math.min(owned, MAX_VISIBLE_UNITS);

  return (
    <div className={`pl-lane ${tierClass}${celebrating ? ' pl-celebrate' : ''}`}>
      <button
        className="pl-leader pl-leader-clickable"
        onClick={() => onShowDetail?.(producer)}
        aria-label={`${producer.name} details`}
        type="button"
      >
        <Sprite sprite={sprite} className="pl-leader-sprite" />
      </button>

      <div className="pl-body">
        <div className="pl-caption">
          <span className="pl-name">{producer.name}</span>
          {owned > 0 && (
            <>
              <span className="pl-sep">·</span>
              <span className="pl-rate">{fmtRate(totalQiPerSec)} Qi/s</span>
            </>
          )}
        </div>
        <div className="pl-stack">
          {Array.from({ length: visible }).map((_, i) => (
            <Sprite key={i} sprite={sprite} className="pl-unit" />
          ))}
          {owned > 0 && <div className="pl-total">×{owned}</div>}
        </div>
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
