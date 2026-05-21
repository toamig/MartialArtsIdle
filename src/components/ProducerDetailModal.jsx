import { fmt, fmtRate } from '../utils/format';
import { getSpriteTier, SPRITE_TIERS } from '../data/producers';

const BASE = import.meta.env.BASE_URL;

/** Render the leader sprite at large size for the modal header. When
 *  `silhouette` is true, the sprite renders as a hard-edged black cutout
 *  via the inline SVG filter — preserves the "what's coming next?" tease
 *  even when the player taps a locked producer to read its unlock info. */
function HeroSprite({ sprite, silhouette }) {
  const cls = `pdm-hero-sprite${silhouette ? ' pdm-hero-silhouette' : ''}`;
  if (typeof sprite === 'string' && sprite.startsWith('/')) {
    return (
      <img
        src={`${BASE}${sprite.replace(/^\//, '')}`}
        alt=""
        className={cls}
        draggable={false}
      />
    );
  }
  return <span className={`${cls} pdm-hero-emoji`} aria-hidden="true">{sprite}</span>;
}

/**
 * Modal that opens when the player taps a producer's leader sprite in the
 * Cultivation screen lane. Surfaces:
 *   - lore description (producer.desc — the player-facing "why this is stronger")
 *   - owned count + current tier + next tier threshold
 *   - per-unit qi/s after upgrade multipliers
 *   - this producer's total qi/s contribution + percentage of total game rate
 *
 * Locked producers show the unlock hint instead of stats.
 */
export default function ProducerDetailModal({
  producer,
  owned,
  unlocked,
  upgradeMult,         // multiplier from producer-doubling upgrades for this id
  totalGameRate,       // total qi/s across all producers (post-mult)
  onClose,
}) {
  const tier      = unlocked ? getSpriteTier(owned) : null;
  const spriteIdx = tier?.idx ?? 0;
  const sprite    = producer.sprites?.[spriteIdx] ?? producer.sprites?.[0] ?? '◆';

  const perUnitRate   = producer.startQiPerSec * (upgradeMult ?? 1);
  const totalFromHere = owned * perUnitRate;
  const sharePct      = totalGameRate > 0
    ? (totalFromHere / totalGameRate) * 100
    : 0;

  // Find the next-tier threshold for the "X more to reach Silver/Gold/Mythic" line.
  // SPRITE_TIERS is in ascending minOwned order — pick the first one greater
  // than the current count.
  const nextTier = unlocked
    ? SPRITE_TIERS.find(t => t.minOwned > owned) ?? null
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pdm-modal" onClick={e => e.stopPropagation()}>
        <button className="journey-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="pdm-hero">
          <HeroSprite sprite={sprite} silhouette={!unlocked} />
          {tier && (
            <span className={`pdm-tier-badge pdm-badge-${tier.name}`}>
              {tier.label}
            </span>
          )}
        </div>

        {/* Spoiler-free name for locked producers — the silhouette + "???"
            keeps the Cookie-Clicker mystery; the unlock-realm hint below
            tells the player when to expect it without revealing what. */}
        <div className={`pdm-name${!unlocked ? ' pdm-name-locked' : ''}`}>
          {unlocked ? producer.name : '???'}
        </div>

        {!unlocked ? (
          <div className="pdm-locked">
            <div className="pdm-locked-icon">🔒</div>
            <div className="pdm-locked-text">
              Unlocks at realm {producer.unlock?.minRealmIndex ?? '?'}.
            </div>
          </div>
        ) : (
          <>
            <p className="pdm-lore">{producer.desc}</p>

            <div className="pdm-stats">
              <div className="pdm-stat-row">
                <span className="pdm-stat-label">Owned</span>
                <span className="pdm-stat-value">×{owned}</span>
              </div>
              <div className="pdm-stat-row">
                <span className="pdm-stat-label">Per unit</span>
                <span className="pdm-stat-value">
                  {fmtRate(perUnitRate)} Qi/s
                  {upgradeMult > 1 && (
                    <span className="pdm-stat-mult"> (×{upgradeMult} upgrades)</span>
                  )}
                </span>
              </div>
              <div className="pdm-stat-row pdm-stat-row-emph">
                <span className="pdm-stat-label">Total contribution</span>
                <span className="pdm-stat-value">
                  {fmtRate(totalFromHere)} Qi/s
                </span>
              </div>
              <div className="pdm-stat-row">
                <span className="pdm-stat-label">Share of total qi/s</span>
                <span className="pdm-stat-value">
                  {sharePct < 0.05 && totalFromHere > 0 ? '<0.1' : sharePct.toFixed(1)}%
                </span>
              </div>
              {nextTier && (
                <div className="pdm-stat-row">
                  <span className="pdm-stat-label">Next tier ({nextTier.label})</span>
                  <span className="pdm-stat-value">
                    {nextTier.minOwned - owned} more
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
