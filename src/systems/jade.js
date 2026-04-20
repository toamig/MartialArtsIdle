/**
 * jade.js — Jade currency system.
 *
 * Jade is the single premium currency. Primarily purchased via IAP, earned
 * slowly through milestones, events, and the jade_per_breakthrough perk.
 *
 * Balance is persisted in localStorage separately from the main save so it
 * survives a save wipe (players keep paid currency after a reset).
 */

const JADE_KEY = 'mai_jade';

export function getJadeBalance() {
  try {
    const raw = localStorage.getItem(JADE_KEY);
    if (raw !== null) return Math.max(0, parseInt(raw, 10) || 0);
  } catch {}
  return 0;
}

export function addJade(amount) {
  const next = getJadeBalance() + Math.max(0, Math.floor(amount));
  try { localStorage.setItem(JADE_KEY, String(next)); } catch {}
  return next;
}

/**
 * Attempt to spend jade. Returns true and deducts if balance is sufficient.
 * Returns false without touching balance if insufficient.
 */
export function spendJade(amount) {
  const cost = Math.max(0, Math.floor(amount));
  const balance = getJadeBalance();
  if (balance < cost) return false;
  try { localStorage.setItem(JADE_KEY, String(balance - cost)); } catch {}
  return true;
}

// ── IAP stubs — replace with platform SDK calls when ready ───────────────────

export const JADE_PACKAGES = [
  { id: 'jade_60',   jade: 300,   price: '$0.99',  label: 'Handful of Jade'  },
  { id: 'jade_330',  jade: 1650,  price: '$4.99',  label: 'Pouch of Jade'    },
  { id: 'jade_980',  jade: 4900,  price: '$14.99', label: 'Chest of Jade'    },
  { id: 'jade_1980', jade: 9900,  price: '$29.99', label: 'Vault of Jade'    },
  { id: 'jade_3280', jade: 16400, price: '$49.99', label: 'Treasury of Jade' },
  { id: 'jade_6480', jade: 32400, price: '$99.99', label: 'Heaven\'s Fortune' },
];

export async function purchaseJade(packageId) {
  const { purchaseProduct } = await import('../iap/iapService');
  const pkg = JADE_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return { ok: false, error: 'Unknown package' };
  try {
    await purchaseProduct(packageId);
    addJade(pkg.jade);
    return { ok: true, jade: pkg.jade };
  } catch (err) {
    if (err?.message?.includes('cancel')) return { ok: false, cancelled: true };
    return { ok: false, error: err?.message ?? 'Purchase failed' };
  }
}

// ── Jade costs ────────────────────────────────────────────────────────────────

export const JADE_COSTS = {
  reroll_minor:       50,   // reroll on a minor level-up selection
  reroll_breakthrough: 0,   // first reroll on breakthrough is free (handled in hook)
  reroll_extra:       100,  // additional rerolls on breakthrough after the free one
  // Law offers are rarer than augments and shape several realms of play,
  // so each reroll past the free first costs more than reroll_extra.
  reroll_law_extra:   150,
};
