import { SELECTION_BY_ID, SELECTION_RARITY } from '../data/selections';
import { JADE_COSTS } from '../systems/jade';

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY = {
  cultivation: { icon: '☯', color: '#a78bfa' },
  combat:      { icon: '⚔', color: '#f87171' },
  gathering:   { icon: '✿', color: '#4ade80' },
  mining:      { icon: '⛏', color: '#fb923c' },
  economy:     { icon: '◈', color: '#fbbf24' },
  special:     { icon: '✦', color: '#22d3ee' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEffect(effect) {
  if (effect.type !== 'stat_mod') return null;
  const prefix = effect.mod === 'more' ? '×' : '+';
  const val    = effect.mod === 'increased'
    ? `${Math.round(effect.value * 100)}%`
    : effect.mod === 'more'
    ? effect.value.toFixed(2)
    : effect.value;
  return `${prefix}${val} ${effect.stat.replace(/_/g, ' ')}`;
}

// ── Card ─────────────────────────────────────────────────────────────────────

function AugmentCard({ optionId, index, onPick, onRerollOne, rerollCost, hasFreeReroll, canAffordReroll }) {
  const opt      = SELECTION_BY_ID[optionId];
  if (!opt) return null;

  const rarity   = SELECTION_RARITY[opt.rarity];
  const cat      = CATEGORY[opt.category] ?? { icon: '◆', color: '#9ca3af' };
  const effects  = opt.effects.map(fmtEffect).filter(Boolean);

  return (
    <div
      className={`augment-card augment-card-${opt.rarity}`}
      style={{ '--cat-color': cat.color, '--rarity-color': rarity.color }}
      onClick={() => onPick(optionId)}
    >
      {/* Category strip */}
      <div className="augment-cat-strip">
        <span className="augment-cat-icon">{cat.icon}</span>
        <span className="augment-cat-label">{opt.category}</span>
        <span className="augment-rarity-dot" style={{ background: rarity.color }} title={rarity.label} />
      </div>

      {/* Body */}
      <div className="augment-body">
        <p className="augment-name">{opt.name}</p>
        <p className="augment-desc">{opt.description}</p>
        {effects.length > 0 && (
          <div className="augment-effects">
            {effects.map((e, i) => <span key={i} className="augment-effect-chip">{e}</span>)}
          </div>
        )}
        {opt.maxStacks > 1 && (
          <span className="augment-stacks">Max ×{opt.maxStacks}</span>
        )}
      </div>

      {/* Per-card reroll */}
      <button
        className={`augment-reroll${!canAffordReroll ? ' augment-reroll-disabled' : ''}`}
        onClick={e => { e.stopPropagation(); canAffordReroll && onRerollOne(index); }}
        disabled={!canAffordReroll}
        title={hasFreeReroll ? 'Reroll (free)' : `Reroll (${rerollCost} Jade)`}
      >
        ↺{hasFreeReroll ? '' : ` ${rerollCost}`}
      </button>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function SelectionModal({ selection, jadeBalance, onPick, onRerollOne, onClose }) {
  if (!selection) return null;

  const { id, realmLabel, tier, options, freeRerolls, rerollsUsed } = selection;
  const hasFreeReroll = rerollsUsed < freeRerolls;
  const rerollCost    = hasFreeReroll ? 0
    : tier === 'breakthrough' ? JADE_COSTS.reroll_extra : JADE_COSTS.reroll_minor;
  const canAffordReroll = hasFreeReroll || jadeBalance >= rerollCost;
  const isBreakthrough  = tier === 'breakthrough';

  return (
    <div className="modal-overlay sel-overlay" onClick={onClose}>
      <div
        className={`sel-modal${isBreakthrough ? ' sel-modal-breakthrough' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sel-header">
          {isBreakthrough && <span className="sel-breakthrough-badge">⚡ Breakthrough</span>}
          <h2 className="sel-title">
            {isBreakthrough ? 'Breakthrough Reward' : 'Level-Up Reward'}
          </h2>
          <p className="sel-realm">{realmLabel}</p>
        </div>

        {/* Augment cards */}
        <div className="augment-row">
          {options.map((optId, i) => (
            <AugmentCard
              key={optId}
              optionId={optId}
              index={i}
              onPick={(oId) => onPick(id, oId)}
              onRerollOne={(idx) => onRerollOne(id, idx)}
              hasFreeReroll={hasFreeReroll}
              rerollCost={rerollCost}
              canAffordReroll={canAffordReroll}
            />
          ))}
        </div>

        {/* Footer — just skip + jade balance */}
        <div className="sel-footer">
          <span className="sel-jade-balance">🪨 {jadeBalance}</span>
          <button className="sel-skip-btn" onClick={onClose}>Decide Later</button>
        </div>
      </div>
    </div>
  );
}

export default SelectionModal;
