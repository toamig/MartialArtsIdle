import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TECHNIQUE_QUALITY, TECHNIQUE_RANK,
  TYPE_COLOR, getCooldown, getK, canEquip,
} from '../data/techniques';

const FILTER_KEYS = ['All', 'Attack', 'Heal', 'Defend', 'Dodge'];
const SLOT_T_KEYS = ['techniqueSlotModal.slot1', 'techniqueSlotModal.slot2', 'techniqueSlotModal.slot3'];

function TechniqueCard({ tech, equipped, locked, onClick }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const quality = TECHNIQUE_QUALITY[tech.quality];
  const rank    = TECHNIQUE_RANK[tech.rank];
  const cd      = getCooldown(tech.type, tech.quality);
  const K       = getK(tech.rank, tech.quality);

  const techName    = tGame(`techniques.${tech.id}.name`,    { defaultValue: tech.name });
  const techFlavour = tGame(`techniques.${tech.id}.flavour`, { defaultValue: tech.flavour });

  return (
    <button
      className={`tech-list-item${equipped ? ' tech-list-equipped' : ''}${locked ? ' tech-list-locked' : ''}`}
      onClick={locked ? undefined : onClick}
    >
      <div className="tech-item-header">
        <span className="tech-item-name">{techName}</span>
        <div className="tech-item-badges">
          <span className="tech-badge" style={{ color: TYPE_COLOR[tech.type], borderColor: TYPE_COLOR[tech.type] }}>
            {t(`techniqueTypes.${tech.type}`, { defaultValue: tech.type })}
          </span>
          <span className="tech-badge" style={{ color: quality.color, borderColor: quality.color }}>
            {t(`quality.${tech.quality}`, { defaultValue: quality.label })}
          </span>
          <span className="tech-badge tech-badge-rank">
            {t(`techniqueRanks.${tech.rank}`, { defaultValue: rank.label })}
          </span>
        </div>
      </div>

      <div className="tech-item-stats">
        <span>{t('techniqueSlotModal.cooldown', { cd: cd.toFixed(1) })}</span>
        {tech.type === 'Attack' && (
          <span>{t('techniqueSlotModal.kMult', { k: K })}</span>
        )}
        {tech.type === 'Heal' && (
          <span>{t('techniqueSlotModal.healPercent', { pct: Math.round((tech.healPercent ?? 0.25) * 100) })}</span>
        )}
        {tech.type === 'Defend' && (
          <span>{t('techniqueSlotModal.defBuff', { mult: tech.defMult, hits: tech.buffAttacks })}</span>
        )}
        {tech.type === 'Dodge' && (
          <span>{t('techniqueSlotModal.dodgeBuff', { pct: Math.round((tech.dodgeChance ?? 0) * 100), hits: tech.buffAttacks })}</span>
        )}
        {tech.element !== 'Normal' && (
          <span className="tech-element">
            {t(`elements.${tech.element}`, { defaultValue: tech.element })}
          </span>
        )}
      </div>

      {tech.passives?.length > 0 && (
        <ul className="tech-item-passives">
          {tech.passives.map(p => {
            const desc = tGame(`techniques.${tech.id}.passives.${p.name}`, { defaultValue: p.description });
            return (
              <li key={p.name}><strong>{p.name}:</strong> {desc}</li>
            );
          })}
        </ul>
      )}

      {techFlavour && <p className="tech-item-flavour">"{techFlavour}"</p>}

      {equipped && <span className="tech-equipped-badge">{t('common.equipped')}</span>}
      {locked   && (
        <span className="tech-locked-badge">
          {t('techniqueSlotModal.requiresRealm', { rank: t(`techniqueRanks.${tech.rank}`, { defaultValue: rank.label }) })}
        </span>
      )}
    </button>
  );
}

function TechniqueSlotModal({ slotIndex, currentId, realmIndex, ownedTechniques = {}, onEquip, onClose }) {
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
                  ? { background: TYPE_COLOR[f], borderColor: TYPE_COLOR[f] }
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
              locked={!canEquip(tech, realmIndex)}
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
