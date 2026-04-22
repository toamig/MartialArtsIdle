import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PILLS, ITEM_RARITY,
  PILL_CATEGORIES, PILL_CATEGORY_LABEL,
} from '../data/pills';

const CAT_T_KEY = {
  combat:  'pillDrawer.catCombat',
  harvest: 'pillDrawer.catHarvest',
  mining:  'pillDrawer.catMining',
};

function DrawerPillCard({ pill, qty, onUse }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const [floats, setFloats] = useState([]);

  const color    = ITEM_RARITY[pill.rarity]?.color ?? '#aaa';
  const pillName = tGame(`items.${pill.id}.name`, { defaultValue: pill.name });

  function formatPillEffect(eff) {
    const label = t(`statNamesShort.${eff.stat}`, { defaultValue: eff.stat });
    if (eff.stat === 'qi_speed' || eff.type === 'increased') {
      return t('pillDrawer.effectPct', { pct: Math.round(eff.value * 100), stat: label });
    }
    return t('pillDrawer.effectFlat', { val: eff.value, stat: label });
  }

  const handleUse = useCallback(() => {
    const deltas = onUse();
    if (!deltas?.length) return;

    const newFloats = deltas.map((d, i) => {
      const statLabel = t(`statNamesShort.${d.stat}`, { defaultValue: d.stat });
      const isIncreased = d.stat === 'qi_speed' || !pill.effects.find(e => e.stat === d.stat && e.type === 'flat');
      const text = isIncreased
        ? `+${Math.round(d.value * 100)}% ${statLabel}`
        : `+${d.value} ${statLabel}`;
      return { id: `${Date.now()}-${i}`, text };
    });

    setFloats(prev => [...prev, ...newFloats]);
    setTimeout(() => {
      setFloats(prev => prev.filter(f => !newFloats.some(n => n.id === f.id)));
    }, 1300);
  }, [onUse, pill.effects, t]);

  return (
    <div className="pill-drawer-card" style={{ '--rarity-color': color, position: 'relative', overflow: 'visible' }}>
      {floats.map(f => (
        <span key={f.id} className="pill-stat-float" style={{ color }}>{f.text}</span>
      ))}
      <div className="pill-drawer-card-head">
        <span className="pill-drawer-card-name" style={{ color }}>{pillName}</span>
        <span className="pill-drawer-card-qty">×{qty}</span>
      </div>
      <div className="pill-drawer-card-effects">
        {pill.effects.map((eff, i) => (
          <div key={i} className="pill-drawer-card-effect">{formatPillEffect(eff)}</div>
        ))}
      </div>
      <button className="pill-drawer-card-use" onClick={handleUse} disabled={qty <= 0}>
        {t('pillDrawer.use')}
      </button>
    </div>
  );
}

function PillDrawer({ open, onClose, defaultTab = 'combat', pills }) {
  const { t } = useTranslation('ui');
  const [tab, setTab] = useState(defaultTab);

  const byCategory = useMemo(() => {
    const map = { combat: [], harvest: [], mining: [] };
    for (const p of PILLS) {
      const owned = pills?.getOwnedCount?.(p.id) ?? 0;
      if (owned <= 0) continue;
      for (const cat of p.categories) map[cat].push({ pill: p, owned });
    }
    return map;
  }, [pills]);

  if (!open) return null;

  const totalOwned = Object.values(pills?.ownedPills ?? {}).reduce((s, n) => s + n, 0);
  const visible    = byCategory[tab] ?? [];
  const tabTotal   = visible.reduce((sum, e) => sum + e.owned, 0);

  const handleConsumeAll = () => {
    const ids = [...new Set(visible.map(e => e.pill.id))];
    pills?.consumeAll?.(ids);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pill-modal" onClick={e => e.stopPropagation()}>
        <div className="pill-modal-header">
          <span className="pill-modal-title">◈ {t('pillDrawer.title')}</span>
          <span className="pill-modal-count-badge">{totalOwned} owned</span>
          <button className="journey-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="pill-modal-tab-row">
          <div className="pill-drawer-tabs">
            {PILL_CATEGORIES.map((cat) => {
              const count = byCategory[cat].reduce((sum, e) => sum + e.owned, 0);
              return (
                <button
                  key={cat}
                  className={`pill-drawer-tab${tab === cat ? ' active' : ''}`}
                  onClick={() => setTab(cat)}
                >
                  <span>{t(CAT_T_KEY[cat], { defaultValue: PILL_CATEGORY_LABEL[cat] })}</span>
                  <span className="pill-drawer-tab-count">{count}</span>
                </button>
              );
            })}
          </div>
          {tabTotal > 0 && (
            <button className="pill-modal-consume-all" onClick={handleConsumeAll}>
              Consume All ({tabTotal})
            </button>
          )}
        </div>

        <div className="pill-drawer-body">
          {visible.length === 0 ? (
            <div className="pill-drawer-empty">
              {t('pillDrawer.empty', {
                category: t(CAT_T_KEY[tab], { defaultValue: PILL_CATEGORY_LABEL[tab] }).toLowerCase(),
              })}
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

export default PillDrawer;
