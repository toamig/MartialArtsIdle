import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ALL_MATERIALS, RARITY, getGatherCost, getMineCost } from '../data/materials';
import { RATE_MULTIPLIER } from '../systems/autoFarm';

const BASE_SPEED = 3; // pts/sec — must match autoFarm.js BASE_GATHER_SPEED / BASE_MINE_SPEED

function formatTime(sec) {
  if (sec < 60)   return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60)     return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0  ? `${h}h ${rm}m` : `${h}h`;
}

function computeRates(drops, tab, activityStats) {
  const isGather = tab === 'gather';
  const bonus    = isGather
    ? Math.max(0, activityStats?.harvestSpeed ?? 0)
    : Math.max(0, activityStats?.miningSpeed  ?? 0);
  const speed      = (BASE_SPEED + bonus) * RATE_MULTIPLIER;
  const luckPct    = isGather
    ? (activityStats?.harvestLuck ?? 0)
    : (activityStats?.miningLuck  ?? 0);
  const tierUp     = activityStats?.gatherMineRarityUpChance ?? 0;
  const getCost    = isGather ? getGatherCost : getMineCost;

  const primaryDrops = drops.filter(d => (ALL_MATERIALS[d.itemId]?.type ?? '') !== 'cultivation');
  const bonusDrops   = drops.filter(d => (ALL_MATERIALS[d.itemId]?.type ?? '') === 'cultivation');
  const pool         = primaryDrops.length ? primaryDrops : drops;
  const totalW       = pool.reduce((s, d) => s + d.chance, 0);

  let cyclesPerSec = 0;
  const primaryRates = pool.map(drop => {
    const rate  = totalW > 0 ? (drop.chance / totalW) * (speed / getCost(drop.itemId)) : 0;
    cyclesPerSec += rate;
    return { ...drop, ratePerSec: rate };
  });

  const bonusRates = bonusDrops.map(drop => ({
    ...drop,
    ratePerSec: cyclesPerSec * drop.chance,
    isBonus: true,
  }));

  return { primaryRates, bonusRates, speed, bonus, luckPct, tierUp };
}

function DropRow({ drop, tGame }) {
  const mat    = ALL_MATERIALS[drop.itemId];
  const rarity = mat ? RARITY[mat.rarity] : null;
  const name   = mat
    ? tGame(`items.${drop.itemId}.name`, { defaultValue: mat.name })
    : drop.itemId;
  const qty = drop.qty[0] === drop.qty[1]
    ? `×${drop.qty[0]}`
    : `×${drop.qty[0]}–${drop.qty[1]}`;
  const pct        = Math.round(drop.chance * 100);
  const timePerDrop = drop.ratePerSec > 0 ? formatTime(1 / drop.ratePerSec) : '—';

  return (
    <div className="activity-tooltip-drop-row">
      <span className="activity-tooltip-drop-name" style={{ color: rarity?.color }}>
        {name} {qty}
      </span>
      <span className="activity-tooltip-drop-pct">{pct}%</span>
      <span className="activity-tooltip-drop-time">~{timePerDrop}</span>
    </div>
  );
}

export default function ActivityTooltip({ tab, drops, activityStats, style }) {
  const { t: tGame } = useTranslation('game');
  if (!drops?.length || !style) return null;

  const isGather = tab === 'gather';
  const { primaryRates, bonusRates, speed, bonus, luckPct, tierUp } = computeRates(drops, tab, activityStats);

  const content = (
    <div className="activity-tooltip" style={style}>

      <div className="activity-tooltip-header">
        <span className="activity-tooltip-title" style={{ color: isGather ? '#4ade80' : '#fb923c' }}>
          {isGather ? '🌿 Gathering' : '⛏ Mining'}
        </span>
      </div>

      <div className="activity-tooltip-section">
        <div className="activity-tooltip-stat-row">
          <span className="activity-tooltip-stat-label">Speed</span>
          <span className="activity-tooltip-stat-value">
            {speed} pts/s{bonus > 0 ? <span className="activity-tooltip-bonus"> (+{bonus})</span> : ''}
          </span>
        </div>
        {luckPct > 0 && (
          <div className="activity-tooltip-stat-row">
            <span className="activity-tooltip-stat-label">Luck</span>
            <span className="activity-tooltip-stat-value">{Math.round(luckPct)}%</span>
          </div>
        )}
        {tierUp > 0 && (
          <div className="activity-tooltip-stat-row">
            <span className="activity-tooltip-stat-label">Tier+</span>
            <span className="activity-tooltip-stat-value">{Math.round(tierUp * 100)}%</span>
          </div>
        )}
      </div>

      <div className="activity-tooltip-section">
        <div className="activity-tooltip-col-header">
          <span style={{ flex: 1 }}>Drop</span>
          <span className="activity-tooltip-col-chance">Pool</span>
          <span className="activity-tooltip-col-timer">Per item</span>
        </div>
        {primaryRates.map((drop, i) => (
          <DropRow key={i} drop={drop} tGame={tGame} />
        ))}
      </div>

      {bonusRates.length > 0 && (
        <div className="activity-tooltip-section">
          <span className="activity-tooltip-section-label">QI Stones (bonus)</span>
          {bonusRates.map((drop, i) => (
            <DropRow key={i} drop={drop} tGame={tGame} />
          ))}
        </div>
      )}

    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
