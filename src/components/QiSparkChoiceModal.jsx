import { useEffect, useRef, useState } from 'react';
import { QI_SPARK_BY_ID, SPARK_RARITY, SPARK_COPY } from '../data/qiSparks';

const BASE = import.meta.env.BASE_URL;
// Inactivity timeout — modal auto-resolves (picks leftmost) if the player
// doesn't interact for this long. Bumped 30s → 60s 2026-05-21 after
// playtest report: 30s was too tight when rerolling + reading detail
// panels. Now ANY interaction (click, reroll, detail open) resets the
// timer, so an engaged player effectively never times out.
const CHOICE_TIMEOUT_MS = 60_000;

// Map markdown-ish `**bold**` to <strong>. Tiny renderer so we don't pull in
// a markdown lib — the only formatting we use in effectText is bold.
function renderEffect(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

/** Render an icon: pixel sprite if path-like, else emoji glyph. */
function CardIcon({ icon }) {
  if (typeof icon === 'string' && icon.startsWith('/')) {
    return <img src={`${BASE}${icon.replace(/^\//, '')}`} alt="" className="qs-card-icon-img" draggable={false} />;
  }
  return <span className="qs-card-icon-emoji" aria-hidden="true">{icon}</span>;
}

/**
 * Resolve the display icon for a spark id. Priority:
 *   1. SPARK_COPY[id].icon — explicit override (producer sprite for
 *      legendaries, themed emoji for common/uncommon)
 *   2. mechanic-tier cards reuse the same medallion icon the upgrades
 *      shop already shows (ui/upgrade_<mechanicId>.png — Crystal
 *      Reservoir, Divine Qi, etc.)
 *   3. fallback to ✦
 */
function iconFor(sparkId) {
  const copy = SPARK_COPY[sparkId];
  if (copy?.icon) return copy.icon;
  const card = QI_SPARK_BY_ID[sparkId];
  if (card?.kind === 'mechanic' && card.mechanicId) {
    return `/ui/upgrade_${card.mechanicId}.png`;
  }
  return '✦';
}

// ── Vertical-stack card ─────────────────────────────────────────────────────

function SparkCard({
  sparkId,
  cardIndex,
  onPick,
  onRerollCard,
  onOpenDetail,
  isFreeReroll,
  rerollCost,
  canAffordReroll,
}) {
  const card = QI_SPARK_BY_ID[sparkId];
  if (!card) return null;
  const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
  const copy   = SPARK_COPY[sparkId];
  // Effect text falls back to the legacy `description` field for any card
  // that hasn't been migrated to plain-English copy yet.
  const effectText = copy?.effectText ?? card.description ?? '';
  const icon       = iconFor(sparkId);

  return (
    <div
      className={`qs-card qs-card-${card.rarity}`}
      style={{ '--rarity-color': rarity.color }}
    >
      <button
        type="button"
        className="qs-card-tap"
        onClick={() => onOpenDetail?.(sparkId)}
        aria-label={`${card.name} — tap for details`}
      >
        <div className="qs-card-img"><CardIcon icon={icon} /></div>
        <div className="qs-card-info">
          <div className="qs-card-head">
            <span className="qs-card-name">{card.name}</span>
            <span className={`qs-card-rarity-tag qs-rt-${card.rarity}`}>{rarity.label}</span>
          </div>
          <div className="qs-card-effect">{renderEffect(effectText)}</div>
          <span className="qs-card-info-hint">tap for example + lore</span>
        </div>
      </button>
      <div className="qs-card-actions">
        <button
          type="button"
          className="qs-btn qs-btn-pick"
          onClick={() => onPick(sparkId)}
        >
          Pick
        </button>
      </div>
    </div>
  );
}

// ── Detail panel — opens when card body is tapped ───────────────────────────

function DetailPanel({ sparkId, onClose, onPick }) {
  const card = QI_SPARK_BY_ID[sparkId];
  if (!card) return null;
  const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
  const copy   = SPARK_COPY[sparkId];
  const icon   = iconFor(sparkId);
  const effectText  = copy?.effectText  ?? card.description ?? '';
  const exampleHtml = copy?.exampleText ?? null;
  const loreHtml    = copy?.loreText    ?? null;

  return (
    <div
      className="qs-detail-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`qs-detail-panel qs-detail-r-${card.rarity}`} style={{ '--rarity-color': rarity.color }}>
        <button type="button" className="qs-detail-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="qs-detail-hero">
          <CardIcon icon={icon} />
          <div className={`qs-detail-rarity-banner qs-rt-${card.rarity}`}>{rarity.label}</div>
        </div>
        <div className="qs-detail-body">
          <div className="qs-detail-name">{card.name}</div>
          <div className="qs-detail-section">
            <div className="qs-detail-section-label">Effect</div>
            <div className="qs-detail-effect-text">{renderEffect(effectText)}</div>
          </div>
          {exampleHtml && (
            <div className="qs-detail-section">
              <div className="qs-detail-section-label">Example</div>
              <div className="qs-detail-example" dangerouslySetInnerHTML={{ __html: exampleHtml }} />
            </div>
          )}
          {loreHtml && (
            <div className="qs-detail-section">
              <div className="qs-detail-section-label">Lore</div>
              <div className="qs-detail-lore">{loreHtml}</div>
            </div>
          )}
          <div className="qs-detail-actions">
            <button
              type="button"
              className="qs-btn qs-btn-pick"
              onClick={() => { onPick(sparkId); onClose(); }}
            >
              Pick this spark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

/**
 * Two-card pick UI. Auto-resolves to the leftmost card after CHOICE_TIMEOUT_MS
 * if the player ignores it, so cultivation never blocks indefinitely.
 *
 * Per-card reroll model: each of the 2 cards has its own ↺ button and its
 * own free-reroll allowance + paid-cost escalator. The footer is a small
 * transparency strip showing the baseline legendary chance + pity counter
 * status so the player understands the surface mechanic.
 *
 * Props:
 *   offer:             { id, cards, cardFreeRerollsLeft, cardPaidRerollsUsed }
 *   bloodLotusBalance
 *   nextRerollCostFor: (cardIndex) → number (0 if free reroll available)
 *   onChoose(sparkId)
 *   onRerollCard(cardIndex)
 *   onSkip()
 *   pityCounter:       number (breakthroughs since last legendary appeared)
 *   pityThreshold:     number (cap before pity triggers a guaranteed legendary)
 *   legendaryChance:   number (per-card baseline chance, 0..1)
 */
function QiSparkChoiceModal({
  offer,
  bloodLotusBalance,
  nextRerollCostFor,
  onChoose,
  onRerollOffer,
  // Legacy prop name — still accepted, treated as the offer-level reroll.
  onRerollCard,
  onSkip,
  pityCounter = 0,
  pityThreshold = 17,
  legendaryChance = 0.06,
  legendaryPoolInfo = null,
}) {
  // 2026-05-21 redesign: tier-locked offers, single reroll for the pair.
  const rerollFn = onRerollOffer ?? onRerollCard;

  // Auto-skip after timeout — captures onSkip via ref so the timer doesn't
  // reset on every render of the parent.
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

  // Activity nonce bumps on user interaction → resets the auto-timeout.
  // Prevents the modal from vanishing mid-reroll or while reading details.
  const [activityNonce, setActivityNonce] = useState(0);
  const bumpActivity = () => setActivityNonce(n => n + 1);

  useEffect(() => {
    if (!offer) return;
    const id = setTimeout(() => onSkipRef.current?.(), CHOICE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [offer?.id, activityNonce]);

  // Wrap reroll so it counts as activity (resets the timer).
  const onRerollActive = () => { bumpActivity(); rerollFn?.(); };

  // Detail panel state — tracks which card the player has tapped open.
  const [detailIdx, setDetailIdx] = useState(null);
  useEffect(() => { setDetailIdx(null); }, [offer?.id]); // close detail on new offer

  if (!offer) return null;

  // 2026-05-21: tier-locked redesign. Offer carries one reroll cost (no
  // per-card variant). Accept both new (no-arg) and legacy (cardIndex) callers.
  const rerollCost  = typeof nextRerollCostFor === 'function'
    ? (nextRerollCostFor(0) ?? 0)  // legacy signature falls back cleanly
    : 0;
  const freeLeft    = offer.offerFreeRerollsLeft ?? 0;
  const isFreeReroll = freeLeft > 0;
  const canAffordReroll = isFreeReroll || (bloodLotusBalance ?? 0) >= rerollCost;

  // Offer rarity — all cards in a tier-locked offer share the same rarity.
  const firstCard = offer.cards?.[0] ? QI_SPARK_BY_ID[offer.cards[0]] : null;
  const offerRarity = firstCard?.rarity ?? 'common';
  const offerRarityLabel = SPARK_RARITY[offerRarity]?.label ?? '';

  const pityRemaining   = Math.max(0, pityThreshold - pityCounter);
  const pityImminent    = pityRemaining <= 3;
  const pityGuaranteed  = pityRemaining === 0;
  const chancePct       = Math.round(legendaryChance * 100);

  const openDetailForIdx = (sparkId) => {
    bumpActivity(); // opening the detail panel counts as engaged play
    const idx = offer.cards.indexOf(sparkId);
    if (idx >= 0) setDetailIdx(idx);
  };

  return (
    <div className="modal-overlay qi-spark-overlay">
      <div className="qs-modal" onClick={e => e.stopPropagation()}>
        <div className="qs-header">
          <h2 className="qs-title">Qi Spark</h2>
          <p className="qs-subtitle">
            <span className={`qs-offer-tier qs-rt-${offerRarity}`}>{offerRarityLabel}</span>
            {' '}offer — choose one of two.
          </p>
        </div>

        <div className="qs-vstack">
          {offer.cards.map((sparkId, idx) => (
              <SparkCard
                key={`${sparkId}-${idx}`}
                sparkId={sparkId}
                cardIndex={idx}
                onPick={onChoose}
                onOpenDetail={openDetailForIdx}
              />
            ))}
        </div>

        {/* Offer-level reroll — 1 free per offer, then escalating Lotus. Re-rolls
            the tier AND both cards (tier-locked redesign 2026-05-21). */}
        <div className="qs-offer-reroll-row">
          <button
            type="button"
            className={`qs-btn qs-btn-reroll qs-btn-reroll-offer${isFreeReroll ? ' qs-btn-reroll-free' : ''}${!canAffordReroll ? ' qs-btn-reroll-locked' : ''}`}
            disabled={!canAffordReroll}
            onClick={onRerollActive}
            title={
              isFreeReroll       ? 'Reroll both cards — free!'
              : !canAffordReroll ? `Need ${rerollCost} Blood Lotus to reroll`
              :                    `Reroll both cards — ${rerollCost} Blood Lotus`
            }
          >
            ↺ Reroll pair {isFreeReroll ? '(free)' : `· ${rerollCost} BL`}
          </button>
        </div>

        {(() => {
          // Context-aware footer — protects players from spending Lotus
          // when no legendaries are reachable, AND shows the pool growing
          // as new producers unlock.
          const eligible = legendaryPoolInfo?.eligibleCount ?? 0;
          const total    = legendaryPoolInfo?.totalCount    ?? 0;
          const next     = legendaryPoolInfo?.nextUnlock;

          if (eligible === 0 && next) {
            return (
              <div className="qs-footer-meta qs-footer-meta-locked">
                <span>🔒 Legendary sparks unlock with <strong>{next.producerName}</strong></span>
              </div>
            );
          }
          if (eligible === 0) {
            // Fallback when legendaryPoolInfo isn't threaded (e.g. tests) —
            // fall back to the original chance + pity readout.
            return (
              <div className={`qs-footer-meta${pityImminent ? ' qs-footer-meta-pity-soon' : ''}${pityGuaranteed ? ' qs-footer-meta-pity-now' : ''}`}>
                <span className="qsfm-chance">✦ <strong>{chancePct}%</strong> legendary chance per card</span>
                <span className="qsfm-sep">·</span>
                <span className="qsfm-pity">
                  {pityGuaranteed
                    ? <>⚡ <strong>Next breakthrough: guaranteed legendary</strong></>
                    : pityImminent
                      ? <>⚡ Legendary guaranteed in <strong>{pityRemaining}</strong> {pityRemaining === 1 ? 'realm' : 'realms'}</>
                      : <>Pity in <strong>{pityRemaining}</strong> realms</>}
                </span>
              </div>
            );
          }
          // 1+ eligible — show chance, pool progress, and pity together.
          const poolText = (total > 0 && eligible < total)
            ? `${eligible} of ${total} unlocked`
            : 'full pool';
          return (
            <div className={`qs-footer-meta${pityImminent ? ' qs-footer-meta-pity-soon' : ''}${pityGuaranteed ? ' qs-footer-meta-pity-now' : ''}`}>
              <span className="qsfm-chance">✦ <strong>{chancePct}%</strong> legendary · <span className="qsfm-pool">{poolText}</span></span>
              <span className="qsfm-sep">·</span>
              <span className="qsfm-pity">
                {pityGuaranteed
                  ? <>⚡ <strong>Next breakthrough: guaranteed legendary</strong></>
                  : pityImminent
                    ? <>⚡ Pity in <strong>{pityRemaining}</strong> {pityRemaining === 1 ? 'realm' : 'realms'}</>
                    : <>Pity in <strong>{pityRemaining}</strong> realms</>}
              </span>
            </div>
          );
        })()}

        {detailIdx !== null && (() => {
          const sparkId = offer.cards[detailIdx];
          return (
            <DetailPanel
              sparkId={sparkId}
              onClose={() => setDetailIdx(null)}
              onPick={onChoose}
            />
          );
        })()}
      </div>
    </div>
  );
}

export default QiSparkChoiceModal;
