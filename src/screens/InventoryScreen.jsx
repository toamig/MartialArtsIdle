import { useState } from 'react';
import { ITEMS, RARITY } from '../data/items';
import { QUALITY, ARTEFACTS_BY_ID, getSlotBonuses } from '../data/artefacts';
import { LAW_RARITY } from '../data/laws';
import { TECHNIQUE_QUALITY, TYPE_COLOR, getCooldown, getK } from '../data/techniques';
import { MAX_ARTEFACTS } from '../hooks/useArtefacts';
import { MAX_TECHNIQUES } from '../hooks/useTechniques';
import { MAX_LAWS } from '../hooks/useCultivation';
import ItemModal from '../components/ItemModal';

const BASE = import.meta.env.BASE_URL;

const STAT_LABEL = {
  physical_damage:   'Physical DMG',
  defense:           'Defense',
  health:            'Health',
  soul_toughness:    'Soul Toughness',
  essence:           'Essence',
  elemental_defense: 'Elemental DEF',
};

const MATERIAL_TABS = [
  { key: 'herbs',       label: 'Herbs'      },
  { key: 'minerals',    label: 'Minerals'   },
  { key: 'cultivation', label: 'Cultivation' },
];

const ALL_TABS = [
  ...MATERIAL_TABS,
  { key: 'artefacts',  label: 'Artefacts'  },
  { key: 'techniques', label: 'Techniques' },
  { key: 'laws',       label: 'Laws'       },
];

const MATERIAL_KEYS = new Set(MATERIAL_TABS.map(t => t.key));

function InventoryScreen({ inventory, artefacts, techniques, cultivation }) {
  const { getQuantity } = inventory;
  const [activeTab, setActiveTab] = useState('herbs');
  const [selectedItem,      setSelectedItem]      = useState(null);
  const [selectedArtefact,  setSelectedArtefact]  = useState(null);
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [selectedLaw,       setSelectedLaw]       = useState(null);

  return (
    <div className="screen inventory-screen">
      <h1>Inventory</h1>

      <div className="inv-tabs">
        {ALL_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`inv-tab ${activeTab === tab.key ? 'inv-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Materials ────────────────────────────────────────────────────────── */}
      {MATERIAL_KEYS.has(activeTab) && (
        <div className="inv-grid">
          {ITEMS[activeTab].map((item) => {
            const qty    = getQuantity(item.id);
            const rarity = RARITY[item.rarity];
            return (
              <button
                key={item.id}
                className="inv-slot"
                style={{ borderColor: qty > 0 ? rarity.color : undefined }}
                onClick={() => setSelectedItem(item)}
              >
                <img
                  src={`${BASE}sprites/items/${item.id}.png`}
                  alt={item.name}
                  className="inv-icon"
                />
                <span className="inv-qty">{qty}</span>
                <span className="inv-name" style={{ color: rarity.color }}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Artefacts ────────────────────────────────────────────────────────── */}
      {activeTab === 'artefacts' && artefacts && (
        <>
          <p className="inv-cap-label">{artefacts.owned.length} / {MAX_ARTEFACTS} slots</p>
          <div className="inv-grid">
            {artefacts.owned.map((instance) => {
              const art = ARTEFACTS_BY_ID[instance.catalogueId];
              if (!art) return null;
              const q = QUALITY[art.rarity];
              return (
                <button
                  key={instance.uid}
                  className="inv-slot"
                  style={{ borderColor: q.color }}
                  onClick={() => setSelectedArtefact(instance)}
                >
                  <span className="inv-quality-gem" style={{ color: q.color }}>◆</span>
                  <span className="inv-name" style={{ color: q.color }}>{art.name}</span>
                  <span className="inv-slot-label">{art.slot}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Techniques ───────────────────────────────────────────────────────── */}
      {activeTab === 'techniques' && techniques && (
        <>
          <p className="inv-cap-label">
            {Object.keys(techniques.ownedTechniques).length} / {MAX_TECHNIQUES} slots
          </p>
          <div className="inv-grid">
            {Object.values(techniques.ownedTechniques).map((tech) => {
              const color = LAW_RARITY[tech.quality]?.color ?? '#9ca3af';
              return (
                <button
                  key={tech.id}
                  className="inv-slot"
                  style={{ borderColor: color }}
                  onClick={() => setSelectedTechnique(tech)}
                >
                  <span className="inv-quality-gem" style={{ color }}>◆</span>
                  <span className="inv-name" style={{ color }}>{tech.name}</span>
                  <span className="inv-slot-label">{tech.type}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Laws ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'laws' && cultivation && (
        <>
          <p className="inv-cap-label">
            {cultivation.ownedLaws.length} / {MAX_LAWS} slots
          </p>
          <div className="inv-grid">
            {cultivation.ownedLaws.map((law) => {
              const rarity = LAW_RARITY[law.rarity];
              return (
                <button
                  key={law.id}
                  className="inv-slot"
                  style={{ borderColor: rarity.color }}
                  onClick={() => setSelectedLaw(law)}
                >
                  <span className="inv-quality-gem" style={{ color: rarity.color }}>◆</span>
                  <span className="inv-name" style={{ color: rarity.color }}>{law.name}</span>
                  <span className="inv-slot-label">{law.element}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          quantity={getQuantity(selectedItem.id)}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {selectedArtefact && (() => {
        const art    = ARTEFACTS_BY_ID[selectedArtefact.catalogueId];
        const q      = QUALITY[art.rarity];
        const bonuses = getSlotBonuses(art.slot, art.rarity);
        return (
          <div className="modal-overlay" onClick={() => setSelectedArtefact(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedArtefact(null)}>x</button>
              <h2 className="modal-title">{art.name}</h2>
              <span className="modal-rarity" style={{ color: q.color }}>
                {q.label} · {art.slot}
              </span>
              <p className="modal-desc">{art.description}</p>
              <div className="item-stat-block">
                {bonuses.map((b, i) => (
                  <div key={i} className="item-stat-row">
                    <span className="item-stat-label">{STAT_LABEL[b.stat] ?? b.stat}</span>
                    <span className="item-stat-value" style={{ color: q.color }}>+{b.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {selectedTechnique && (() => {
        const tech    = selectedTechnique;
        const quality = TECHNIQUE_QUALITY[tech.quality] ?? { label: tech.quality, color: '#9ca3af' };
        const typeCol = TYPE_COLOR[tech.type] ?? '#fff';
        const cd      = getCooldown(tech.type, tech.quality);
        return (
          <div className="modal-overlay" onClick={() => setSelectedTechnique(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedTechnique(null)}>x</button>
              <h2 className="modal-title">{tech.name}</h2>
              <span className="modal-rarity" style={{ color: quality.color }}>
                {quality.label} · {tech.rank}
              </span>
              <div className="item-stat-block">
                <div className="item-stat-row">
                  <span className="item-stat-label">Type</span>
                  <span className="item-stat-value" style={{ color: typeCol }}>{tech.type}</span>
                </div>
                <div className="item-stat-row">
                  <span className="item-stat-label">Cooldown</span>
                  <span className="item-stat-value">{cd.toFixed(1)}s</span>
                </div>
                {tech.type === 'Attack' && (
                  <div className="item-stat-row">
                    <span className="item-stat-label">Damage ×K</span>
                    <span className="item-stat-value">{getK(tech.rank, tech.quality)}</span>
                  </div>
                )}
                {tech.type === 'Heal' && (
                  <div className="item-stat-row">
                    <span className="item-stat-label">Heal</span>
                    <span className="item-stat-value">{Math.round((tech.healPercent ?? 0.25) * 100)}% HP</span>
                  </div>
                )}
                {tech.type === 'Defend' && (
                  <>
                    <div className="item-stat-row">
                      <span className="item-stat-label">DEF Mult</span>
                      <span className="item-stat-value">×{tech.defMult}</span>
                    </div>
                    <div className="item-stat-row">
                      <span className="item-stat-label">Duration</span>
                      <span className="item-stat-value">{tech.buffDuration}s</span>
                    </div>
                  </>
                )}
                {tech.type === 'Dodge' && (
                  <>
                    <div className="item-stat-row">
                      <span className="item-stat-label">Dodge Chance</span>
                      <span className="item-stat-value">{Math.round((tech.dodgeChance ?? 0) * 100)}%</span>
                    </div>
                    <div className="item-stat-row">
                      <span className="item-stat-label">Duration</span>
                      <span className="item-stat-value">{tech.buffDuration}s</span>
                    </div>
                  </>
                )}
                {tech.element && tech.element !== 'Normal' && (
                  <div className="item-stat-row">
                    <span className="item-stat-label">Element</span>
                    <span className="item-stat-value">{tech.element}</span>
                  </div>
                )}
              </div>
              {tech.passives?.length > 0 && (
                <div className="item-stat-block">
                  {tech.passives.map((p, i) => (
                    <p key={i} className="modal-desc">
                      <strong>{p.name}:</strong> {p.description}
                    </p>
                  ))}
                </div>
              )}
              {tech.flavour && <p className="modal-desc tech-item-flavour">"{tech.flavour}"</p>}
            </div>
          </div>
        );
      })()}

      {selectedLaw && (() => {
        const law    = selectedLaw;
        const rarity = LAW_RARITY[law.rarity];
        return (
          <div className="modal-overlay" onClick={() => setSelectedLaw(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedLaw(null)}>x</button>
              <h2 className="modal-title">{law.name}</h2>
              <span className="modal-rarity" style={{ color: rarity.color }}>
                {rarity.label} · {law.element}
              </span>
              <div className="item-stat-block">
                <div className="item-stat-row">
                  <span className="item-stat-label">Cultivation Speed</span>
                  <span className="item-stat-value">×{law.cultivationSpeedMult.toFixed(1)}</span>
                </div>
                <div className="item-stat-row">
                  <span className="item-stat-label">Essence Mult</span>
                  <span className="item-stat-value">{law.essenceMult}</span>
                </div>
                <div className="item-stat-row">
                  <span className="item-stat-label">Soul Mult</span>
                  <span className="item-stat-value">{law.soulMult}</span>
                </div>
                <div className="item-stat-row">
                  <span className="item-stat-label">Body Mult</span>
                  <span className="item-stat-value">{law.bodyMult}</span>
                </div>
              </div>
              {law.passives?.length > 0 && (
                <div className="item-stat-block">
                  <span className="item-stat-section">Passives ({law.passives.length}/{rarity.passiveSlots})</span>
                  {law.passives.map((p, i) => (
                    <p key={i} className="modal-desc">
                      <strong>{p.name}:</strong> {p.description}
                    </p>
                  ))}
                </div>
              )}
              <p className="modal-desc tech-item-flavour">"{law.flavour}"</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default InventoryScreen;
