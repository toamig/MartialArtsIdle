import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HERB_ITEMS, ORE_ITEMS, BLOOD_CORE_ITEMS, CULTIVATION_ITEMS, RARITY, mineralForRarity, ALL_MATERIALS } from '../data/materials';

const MATERIAL_ITEMS = {
  herbs:       HERB_ITEMS,
  minerals:    ORE_ITEMS,
  bloodCores:  BLOOD_CORE_ITEMS,
  cultivation: CULTIVATION_ITEMS,
};
import { QUALITY, ARTEFACTS_BY_ID, getSlotBonuses } from '../data/artefacts';
import { formatArtefactName } from '../data/artefactNames';
import { LAW_RARITY } from '../data/laws';
import { formatUniqueDescription } from '../data/lawUniques';
import { TECHNIQUE_QUALITY, TYPE_COLOR, getCooldown, getK } from '../data/techniques';
import { MAX_ARTEFACTS } from '../hooks/useArtefacts';
import { MAX_TECHNIQUES } from '../hooks/useTechniques';
import { MAX_LAWS } from '../hooks/useCultivation';
import ItemModal from '../components/ItemModal';

const BASE = import.meta.env.BASE_URL;

/**
 * Shared dismantle action. Refuses when the hook rejects (equipped /
 * active / missing). On success, grants 1 mineral of matching rarity.
 */
function dismantleTo(inventory, rarity) {
  if (!rarity) return null;
  const mineralId = mineralForRarity(rarity);
  inventory?.addItem?.(mineralId, 1);
  return mineralId;
}

function needsDismantleConfirm(rarity, invested) {
  // Confirm for Silver+ rarity OR if the player has sunk any hone /
  // replace / add into the item (craftCount > 0, for affix items).
  const rank = { Iron: 1, Bronze: 2, Silver: 3, Gold: 4, Transcendent: 5 }[rarity] ?? 1;
  return rank >= 3 || invested;
}

function DismantleButton({ label = 'Dismantle', rarity, invested = false, disabled, disabledReason, onDismantle }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mineralId = rarity ? mineralForRarity(rarity) : null;
  const mineralName = mineralId ? (ALL_MATERIALS[mineralId]?.name ?? mineralId) : '';
  const needsConfirm = needsDismantleConfirm(rarity, invested);

  if (disabled) {
    return (
      <button className="save-btn save-btn-danger" disabled title={disabledReason}>
        {label}
      </button>
    );
  }

  if (confirmOpen) {
    return (
      <div className="wipe-confirm" style={{ marginTop: '8px' }}>
        <span className="wipe-confirm-label">
          Dismantle this <strong>{rarity}</strong> item for 1× {mineralName}?
        </span>
        <button className="save-btn save-btn-danger" onClick={() => { setConfirmOpen(false); onDismantle(); }}>Confirm</button>
        <button className="save-btn" onClick={() => setConfirmOpen(false)}>Cancel</button>
      </div>
    );
  }

  return (
    <button
      className="save-btn save-btn-danger"
      onClick={() => (needsConfirm ? setConfirmOpen(true) : onDismantle())}
      title={`Dismantle for 1× ${mineralName}`}
    >
      {label} · +1 {mineralName}
    </button>
  );
}

function CollectionScreen({ inventory, artefacts, techniques, cultivation }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const { getQuantity } = inventory;
  const [activeTab, setActiveTab] = useState('herbs');
  const [selectedItem,      setSelectedItem]      = useState(null);
  const [selectedArtefact,  setSelectedArtefact]  = useState(null);
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [selectedLaw,       setSelectedLaw]       = useState(null);

  const ALL_TABS = [
    { key: 'herbs',       tKey: 'inventory.tabHerbs'      },
    { key: 'minerals',    tKey: 'inventory.tabMinerals'   },
    { key: 'bloodCores',  tKey: 'inventory.tabBloodCores' },
    { key: 'cultivation', tKey: 'inventory.tabCultivation'},
    { key: 'artefacts',   tKey: 'inventory.tabArtefacts'  },
    { key: 'techniques',  tKey: 'inventory.tabTechniques' },
    { key: 'laws',        tKey: 'inventory.tabLaws'       },
  ];

  const MATERIAL_KEYS = new Set(['herbs', 'minerals', 'bloodCores', 'cultivation']);

  return (
    <div className="screen inventory-screen">
      <h1>{t('collection.title', { defaultValue: 'Collection' })}</h1>

      <div className="inv-tabs">
        {ALL_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`inv-tab ${activeTab === tab.key ? 'inv-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(tab.tKey)}
          </button>
        ))}
      </div>

      {/* ── Materials ────────────────────────────────────────────────────────── */}
      {MATERIAL_KEYS.has(activeTab) && (
        <div className="inv-grid">
          {MATERIAL_ITEMS[activeTab].filter(item => inventory.inventory[item.id] !== undefined).map((item) => {
            const qty    = getQuantity(item.id);
            const rarity = RARITY[item.rarity];
            const itemName = tGame(`items.${item.id}.name`, { defaultValue: item.name });
            return (
              <button
                key={item.id}
                className="inv-slot"
                style={{ borderColor: qty > 0 ? rarity.color : undefined }}
                onClick={() => setSelectedItem(item)}
              >
                <img
                  src={`${BASE}sprites/items/${item.id}.png`}
                  alt={itemName}
                  className="inv-icon"
                />
                <span className="inv-qty">{qty}</span>
                <span className="inv-name" style={{ color: rarity.color }}>
                  {itemName}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Artefacts ────────────────────────────────────────────────────────── */}
      {activeTab === 'artefacts' && artefacts && (
        <>
          <p className="inv-cap-label">{t('inventory.slots', { count: artefacts.owned.length, max: MAX_ARTEFACTS })}</p>
          <div className="inv-grid">
            {artefacts.owned.map((instance) => {
              const art = ARTEFACTS_BY_ID[instance.catalogueId];
              if (!art) return null;
              const rarity = instance.rarity ?? art.rarity;
              const q = QUALITY[rarity];
              const artName = formatArtefactName(instance)
                ?? tGame(`artefacts.${art.id}.name`, { defaultValue: art.name });
              return (
                <button
                  key={instance.uid}
                  className="inv-slot"
                  style={{ borderColor: q.color }}
                  onClick={() => setSelectedArtefact(instance)}
                >
                  <span className="inv-quality-gem" style={{ color: q.color }}>◆</span>
                  <span className="inv-name" style={{ color: q.color }}>{artName}</span>
                  <span className="inv-slot-label">{t(`build.slots.${art.slot}`, { defaultValue: art.slot })}</span>
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
            {t('inventory.slots', { count: Object.keys(techniques.ownedTechniques).length, max: MAX_TECHNIQUES })}
          </p>
          <div className="inv-grid">
            {Object.values(techniques.ownedTechniques).map((tech) => {
              const color = LAW_RARITY[tech.quality]?.color ?? '#9ca3af';
              const techName = tGame(`techniques.${tech.id}.name`, { defaultValue: tech.name });
              return (
                <button
                  key={tech.id}
                  className="inv-slot"
                  style={{ borderColor: color }}
                  onClick={() => setSelectedTechnique(tech)}
                >
                  <span className="inv-quality-gem" style={{ color }}>◆</span>
                  <span className="inv-name" style={{ color }}>{techName}</span>
                  <span className="inv-slot-label">{t(`techniqueTypes.${tech.type}`, { defaultValue: tech.type })}</span>
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
            {t('inventory.slots', { count: cultivation.ownedLaws.length, max: MAX_LAWS })}
          </p>
          <div className="inv-grid">
            {cultivation.ownedLaws.map((law) => {
              const rarity = LAW_RARITY[law.rarity];
              const lawName = tGame(`laws.${law.id}.name`, { defaultValue: law.name });
              return (
                <button
                  key={law.id}
                  className="inv-slot"
                  style={{ borderColor: rarity.color }}
                  onClick={() => setSelectedLaw(law)}
                >
                  <span className="inv-quality-gem" style={{ color: rarity.color }}>◆</span>
                  <span className="inv-name" style={{ color: rarity.color }}>{lawName}</span>
                  <span className="inv-slot-label">{t(`elements.${law.element}`, { defaultValue: law.element })}</span>
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
        const rarity = selectedArtefact.rarity ?? art.rarity;
        const q      = QUALITY[rarity];
        const bonuses = getSlotBonuses(art.slot, rarity);
        const artName = formatArtefactName(selectedArtefact)
          ?? tGame(`artefacts.${art.id}.name`, { defaultValue: art.name });
        const artDesc = tGame(`artefacts.${art.id}.desc`, { defaultValue: art.description });
        return (
          <div className="modal-overlay" onClick={() => setSelectedArtefact(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedArtefact(null)}>x</button>
              <h2 className="modal-title">{artName}</h2>
              <span className="modal-rarity" style={{ color: q.color }}>
                {t(`quality.${rarity}`, { defaultValue: q.label })} · {t(`build.slots.${art.slot}`, { defaultValue: art.slot })}
              </span>
              <p className="modal-desc">{artDesc}</p>
              <div className="item-stat-block">
                {bonuses.map((b, i) => (
                  <div key={i} className="item-stat-row">
                    <span className="item-stat-label">{t(`statNames.${b.stat}`, { defaultValue: b.stat.replace(/_/g, ' ') })}</span>
                    <span className="item-stat-value" style={{ color: q.color }}>+{b.value}</span>
                  </div>
                ))}
              </div>
              {(() => {
                const isEquipped = !!artefacts.equippedInSlot(selectedArtefact.uid);
                return (
                  <DismantleButton
                    rarity={rarity}
                    invested={(selectedArtefact.craftCount ?? 0) > 0}
                    disabled={isEquipped}
                    disabledReason={isEquipped ? 'Unequip this artefact first.' : undefined}
                    onDismantle={() => {
                      const r = artefacts.dismantleArtefact(selectedArtefact.uid);
                      if (r) {
                        dismantleTo(inventory, r);
                        setSelectedArtefact(null);
                      }
                    }}
                  />
                );
              })()}
            </div>
          </div>
        );
      })()}

      {selectedTechnique && (() => {
        const tech    = selectedTechnique;
        const quality = TECHNIQUE_QUALITY[tech.quality] ?? { label: tech.quality, color: '#9ca3af' };
        const typeCol = TYPE_COLOR[tech.type] ?? '#fff';
        const cd      = getCooldown(tech.type, tech.quality);
        const techName = tGame(`techniques.${tech.id}.name`, { defaultValue: tech.name });
        const techFlavour = tGame(`techniques.${tech.id}.flavour`, { defaultValue: tech.flavour });
        return (
          <div className="modal-overlay" onClick={() => setSelectedTechnique(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedTechnique(null)}>x</button>
              <h2 className="modal-title">{techName}</h2>
              <span className="modal-rarity" style={{ color: quality.color }}>
                {t(`quality.${tech.quality}`, { defaultValue: quality.label })} · {t(`techniqueRanks.${tech.rank}`, { defaultValue: tech.rank })}
              </span>
              <div className="item-stat-block">
                <div className="item-stat-row">
                  <span className="item-stat-label">{t('inventory.labelType')}</span>
                  <span className="item-stat-value" style={{ color: typeCol }}>{t(`techniqueTypes.${tech.type}`, { defaultValue: tech.type })}</span>
                </div>
                <div className="item-stat-row">
                  <span className="item-stat-label">{t('inventory.labelCooldown')}</span>
                  <span className="item-stat-value">{cd.toFixed(1)}s</span>
                </div>
                {tech.type === 'Attack' && (
                  <div className="item-stat-row">
                    <span className="item-stat-label">{t('inventory.labelDmgMult')}</span>
                    <span className="item-stat-value">{getK(tech.rank, tech.quality)}</span>
                  </div>
                )}
                {tech.type === 'Heal' && (
                  <div className="item-stat-row">
                    <span className="item-stat-label">{t('inventory.labelHeal')}</span>
                    <span className="item-stat-value">{Math.round((tech.healPercent ?? 0.25) * 100)}% HP</span>
                  </div>
                )}
                {tech.type === 'Defend' && (
                  <>
                    <div className="item-stat-row">
                      <span className="item-stat-label">{t('inventory.labelDefMult')}</span>
                      <span className="item-stat-value">×{tech.defMult}</span>
                    </div>
                    <div className="item-stat-row">
                      <span className="item-stat-label">{t('inventory.labelBuffHits', { defaultValue: 'Covers' })}</span>
                      <span className="item-stat-value">{tech.buffAttacks} hits</span>
                    </div>
                  </>
                )}
                {tech.type === 'Dodge' && (
                  <>
                    <div className="item-stat-row">
                      <span className="item-stat-label">{t('inventory.labelDodgeChance')}</span>
                      <span className="item-stat-value">{Math.round((tech.dodgeChance ?? 0) * 100)}%</span>
                    </div>
                    <div className="item-stat-row">
                      <span className="item-stat-label">{t('inventory.labelBuffHits', { defaultValue: 'Covers' })}</span>
                      <span className="item-stat-value">{tech.buffAttacks} hits</span>
                    </div>
                  </>
                )}
                {tech.element && tech.element !== 'Normal' && (
                  <div className="item-stat-row">
                    <span className="item-stat-label">{t('inventory.labelElement')}</span>
                    <span className="item-stat-value">{t(`elements.${tech.element}`, { defaultValue: tech.element })}</span>
                  </div>
                )}
              </div>
              {tech.passives?.length > 0 && (
                <div className="item-stat-block">
                  {tech.passives.map((p, i) => {
                    const passiveDesc = tGame(`techniques.${tech.id}.passives.${p.name}`, { defaultValue: p.description });
                    return (
                      <p key={i} className="modal-desc">
                        <strong>{p.name}:</strong> {passiveDesc}
                      </p>
                    );
                  })}
                </div>
              )}
              {techFlavour && <p className="modal-desc tech-item-flavour">"{techFlavour}"</p>}
              {(() => {
                const isEquipped = techniques.slots.includes(tech.id);
                return (
                  <DismantleButton
                    rarity={tech.quality}
                    invested={(tech.passives ?? []).some(p => p.tier && p.tier !== 'Iron')}
                    disabled={isEquipped}
                    disabledReason={isEquipped ? 'Unequip this technique first.' : undefined}
                    onDismantle={() => {
                      const r = techniques.dismantleTechnique(tech.id);
                      if (r) {
                        dismantleTo(inventory, r);
                        setSelectedTechnique(null);
                      }
                    }}
                  />
                );
              })()}
            </div>
          </div>
        );
      })()}

      {selectedLaw && (() => {
        const law    = selectedLaw;
        const rarity = LAW_RARITY[law.rarity];
        const lawName   = tGame(`laws.${law.id}.name`,   { defaultValue: law.name });
        const lawFlavour = tGame(`laws.${law.id}.flavour`, { defaultValue: law.flavour });
        return (
          <div className="modal-overlay" onClick={() => setSelectedLaw(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedLaw(null)}>x</button>
              <h2 className="modal-title">{lawName}</h2>
              <span className="modal-rarity" style={{ color: rarity.color }}>
                {t(`quality.${law.rarity}`, { defaultValue: rarity.label })} · {t(`elements.${law.element}`, { defaultValue: law.element })}
              </span>
              <div className="item-stat-block">
                <div className="item-stat-row">
                  <span className="item-stat-label">{t('inventory.labelCultSpeed')}</span>
                  <span className="item-stat-value">×{law.cultivationSpeedMult.toFixed(1)}</span>
                </div>
              </div>
              {law.uniques && Object.keys(law.uniques).length > 0 && (
                <div className="item-stat-block">
                  <span className="item-stat-section">{t('inventory.labelUniqueModifiers')}</span>
                  {Object.entries(law.uniques).map(([tier, u]) => (
                    u && (
                      <p key={tier} className="modal-desc">
                        <strong style={{ color: LAW_RARITY[tier]?.color }}>{tier}:</strong>{' '}
                        {formatUniqueDescription(u.id, u.value)}
                      </p>
                    )
                  ))}
                </div>
              )}
              <p className="modal-desc tech-item-flavour">"{lawFlavour}"</p>
              {(() => {
                const isActive = cultivation?.activeLaw?.id === law.id;
                return (
                  <DismantleButton
                    rarity={law.rarity}
                    invested={Object.keys(law.uniques ?? {}).length > 0}
                    disabled={isActive}
                    disabledReason={isActive ? 'This is your active law — pick another first.' : undefined}
                    onDismantle={() => {
                      const r = cultivation.dismantleLaw(law.id);
                      if (r) {
                        dismantleTo(inventory, r);
                        setSelectedLaw(null);
                      }
                    }}
                  />
                );
              })()}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default CollectionScreen;
