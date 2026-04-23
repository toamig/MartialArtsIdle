import { SELECTION_BY_ID, SELECTION_RARITY } from '../data/selections';
import { BLOOD_LOTUS_COSTS } from '../systems/bloodLotus';
import { LAW_RARITY } from '../data/laws';
import { formatUniqueDescription } from '../data/lawUniques';
import { MAX_LAWS } from '../hooks/useCultivation';

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY = {
  cultivation: { icon: '☯', color: '#a78bfa' },
  combat:      { icon: '⚔', color: '#f87171' },
  gathering:   { icon: '✿', color: '#4ade80' },
  mining:      { icon: '⛏', color: '#fb923c' },
  economy:     { icon: '◈', color: '#fbbf24' },
  special:     { icon: '✦', color: '#22d3ee' },
};

// ── Augment card (existing) ──────────────────────────────────────────────────

function AugmentCard({ optionId, onPick }) {
  const opt    = SELECTION_BY_ID[optionId];
  if (!opt) return null;

  const rarity = SELECTION_RARITY[opt.rarity];
  const cat    = CATEGORY[opt.category] ?? { icon: '◆', color: '#9ca3af' };

  return (
    <div
      className={`augment-card augment-card-${opt.rarity}`}
      style={{ '--cat-color': cat.color, '--rarity-color': rarity.color }}
      onClick={() => onPick(optionId)}
    >
      <div className="augment-cat-strip">
        <span className="augment-cat-icon">{cat.icon}</span>
        <span className="augment-cat-label">{opt.category}</span>
        <span className="augment-rarity-dot" style={{ background: rarity.color }} title={rarity.label} />
      </div>
      <div className="augment-body">
        <p className="augment-name">{opt.name}</p>
        <p className="augment-desc">{opt.description}</p>
        {opt.maxStacks > 1 && (
          <span className="augment-stacks">Max ×{opt.maxStacks}</span>
        )}
      </div>
    </div>
  );
}

// ── Law card (new) ───────────────────────────────────────────────────────────

/** Short one-line summary of a law's typeMults like "+120% Body". */
function formatLawTypeMults(law) {
  const parts = [];
  const tm = law.typeMults ?? {};
  for (const [stat, mult] of Object.entries(tm)) {
    if (!mult || mult <= 0) continue;
    const pct = Math.round((mult - 1) * 100);
    parts.push(`+${pct}% ${stat[0].toUpperCase()}${stat.slice(1)}`);
  }
  return parts.length ? parts.join(' · ') : 'No stat mults';
}

function LawCard({ law, onPick, disabled }) {
  const rarity = LAW_RARITY[law.rarity] ?? { color: '#9ca3af', label: law.rarity };
  const types = (law.types ?? []).join(' · ');
  const topUnique = law.uniques && Object.entries(law.uniques)[0];
  return (
    <div
      className={`augment-card law-card augment-card-${law.rarity?.toLowerCase?.() ?? 'iron'}`}
      style={{ '--cat-color': '#c9972a', '--rarity-color': rarity.color, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      onClick={() => !disabled && onPick?.()}
    >
      <div className="augment-cat-strip">
        <span className="augment-cat-icon">☯</span>
        <span className="augment-cat-label">{law.rarity}</span>
        <span className="augment-rarity-dot" style={{ background: rarity.color }} />
      </div>
      <div className="augment-body">
        <p className="augment-name" style={{ color: rarity.color }}>{law.name}</p>
        <p className="augment-desc">
          <strong>{types || 'general'}</strong>
        </p>
        <p className="augment-desc">
          ×{(law.cultivationSpeedMult ?? 1).toFixed(2)} cultivation · {formatLawTypeMults(law)}
        </p>
        {topUnique && (
          <p className="augment-desc" style={{ fontStyle: 'italic', opacity: 0.85 }}>
            {topUnique[0]}: {formatUniqueDescription(topUnique[1].id, topUnique[1].value)}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Law variant — modal body ─────────────────────────────────────────────────

function LawSelectionBody({ selection, bloodLotusBalance, onPickLaw, onSkipLaw, onRerollLawOne, ownedLaws, activeLawId, onDismantleLaw }) {
  const { id, realmLabel, lawOptions, freeRerolls, rerollsUsed, isFirst } = selection;
  const hasFreeReroll = rerollsUsed < freeRerolls;
  const rerollCost = hasFreeReroll ? 0 : BLOOD_LOTUS_COSTS.reroll_law_extra;
  const canAffordReroll = hasFreeReroll || (bloodLotusBalance ?? 0) >= rerollCost;

  // Library full guard — show an inline dismantle strip that blocks the
  // cards until the player frees a slot.
  const libraryFull = (ownedLaws?.length ?? 0) >= MAX_LAWS;
  // Dismantleable = any law that isn't the currently active one.
  const dismantleable = (ownedLaws ?? []).filter(l => l.id !== activeLawId);

  return (
    <>
      <div className="sel-header">
        <h2 className="sel-title">{isFirst ? 'Choose your first Cultivation Law' : 'New Cultivation Law'}</h2>
      </div>

      {libraryFull && (
        <div className="wipe-confirm" style={{ marginBottom: '12px' }}>
          <span className="wipe-confirm-label">
            Your library is full ({MAX_LAWS}). Dismantle one to make room:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {dismantleable.length === 0 ? (
              <span className="sel-realm">Only your active law remains — equip a different one from Character first.</span>
            ) : dismantleable.map(l => (
              <button
                key={l.id}
                className="save-btn save-btn-danger"
                onClick={() => onDismantleLaw?.(l.id)}
                title={`Dismantle ${l.name}`}
              >
                {l.name} ({l.rarity})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card-pair-grid">
        {(lawOptions ?? []).map((law, i) => (
          <div key={`${law.id}-${i}`} className="card-pair">
            <LawCard
              law={law}
              disabled={libraryFull}
              onPick={() => !libraryFull && onPickLaw?.(id, i)}
            />
            <div className="augment-reroll-cell">
              <button
                className={[
                  'augment-reroll-btn',
                  hasFreeReroll    ? 'augment-reroll-free'   : '',
                  !canAffordReroll ? 'augment-reroll-locked' : '',
                ].filter(Boolean).join(' ')}
                disabled={!canAffordReroll}
                onClick={() => canAffordReroll && onRerollLawOne?.(id, i)}
                title={
                  hasFreeReroll    ? 'Reroll — free!'
                  : !canAffordReroll ? `Need ${rerollCost} Blood Lotus`
                  :                   `Reroll — costs ${rerollCost} Blood Lotus`
                }
              >
                {!canAffordReroll ? '⊘' : '↺'}
              </button>
              <span className={[
                'augment-reroll-cost',
                hasFreeReroll    ? 'augment-reroll-cost-free'  : '',
                !canAffordReroll ? 'augment-reroll-cost-short' : '',
              ].filter(Boolean).join(' ')}>
                {hasFreeReroll ? 'Free' : `${rerollCost} BL`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!isFirst && (
        <div className="sel-footer">
          <button className="sel-skip-btn" onClick={() => onSkipLaw?.(id)}>
            Skip
          </button>
        </div>
      )}
    </>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function SelectionModal({
  selection,
  bloodLotusBalance,
  onPick,
  onRerollOne,
  onClose,
  onPickLaw,
  onSkipLaw,
  onRerollLawOne,
  onOpenShop,
  ownedLaws,
  activeLawId,
  onDismantleLaw,
}) {
  if (!selection) return null;
  const isLaw = selection.kind === 'law';

  if (isLaw) {
    return (
      <div className="modal-overlay sel-overlay" onClick={onClose}>
        <div
          className="sel-modal sel-modal-law"
          onClick={e => e.stopPropagation()}
        >
          <LawSelectionBody
            selection={selection}
            bloodLotusBalance={bloodLotusBalance}
            onPickLaw={onPickLaw}
            onSkipLaw={onSkipLaw}
            onRerollLawOne={onRerollLawOne}
            ownedLaws={ownedLaws}
            activeLawId={activeLawId}
            onDismantleLaw={onDismantleLaw}
          />
        </div>
      </div>
    );
  }

  // Augment variant (existing behaviour).
  const { id, realmLabel, tier, options, freeRerolls, rerollsUsed } = selection;
  const hasFreeReroll   = rerollsUsed < freeRerolls;
  const rerollCost      = hasFreeReroll ? 0
    : tier === 'breakthrough' ? BLOOD_LOTUS_COSTS.reroll_extra : BLOOD_LOTUS_COSTS.reroll_minor;
  const canAffordReroll = hasFreeReroll || (bloodLotusBalance ?? 0) >= rerollCost;
  const isBreakthrough  = tier === 'breakthrough';

  return (
    <div className="modal-overlay sel-overlay" onClick={onClose}>
      <div
        className={`sel-modal${isBreakthrough ? ' sel-modal-breakthrough' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sel-header">
          <h2 className="sel-title">
            {isBreakthrough ? 'Breakthrough Reward' : 'Level-Up Reward'}
          </h2>
        </div>

        <div className="card-pair-grid">
          {options.map((optId, i) => {
            const locked = !canAffordReroll;
            return (
              <div key={optId} className="card-pair">
                <AugmentCard optionId={optId} onPick={(oId) => onPick(id, oId)} />
                <div className="augment-reroll-cell">
                  <button
                    className={[
                      'augment-reroll-btn',
                      hasFreeReroll ? 'augment-reroll-free' : '',
                      locked        ? 'augment-reroll-locked' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => locked ? onOpenShop?.() : onRerollOne(id, i)}
                    title={
                      hasFreeReroll ? 'Reroll — free!'
                      : locked      ? `Need ${rerollCost} Blood Lotus · tap to open Shop`
                      :               `Reroll — costs ${rerollCost} Blood Lotus`
                    }
                  >
                    {locked ? '⊘' : '↺'}
                  </button>
                  <span className={[
                    'augment-reroll-cost',
                    hasFreeReroll ? 'augment-reroll-cost-free'  : '',
                    locked        ? 'augment-reroll-cost-short' : '',
                  ].filter(Boolean).join(' ')}>
                    {hasFreeReroll ? 'Free' : `${rerollCost} BL`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default SelectionModal;
