// @refresh reset
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TECHNIQUE_QUALITY,
  TYPE_COLOR,
  describeTechnique,
  getTechniqueBaseId,
} from '../data/techniques';

const FILTER_KEYS = ['All', 'Attack', 'Heal', 'Defend', 'Dodge', 'Expose'];
const SLOT_T_KEYS = ['techniqueSlotModal.slot1', 'techniqueSlotModal.slot2', 'techniqueSlotModal.slot3'];

function TechniqueCard({ tech, equipped, onClick }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const quality  = TECHNIQUE_QUALITY[tech.quality];
  const typeCol  = TYPE_COLOR[tech.type] ?? '#fff';

  // i18n keys live on the catalogue base id; drop-instance ids carry a
  // `__suffix` for uniqueness — strip it before looking up translations.
  const baseId      = getTechniqueBaseId(tech.id);
  const techName    = tGame(`techniques.${baseId}.name`,    { defaultValue: tech.name });
  const techFlavour = tGame(`techniques.${baseId}.flavour`, { defaultValue: tech.flavour });

  const lines = describeTechnique(tech);
  const tooltip = `${t(`techniqueTypes.${tech.type}`, { defaultValue: tech.type })} · ${t(`quality.${tech.quality}`, { defaultValue: quality.label })}`;

  return (
    <button
      className={`tech-list-item${equipped ? ' tech-list-equipped' : ''}`}
      style={{ '--tech-quality': quality.color }}
      onClick={onClick}
    >
      <div className="tech-item-header">
        <span
          className="tech-icon"
          style={{ '--type-color': typeCol, '--type-bg': typeCol + '22' }}
          title={tooltip}
        >
          <span className="tech-icon-glyph">{tech.icon ?? '?'}</span>
        </span>
        <span className="tech-item-name">{techName}</span>
      </div>

      <ul className="tech-item-stats">
        {lines.map((line, i) => <li key={i}>{line}</li>)}
      </ul>

      {techFlavour && <p className="tech-item-flavour">"{techFlavour}"</p>}

      {equipped && <span className="tech-equipped-badge">{t('common.equipped')}</span>}
    </button>
  );
}

function TechniqueSlotModal({ slotIndex, currentId, ownedTechniques = {}, onEquip, onClose }) {
  const { t } = useTranslation('ui');
  const [filter, setFilter] = useState('All');

  const visible = Object.values(ownedTechniques)
    .filter(tech => filter === 'All' || tech.type === filter);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content tech-modal-content"
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="tech-modal-title">{t(SLOT_T_KEYS[slotIndex])}</h2>

        <div className="tech-type-filters">
          {FILTER_KEYS.map(f => {
            const label = f === 'All' ? t('techniqueSlotModal.filterAll') : t(`techniqueTypes.${f}`, { defaultValue: f });
            return (
              <button
                key={f}
                className={`tech-type-btn${filter === f ? ' tech-type-btn-active' : ''}`}
                style={filter === f && f !== 'All'
                  ? { '--type-color': TYPE_COLOR[f] }
                  : undefined}
                onClick={() => setFilter(f)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="tech-list">
          {visible.map(tech => (
            <TechniqueCard
              key={tech.id}
              tech={tech}
              equipped={tech.id === currentId}
              onClick={() => onEquip(slotIndex, tech.id)}
            />
          ))}
        </div>

        {currentId && (
          <button
            className="tech-unequip-btn"
            onClick={() => onEquip(slotIndex, null)}
          >
            {t('techniqueSlotModal.unequip')}
          </button>
        )}
      </div>
    </div>
  );
}

export default TechniqueSlotModal;
