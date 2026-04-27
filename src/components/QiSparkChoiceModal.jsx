import { useEffect, useRef } from 'react';
import { QI_SPARK_BY_ID, SPARK_RARITY } from '../data/qiSparks';

const CHOICE_TIMEOUT_MS = 30_000;

// ── Single card ──────────────────────────────────────────────────────────────

function SparkCard({ sparkId, onPick }) {
  const card = QI_SPARK_BY_ID[sparkId];
  if (!card) return null;
  const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;

  return (
    <div
      className={`qi-spark-card qi-spark-card-${card.rarity}`}
      style={{ '--rarity-color': rarity.color }}
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
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

/**
 * Two-card pick UI. Auto-resolves to the leftmost card after CHOICE_TIMEOUT_MS
 * if the player ignores it, so cultivation never blocks indefinitely.
 *
 * Props:
 *   offer:           { id, cards, rerollsUsed, freeRerollsLeft }
 *   bloodLotusBalance
 *   nextRerollCost:  number (0 if free reroll available)
 *   onChoose(sparkId)
 *   onReroll()
 *   onSkip()
 */
function QiSparkChoiceModal({
  offer,
  bloodLotusBalance,
  nextRerollCost,
  onChoose,
  onReroll,
  onSkip,
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

  const isFreeReroll = (offer.freeRerollsLeft ?? 0) > 0;
  const canAffordReroll = isFreeReroll || (bloodLotusBalance ?? 0) >= nextRerollCost;

  return (
    <div className="modal-overlay qi-spark-overlay">
      <div className="qi-spark-modal" onClick={e => e.stopPropagation()}>
        <div className="qi-spark-header">
          <h2 className="qi-spark-title">Qi Spark</h2>
          <p className="qi-spark-subtitle">A spark of dao reaches you. Choose one.</p>
        </div>

        <div className="qi-spark-grid">
          {offer.cards.map((sparkId) => (
            <SparkCard key={sparkId} sparkId={sparkId} onPick={onChoose} />
          ))}
        </div>

        <div className="qi-spark-footer">
          <button
            className={`qi-spark-reroll-btn${isFreeReroll ? ' qi-spark-reroll-free' : ''}${!canAffordReroll ? ' qi-spark-reroll-locked' : ''}`}
            disabled={!canAffordReroll}
            onClick={onReroll}
            title={
              isFreeReroll      ? 'Reroll — free!'
              : !canAffordReroll ? `Need ${nextRerollCost} Blood Lotus`
              :                    `Reroll — costs ${nextRerollCost} Blood Lotus`
            }
          >
            ↺ {isFreeReroll ? 'Reroll (Free)' : `Reroll · ${nextRerollCost} BL`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QiSparkChoiceModal;
