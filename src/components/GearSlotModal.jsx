import { useTranslation } from 'react-i18next';
import { QUALITY, getSlotBonuses } from '../data/artefacts';

function bonusSummary(slot, rarity) {
  return getSlotBonuses(slot, rarity)
    .map(b => `+${b.value} ${b.stat.replace(/_/g, ' ')}`)
    .join(', ');
}

function ArtefactCard({ artefact, equipped, currentSlot, onEquip, onUnequip }) {
  const { t } = useTranslation('ui');

  const quality        = QUALITY[artefact.rarity];
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
        <span className="art-pick-name" style={{ color: quality.color }}>
          {artefact.name}
        </span>
        <span className="art-pick-quality" style={{ color: quality.color }}>
          {t(`quality.${artefact.rarity}`, { defaultValue: quality.label })}
        </span>
      </div>
      <span className="art-pick-bonus">{bonusSummary(artefact.slot, artefact.rarity)}</span>
      {isEquippedHere      && <span className="art-pick-tag">{t('gearSlotModal.tagEquipped')}</span>}
      {isEquippedElsewhere && (
        <span className="art-pick-tag art-pick-tag-elsewhere">
          {t('gearSlotModal.tagInSlot', { slot: currentSlot })}
        </span>
      )}
    </div>
  );
}

function GearSlotModal({ slot, artefacts, onClose }) {
  const { t } = useTranslation('ui');

  if (!slot) return null;

  const equipped  = artefacts.getEquipped(slot.id);
  const available = artefacts.getOwnedForSlot(slot.type);
  const desc      = t(`gearSlotModal.slotDescs.${slot.type}`, { defaultValue: '' });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content art-pick-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>x</button>

        <h2 className="modal-title">{t(`build.slots.${slot.type}`, { defaultValue: slot.label })}</h2>
        <p className="modal-desc">{desc}</p>

        <p className="art-pick-section-label">{t('gearSlotModal.sectionEquipped')}</p>
        {equipped ? (
          <ArtefactCard
            artefact={equipped}
            equipped={equipped.uid}
            currentSlot={null}
            onEquip={() => {}}
            onUnequip={() => { artefacts.unequip(slot.id); onClose(); }}
          />
        ) : (
          <div className="art-pick-empty">{t('gearSlotModal.nothingEquipped')}</div>
        )}

        {available.length > 0 && (
          <>
            <p className="art-pick-section-label">{t('gearSlotModal.sectionOwned')}</p>
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
