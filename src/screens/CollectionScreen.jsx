// @refresh reset
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HERB_ITEMS, ORE_ITEMS, BLOOD_CORE_ITEMS, CULTIVATION_ITEMS, RARITY, mineralForRarity, ALL_MATERIALS } from '../data/materials';
import { QUALITY, ARTEFACTS_BY_ID, getSlotBonuses } from '../data/artefacts';
import { formatArtefactName } from '../data/artefactNames';
import { LAW_RARITY } from '../data/laws';
import { formatUniqueDescription } from '../data/lawUniques';
import { TECHNIQUE_QUALITY, TYPE_COLOR, getCooldown, getK } from '../data/techniques';
import { MAX_ARTEFACTS } from '../hooks/useArtefacts';
import { MAX_UPGRADE_BY_RARITY } from '../data/artefactUpgrades';
import { ARTEFACT_SETS } from '../data/artefactSets';
import { MAX_TECHNIQUES } from '../hooks/useTechniques';
import { MAX_LAWS } from '../hooks/useCultivation';
import ItemModal from '../components/ItemModal';
import ArtefactTooltip, { useTooltipPos } from '../components/ArtefactTooltip';

const BASE = import.meta.env.BASE_URL;

const MATERIAL_SECTIONS = [
  { key: 'herbs',       items: HERB_ITEMS,       tKey: 'inventory.tabHerbs'       },
  { key: 'minerals',    items: ORE_ITEMS,         tKey: 'inventory.tabMinerals'    },
  { key: 'bloodCores',  items: BLOOD_CORE_ITEMS,  tKey: 'inventory.tabBloodCores'  },
  { key: 'cultivation', items: CULTIVATION_ITEMS, tKey: 'inventory.tabCultivation' },
];

function dismantleTo(inventory, rarity) {
  if (!rarity) return null;
  const mineralId = mineralForRarity(rarity);
  inventory?.addItem?.(mineralId, 1);
  return mineralId;
}

function needsDismantleConfirm(rarity, invested) {
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

function CollectionSection({ title, badge, isEmpty, alwaysShow = false, children }) {
  if (!alwaysShow && isEmpty) return null;
  return (
    <div className="col-section">
      <div className="col-section-header">
        <span className="col-section-title">{title}</span>
        {badge != null && <span className="col-section-badge">{badge}</span>}
      </div>
      {isEmpty ? <p className="col-section-empty">Empty</p> : children}
    </div>
  );
}

function CollectionScreen({ inventory, artefacts, techniques, cultivation }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const { getQuantity } = inventory;
  const [activeTab,         setActiveTab]         = useState('materials');
  const [selectedItem,      setSelectedItem]       = useState(null);
  const [selectedArtefact,  setSelectedArtefact]   = useState(null);
  const artTooltip = useTooltipPos();
  const [hoveredArtUid,     setHoveredArtUid]      = useState(null);
  const [selectedTechnique, setSelectedTechnique]  = useState(null);
  const [selectedLaw,       setSelectedLaw]        = useState(null);

  const artCount  = artefacts?.owned.length ?? 0;
  const techCount = Object.keys(techniques?.ownedTechniques ?? {}).length;
  const lawCount  = cultivation?.ownedLaws.length ?? 0;

  return (
    <div className="screen inventory-screen">
      <h1>{t('collection.title', { defaultValue: 'Collection' })}</h1>

      <div className="inv-tabs">
        {[
          { key: 'materials', label: t('collection.tabMaterials', { defaultValue: 'Materials' }) },
          { key: 'gear',      label: t('collection.tabGear',      { defaultValue: 'Gear' }) },
        ].map(tab => (
          <button
            key={tab.key}
            className={`inv-tab ${activeTab === tab.key ? 'inv-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Materials ──────────────────────────────────────────────────────────── */}
      {activeTab === 'materials' && (
        <div className="col-sections">
          {MATERIAL_SECTIONS.map(({ key, items, tKey }) => {
            const owned = items.filter(item => inventory.inventory[item.id] !== undefined);
            return (
              <CollectionSection key={key} title={t(tKey)} isEmpty={owned.length === 0}>
                <div className="inv-grid">
                  {owned.map((item) => {
                    const qty      = getQuantity(item.id);
                    const rarity   = RARITY[item.rarity];
                    const itemName = tGame(`items.${item.id}.name`, { defaultValue: item.name });
                    return (
                      <button
                        key={item.id}
                        className="inv-slot"
                        style={{ borderColor: qty > 0 ? rarity.color : undefined }}
                        onClick={() => setSelectedItem(item)}
                      >
                        <img src={`${BASE}sprites/items/${item.id}.png`} alt={itemName} className="inv-icon" />
                        <span className="inv-qty">{qty}</span>
                        <span className="inv-name" style={{ color: rarity.color }}>{itemName}</span>
                      </button>
                    );
                  })}
                </div>
              </CollectionSection>
            );
          })}
        </div>
      )}

      {/* ── Gear ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'gear' && (
        <div className="col-sections">

          {/* Artefacts */}
          <CollectionSection
            title={t('inventory.tabArtefacts')}
            badge={`${artCount} / ${MAX_ARTEFACTS}`}
            isEmpty={artCount === 0}
            alwaysShow
          >
            <div className="inv-grid">
              {[...artefacts.owned]
                .sort((a, b) => {
                  const aEq = !!artefacts.equippedInSlot(a.uid);
                  const bEq = !!artefacts.equippedInSlot(b.uid);
                  return aEq === bEq ? 0 : aEq ? -1 : 1;
                })
                .map((instance) => {
                  const art = ARTEFACTS_BY_ID[instance.catalogueId];
                  if (!art) return null;
                  const rarity     = instance.rarity ?? art.rarity;
                  const q          = QUALITY[rarity];
                  const artName    = formatArtefactName(instance) ?? tGame(`artefacts.${art.id}.name`, { defaultValue: art.name });
                  const isEquipped = !!artefacts.equippedInSlot(instance.uid);
                  return (
                    <button
                      key={instance.uid}
                      className={`inv-slot${isEquipped ? ' inv-slot-equipped' : ''}`}
                      style={{ borderColor: q.color }}
                      onClick={() => setSelectedArtefact(instance)}
                      onMouseEnter={(e) => { setHoveredArtUid(instance.uid); artTooltip.handlers.onMouseEnter(e); }}
                      onMouseMove={artTooltip.handlers.onMouseMove}
                      onMouseLeave={(e) => { setHoveredArtUid(null); artTooltip.handlers.onMouseLeave(e); }}
                      onTouchStart={(e) => { setHoveredArtUid(instance.uid); artTooltip.handlers.onTouchStart(e); }}
                      onTouchEnd={(e) => { setHoveredArtUid(null); artTooltip.handlers.onTouchEnd(e); }}
                      onTouchMove={artTooltip.handlers.onTouchMove}
                    >
                      <span className="inv-quality-gem" style={{ color: q.color }}>◆</span>
                      <span className="inv-name" style={{ color: q.color }}>{artName}</span>
                      <span className="inv-slot-label">{t(`build.slots.${art.slot}`, { defaultValue: art.slot })}</span>
                      {isEquipped && <span className="inv-equipped-badge">{t('common.equipped')}</span>}
                    </button>
                  );
                })}
            </div>
          </CollectionSection>

          {/* Techniques */}
          <CollectionSection
            title={t('inventory.tabTechniques')}
            badge={`${techCount} / ${MAX_TECHNIQUES}`}
            isEmpty={techCount === 0}
            alwaysShow
          >
            <div className="inv-grid">
              {Object.values(techniques.ownedTechniques).map((tech) => {
                const color    = LAW_RARITY[tech.quality]?.color ?? '#9ca3af';
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
          </CollectionSection>

          {/* Laws */}
          <CollectionSection
            title={t('inventory.tabLaws')}
            badge={`${lawCount} / ${MAX_LAWS}`}
            isEmpty={lawCount === 0}
            alwaysShow
          >
            <div className="inv-grid">
              {cultivation.ownedLaws.map((law) => {
                const rarity  = LAW_RARITY[law.rarity];
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
          </CollectionSection>

        </div>
      )}

      {/* Artefact hover tooltip */}
      {artTooltip.pos && hoveredArtUid && (() => {
        const inst = artefacts.owned.find(o => o.uid === hoveredArtUid);
        if (!inst) return null;
        const cat    = ARTEFACTS_BY_ID[inst.catalogueId];
        if (!cat) return null;
        const rarity = inst.rarity ?? cat.rarity;
        const name   = formatArtefactName(inst) ?? tGame(`artefacts.${cat.id}.name`, { defaultValue: cat.name });
        return (
          <ArtefactTooltip
            artefact={{ ...cat, rarity, name }}
            affixes={inst.affixes ?? []}
            element={inst.element}
            setIds={inst.setIds}
            upgradeLevel={inst.upgradeLevel ?? 0}
            style={{ position: 'fixed', left: artTooltip.pos.x, top: artTooltip.pos.y, zIndex: 100 }}
          />
        );
      })()}

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          quantity={getQuantity(selectedItem.id)}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {selectedArtefact && (() => {
        // Live snapshot — so UI reflects level-ups without re-opening the modal.
        const live   = artefacts.owned.find(o => o.uid === selectedArtefact.uid) ?? selectedArtefact;
        const art    = ARTEFACTS_BY_ID[live.catalogueId];
        const rarity = live.rarity ?? art.rarity;
        const q      = QUALITY[rarity];
        const bonuses = getSlotBonuses(art.slot, rarity);
        const artName = formatArtefactName(live) ?? tGame(`artefacts.${art.id}.name`, { defaultValue: art.name });
        const artDesc = tGame(`artefacts.${art.id}.desc`, { defaultValue: art.description });
        const level  = live.upgradeLevel ?? 0;
        const cap    = MAX_UPGRADE_BY_RARITY[rarity] ?? 0;
        const cost   = level < cap ? (artefacts.getUpgradeCost?.(live.uid) ?? null) : null;
        const canAfford = !!cost && cost.every(c => getQuantity(c.itemId) >= c.qty);
        return (
          <div className="modal-overlay" onClick={() => setSelectedArtefact(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedArtefact(null)}>x</button>
              <h2 className="modal-title">
                {artName}{level > 0 && <span style={{ color: q.color, marginLeft: 8 }}>+{level}</span>}
              </h2>
              <span className="modal-rarity" style={{ color: q.color }}>
                {t(`quality.${rarity}`, { defaultValue: q.label })} · {t(`build.slots.${art.slot}`, { defaultValue: art.slot })}
                {live.element && <> · {t(`elements.${live.element}`, { defaultValue: live.element })}</>}
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

              {/* ── Set membership ──────────────────────────────────────── */}
              {Array.isArray(live.setIds) && live.setIds.length > 0 && (
                <div className="item-stat-block" style={{ marginTop: 8 }}>
                  <div className="item-stat-row" style={{ opacity: 0.85 }}>
                    <span className="item-stat-label">{t('collection.setLabel', { defaultValue: 'Set' })}</span>
                  </div>
                  {live.setIds.map(sid => {
                    const s = ARTEFACT_SETS[sid];
                    if (!s) return null;
                    return (
                      <div key={sid} style={{ paddingLeft: 12, marginBottom: 4 }}>
                        <div className="item-stat-row">
                          <span className="item-stat-label">◆ {s.name}</span>
                          <span className="item-stat-value" style={{ opacity: 0.7 }}>
                            {t(`elements.${s.element}`, { defaultValue: s.element })}
                          </span>
                        </div>
                        <div className="item-stat-row" style={{ paddingLeft: 12, opacity: 0.65, fontSize: 12 }}>
                          <span className="item-stat-label">2p: {s.twoPiece?.description}</span>
                        </div>
                        <div className="item-stat-row" style={{ paddingLeft: 12, opacity: 0.65, fontSize: 12 }}>
                          <span className="item-stat-label">4p: {s.fourPiece?.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Upgrade panel ───────────────────────────────────────── */}
              <div className="item-stat-block" style={{ marginTop: 12, padding: 10, border: `1px solid ${q.color}55`, borderRadius: 6 }}>
                <div className="item-stat-row">
                  <span className="item-stat-label">{t('collection.upgradeLevel', { defaultValue: 'Upgrade' })}</span>
                  <span className="item-stat-value" style={{ color: q.color }}>+{level} / +{cap}</span>
                </div>
                {level < cap && cost && (
                  <>
                    <div className="item-stat-row" style={{ marginTop: 6, opacity: 0.85 }}>
                      <span className="item-stat-label">{t('collection.upgradeCost', { defaultValue: 'Next level cost' })}</span>
                    </div>
                    {cost.map((c, i) => {
                      const have = getQuantity(c.itemId);
                      const short = have < c.qty;
                      const matName = ALL_MATERIALS[c.itemId]?.name ?? c.itemId;
                      return (
                        <div key={i} className="item-stat-row" style={{ paddingLeft: 12 }}>
                          <span className="item-stat-label">{tGame(`materials.${c.itemId}.name`, { defaultValue: matName })}</span>
                          <span className="item-stat-value" style={{ color: short ? '#f87171' : '#a3e635' }}>
                            {have} / {c.qty}
                          </span>
                        </div>
                      );
                    })}
                    <button
                      className="save-btn"
                      style={{ marginTop: 8, width: '100%' }}
                      disabled={!canAfford}
                      title={canAfford ? '' : 'Not enough materials.'}
                      onClick={() => {
                        if (!canAfford) return;
                        for (const c of cost) inventory.removeItem(c.itemId, c.qty);
                        artefacts.levelUpArtefact(live.uid);
                      }}
                    >
                      {t('collection.upgradeBtn', { defaultValue: 'Upgrade +1' })}
                    </button>
                  </>
                )}
                {level >= cap && (
                  <div className="item-stat-row" style={{ marginTop: 6, opacity: 0.7 }}>
                    <span className="item-stat-label">{t('collection.upgradeMaxed', { defaultValue: 'Fully upgraded' })}</span>
                  </div>
                )}
              </div>

              {(() => {
                const isEquipped = !!artefacts.equippedInSlot(live.uid);
                return (
                  <DismantleButton
                    rarity={rarity}
                    invested={(live.craftCount ?? 0) > 0 || level > 0}
                    disabled={isEquipped}
                    disabledReason={isEquipped ? 'Unequip this artefact first.' : undefined}
                    onDismantle={() => {
                      const r = artefacts.dismantleArtefact(live.uid);
                      if (r) { dismantleTo(inventory, r); setSelectedArtefact(null); }
                    }}
                  />
                );
              })()}
            </div>
          </div>
        );
      })()}

      {selectedTechnique && (() => {
        const tech     = selectedTechnique;
        const quality  = TECHNIQUE_QUALITY[tech.quality] ?? { label: tech.quality, color: '#9ca3af' };
        const typeCol  = TYPE_COLOR[tech.type] ?? '#fff';
        const cd       = getCooldown(tech.type, tech.quality);
        const techName    = tGame(`techniques.${tech.id}.name`,    { defaultValue: tech.name });
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
                    return <p key={i} className="modal-desc"><strong>{p.name}:</strong> {passiveDesc}</p>;
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
                      if (r) { dismantleTo(inventory, r); setSelectedTechnique(null); }
                    }}
                  />
                );
              })()}
            </div>
          </div>
        );
      })()}

      {selectedLaw && (() => {
        const law     = selectedLaw;
        const rarity  = LAW_RARITY[law.rarity];
        const lawName    = tGame(`laws.${law.id}.name`,    { defaultValue: law.name });
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
                      if (r) { dismantleTo(inventory, r); setSelectedLaw(null); }
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
