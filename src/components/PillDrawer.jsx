import { useState, useMemo } from 'react';
import {
  PILLS, PILLS_BY_ID, ITEM_RARITY,
  PILL_CATEGORIES, PILL_CATEGORY_LABEL,
} from '../data/pills';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PILL_STAT_DISPLAY = {
  qi_speed:          'Qi Speed',
  defense:           'Defense',
  health:            'Health',
  physical_damage:   'Phys. Dmg',
  elemental_damage:  'Elem. Dmg',
  harvest_speed:     'Harvest Speed',
  mining_speed:      'Mining Speed',
  harvest_luck:      'Harvest Luck',
  mining_luck:       'Mining Luck',
  soul_toughness:    'Soul Tough.',
  elemental_defense: 'Elem. Def',
  essence:           'Essence',
};

function formatPillEffect(eff, duration) {
  const label = PILL_STAT_DISPLAY[eff.stat] ?? eff.stat;
  if (eff.stat === 'qi_speed' || eff.type === 'increased') {
    return `+${Math.round(eff.value * 100)}% ${label} (${duration}s)`;
  }
  return `+${eff.value} ${label} (${duration}s)`;
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

/**
 * Pill drawer — bottom sheet with category tabs.
 *
 * Props:
 *   open          - boolean, show/hide
 *   onClose       - () => void
 *   defaultTab    - initial category (cultivation | combat | harvest | mining)
 *   pills         - usePills() API (needs getOwnedCount, usePill)
 */
function PillDrawer({ open, onClose, defaultTab = 'cultivation', pills }) {
  const [tab, setTab] = useState(defaultTab);

  // Group owned pills by category. A pill with multiple categories appears
  // in each of its tabs (intentional — better discoverability).
  const byCategory = useMemo(() => {
    const map = { cultivation: [], combat: [], harvest: [], mining: [] };
    for (const p of PILLS) {
      const owned = pills?.getOwnedCount?.(p.id) ?? 0;
      if (owned <= 0) continue;
      for (const cat of p.categories) map[cat].push({ pill: p, owned });
    }
    return map;
  }, [pills]);

  if (!open) return null;

  const visible = byCategory[tab] ?? [];

  return (
    <div className="pill-drawer-backdrop" onClick={onClose}>
      <div className="pill-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="pill-drawer-header">
          <span className="pill-drawer-title">Pills</span>
          <button className="pill-drawer-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Category tabs */}
        <div className="pill-drawer-tabs">
          {PILL_CATEGORIES.map((cat) => {
            const count = byCategory[cat].reduce((sum, e) => sum + e.owned, 0);
            return (
              <button
                key={cat}
                className={`pill-drawer-tab${tab === cat ? ' active' : ''}`}
                onClick={() => setTab(cat)}
              >
                <span>{PILL_CATEGORY_LABEL[cat]}</span>
                <span className="pill-drawer-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="pill-drawer-body">
          {visible.length === 0 ? (
            <div className="pill-drawer-empty">
              No {PILL_CATEGORY_LABEL[tab].toLowerCase()} pills yet. Brew some at the Production screen.
            </div>
          ) : (
            <div className="pill-drawer-grid">
              {visible.map(({ pill, owned }) => (
                <DrawerPillCard
                  key={pill.id}
                  pill={pill}
                  qty={owned}
                  onUse={() => pills.usePill(pill.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DrawerPillCard({ pill, qty, onUse }) {
  const color = ITEM_RARITY[pill.rarity]?.color ?? '#aaa';
  return (
    <div className="pill-drawer-card" style={{ borderColor: color }}>
      <div className="pill-drawer-card-head">
        <span className="pill-drawer-card-name" style={{ color }}>{pill.name}</span>
        <span className="pill-drawer-card-qty">×{qty}</span>
      </div>
      <div className="pill-drawer-card-effects">
        {pill.effects.map((eff, i) => (
          <div key={i} className="pill-drawer-card-effect">{formatPillEffect(eff, pill.duration)}</div>
        ))}
      </div>
      <button className="pill-drawer-card-use" onClick={onUse}>Use</button>
    </div>
  );
}

export default PillDrawer;
