import { useState } from 'react';
import GearSlotModal from '../components/GearSlotModal';
import TechniqueSlotModal from '../components/TechniqueSlotModal';
import { LAW_RARITY } from '../data/laws';
import { TECHNIQUE_QUALITY, TYPE_COLOR, getCooldown } from '../data/techniques';
import { QUALITY } from '../data/artefacts';

// col/row are 1-indexed CSS grid positions (3 columns, 5 rows)
const GEAR_SLOTS = [
  { id: 'head',   label: 'Head',   type: 'head',   col: 2, row: 1 },

  { id: 'ring_1', label: 'Ring',   type: 'ring',   col: 1, row: 2 },
  { id: 'neck',   label: 'Neck',   type: 'neck',   col: 2, row: 2 },
  { id: 'ring_2', label: 'Ring',   type: 'ring',   col: 3, row: 2 },

  { id: 'weapon', label: 'Weapon', type: 'weapon', col: 1, row: 3 },
  { id: 'body',   label: 'Body',   type: 'body',   col: 2, row: 3 },
  { id: 'hands',  label: 'Hands',  type: 'hands',  col: 3, row: 3 },

  { id: 'waist',  label: 'Waist',  type: 'waist',  col: 2, row: 4 },

  { id: 'ring_3', label: 'Ring',   type: 'ring',   col: 1, row: 5 },
  { id: 'feet',   label: 'Feet',   type: 'feet',   col: 2, row: 5 },
  { id: 'ring_4', label: 'Ring',   type: 'ring',   col: 3, row: 5 },
];

const SLOT_LABELS = ['I', 'II', 'III'];

function TechSlotCard({ index, tech, onClick }) {
  if (!tech) {
    return (
      <button className="card build-slot build-tech-slot" onClick={onClick}>
        <span className="build-slot-label">Technique {SLOT_LABELS[index]}</span>
        <p className="build-slot-empty">None</p>
      </button>
    );
  }

  const quality = TECHNIQUE_QUALITY[tech.quality];
  const cd      = getCooldown(tech.type, tech.quality);

  return (
    <button className="card build-slot build-tech-slot build-tech-filled" onClick={onClick}>
      <span className="build-slot-label">Technique {SLOT_LABELS[index]}</span>
      <span className="build-tech-name">{tech.name}</span>
      <div className="build-tech-badges">
        <span className="build-tech-badge" style={{ color: TYPE_COLOR[tech.type], borderColor: TYPE_COLOR[tech.type] }}>
          {tech.type}
        </span>
        <span className="build-tech-badge" style={{ color: quality.color, borderColor: quality.color }}>
          {quality.label}
        </span>
        <span className="build-tech-badge build-tech-rank">{tech.rank}</span>
      </div>
      <span className="build-tech-cd">CD: {cd.toFixed(1)}s</span>
    </button>
  );
}

function BuildScreen({ cultivation, techniques, artefacts }) {
  const [selectedSlot,     setSelectedSlot]     = useState(null);
  const [selectedTechSlot, setSelectedTechSlot] = useState(null);

  const { activeLaw, isLawUnlocked, realmIndex } = cultivation;
  const rarity = LAW_RARITY[activeLaw.rarity];

  const handleEquip = (slotIndex, id) => {
    if (id === null) {
      techniques.unequip(slotIndex);
    } else {
      techniques.equip(slotIndex, id);
    }
    setSelectedTechSlot(null);
  };

  return (
    <div className="screen build-screen">
      <h1>Equipment</h1>
      <p className="subtitle">Gear, laws, and techniques</p>

      {/* ── Artefacts + Law side by side ── */}
      <div className="build-top-row">
        <section className="build-section">
          <h2 className="build-section-title">Artefacts</h2>
          <div className="gear-body-layout">
            {GEAR_SLOTS.map((slot) => {
              const art     = artefacts.getEquipped(slot.id);
              const quality = art ? QUALITY[art.rarity] : null;
              return (
                <button
                  key={slot.id}
                  className={`inv-slot gear-slot${art ? ' gear-slot-filled' : ''}`}
                  style={{
                    gridColumn:  slot.col,
                    gridRow:     slot.row,
                    borderColor: quality?.color,
                    borderStyle: art ? 'solid' : undefined,
                  }}
                  onClick={() => setSelectedSlot(slot)}
                >
                  {art ? (
                    <>
                      <span className="gear-slot-quality-dot" style={{ background: quality.color }} />
                      <span className="gear-slot-name gear-slot-name-filled" style={{ color: quality.color }}>
                        {art.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="gear-slot-glyph">+</span>
                      <span className="inv-name gear-slot-name">{slot.label}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="build-section build-law-section">
          <h2 className="build-section-title">Cultivation Law</h2>
          <div className={`build-law-card ${!isLawUnlocked ? 'build-law-locked' : ''}`}>

            {/* Header */}
            <div className="law-header">
              <span className="law-name">{activeLaw.name}</span>
              <div className="law-badges">
                <span className="law-badge law-element">{activeLaw.element}</span>
                <span className="law-badge law-rarity-badge" style={{ color: rarity.color, borderColor: rarity.color }}>
                  {rarity.label}
                </span>
              </div>
            </div>

            {/* Flavour */}
            <p className="law-flavour">"{activeLaw.flavour}"</p>

            <div className="law-divider" />

            {/* Cultivation speed */}
            <div className="law-stat-row">
              <span className="law-stat-label">Cultivation Speed</span>
              <span className="law-stat-value">×{activeLaw.cultivationSpeedMult.toFixed(1)}</span>
            </div>

            <div className="law-divider" />

            {/* Multipliers */}
            <div className="law-stat-row">
              <span className="law-stat-label">Essence Mult</span>
              <span className="law-stat-value">{activeLaw.essenceMult}</span>
            </div>
            <div className="law-stat-row">
              <span className="law-stat-label">Soul Mult</span>
              <span className="law-stat-value">{activeLaw.soulMult}</span>
            </div>
            <div className="law-stat-row">
              <span className="law-stat-label">Body Mult</span>
              <span className="law-stat-value">{activeLaw.bodyMult}</span>
            </div>

            <div className="law-divider" />

            {/* Passives */}
            <div className="law-passives">
              <span className="law-stat-label">
                Passives ({activeLaw.passives.length}/{rarity.passiveSlots})
              </span>
              {activeLaw.passives.map((p) => (
                <div key={p.name} className="law-passive">
                  <span className="law-passive-name">{p.name}</span>
                  <span className="law-passive-desc">{p.description}</span>
                </div>
              ))}
            </div>

            <div className="law-divider" />

            {/* Realm requirement */}
            <div className="law-req-row">
              <span className="law-stat-label">Requires</span>
              <span className={`law-req-status ${isLawUnlocked ? 'law-req-met' : 'law-req-locked'}`}>
                {isLawUnlocked ? '✓' : '🔒'} {activeLaw.realmRequirementLabel}
              </span>
            </div>

          </div>
        </section>
      </div>

      {/* ── Secret Techniques ── */}
      <section className="build-section">
        <h2 className="build-section-title">Secret Techniques</h2>
        <div className="card-grid">
          {[0, 1, 2].map(i => (
            <TechSlotCard
              key={i}
              index={i}
              tech={techniques.equippedTechniques[i]}
              onClick={() => setSelectedTechSlot(i)}
            />
          ))}
        </div>
      </section>

      {selectedSlot && (
        <GearSlotModal slot={selectedSlot} artefacts={artefacts} onClose={() => setSelectedSlot(null)} />
      )}

      {selectedTechSlot !== null && (
        <TechniqueSlotModal
          slotIndex={selectedTechSlot}
          currentId={techniques.slots[selectedTechSlot]}
          realmIndex={realmIndex}
          onEquip={handleEquip}
          onClose={() => setSelectedTechSlot(null)}
        />
      )}
    </div>
  );
}

export default BuildScreen;
