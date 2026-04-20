import { useState } from 'react';
import { CULTIVATION_ITEMS, RARITY, getRefinedQi } from '../data/materials';

const BASE = import.meta.env.BASE_URL;

const TIER_THRESHOLDS = [1000, 750, 500, 350, 200, 100, 50, 25, 10, 1];
const TIER_VALUES     = [  10,   9,   8,   7,   6,   5,  4,  3,  2, 1];

function getCrystalTier(level) {
  if (level <= 0) return null;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (level >= TIER_THRESHOLDS[i]) return TIER_VALUES[i];
  }
  return 1;
}

function fmtRqi(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function StoneCard({ stone, selected, onSelect }) {
  const color = RARITY[stone.rarity]?.color ?? '#9ca3af';
  return (
    <button
      className={`cfm-stone${selected ? ' cfm-stone-sel' : ''}`}
      style={{ '--rarity-color': color }}
      onClick={onSelect}
    >
      <span className="cfm-stone-rqi">+{fmtRqi(stone.refinedQiValue)}</span>
      <span className="cfm-stone-name">{stone.name}</span>
      <span className="cfm-stone-count">×{stone.qty}</span>
    </button>
  );
}

function CrystalFeedModal({ crystal, inventory, onClose }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [feedQty, setFeedQty]           = useState(1);

  const { level, refinedQi, requiredForNext, crystalQiBonus, feed } = crystal;
  const nextBonus = (level + 1) * 2;

  const availableStones = CULTIVATION_ITEMS
    .map(item => ({
      ...item,
      qty:             inventory.getQuantity(item.id),
      refinedQiValue:  getRefinedQi(item.id),
    }))
    .filter(s => s.qty > 0);

  const selectedStillAvailable = selectedItem && availableStones.some(s => s.id === selectedItem);
  const effectiveSelected      = selectedStillAvailable ? selectedItem : null;
  const selectedStone          = effectiveSelected ? availableStones.find(s => s.id === effectiveSelected) : null;
  const selectedOwned          = selectedStone?.qty ?? 0;
  const rqiPerUnit             = selectedStone ? getRefinedQi(effectiveSelected) : 0;
  const totalGain              = feedQty * rqiPerUnit;
  const willLevelUp            = effectiveSelected && (refinedQi + totalGain) >= requiredForNext;

  const pct      = requiredForNext > 0 ? Math.min(100, (refinedQi / requiredForNext) * 100) : 100;
  const tier       = getCrystalTier(level) ?? 1;
  const crystalSrc = `${BASE}crystals/crystal_${tier}.png`;

  const clampQty = (next) => Math.max(1, Math.min(next, selectedOwned));

  const handleFeed = () => {
    if (!effectiveSelected || feedQty <= 0) return;
    feed(effectiveSelected, feedQty);
    const remaining = inventory.getQuantity(effectiveSelected) - feedQty;
    if (remaining <= 0) {
      setSelectedItem(null);
      setFeedQty(1);
    } else {
      setFeedQty(q => Math.min(q, remaining));
    }
  };

  const handleSelect = (id) => {
    setSelectedItem(id);
    setFeedQty(1);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cfm-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="cfm-header">
          <img src={crystalSrc} className="cfm-crystal-img" alt="" draggable="false" />
          <div className="cfm-header-text">
            <div className="cfm-title">Qi Crystal</div>
            <div className="cfm-subtitle">Level {level}</div>
          </div>
          <div className="cfm-bonus-block">
            {level > 0 && (
              <div className="cfm-bonus-current">
                <span className="cfm-bonus-gem">◆</span> +{crystalQiBonus} Qi/s
              </div>
            )}
            <div className="cfm-bonus-next">
              <span className="cfm-bonus-arrow">▲</span>
              <span>Lv.{level + 1} → +{nextBonus} Qi/s</span>
            </div>
          </div>
          <button className="journey-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Refinement progress ── */}
        <div className="cfm-progress-wrap">
          <div className="cfm-progress-track">
            <div className="cfm-progress-fill" style={{ width: `${pct}%` }} />
            {effectiveSelected && totalGain > 0 && (
              <div
                className="cfm-progress-preview"
                style={{ width: `${Math.min(100, ((refinedQi + totalGain) / requiredForNext) * 100)}%` }}
              />
            )}
          </div>
          <div className="cfm-progress-labels">
            <span>{fmtRqi(refinedQi)} / {fmtRqi(requiredForNext)} RQI</span>
            <span className="cfm-progress-next">Level {level + 1}</span>
          </div>
        </div>

        {/* ── Stone grid ── */}
        <div className="cfm-section-label">Feed QI Stones</div>

        {availableStones.length === 0 ? (
          <div className="cfm-empty">
            <span className="cfm-empty-icon">🪨</span>
            <span>No QI stones available</span>
            <span className="cfm-empty-hint">Mine or gather cultivation stones first</span>
          </div>
        ) : (
          <div className="cfm-stone-grid">
            {availableStones.map(stone => (
              <StoneCard
                key={stone.id}
                stone={stone}
                selected={effectiveSelected === stone.id}
                onSelect={() => handleSelect(stone.id)}
              />
            ))}
          </div>
        )}

        {/* ── Controls ── */}
        {effectiveSelected && selectedStone && (
          <div className="cfm-controls">
            <div className="cfm-controls-name" style={{ color: RARITY[selectedStone.rarity]?.color }}>
              {selectedStone.name}
            </div>
            <div className="cfm-qty-row">
              <button className="cfm-qty-btn" onClick={() => setFeedQty(q => clampQty(q - 1))} disabled={feedQty <= 1}>−</button>
              <span className="cfm-qty-val">{feedQty}</span>
              <button className="cfm-qty-btn" onClick={() => setFeedQty(q => clampQty(q + 1))} disabled={feedQty >= selectedOwned}>+</button>
              <button className="cfm-qty-btn cfm-qty-step" onClick={() => setFeedQty(q => clampQty(q + 10))}>+10</button>
              <button className="cfm-qty-btn cfm-qty-max" onClick={() => setFeedQty(selectedOwned)}>Max</button>
            </div>
            <div className="cfm-gain-preview">
              Gain: <strong>+{fmtRqi(totalGain)} RQI</strong>
              {willLevelUp && <span className="cfm-levelup-tag">Level Up!</span>}
            </div>
            <button className={`cfm-refine-btn${willLevelUp ? ' cfm-refine-levelup' : ''}`} onClick={handleFeed}>
              {willLevelUp ? '⚡ Refine & Level Up' : '⚡ Refine'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrystalFeedModal;
