import { useEffect, useRef } from 'react';
import { QI_SPARK_BY_ID, SPARK_RARITY } from '../data/qiSparks';

const CHOICE_TIMEOUT_MS = 30_000;

// ── Single card with its own per-card reroll button ─────────────────────────

function SparkCard({
  sparkId,
  cardIndex,
  onPick,
  onRerollCard,
  isFreeReroll,
  rerollCost,
  canAffordReroll,
}) {
  const card = QI_SPARK_BY_ID[sparkId];
  if (!card) return null;
  const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;

  return (
    <div
      className={`qi-spark-card qi-spark-card-${card.rarity}`}
      style={{ '--rarity-color': rarity.color }}
    >
      <button
        type="button"
        className="qi-spark-card-pick"
        onClick={() => onPick(sparkId)}
      >
        <div className="qi-spark-strip">
          <span className="qi-spark-rarity-dot" style={{ background: rarity.color }} />
          <span className="qi-spark-rarity-label">{rarity.label}</span>
        </div>
        <div className="qi-spark-body">
          <p className="qi-spark-name">{card.name}</p>
          <p className="qi-spark-desc">{card.description}</p>
        </div>
      </button>
      {/* Per-card reroll button. First reroll on each card is FREE; subsequent
          rerolls cost escalating Blood Lotus, tracked independently. */}
      <button
        type="button"
        className={`qi-spark-card-reroll${isFreeReroll ? ' qi-spark-card-reroll-free' : ''}${!canAffordReroll ? ' qi-spark-card-reroll-locked' : ''}`}
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

  if (!offer) return null;

  const freeLeftPerCard = offer.cardFreeRerollsLeft ?? [1, 1];
  const pityRemaining   = Math.max(0, pityThreshold - pityCounter);
  const pityImminent    = pityRemaining <= 3;
  const pityGuaranteed  = pityRemaining === 0;
  const chancePct       = Math.round(legendaryChance * 100);

  return (
    <div className="modal-overlay qi-spark-overlay">
      <div className="qi-spark-modal" onClick={e => e.stopPropagation()}>
        <div className="qi-spark-header">
          <h2 className="qi-spark-title">Qi Spark</h2>
          <p className="qi-spark-subtitle">A spark of dao reaches you. Choose one.</p>
        </div>

        <div className="qi-spark-grid">
          {offer.cards.map((sparkId, idx) => {
            const cost          = nextRerollCostFor?.(idx) ?? 0;
            const isFreeReroll  = (freeLeftPerCard[idx] ?? 0) > 0;
            const canAfford     = isFreeReroll || (bloodLotusBalance ?? 0) >= cost;
            return (
              <SparkCard
                key={`${sparkId}-${idx}`}
                sparkId={sparkId}
                cardIndex={idx}
                onPick={onChoose}
                onRerollCard={onRerollCard}
                isFreeReroll={isFreeReroll}
                rerollCost={cost}
                canAffordReroll={canAfford}
              />
            );
          })}
        </div>

        <div className={`qi-spark-footer-meta${pityImminent ? ' qi-spark-footer-meta-pity-soon' : ''}${pityGuaranteed ? ' qi-spark-footer-meta-pity-now' : ''}`}>
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
      </div>
    </div>
  );
}

export default QiSparkChoiceModal;
