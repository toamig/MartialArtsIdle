import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RARITY, ALL_MATERIALS, getGatherCost } from '../data/materials';
import { AudioManager } from '../audio';

const BASE_GATHER_SPEED = 3; // gather points per second

/** Weighted random pick from a drop array (uses `chance` as weight). */
function pickWeighted(drops) {
  if (!drops?.length) return null;
  const total = drops.reduce((s, d) => s + d.chance, 0);
  let roll = Math.random() * total;
  for (const d of drops) {
    roll -= d.chance;
    if (roll <= 0) return d;
  }
  return drops[drops.length - 1];
}

/** Random integer in [min, max] inclusive. */
function rollQty([min, max]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function GatheringScreen({ region, inventory, onBack, getFullStats }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const gatherDrops  = region.gatherDrops ?? [];
  // Split: primary herb drops vs bonus cultivation drops (QI stones)
  const primaryDrops = gatherDrops.filter(d => (ALL_MATERIALS[d.itemId]?.type ?? '') !== 'cultivation');
  const bonusDrops   = gatherDrops.filter(d => (ALL_MATERIALS[d.itemId]?.type ?? '') === 'cultivation');
  const activePools  = primaryDrops.length ? primaryDrops : gatherDrops;

  function buildCurrent(drop) {
    const mat = ALL_MATERIALS[drop?.itemId] ?? {};
    return { ...mat, itemId: drop?.itemId, gatherCost: getGatherCost(drop?.itemId ?? ''), qty: drop?.qty ?? [1, 1] };
  }

  const [current, setCurrent]     = useState(() => buildCurrent(pickWeighted(activePools)));
  const [collected, setCollected] = useState([]);

  const progressBarRef  = useRef(null);
  const progressVal     = useRef(0);
  const currentRef      = useRef(current);
  const lastTRef        = useRef(null);
  const getFullStatsRef = useRef(getFullStats);

  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { getFullStatsRef.current = getFullStats; }, [getFullStats]);

  useEffect(() => {
    if (!gatherDrops.length) return;
    progressVal.current = 0;
    lastTRef.current = null;
    let raf;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);

      if (!lastTRef.current) { lastTRef.current = now; return; }
      const dt = Math.min((now - lastTRef.current) / 1000, 0.1);
      lastTRef.current = now;

      const stats = getFullStatsRef.current?.();
      const speed = BASE_GATHER_SPEED + Math.max(0, stats?.harvestSpeed ?? 0);
      progressVal.current += speed * dt;
      const cost = currentRef.current.gatherCost;
      const pct  = Math.min(progressVal.current / cost, 1);

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${pct * 100}%`;
      }

      if (progressVal.current >= cost) {
        progressVal.current -= cost;

        const luckPct = Math.min(100, Math.max(0, stats?.harvestLuck ?? 0));
        const gathered = [];

        // Give primary herb (always)
        const cur = currentRef.current;
        const qty = rollQty(cur.qty ?? [1, 1]) + (luckPct > 0 && Math.random() * 100 < luckPct ? 1 : 0);
        if (inventory && cur.itemId) inventory.addItem(cur.itemId, qty);
        gathered.push({ itemId: cur.itemId, name: cur.name, rarity: cur.rarity ?? 'Iron', qty });
        AudioManager.playSfx((cur.rarity ?? 'Iron') !== 'Iron' ? 'gather_rare' : 'gather_collect');

        // Roll bonus drops (cultivation / QI stones)
        for (const bd of bonusDrops) {
          if (Math.random() < bd.chance) {
            const bqty = rollQty(bd.qty ?? [1, 1]);
            const bmat = ALL_MATERIALS[bd.itemId];
            if (inventory) inventory.addItem(bd.itemId, bqty);
            gathered.push({ itemId: bd.itemId, name: bmat?.name ?? bd.itemId, rarity: bmat?.rarity ?? 'Iron', qty: bqty });
          }
        }

        // Update collected log
        setCollected(prev => {
          let next = [...prev];
          for (const g of gathered) {
            const idx = next.findIndex(c => c.itemId === g.itemId);
            if (idx >= 0) {
              next[idx] = { ...next[idx], count: next[idx].count + g.qty };
            } else {
              next = [{ itemId: g.itemId, name: g.name, rarity: g.rarity, count: g.qty }, ...next];
            }
          }
          return next;
        });

        // Pick next primary
        const nextDrop = pickWeighted(activePools);
        if (nextDrop) {
          const next = buildCurrent(nextDrop);
          currentRef.current = next;
          setCurrent(next);
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const color = RARITY[current.rarity]?.color ?? '#aaa';
  const stats = getFullStats?.();
  const speed = BASE_GATHER_SPEED + Math.max(0, stats?.harvestSpeed ?? 0);
  const luck  = stats?.harvestLuck ?? 0;

  const regionName  = tGame(`regions.${region.name}.name`, { defaultValue: region.name });
  const itemName    = tGame(`items.${current.itemId}.name`, { defaultValue: current.name ?? current.itemId ?? '' });
  const rarityLabel = t(`rarity.${current.rarity}`, { defaultValue: current.rarity });

  return (
    <div className="screen harvest-screen">
      <div className="harvest-header">
        <button className="back-btn" onClick={onBack}>{t('common.back')}</button>
        <div className="harvest-location">
          <span className="harvest-activity">{t('gathering.activity')}</span>
          <span className="harvest-region">{regionName}</span>
        </div>
      </div>

      <div className="harvest-card">
        <div className="harvest-item-row">
          <span className="harvest-item-name" style={{ color }}>{itemName}</span>
          <span className="harvest-item-rarity" style={{ color, borderColor: color }}>
            {rarityLabel}
          </span>
        </div>
        <div className="harvest-cost-label">
          {luck > 0
            ? t('gathering.costSpeedLuck', { cost: current.gatherCost, speed, luck })
            : t('gathering.costSpeed', { cost: current.gatherCost, speed })}
        </div>
        <div className="harvest-bar-track">
          <div ref={progressBarRef} className="harvest-bar-fill gather-fill" />
        </div>
      </div>

      <div className="harvest-loot">
        <p className="harvest-loot-title">{t('gathering.collected')}</p>
        {collected.length === 0
          ? <p className="harvest-loot-empty">{t('gathering.nothingYet', { defaultValue: '—' })}</p>
          : collected.map(item => (
            <div key={item.itemId} className="harvest-loot-row">
              <span
                className="harvest-loot-name"
                style={{ color: RARITY[item.rarity]?.color ?? '#aaa' }}
              >
                {tGame(`items.${item.itemId}.name`, { defaultValue: item.name })}
              </span>
              <span className="harvest-loot-count">×{item.count}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default GatheringScreen;
