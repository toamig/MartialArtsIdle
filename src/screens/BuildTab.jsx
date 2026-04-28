// @refresh reset
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TechniqueSlotModal from '../components/TechniqueSlotModal';
import ArtefactTooltip, { useTooltipPos } from '../components/ArtefactTooltip';
import LockTooltip from '../components/LockTooltip';
import { LAW_RARITY } from '../data/laws';
import { formatUniqueDescription } from '../data/lawUniques';
import { TECHNIQUE_QUALITY, TYPE_COLOR, getCooldown } from '../data/techniques';
import { QUALITY } from '../data/artefacts';
import { ARTEFACT_SETS, countEquippedSets } from '../data/artefactSets';

// col/row are 1-indexed CSS grid positions (3 columns, 5 rows)
const GEAR_SLOTS = [
  { id: 'head',   type: 'head',   col: 2, row: 1 },
  { id: 'ring_1', type: 'ring',   col: 1, row: 2 },
  { id: 'neck',   type: 'neck',   col: 2, row: 2 },
  { id: 'ring_2', type: 'ring',   col: 3, row: 2 },
  { id: 'weapon', type: 'weapon', col: 1, row: 3 },
  { id: 'body',   type: 'body',   col: 2, row: 3 },
  { id: 'hands',  type: 'hands',  col: 3, row: 3 },
  { id: 'waist',  type: 'waist',  col: 2, row: 4 },
  { id: 'feet',   type: 'feet',   col: 2, row: 5 },
];

const SLOT_LABELS = ['I', 'II', 'III'];

// ── Inline Artefact Picker ───────────────────────────────────────────────────

function InlineArtefactPicker({ slot, artefacts, onClose }) {
  const { t } = useTranslation('ui');
  const availableRaw = artefacts.getOwnedForSlot(slot.type);
  const equipped  = artefacts.getEquipped(slot.id);
  // Items equipped anywhere float to the top so the player can see at a
  // glance which rings/etc. are already in use across sibling slots.
  const available = [...availableRaw].sort((a, b) => {
    const aSlot = artefacts.equippedInSlot(a.uid);
    const bSlot = artefacts.equippedInSlot(b.uid);
    if (!!aSlot === !!bSlot) return 0;
    return aSlot ? -1 : 1;
  });
  const tooltip   = useTooltipPos();
  const [hoveredUid, setHoveredUid] = useState(null);

  const hoveredArt = hoveredUid ? available.find(a => a.uid === hoveredUid) : null;
  const hoveredAffixes = hoveredUid
    ? (artefacts.owned.find(o => o.uid === hoveredUid)?.affixes ?? [])
    : [];

  const slotLabel = t(`build.slots.${slot.type}`, { defaultValue: slot.type });

  return (
    <div className="art-inline-picker">
      <div className="art-inline-picker-header">
        <span className="art-inline-picker-title">{t('build.selectArtefactTitle', { slot: slotLabel })}</span>
        <button className="art-inline-picker-close" onClick={onClose}>✕</button>
      </div>
      {available.length === 0 ? (
        <p className="art-pick-empty">{t('build.noArtefactsForSlot')}</p>
      ) : (
        <div className="art-inline-picker-grid">
          {available.map(a => {
            const artName = a.name;
            const quality = QUALITY[a.rarity];
            const isEquipped = equipped?.uid === a.uid;
            const equippedSlotId = artefacts.equippedInSlot(a.uid);
            const isEquippedElsewhere = !!equippedSlotId && equippedSlotId !== slot.id;
            return (
              <button
                key={a.uid}
                className={`art-inline-card${isEquipped ? ' art-inline-card-equipped' : ''}${isEquippedElsewhere ? ' art-inline-card-equipped-other' : ''}`}
                style={{ borderColor: (isEquipped || isEquippedElsewhere) ? quality?.color : undefined }}
                onClick={() => {
                  if (isEquipped) {
                    artefacts.unequip(slot.id);
                  } else {
                    artefacts.equip(slot.id, a.uid);
                  }
                  onClose();
                }}
                onMouseEnter={(e) => {
                  setHoveredUid(a.uid);
                  tooltip.handlers.onMouseEnter(e);
                }}
                onMouseMove={tooltip.handlers.onMouseMove}
                onMouseLeave={(e) => {
                  setHoveredUid(null);
                  tooltip.handlers.onMouseLeave(e);
                }}
                onTouchStart={(e) => {
                  setHoveredUid(a.uid);
                  tooltip.handlers.onTouchStart(e);
                }}
                onTouchEnd={(e) => {
                  setHoveredUid(null);
                  tooltip.handlers.onTouchEnd(e);
                }}
                onTouchMove={tooltip.handlers.onTouchMove}
              >
                <span className="art-inline-card-name" style={{ color: quality?.color }}>{artName}</span>
                {(isEquipped || isEquippedElsewhere) && (
                  <span className={`art-inline-card-tag${isEquippedElsewhere ? ' art-inline-card-tag-other' : ''}`}>
                    {t('common.equipped')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {tooltip.pos && hoveredArt && (
        <ArtefactTooltip
          artefact={hoveredArt}
          affixes={hoveredAffixes}
          style={{ position: 'fixed', left: tooltip.pos.x, top: tooltip.pos.y }}
        />
      )}
    </div>
  );
}

// ── Law Picker Modal ─────────────────────────────────────────────────────────

function LawPickerModal({ ownedLaws, activeLaw, onSelect, onClose }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');
  const activeId = activeLaw?.id ?? null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content law-picker-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">{t('build.selectLaw')}</h2>
        {ownedLaws.length === 0 ? (
          <p className="sel-realm" style={{ padding: '24px 16px' }}>
            {t('build.noLawsOwned', { defaultValue: 'You haven\'t earned any laws yet.' })}
          </p>
        ) : (
        <div className="law-picker-list">
          {activeId && (
            <button
              className="law-picker-card"
              onClick={() => { onSelect(null); onClose(); }}
            >
              <div className="law-picker-card-header">
                <span className="law-picker-card-name">
                  {t('build.unequipLaw', { defaultValue: 'Unequip current law' })}
                </span>
              </div>
            </button>
          )}
          {ownedLaws.map(law => {
            const rarity = LAW_RARITY[law.rarity];
            const isActive = law.id === activeId;
            const lawName = tGame(`laws.${law.id}.name`, { defaultValue: law.name });
            return (
              <button
                key={law.id}
                className={`law-picker-card${isActive ? ' law-picker-card-active' : ''}`}
                onClick={() => { onSelect(law.id); onClose(); }}
              >
                <div className="law-picker-card-header">
                  <span className="law-picker-card-name">{lawName}</span>
                  <div className="law-badges">
                    <span className="law-badge law-element">{t(`elements.${law.element}`, { defaultValue: law.element })}</span>
                    <span className="law-badge law-rarity-badge" style={{ color: rarity.color, borderColor: rarity.color }}>
                      {t(`quality.${law.rarity}`, { defaultValue: rarity.label })}
                    </span>
                  </div>
                </div>
                <div className="law-picker-card-stats">
                  <span>{t('build.cultSpeed')}: x{(law.cultivationSpeedMult ?? 1).toFixed(1)}</span>
                </div>
                {isActive && <span className="law-picker-card-active-tag">{t('common.active')}</span>}
              </button>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

// ── Technique Slot Card ──────────────────────────────────────────────────────

function TechSlotCard({ index, tech, onClick }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  if (!tech) {
    return (
      <button className="card build-slot build-tech-slot" onClick={onClick}>
        <span className="build-slot-label">{t(`build.technique${index + 1}`)}</span>
        <p className="build-slot-empty">{t('common.none')}</p>
      </button>
    );
  }

  const quality  = TECHNIQUE_QUALITY[tech.quality];
  const typeCol  = TYPE_COLOR[tech.type] ?? '#fff';
  const cd       = getCooldown(tech);
  const techName = tGame(`techniques.${tech.id}.name`, { defaultValue: tech.name });
  const tooltip  = `${t(`techniqueTypes.${tech.type}`, { defaultValue: tech.type })} · ${t(`quality.${tech.quality}`, { defaultValue: quality.label })}`;

  return (
    <button
      className="card build-slot build-tech-slot build-tech-filled"
      style={{ '--tech-quality': quality.color }}
      onClick={onClick}
    >
      <span className="build-slot-label">{t(`build.technique${index + 1}`)}</span>
      <span
        className="tech-icon tech-icon-large"
        style={{ background: typeCol + '22', borderColor: typeCol }}
        title={tooltip}
      >
        <span className="tech-icon-glyph">{tech.icon ?? '?'}</span>
      </span>
      <span className="build-tech-name">{techName}</span>
      <span className="build-tech-cd">{t('build.cdLabel', { n: cd.toFixed(1) })}</span>
    </button>
  );
}

// ── Main BuildContent ─────────────────────────────────────────────────────────

function BuildContent({ cultivation, techniques, artefacts }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const [selectedSlot,     setSelectedSlot]     = useState(null);
  const [selectedTechSlot, setSelectedTechSlot] = useState(null);
  const [lawPickerOpen,    setLawPickerOpen]    = useState(false);

  const { activeLaw, setActiveLaw, isLawUnlocked, realmIndex, ownedLaws } = cultivation;
  const noLaws = !(ownedLaws?.length);

  // Count badges for section headers — mirrors col-section-badge pattern from CollectionScreen
  const equippedGearCount = Object.values(artefacts?.equipped ?? {}).filter(Boolean).length;
  const equippedTechCount = (techniques?.equippedTechniques ?? []).filter(Boolean).length;
  // Unequipped state is legal — render a prompt card instead of crashing.
  const rarity = activeLaw ? LAW_RARITY[activeLaw.rarity] : null;
  const lawName = activeLaw
    ? tGame(`laws.${activeLaw.id}.name`, { defaultValue: activeLaw.name })
    : null;
  const lawFlavour = activeLaw
    ? tGame(`laws.${activeLaw.id}.flavour`, { defaultValue: activeLaw.flavour })
    : null;

  // Gear slot hover tooltip
  const gearTooltip = useTooltipPos();
  const [hoveredSlotId, setHoveredSlotId] = useState(null);

  const hoveredArt = hoveredSlotId ? artefacts.getEquipped(hoveredSlotId) : null;
  const hoveredGearAffixes = hoveredSlotId
    ? (() => {
        const uid = artefacts.equipped[hoveredSlotId];
        if (!uid) return [];
        return artefacts.owned.find(o => o.uid === uid)?.affixes ?? [];
      })()
    : [];

  const handleEquip = (slotIndex, id) => {
    if (id === null) {
      techniques.unequip(slotIndex);
    } else {
      techniques.equip(slotIndex, id);
    }
    setSelectedTechSlot(null);
  };

  return (
    <>
      {/* -- Law | Artefacts | Techniques — stacks on mobile, 3-col grid on desktop -- */}
      <div className="build-layout">

        {/* Law card */}
        <section
          className={`build-section build-law-section${noLaws ? ' build-law-section-locked' : ''}`}
          onClick={noLaws ? undefined : () => setLawPickerOpen(true)}
        >
          <div className="col-section-header">
            <span className="col-section-title">{t('build.cultivationLaw')}</span>
          </div>
          {noLaws && (
            <LockTooltip
              desc="Laws amplify your cultivation speed and grant unique modifiers."
              hint="Complete Tempered Body — claim your first Law at the major realm breakthrough."
              position="below"
            />
          )}
          {noLaws ? (
            <div className="build-law-card build-law-card-compact build-law-gate">
              <div className="law-header">
                <span className="law-name">🔒 {t('build.cultivationLaw')}</span>
              </div>
            </div>
          ) : !activeLaw ? (
            <div className="build-law-card build-law-card-compact build-law-locked">
              <div className="law-header">
                <span className="law-name">{t('build.lawUnequipped', { defaultValue: 'No law equipped' })}</span>
              </div>
              <p className="law-flavour">
                {t('build.lawUnequippedPick', { defaultValue: 'Tap to choose one from your library.' })}
              </p>
            </div>
          ) : (
          <div className={`build-law-card build-law-card-compact${!isLawUnlocked ? ' build-law-locked' : ''}`}>
            <div className="law-header">
              <span className="law-name">{lawName}</span>
              <div className="law-badges">
                <span className="law-badge law-element">{t(`elements.${activeLaw.element}`, { defaultValue: activeLaw.element })}</span>
                <span className="law-badge law-rarity-badge" style={{ color: rarity.color, borderColor: rarity.color }}>
                  {t(`quality.${activeLaw.rarity}`, { defaultValue: rarity.label })}
                </span>
              </div>
            </div>

            <p className="law-flavour">"{lawFlavour}"</p>

            <div className="law-divider" />

            <div className="law-stat-row">
              <span className="law-stat-label">{t('build.cultSpeed')}</span>
              <span className="law-stat-value">x{(activeLaw.cultivationSpeedMult ?? 1).toFixed(1)}</span>
            </div>

            <div className="law-divider" />

            <div className="law-passives">
              <span className="law-stat-label">{t('inventory.labelUniqueModifiers')}</span>
              {activeLaw.uniques && Object.entries(activeLaw.uniques).map(([tier, u]) => (
                u && (
                  <div key={tier} className="law-passive">
                    <span className="law-passive-desc" style={{ color: LAW_RARITY[tier]?.color }}>
                      {formatUniqueDescription(u.id, u.value)}
                    </span>
                  </div>
                )
              ))}
            </div>

            <div className="law-divider" />

            <div className="law-req-row">
              <span className="law-stat-label">Requires</span>
              <span className={`law-req-status ${isLawUnlocked ? 'law-req-met' : 'law-req-locked'}`}>
                {isLawUnlocked ? '\u2713' : '\uD83D\uDD12'} {activeLaw.realmRequirementLabel}
              </span>
            </div>

            <span className="law-tap-hint">{t('build.tapToChange')}</span>
          </div>
          )}
        </section>

        {/* Artefact grid - RIGHT / BOTTOM on mobile */}
        <section className="build-section build-artefact-section">
          <div className="col-section-header">
            <span className="col-section-title">{t('build.artefacts')}</span>
            <span className="col-section-badge">{equippedGearCount}/{GEAR_SLOTS.length}</span>
          </div>
          <div className="gear-body-layout">
            {GEAR_SLOTS.map((slot) => {
              const art     = artefacts.getEquipped(slot.id);
              const quality = art ? QUALITY[art.rarity] : null;
              const slotLabel = t(`build.slots.${slot.type}`, { defaultValue: slot.type });
              const artName = art ? art.name : null;
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
                  onClick={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                  onMouseEnter={(e) => {
                    if (art) {
                      setHoveredSlotId(slot.id);
                      gearTooltip.handlers.onMouseEnter(e);
                    }
                  }}
                  onMouseMove={(e) => {
                    if (art) gearTooltip.handlers.onMouseMove(e);
                  }}
                  onMouseLeave={(e) => {
                    setHoveredSlotId(null);
                    gearTooltip.handlers.onMouseLeave(e);
                  }}
                  onTouchStart={(e) => {
                    if (art) {
                      setHoveredSlotId(slot.id);
                      gearTooltip.handlers.onTouchStart(e);
                    }
                  }}
                  onTouchEnd={(e) => {
                    setHoveredSlotId(null);
                    gearTooltip.handlers.onTouchEnd(e);
                  }}
                  onTouchMove={gearTooltip.handlers.onTouchMove}
                >
                  {art ? (
                    <>
                      <span className="gear-slot-quality-dot" style={{ background: quality.color }} />
                      <span className="gear-slot-name gear-slot-name-filled" style={{ color: quality.color }}>
                        {artName}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="gear-slot-glyph">+</span>
                      <span className="inv-name gear-slot-name">{slotLabel}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active-sets summary. 2-piece = minor bonus active, 4-piece =
              minor + major. Set bonuses themselves are placeholder until a
              later overhaul stage wires them into the stat engine. */}
          {(() => {
            const setCounts = countEquippedSets(artefacts.equipped, artefacts.owned);
            const active    = Object.entries(setCounts).filter(([, n]) => n >= 2);
            if (!active.length) return null;
            return (
              <div className="active-sets-panel">
                <div className="active-sets-title">
                  {t('build.activeSets', { defaultValue: 'Active sets' })}
                </div>
                {active.map(([sid, n]) => {
                  const s = ARTEFACT_SETS[sid];
                  if (!s) return null;
                  return (
                    <div key={sid} className="active-set-row">
                      <div className="active-set-row-header">
                        <span className="active-set-name">◆ {s.name}</span>
                        <span className="active-set-count">{n}-piece</span>
                      </div>
                      <div className="active-set-bonus">· {s.twoPiece?.description}</div>
                      {n >= 4 && (
                        <div className="active-set-bonus">· {s.fourPiece?.description}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Gear hover tooltip */}
          {gearTooltip.pos && hoveredArt && (
            <ArtefactTooltip
              artefact={hoveredArt}
              affixes={hoveredGearAffixes}
              style={{ position: 'fixed', left: gearTooltip.pos.x, top: gearTooltip.pos.y }}
            />
          )}

          {/* Inline artefact picker — bottom sheet on mobile */}
          {selectedSlot && (
            <>
              <div className="art-picker-backdrop" onClick={() => setSelectedSlot(null)} />
              <InlineArtefactPicker
                slot={selectedSlot}
                artefacts={artefacts}
                onClose={() => setSelectedSlot(null)}
              />
            </>
          )}
        </section>

        {/* Secret Techniques */}
        <section className="build-section build-tech-section">
          <div className="col-section-header">
            <span className="col-section-title">{t('build.secretTechniques')}</span>
            <span className="col-section-badge">{equippedTechCount}/3</span>
          </div>
          <div className="card-grid build-tech-grid">
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
      </div>

      {/* Law picker modal */}
      {lawPickerOpen && (
        <LawPickerModal
          ownedLaws={ownedLaws}
          activeLaw={activeLaw}
          onSelect={setActiveLaw}
          onClose={() => setLawPickerOpen(false)}
        />
      )}

      {selectedTechSlot !== null && (
        <TechniqueSlotModal
          slotIndex={selectedTechSlot}
          currentId={techniques.slots[selectedTechSlot]}
          ownedTechniques={techniques.ownedTechniques}
          onEquip={handleEquip}
          onClose={() => setSelectedTechSlot(null)}
        />
      )}
    </>
  );
}

export default BuildContent;
