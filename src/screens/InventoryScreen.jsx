import { useState } from 'react';
import { ITEMS, RARITY } from '../data/items';
import ItemModal from '../components/ItemModal';

const BASE = import.meta.env.BASE_URL;

const CATEGORIES = [
  { key: 'herbs', label: 'Herbs' },
  { key: 'minerals', label: 'Minerals' },
  { key: 'cultivation', label: 'Cultivation' },
];

function InventoryScreen({ inventory }) {
  const { getQuantity } = inventory;
  const [activeCategory, setActiveCategory] = useState('herbs');
  const [selectedItem, setSelectedItem] = useState(null);

  const items = ITEMS[activeCategory];

  return (
    <div className="screen inventory-screen">
      <h1>Inventory</h1>
      <p className="subtitle">Your collected materials</p>

      <div className="inv-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`inv-tab ${activeCategory === cat.key ? 'inv-tab-active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="inv-grid">
        {items.map((item) => {
          const qty = getQuantity(item.id);
          const rarity = RARITY[item.rarity];
          return (
            <button
              key={item.id}
              className="inv-slot"
              style={{ borderColor: qty > 0 ? rarity.color : undefined }}
              onClick={() => setSelectedItem(item)}
            >
              <img
                src={`${BASE}sprites/items/${item.id}.png`}
                alt={item.name}
                className="inv-icon"
              />
              <span className="inv-qty">{qty}</span>
              <span className="inv-name" style={{ color: rarity.color }}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          quantity={getQuantity(selectedItem.id)}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

export default InventoryScreen;
