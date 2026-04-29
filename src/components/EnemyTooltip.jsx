import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ALL_MATERIALS, RARITY } from '../data/materials';
import { fmt as fmtNum } from '../utils/format';

const DAMAGE_COLOR = {
  physical:  '#fb923c',
  elemental: '#22d3ee',
};

const DAMAGE_ICON = {
  physical:  '⚔',
  elemental: '✦',
};

const formatNum = fmtNum;

function calcStats(enemyDef, regionIndex) {
  const idx    = Math.max(0, regionIndex ?? 0);
  const hpBase  = 150 * Math.pow(1.12, idx);
  const atkBase =  18 * Math.pow(1.12, idx);
  return {
    hp:  Math.max(100, Math.floor(hpBase  * (enemyDef?.statMult?.hp  ?? 1))),
    atk: Math.max(10,  Math.floor(atkBase * (enemyDef?.statMult?.atk ?? 1))),
  };
}

export default function EnemyTooltip({ enemyDef, regionIndex, style }) {
  const { t: tGame } = useTranslation('game');
  if (!enemyDef || !style) return null;

  const stats   = calcStats(enemyDef, regionIndex);
  const dtColor = DAMAGE_COLOR[enemyDef.damageType] ?? '#9ca3af';
  const dtIcon  = DAMAGE_ICON[enemyDef.damageType]  ?? '⚔';
  const name    = tGame(`enemies.${enemyDef.id}.name`, { defaultValue: enemyDef.name });

  const content = (
    <div className="enemy-tooltip" style={style}>

      <div className="enemy-tooltip-header">
        <span className="enemy-tooltip-name">{name}</span>
        <span className="enemy-tooltip-dtype" style={{ color: dtColor }}>
          {dtIcon} {enemyDef.damageType}
        </span>
      </div>

      <div className="enemy-tooltip-section">
        <span className="enemy-tooltip-section-label">Stats</span>
        <div className="enemy-tooltip-stat-row">
          <span className="enemy-tooltip-stat-label">HP</span>
          <span className="enemy-tooltip-stat-value">{formatNum(stats.hp)}</span>
        </div>
        <div className="enemy-tooltip-stat-row">
          <span className="enemy-tooltip-stat-label">ATK</span>
          <span className="enemy-tooltip-stat-value">{formatNum(stats.atk)}</span>
        </div>
      </div>

      {(enemyDef.drops?.length > 0 || enemyDef.techniqueDrop) && (
        <div className="enemy-tooltip-section">
          <span className="enemy-tooltip-section-label">Drops</span>
          {(enemyDef.drops ?? []).map((drop, i) => {
            const mat      = ALL_MATERIALS[drop.itemId];
            const rarity   = mat ? RARITY[mat.rarity] : null;
            const itemName = mat
              ? tGame(`items.${drop.itemId}.name`, { defaultValue: mat.name })
              : drop.itemId;
            const qty = drop.qty[0] === drop.qty[1]
              ? `×${drop.qty[0]}`
              : `×${drop.qty[0]}–${drop.qty[1]}`;
            return (
              <div key={i} className="enemy-tooltip-drop-row">
                <span className="enemy-tooltip-drop-name" style={{ color: rarity?.color }}>
                  {itemName} {qty}
                </span>
                <span className="enemy-tooltip-drop-chance">
                  {Math.round(drop.chance * 100)}%
                </span>
              </div>
            );
          })}
          {enemyDef.techniqueDrop && (
            <>
              <div className="enemy-tooltip-drop-row">
                <span className="enemy-tooltip-drop-name" style={{ color: '#22d3ee' }}>
                  Technique Scroll
                </span>
                <span className="enemy-tooltip-drop-chance">
                  {Math.round(enemyDef.techniqueDrop.chance * 100)}%
                </span>
              </div>
              <div className="enemy-tooltip-drop-row">
                <span className="enemy-tooltip-drop-name" style={{ color: '#facc15' }}>
                  Artefact
                </span>
                <span className="enemy-tooltip-drop-chance">
                  {Math.round(enemyDef.techniqueDrop.chance * 2.0 * 100)}%
                </span>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
