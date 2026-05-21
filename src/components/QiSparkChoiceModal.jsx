import { useEffect, useRef, useState } from 'react';
import { QI_SPARK_BY_ID, SPARK_RARITY, SPARK_COPY } from '../data/qiSparks';

const BASE = import.meta.env.BASE_URL;
const CHOICE_TIMEOUT_MS = 30_000;

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
  const icon       = copy?.icon ?? '✦';

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
        <button
          type="button"
          className={`qs-btn qs-btn-reroll${isFreeReroll ? ' qs-btn-reroll-free' : ''}${!canAffordReroll ? ' qs-btn-reroll-locked' : ''}`}
          disabled={!canAffordReroll}
          onClick={() => onRerollCard?.(cardIndex)}
          title={
            isFreeReroll       ? 'Reroll this card — free!'
            : !canAffordReroll ? `Need ${rerollCost} Blood Lotus to reroll`
            :                    `Reroll this card — ${rerollCost} Blood Lotus`
          }
        >
          ↺ {isFreeReroll ? 'Free reroll' : `${rerollCost} BL`}
        </button>
      </div>
    </div>
  );
}

// ── Detail panel — opens when card body is tapped ───────────────────────────

function DetailPanel({ sparkId, onClose, onPick, onRerollCard, cardIndex, isFreeReroll, rerollCost, canAffordReroll }) {
  const card = QI_SPARK_BY_ID[sparkId];
  if (!card) return null;
  const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
  const copy   = SPARK_COPY[sparkId];
  const icon   = copy?.icon ?? '✦';
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
            <button
              type="button"
              className={`qs-btn qs-btn-reroll${isFreeReroll ? ' qs-btn-reroll-free' : ''}${!canAffordReroll ? ' qs-btn-reroll-locked' : ''}`}
              disabled={!canAffordReroll}
              onClick={() => { onRerollCard?.(cardIndex); onClose(); }}
            >
              ↺ {isFreeReroll ? 'Free reroll' : `${rerollCost} BL`}
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
  onRerollCard,
  onSkip,
  pityCounter = 0,
  pityThreshold = 17,
  legendaryChance = 0.03,
}) {
  // Auto-skip after timeout — captures onSkip via ref so the timer doesn't
  // reset on every render of the parent.
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;
  useEffect(() => {
    if (!offer) return;
    const id = setTimeout(() => onSkipRef.current?.(), CHOICE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [offer?.id]); // re-arm whenever a new offer appears

  // Detail panel state — tracks which card the player has tapped open.
  const [detailIdx, setDetailIdx] = useState(null);
  useEffect(() => { setDetailIdx(null); }, [offer?.id]); // close detail on new offer

  if (!offer) return null;

  const freeLeftPerCard = offer.cardFreeRerollsLeft ?? [1, 1];
  const pityRemaining   = Math.max(0, pityThreshold - pityCounter);
  const pityImminent    = pityRemaining <= 3;
  const pityGuaranteed  = pityRemaining === 0;
  const chancePct       = Math.round(legendaryChance * 100);

  const openDetailForIdx = (sparkId) => {
    const idx = offer.cards.indexOf(sparkId);
    if (idx >= 0) setDetailIdx(idx);
  };

  return (
    <div className="modal-overlay qi-spark-overlay">
      <div className="qs-modal" onClick={e => e.stopPropagation()}>
        <div className="qs-header">
          <h2 className="qs-title">Qi Spark</h2>
          <p className="qs-subtitle">A spark of dao reaches you. Choose one.</p>
        </div>

        <div className="qs-vstack">
          {offer.cards.map((sparkId, idx) => {
            const cost         = nextRerollCostFor?.(idx) ?? 0;
            const isFreeReroll = (freeLeftPerCard[idx] ?? 0) > 0;
            const canAfford    = isFreeReroll || (bloodLotusBalance ?? 0) >= cost;
            return (
              <SparkCard
                key={`${sparkId}-${idx}`}
                sparkId={sparkId}
                cardIndex={idx}
                onPick={onChoose}
                onRerollCard={onRerollCard}
                onOpenDetail={openDetailForIdx}
                isFreeReroll={isFreeReroll}
                rerollCost={cost}
                canAffordReroll={canAfford}
              />
            );
          })}
        </div>

        <div className={`qs-footer-meta${pityImminent ? ' qs-footer-meta-pity-soon' : ''}${pityGuaranteed ? ' qs-footer-meta-pity-now' : ''}`}>
          <span className="qsfm-chance">
            ✦ <strong>{chancePct}%</strong> legendary chance per card
          </span>
          <span className="qsfm-sep">·</span>
          <span className="qsfm-pity">
            {pityGuaranteed
              ? <>⚡ <strong>Next breakthrough: guaranteed legendary</strong></>
              : pityImminent
                ? <>⚡ Legendary guaranteed in <strong>{pityRemaining}</strong> {pityRemaining === 1 ? 'realm' : 'realms'}</>
                : <>Pity in <strong>{pityRemaining}</strong> realms</>}
          </span>
        </div>

        {detailIdx !== null && (() => {
          const sparkId      = offer.cards[detailIdx];
          const cost         = nextRerollCostFor?.(detailIdx) ?? 0;
          const isFreeReroll = (freeLeftPerCard[detailIdx] ?? 0) > 0;
          const canAfford    = isFreeReroll || (bloodLotusBalance ?? 0) >= cost;
          return (
            <DetailPanel
              sparkId={sparkId}
              cardIndex={detailIdx}
              onClose={() => setDetailIdx(null)}
              onPick={onChoose}
              onRerollCard={onRerollCard}
              isFreeReroll={isFreeReroll}
              rerollCost={cost}
              canAffordReroll={canAfford}
            />
          );
        })()}
      </div>
    </div>
  );
}

export default QiSparkChoiceModal;
