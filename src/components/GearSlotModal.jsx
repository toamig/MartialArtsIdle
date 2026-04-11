import { QUALITY, getSlotBonuses } from '../data/artefacts';

const SLOT_DESC = {
  head:    'Headbands, crowns, and jade hairpins. Enhances spiritual defence and focus.',
  neck:    'Pendants and talismans. Provides soul protection and elemental resistance.',
  body:    'Robes and battle vests. The primary defensive piece.',
  hands:   'Bracers and gauntlets. Enhances strikes and channels elemental energy.',
  waist:   'Sashes and belts. Stabilises the dantian and improves qi circulation.',
  feet:    'Boots and sandals. Improves movement and dodge.',
  ring:    'Power rings focus combat stats through the meridians.',
  weapon:  'Weapons provide flat damage and unlock secret technique requirements.',
};

function bonusSummary(slot, rarity) {
  return getSlotBonuses(slot, rarity)
    .map(b => `+${b.value} ${b.stat.replace(/_/g, ' ')}`)
    .join(', ');
}

function ArtefactCard({ artefact, equipped, currentSlot, onEquip, onUnequip }) {
  const quality = QUALITY[artefact.rarity];
  const isEquippedHere = equipped === artefact.uid;
  const isEquippedElsewhere = !isEquippedHere && currentSlot !== null;

  return (
    <div
      className={`art-pick-card${isEquippedHere ? ' art-pick-equipped' : ''}`}
      style={{ borderColor: isEquippedHere ? quality.color : undefined }}
      onClick={isEquippedHere ? onUnequip : onEquip}
      role="button"
    >
      <div className="art-pick-header">
        <span className="art-pick-name" style={{ color: quality.color }}>{artefact.name}</span>
        <span className="art-pick-quality" style={{ color: quality.color }}>{quality.label}</span>
      </div>
      <span className="art-pick-bonus">{bonusSummary(artefact.slot, artefact.rarity)}</span>
      {isEquippedHere && <span className="art-pick-tag">Equipped — tap to remove</span>}
      {isEquippedElsewhere && <span className="art-pick-tag art-pick-tag-elsewhere">In {currentSlot}</span>}
    </div>
  );
}

function GearSlotModal({ slot, artefacts, onClose }) {
  if (!slot) return null;

  const equipped  = artefacts.getEquipped(slot.id);        // full artefact obj or null
  const available = artefacts.getOwnedForSlot(slot.type);  // all owned for this slot type
  const desc      = SLOT_DESC[slot.type] ?? 'An equipment slot.';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content art-pick-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>x</button>

        <h2 className="modal-title">{slot.label}</h2>
        <p className="modal-desc">{desc}</p>

        {/* Equipped */}
        <p className="art-pick-section-label">Equipped</p>
        {equipped ? (
          <ArtefactCard
            artefact={equipped}
            equipped={equipped.uid}
            currentSlot={null}
            onEquip={() => {}}
            onUnequip={() => { artefacts.unequip(slot.id); onClose(); }}
          />
        ) : (
          <div className="art-pick-empty">Nothing equipped</div>
        )}

        {/* Available */}
        {available.length > 0 && (
          <>
            <p className="art-pick-section-label">Owned</p>
            <div className="art-pick-list">
              {available.map(a => {
                const inSlot = artefacts.equippedInSlot(a.uid);
                return (
                  <ArtefactCard
                    key={a.uid}
                    artefact={a}
                    equipped={equipped?.uid ?? null}
                    currentSlot={inSlot && inSlot !== slot.id ? inSlot : null}
                    onEquip={() => { artefacts.equip(slot.id, a.uid); onClose(); }}
                    onUnequip={() => { artefacts.unequip(slot.id); onClose(); }}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GearSlotModal;
