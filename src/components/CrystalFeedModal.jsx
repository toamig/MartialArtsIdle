import { useState } from 'react';
import { ITEMS, RARITY, getRefinedQi } from '../data/items';

function CrystalFeedModal({ crystal, inventory, onClose }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [feedQty, setFeedQty] = useState(1);

  const { level, refinedQi, requiredForNext, crystalQiBonus, feed } = crystal;

  const availableStones = ITEMS.cultivation
    .map(item => ({
      ...item,
      qty: inventory.getQuantity(item.id),
      refinedQiValue: getRefinedQi(item.id),
    }))
    .filter(s => s.qty > 0);

  // Clear selection if the selected stone is no longer available
  const selectedStillAvailable = selectedItem && availableStones.some(s => s.id === selectedItem);
  const effectiveSelected = selectedStillAvailable ? selectedItem : null;
  const selectedOwned = effectiveSelected ? inventory.getQuantity(effectiveSelected) : 0;

  const handleFeed = () => {
    if (!effectiveSelected || feedQty <= 0) return;
    feed(effectiveSelected, feedQty);
    const remaining = inventory.getQuantity(effectiveSelected);
    if (remaining <= 0) {
      setSelectedItem(null);
      setFeedQty(1);
    } else {
      setFeedQty(q => Math.min(q, remaining));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content crystal-feed-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>x</button>

        <h2 className="modal-title">Key Crystal</h2>

        <div className="crystal-feed-info">
          <span className="crystal-feed-level">Level {level}</span>
          <span className="crystal-feed-bonus">+{crystalQiBonus} Qi/s</span>
        </div>

        <div className="crystal-feed-bar-wrap">
          <div className="crystal-feed-bar">
            <div
              className="crystal-feed-bar-fill"
              style={{ width: `${(refinedQi / requiredForNext) * 100}%` }}
            />
          </div>
          <span className="crystal-feed-bar-label">
            {refinedQi} / {requiredForNext} Refined QI
          </span>
        </div>

        <div className="crystal-feed-stones">
          {availableStones.length === 0 && (
            <p className="crystal-feed-empty">No QI stones available</p>
          )}
          {availableStones.map(stone => (
            <div
              key={stone.id}
              className={`crystal-feed-stone${effectiveSelected === stone.id ? ' crystal-feed-stone-selected' : ''}`}
              onClick={() => { setSelectedItem(stone.id); setFeedQty(1); }}
              role="button"
            >
              <span className="crystal-feed-stone-name" style={{ color: RARITY[stone.rarity]?.color }}>
                {stone.name}
              </span>
              <span className="crystal-feed-stone-qty">x{stone.qty}</span>
              <span className="crystal-feed-stone-val">+{stone.refinedQiValue}</span>
            </div>
          ))}
        </div>

        {effectiveSelected && (
          <div className="crystal-feed-actions">
            <div className="crystal-feed-qty-row">
              <button
                className="crystal-feed-qty-btn"
                onClick={() => setFeedQty(q => Math.max(1, q - 1))}
                disabled={feedQty <= 1}
              >−</button>
              <span className="crystal-feed-qty-value">{feedQty}</span>
              <button
                className="crystal-feed-qty-btn"
                onClick={() => setFeedQty(q => Math.min(q + 1, selectedOwned))}
                disabled={feedQty >= selectedOwned}
              >+</button>
              <button
                className="crystal-feed-qty-btn crystal-feed-max-btn"
                onClick={() => setFeedQty(selectedOwned)}
              >Max</button>
            </div>
            <button className="crystal-feed-btn" onClick={handleFeed}>
              Feed (+{feedQty * getRefinedQi(effectiveSelected)} RQI)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrystalFeedModal;
