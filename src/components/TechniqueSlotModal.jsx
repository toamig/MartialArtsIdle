import { useState } from 'react';
import {
  TECHNIQUES, TECHNIQUE_QUALITY, TECHNIQUE_RANK,
  TYPE_COLOR, BASE_COOLDOWN, getCooldown, getK, canEquip,
} from '../data/techniques';

const FILTERS = ['All', 'Attack', 'Heal', 'Defend', 'Dodge'];
const SLOT_LABELS = ['Technique I', 'Technique II', 'Technique III'];

function TechniqueCard({ tech, equipped, locked, onClick }) {
  const quality = TECHNIQUE_QUALITY[tech.quality];
  const rank    = TECHNIQUE_RANK[tech.rank];
  const cd      = getCooldown(tech.type, tech.quality);
  const K       = getK(tech.rank, tech.quality);

  return (
    <button
      className={`tech-list-item${equipped ? ' tech-list-equipped' : ''}${locked ? ' tech-list-locked' : ''}`}
      onClick={locked ? undefined : onClick}
    >
      {/* Header row */}
      <div className="tech-item-header">
        <span className="tech-item-name">{tech.name}</span>
        <div className="tech-item-badges">
          <span className="tech-badge" style={{ color: TYPE_COLOR[tech.type], borderColor: TYPE_COLOR[tech.type] }}>
            {tech.type}
          </span>
          <span className="tech-badge" style={{ color: quality.color, borderColor: quality.color }}>
            {quality.label}
          </span>
          <span className="tech-badge tech-badge-rank">
            {rank.label}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="tech-item-stats">
        <span>CD {cd.toFixed(1)}s</span>
        {tech.type === 'Attack' && <span>K ×{K}</span>}
        {tech.type === 'Heal'   && <span>Heal {Math.round((tech.healPercent ?? 0.25) * 100)}% HP</span>}
        {tech.type === 'Defend' && <span>DEF ×{tech.defMult} / {tech.buffDuration}s</span>}
        {tech.type === 'Dodge'  && <span>{Math.round((tech.dodgeChance ?? 0) * 100)}% dodge / {tech.buffDuration}s</span>}
        {tech.element !== 'Normal' && <span className="tech-element">{tech.element}</span>}
      </div>

      {/* Passives */}
      {tech.passives?.length > 0 && (
        <ul className="tech-item-passives">
          {tech.passives.map(p => (
            <li key={p.name}><strong>{p.name}:</strong> {p.description}</li>
          ))}
        </ul>
      )}

      {/* Flavour */}
      <p className="tech-item-flavour">"{tech.flavour}"</p>

      {/* Badges */}
      {equipped && <span className="tech-equipped-badge">Equipped</span>}
      {locked   && (
        <span className="tech-locked-badge">
          Requires {rank.label} realm
        </span>
      )}
    </button>
  );
}

function TechniqueSlotModal({ slotIndex, currentId, realmIndex, onEquip, onClose }) {
  const [filter, setFilter] = useState('All');

  const visible = TECHNIQUES.filter(t => filter === 'All' || t.type === filter);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content tech-modal-content"
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="tech-modal-title">{SLOT_LABELS[slotIndex]}</h2>

        {/* Type filter tabs */}
        <div className="tech-type-filters">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`tech-type-btn${filter === f ? ' tech-type-btn-active' : ''}`}
              style={filter === f && f !== 'All'
                ? { background: TYPE_COLOR[f], borderColor: TYPE_COLOR[f] }
                : undefined}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Technique list */}
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

        {/* Unequip */}
        {currentId && (
          <button
            className="tech-unequip-btn"
            onClick={() => onEquip(slotIndex, null)}
          >
            Unequip
          </button>
        )}
      </div>
    </div>
  );
}

export default TechniqueSlotModal;
