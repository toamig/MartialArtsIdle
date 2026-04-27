import { BLOOD_LOTUS_COSTS } from '../systems/bloodLotus';
import { LAW_RARITY } from '../data/laws';
import { formatUniqueDescription } from '../data/lawUniques';
import { MAX_LAWS } from '../hooks/useCultivation';

// ── Law card ─────────────────────────────────────────────────────────────────

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
          ×{(law.cultivationSpeedMult ?? 1).toFixed(2)} cultivation
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

// ── Modal body ───────────────────────────────────────────────────────────────

function LawSelectionBody({ selection, bloodLotusBalance, onPickLaw, onSkipLaw, onRerollLawOne, ownedLaws, activeLawId, onDismantleLaw }) {
  const { id, lawOptions, freeRerolls, rerollsUsed, isFirst } = selection;
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
  onClose,
  onPickLaw,
  onSkipLaw,
  onRerollLawOne,
  ownedLaws,
  activeLawId,
  onDismantleLaw,
}) {
  if (!selection || selection.kind !== 'law') return null;

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

export default SelectionModal;
