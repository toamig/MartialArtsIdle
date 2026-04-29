// @refresh reset
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HERB_ITEMS, ORE_ITEMS, BLOOD_CORE_ITEMS, CULTIVATION_ITEMS, RARITY, mineralForRarity, ALL_MATERIALS } from '../data/materials';
import { QUALITY, ARTEFACTS_BY_ID } from '../data/artefacts';
import { formatArtefactName } from '../data/artefactNames';
import { formatAffixValue, AFFIX_UNIQUE_COLOR } from '../data/affixDisplay';
import { effectiveAffixValue, bonusCount } from '../data/artefactUpgrades';
import { LAW_RARITY } from '../data/laws';
import { formatUniqueDescription } from '../data/lawUniques';
import { TECHNIQUE_QUALITY, TYPE_COLOR, describeTechnique } from '../data/techniques';
import { MAX_ARTEFACTS } from '../hooks/useArtefacts';
import { MAX_UPGRADE_BY_RARITY } from '../data/artefactUpgrades';
import { ARTEFACT_SETS } from '../data/artefactSets';
import { MAX_TECHNIQUES } from '../hooks/useTechniques';
import { MAX_LAWS } from '../hooks/useCultivation';
import ItemModal from '../components/ItemModal';
import ArtefactTooltip, { useTooltipPos } from '../components/ArtefactTooltip';
import ArtefactUpgradeModal from '../components/ArtefactUpgradeModal';

const ARTEFACT_SLOT_ORDER = ['weapon', 'head', 'body', 'hands', 'waist', 'feet', 'neck', 'ring'];
const RARITY_ORDER         = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];
const TECH_TYPE_ORDER      = ['Attack', 'Heal', 'Defend', 'Dodge', 'Expose'];
const ELEMENT_ORDER        = ['fire', 'water', 'earth', 'wood', 'metal'];
// Wuxing-aligned filter chip tints. Used only when a chip is active so the
// strip stays neutral at rest. Subset chosen for readability against dark bg.
const ELEMENT_FILTER_COLOR = {
  fire:  '#f87171',
  water: '#60a5fa',
  earth: '#fbbf24',
  wood:  '#a3e635',
  metal: '#cbd5e1',
};

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

function CollectionSection({ title, badge, count, max, isEmpty, emptyMessage, alwaysShow = false, children }) {
  if (!alwaysShow && isEmpty) return null;
  // Capacity-aware badge: when count + max are passed, the pill turns amber
  // at 80% capacity and red at 95% so the player gets a heads-up before
  // their next drop is silently dropped on the floor.
  let badgeText = badge;
  let badgeVariant = '';
  if (max != null && count != null) {
    badgeText = `${count} / ${max}`;
    const ratio = max > 0 ? count / max : 0;
    if (ratio >= 0.95) badgeVariant = ' is-critical';
    else if (ratio >= 0.8) badgeVariant = ' is-warn';
  }
  return (
    <div className="col-section">
      <div className="col-section-header">
        <span className="col-section-title">{title}</span>
        {badgeText != null && (
          <span className={`col-section-badge${badgeVariant}`}>{badgeText}</span>
        )}
      </div>
      {isEmpty ? (
        <p className="col-section-empty">{emptyMessage ?? 'Empty'}</p>
      ) : children}
    </div>
  );
}

/** FilterChips — single-select strip of filter pills.
    Pass options as `[{ value, label, color? }, ...]`. The "All" chip clears
    the selection (value passed is null). When a chip carries a `color`, the
    chip's active state is tinted with that colour via --chip-accent. */
function FilterChips({ label, options, value, onChange }) {
  return (
    <div className="coll-filter-row">
      {label && <span className="coll-filter-label">{label}</span>}
      <div className="coll-filter-chips">
        <button
          type="button"
          className={`coll-filter-chip${value == null ? ' is-active' : ''}`}
          onClick={() => onChange(null)}
        >
          All
        </button>
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`coll-filter-chip${value === opt.value ? ' is-active' : ''}`}
            style={opt.color ? { '--chip-accent': opt.color } : undefined}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
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
  const [upgradeArtefactUid, setUpgradeArtefactUid] = useState(null);
  const artTooltip = useTooltipPos();
  const [hoveredArtUid,     setHoveredArtUid]      = useState(null);
  const [selectedTechnique, setSelectedTechnique]  = useState(null);
  const [selectedLaw,       setSelectedLaw]        = useState(null);

  // Filter state — null means "All". One state per dimension per grid.
  const [artefactSlotFilter,   setArtefactSlotFilter]   = useState(null);
  const [artefactRarityFilter, setArtefactRarityFilter] = useState(null);
  const [techniqueTypeFilter,  setTechniqueTypeFilter]  = useState(null);
  const [lawElementFilter,     setLawElementFilter]     = useState(null);

  const artCount  = artefacts?.owned.length ?? 0;
  const techCount = Object.keys(techniques?.ownedTechniques ?? {}).length;
  const lawCount  = cultivation?.ownedLaws.length ?? 0;

  // Filtered + sorted derivations. Filters narrow the grid; the existing
  // equipped/active-first sort is preserved on top.
  const filteredArtefacts = useMemo(() => {
    return [...artefacts.owned]
      .filter(o => {
        const cat = ARTEFACTS_BY_ID[o.catalogueId];
        if (!cat) return false;
        if (artefactSlotFilter && cat.slot !== artefactSlotFilter) return false;
        const r = o.rarity ?? cat.rarity ?? 'Iron';
        if (artefactRarityFilter && r !== artefactRarityFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const aEq = !!artefacts.equippedInSlot(a.uid);
        const bEq = !!artefacts.equippedInSlot(b.uid);
        return aEq === bEq ? 0 : aEq ? -1 : 1;
      });
  }, [artefacts, artefactSlotFilter, artefactRarityFilter]);

  const filteredTechniques = useMemo(() => {
    return Object.values(techniques.ownedTechniques)
      .filter(tech => !techniqueTypeFilter || tech.type === techniqueTypeFilter)
      .sort((a, b) => {
        const aEq = techniques.slots.includes(a.id);
        const bEq = techniques.slots.includes(b.id);
        return aEq === bEq ? 0 : aEq ? -1 : 1;
      });
  }, [techniques, techniqueTypeFilter]);

  const filteredLaws = useMemo(() => {
    return [...cultivation.ownedLaws]
      .filter(law => !lawElementFilter || law.element === lawElementFilter)
      .sort((a, b) => {
        const aActive = cultivation?.activeLaw?.id === a.id;
        const bActive = cultivation?.activeLaw?.id === b.id;
        return aActive === bActive ? 0 : aActive ? -1 : 1;
      });
  }, [cultivation, lawElementFilter]);

  return (
    <div className="screen inventory-screen">
      <header className="coll-page-header">
        <h1>{t('collection.title', { defaultValue: 'Collection' })}</h1>
        <span className="coll-page-subtitle">
          {artCount} artefacts · {techCount} techniques · {lawCount} laws
        </span>
      </header>

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
            count={artCount}
            max={MAX_ARTEFACTS}
            isEmpty={artCount === 0}
            emptyMessage={t('collection.emptyArtefacts', { defaultValue: 'Defeat enemies in Worlds to find artefacts.' })}
            alwaysShow
          >
            {artCount > 0 && (
              <>
                <FilterChips
                  label="Slot"
                  value={artefactSlotFilter}
                  onChange={setArtefactSlotFilter}
                  options={ARTEFACT_SLOT_ORDER.map(slot => ({
                    value: slot,
                    label: t(`build.slots.${slot}`, { defaultValue: slot }),
                  }))}
                />
                <FilterChips
                  label="Rarity"
                  value={artefactRarityFilter}
                  onChange={setArtefactRarityFilter}
                  options={RARITY_ORDER.map(r => ({
                    value: r,
                    label: t(`quality.${r}`, { defaultValue: r }),
                    color: QUALITY[r]?.color,
                  }))}
                />
              </>
            )}
            <div className="inv-grid">
              {filteredArtefacts.map((instance) => {
                  const art = ARTEFACTS_BY_ID[instance.catalogueId];
                  if (!art) return null;
                  const rarity     = instance.rarity ?? art.rarity;
                  const q          = QUALITY[rarity];
                  const artName    = formatArtefactName(instance) ?? tGame(`artefacts.${art.id}.name`, { defaultValue: art.name });
                  const isEquipped = !!artefacts.equippedInSlot(instance.uid);
                  const isLocked = !!instance.locked;
                  return (
                    <button
                      key={instance.uid}
                      className={`inv-slot${isEquipped ? ' inv-slot-equipped' : ''}${isLocked ? ' inv-slot-locked' : ''}`}
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
                      {isLocked && <span className="inv-lock-badge" aria-label="Locked">🔒</span>}
                      {isEquipped && <span className="inv-equipped-badge">{t('common.equipped')}</span>}
                    </button>
                  );
                })}
            </div>
          </CollectionSection>

          {/* Techniques */}
          <CollectionSection
            title={t('inventory.tabTechniques')}
            count={techCount}
            max={MAX_TECHNIQUES}
            isEmpty={techCount === 0}
            emptyMessage={t('collection.emptyTechniques', { defaultValue: 'Defeat enemies to drop techniques.' })}
            alwaysShow
          >
            {techCount > 0 && (
              <FilterChips
                label="Type"
                value={techniqueTypeFilter}
                onChange={setTechniqueTypeFilter}
                options={TECH_TYPE_ORDER.map(type => ({
                  value: type,
                  label: t(`techniqueTypes.${type}`, { defaultValue: type }),
                  color: TYPE_COLOR[type],
                }))}
              />
            )}
            <div className="inv-grid">
              {filteredTechniques.map((tech) => {
                  const color    = LAW_RARITY[tech.quality]?.color ?? '#9ca3af';
                  const typeCol  = TYPE_COLOR[tech.type] ?? '#fff';
                  const techName = tGame(`techniques.${tech.id}.name`, { defaultValue: tech.name });
                  const isEquipped = techniques.slots.includes(tech.id);
                  return (
                    <button
                      key={tech.id}
                      className={`inv-slot${isEquipped ? ' inv-slot-equipped' : ''}`}
                      style={{ borderColor: color }}
                      onClick={() => setSelectedTechnique(tech)}
                    >
                      <span
                        className="tech-icon"
                        style={{ '--type-color': typeCol, '--type-bg': typeCol + '22' }}
                      >
                        <span className="tech-icon-glyph">{tech.icon ?? '?'}</span>
                      </span>
                      <span className="inv-name" style={{ color }}>{techName}</span>
                      <span className="inv-slot-label">{t(`techniqueTypes.${tech.type}`, { defaultValue: tech.type })}</span>
                      {isEquipped && <span className="inv-equipped-badge">{t('common.equipped')}</span>}
                    </button>
                  );
                })}
            </div>
          </CollectionSection>

          {/* Laws */}
          <CollectionSection
            title={t('inventory.tabLaws')}
            count={lawCount}
            max={MAX_LAWS}
            isEmpty={lawCount === 0}
            emptyMessage={t('collection.emptyLaws', { defaultValue: 'Reach new realms or defeat elites to drop laws.' })}
            alwaysShow
          >
            {lawCount > 0 && (
              <FilterChips
                label="Element"
                value={lawElementFilter}
                onChange={setLawElementFilter}
                options={ELEMENT_ORDER.map(el => ({
                  value: el,
                  label: t(`elements.${el}`, { defaultValue: el }),
                  color: ELEMENT_FILTER_COLOR[el],
                }))}
              />
            )}
            <div className="inv-grid">
              {filteredLaws.map((law) => {
                  const rarity  = LAW_RARITY[law.rarity];
                  const lawName = tGame(`laws.${law.id}.name`, { defaultValue: law.name });
                  const isActive = cultivation?.activeLaw?.id === law.id;
                  return (
                    <button
                      key={law.id}
                      className={`inv-slot${isActive ? ' inv-slot-equipped' : ''}`}
                      style={{ borderColor: rarity.color }}
                      onClick={() => setSelectedLaw(law)}
                    >
                      <span className="inv-quality-gem" style={{ color: rarity.color }}>◆</span>
                      <span className="inv-name" style={{ color: rarity.color }}>{lawName}</span>
                      <span className="inv-slot-label">{t(`elements.${law.element}`, { defaultValue: law.element })}</span>
                      {isActive && (
                        <span className="inv-equipped-badge">
                          {t('common.active', { defaultValue: 'Active' })}
                        </span>
                      )}
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
        const affixes = live.affixes ?? [];
        const affixBonuses = live.affixBonuses ?? {};
        const artName = formatArtefactName(live) ?? tGame(`artefacts.${art.id}.name`, { defaultValue: art.name });
        const artDesc = tGame(`artefacts.${art.id}.desc`, { defaultValue: art.description });
        const level  = live.upgradeLevel ?? 0;
        const cap    = MAX_UPGRADE_BY_RARITY[rarity] ?? 0;
        const upgradePct = cap > 0 ? Math.min(100, (level / cap) * 100) : 0;
        const isEquipped = !!artefacts.equippedInSlot(live.uid);
        const subtitle = [
          t(`quality.${rarity}`, { defaultValue: q.label }),
          t(`build.slots.${art.slot}`, { defaultValue: art.slot }),
          live.element ? t(`elements.${live.element}`, { defaultValue: live.element }) : null,
        ].filter(Boolean).join(' · ');
        return (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={artName}
            onClick={() => setSelectedArtefact(null)}
          >
            <div className="coll-modal-panel" onClick={e => e.stopPropagation()}>
              <header className="coll-modal-header">
                <span className="coll-modal-gem" style={{ color: q.color }}>◆</span>
                <div className="coll-modal-titles">
                  <div className="coll-modal-title" style={{ color: q.color }}>
                    {artName}
                    {level > 0 && <span className="coll-modal-curlevel"> +{level}</span>}
                  </div>
                  <div className="coll-modal-subtitle">{subtitle}</div>
                </div>
                <button
                  type="button"
                  className={`coll-modal-lock-btn${live.locked ? ' is-locked' : ''}`}
                  aria-pressed={!!live.locked}
                  aria-label={live.locked ? 'Unlock' : 'Lock'}
                  title={live.locked
                    ? 'Locked — protected from dismantle and sacrifice'
                    : 'Lock to protect from dismantle and sacrifice'}
                  onClick={() => artefacts.toggleArtefactLock(live.uid)}
                >
                  {live.locked ? '🔒' : '🔓'}
                </button>
                <button
                  type="button"
                  className="modal-close coll-modal-close"
                  aria-label="Close"
                  onClick={() => setSelectedArtefact(null)}
                >
                  ✕
                </button>
              </header>

              <div className="coll-modal-body">
                {artDesc && <p className="coll-modal-desc">{artDesc}</p>}

                {/* ── Rolled affixes (level-scaled) ─────────────────── */}
                {affixes.length > 0 && (
                  <section>
                    <div className="coll-modal-section-title">Affixes</div>
                    <ul className="coll-stat-list">
                      {affixes.map((a, i) => {
                        const entry    = affixBonuses[i];
                        const count    = bonusCount(entry);
                        const effValue = effectiveAffixValue(a, level, entry);
                        const line     = formatAffixValue({ ...a, value: effValue });
                        return (
                          <li
                            key={i}
                            className={`coll-stat-row${a.unique ? ' is-unique' : ''}`}
                            style={a.unique ? { color: AFFIX_UNIQUE_COLOR } : undefined}
                          >
                            <span className="coll-stat-label">
                              {a.unique && '★ '}{line}
                            </span>
                            {count > 0 && (
                              <span className="coll-stat-bonus">+{count}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {/* ── Set membership ───────────────────────────────── */}
                {Array.isArray(live.setIds) && live.setIds.length > 0 && (
                  <section>
                    <div className="coll-modal-section-title">
                      {t('collection.setLabel', { defaultValue: 'Sets' })}
                    </div>
                    {live.setIds.map(sid => {
                      const s = ARTEFACT_SETS[sid];
                      if (!s) return null;
                      const setEl = t(`elements.${s.element}`, { defaultValue: s.element });
                      return (
                        <div key={sid} className="coll-set-card">
                          <div className="coll-set-card-head">
                            <span className="coll-set-card-gem" style={{ color: q.color }}>◆</span>
                            <span className="coll-set-card-name">{s.name}</span>
                            <span className="coll-set-card-element">{setEl}</span>
                          </div>
                          {s.twoPiece?.description && (
                            <div className="coll-set-card-piece">
                              <span className="coll-set-card-piece-tag">2p</span>
                              {s.twoPiece.description}
                            </div>
                          )}
                          {s.fourPiece?.description && (
                            <div className="coll-set-card-piece">
                              <span className="coll-set-card-piece-tag">4p</span>
                              {s.fourPiece.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </section>
                )}

                {/* ── Upgrade summary — progress bar + open-modal trigger ── */}
                <section>
                  <div className="coll-modal-section-title">
                    {t('collection.upgradeLevel', { defaultValue: 'Upgrade' })}
                  </div>
                  <div className="coll-upgrade-block">
                    <div className="coll-upgrade-block-top">
                      <span className="coll-upgrade-block-label">Level</span>
                      <span className="coll-upgrade-block-value" style={{ color: q.color }}>
                        +{level} / +{cap}
                      </span>
                    </div>
                    <div className="coll-progress-bar" aria-hidden="true">
                      <span
                        className="coll-progress-bar-fill"
                        style={{ width: `${upgradePct}%` }}
                      />
                    </div>
                    {level < cap ? (
                      <button
                        type="button"
                        className="save-btn coll-upgrade-block-btn"
                        onClick={() => setUpgradeArtefactUid(live.uid)}
                      >
                        {t('collection.upgradeOpen', { defaultValue: 'Upgrade…' })}
                      </button>
                    ) : (
                      <div className="coll-upgrade-block-maxed">
                        {t('collection.upgradeMaxed', { defaultValue: 'Fully upgraded' })}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <footer className="coll-modal-footer">
                <DismantleButton
                  rarity={rarity}
                  invested={(live.craftCount ?? 0) > 0 || level > 0}
                  disabled={isEquipped || !!live.locked}
                  disabledReason={
                    isEquipped ? 'Unequip this artefact first.'
                    : live.locked ? 'Unlock this artefact first.'
                    : undefined
                  }
                  onDismantle={() => {
                    const r = artefacts.dismantleArtefact(live.uid);
                    if (r) { dismantleTo(inventory, r); setSelectedArtefact(null); }
                  }}
                />
              </footer>
            </div>
          </div>
        );
      })()}

      {upgradeArtefactUid && (() => {
        const target = artefacts.owned.find(o => o.uid === upgradeArtefactUid);
        if (!target) return null;
        return (
          <ArtefactUpgradeModal
            artefact={target}
            artefacts={artefacts}
            inventory={inventory}
            onClose={() => setUpgradeArtefactUid(null)}
          />
        );
      })()}

      {selectedTechnique && (() => {
        const tech     = selectedTechnique;
        const quality  = TECHNIQUE_QUALITY[tech.quality] ?? { label: tech.quality, color: '#9ca3af' };
        const typeCol  = TYPE_COLOR[tech.type] ?? '#fff';
        const techName    = tGame(`techniques.${tech.id}.name`,    { defaultValue: tech.name });
        const techFlavour = tGame(`techniques.${tech.id}.flavour`, { defaultValue: tech.flavour });
        const lines = describeTechnique(tech);
        const isEquipped = techniques.slots.includes(tech.id);
        const subtitle = `${t(`quality.${tech.quality}`, { defaultValue: quality.label })} · ${t(`techniqueTypes.${tech.type}`, { defaultValue: tech.type })}`;
        return (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={techName}
            onClick={() => setSelectedTechnique(null)}
          >
            <div className="coll-modal-panel" onClick={e => e.stopPropagation()}>
              <header className="coll-modal-header">
                <span
                  className="coll-modal-tech-icon"
                  style={{ '--type-color': typeCol, '--type-bg': `${typeCol}22` }}
                >
                  <span className="coll-modal-tech-icon-glyph">{tech.icon ?? '?'}</span>
                </span>
                <div className="coll-modal-titles">
                  <div className="coll-modal-title" style={{ color: quality.color }}>{techName}</div>
                  <div className="coll-modal-subtitle">{subtitle}</div>
                </div>
                <button
                  type="button"
                  className="modal-close coll-modal-close"
                  aria-label="Close"
                  onClick={() => setSelectedTechnique(null)}
                >
                  ✕
                </button>
              </header>

              <div className="coll-modal-body">
                {lines.length > 0 && (
                  <section>
                    <div className="coll-modal-section-title">Effects</div>
                    <ul className="coll-stat-list">
                      {lines.map((line, i) => (
                        <li key={i} className="coll-stat-row">
                          <span className="coll-stat-label">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {techFlavour && (
                  <p className="coll-modal-flavour">&ldquo;{techFlavour}&rdquo;</p>
                )}
              </div>

              <footer className="coll-modal-footer">
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
              </footer>
            </div>
          </div>
        );
      })()}

      {selectedLaw && (() => {
        const law     = selectedLaw;
        const rarity  = LAW_RARITY[law.rarity];
        const lawName    = tGame(`laws.${law.id}.name`,    { defaultValue: law.name });
        const lawFlavour = tGame(`laws.${law.id}.flavour`, { defaultValue: law.flavour });
        const isActive = cultivation?.activeLaw?.id === law.id;
        const subtitle = `${t(`quality.${law.rarity}`, { defaultValue: rarity.label })} · ${t(`elements.${law.element}`, { defaultValue: law.element })}`;
        const uniqueEntries = law.uniques
          ? Object.entries(law.uniques).filter(([, u]) => !!u)
          : [];
        return (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={lawName}
            onClick={() => setSelectedLaw(null)}
          >
            <div className="coll-modal-panel" onClick={e => e.stopPropagation()}>
              <header className="coll-modal-header">
                <span className="coll-modal-gem" style={{ color: rarity.color }}>◆</span>
                <div className="coll-modal-titles">
                  <div className="coll-modal-title" style={{ color: rarity.color }}>{lawName}</div>
                  <div className="coll-modal-subtitle">{subtitle}</div>
                </div>
                <button
                  type="button"
                  className="modal-close coll-modal-close"
                  aria-label="Close"
                  onClick={() => setSelectedLaw(null)}
                >
                  ✕
                </button>
              </header>

              <div className="coll-modal-body">
                <section>
                  <div className="coll-modal-section-title">Cultivation</div>
                  <ul className="coll-stat-list">
                    <li className="coll-stat-row">
                      <span className="coll-stat-label">
                        {t('inventory.labelCultSpeed', { defaultValue: 'Cultivation speed' })}
                      </span>
                      <span className="coll-stat-value" style={{ color: rarity.color }}>
                        ×{law.cultivationSpeedMult.toFixed(1)}
                      </span>
                    </li>
                  </ul>
                </section>

                {uniqueEntries.length > 0 && (
                  <section>
                    <div className="coll-modal-section-title">
                      {t('inventory.labelUniqueModifiers', { defaultValue: 'Unique modifiers' })}
                    </div>
                    <ul className="coll-stat-list">
                      {uniqueEntries.map(([tier, u]) => (
                        <li key={tier} className="coll-stat-row">
                          <span className="coll-stat-label">
                            <strong style={{ color: LAW_RARITY[tier]?.color }}>{tier}:</strong>{' '}
                            {formatUniqueDescription(u.id, u.value)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {lawFlavour && (
                  <p className="coll-modal-flavour">&ldquo;{lawFlavour}&rdquo;</p>
                )}
              </div>

              <footer className="coll-modal-footer">
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
              </footer>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default CollectionScreen;
