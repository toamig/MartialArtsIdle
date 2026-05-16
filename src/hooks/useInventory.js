import { useState, useEffect } from 'react';
import STARTER_INVENTORY from '../data/starterInventory';
import { FEATURES } from '../data/featureFlags';

const SAVE_KEY = 'mai_inventory';

function loadInventory() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveInventory(inv) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(inv));
  } catch {}
}

export default function useInventory() {
  const [inventory, setInventory] = useState(() => {
    const loaded = loadInventory();
    if (loaded) return loaded;
    // Combat hidden in v1 → don't seed combat-adjacent items. When combat
    // ships in v2 and FEATURES.combat flips true, fresh saves get the
    // starter set; existing saves keep whatever was on disk untouched.
    return FEATURES.combat ? { ...STARTER_INVENTORY } : {};
  });

  useEffect(() => {
    const interval = setInterval(() => {
      saveInventory(inventory);
    }, 2000);
    return () => clearInterval(interval);
  }, [inventory]);

  const getQuantity = (itemId) => inventory[itemId] || 0;

  const addItem = (itemId, amount = 1) => {
    setInventory((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + amount,
    }));
  };

  const removeItem = (itemId, amount = 1) => {
    setInventory((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current - amount);
      return { ...prev, [itemId]: next };
    });
  };

  return { inventory, getQuantity, addItem, removeItem };
}
