// @refresh reset
import { useState, useMemo, useRef } from 'react';
import LockTooltip from '../components/LockTooltip';
import { useTranslation } from 'react-i18next';
import { QUALITY, ARTEFACTS_BY_ID } from '../data/artefacts';
import { formatArtefactName } from '../data/artefactNames';
import { LAW_RARITY } from '../data/laws';
import { TECHNIQUE_QUALITY } from '../data/techniques';
import { HERB_ITEMS, ALL_MATERIALS, RARITY } from '../data/materials';
import { MOD } from '../data/stats';
import { RARITY_TIER } from '../data/affixPools';
import { AFFIX_UNIQUE_COLOR as UNIQUE_COLOR, formatAffixValue } from '../data/affixDisplay';
import ArtefactTooltip, { useTooltipPos } from '../components/ArtefactTooltip';
import { findPill, PILLS, PILLS_BY_ID, RECIPES_BY_PILL } from '../data/pills';

const ITEMS_BY_ID = { ...ALL_MATERIALS, ...PILLS_BY_ID };
import { formatUniqueDescription } from '../data/lawUniques';
import { ARTEFACTS } from '../data/artefacts';
import { generateTechnique } from '../data/techniqueDrops';
// generateLaw moved out of the refining flow — laws now drop from major
// breakthroughs via useSelections.
import { ARTEFACT_NEXT_RARITY, MAX_ARTEFACTS } from '../hooks/useArtefacts';
import { TECH_NEXT_QUALITY, MAX_TECHNIQUES } from '../hooks/useTechniques';
import { LAW_NEXT_RARITY } from '../hooks/useCultivation';
import {
  SLOT_BRACKETS,
  getActiveBrackets,
  getActiveArtefactBrackets,
  getBracketCost as bracketCost,
  UPGRADE_COSTS,
  REFINE_COSTS,
  getUpgradeCosts,
} from '../data/crafting';

/**
 * Group items by their actual `tier` field into rarity brackets.
 * Each bracket shows all filled items of that tier, plus ONE empty slot
 * when the tier is below its limit. The same affix ID can repeat across
 * different tiers (e.g. Iron Sharpness + Bronze Sharpness).
 */
function buildBracketSlots(items, rarity, bracketsProvider = getActiveBrackets) {
  const brackets = bracketsProvider(rarity);
  return brackets.map(b => {
    const slots = [];
    items.forEach((item, gIdx) => {
      const itemTier = item.tier ?? 'Iron';
      if (itemTier === b.label) {
        slots.push({ filled: true, item, gIdx });
      }
    });
    if (slots.length < b.count) {
      slots.push({ filled: false });
    }
    return { ...b, slots };
  });
}

// bracketCost, SLOT_BRACKETS, getActiveBrackets, UPGRADE_COSTS, REFINE_COSTS
// are all imported from src/data/crafting.js — edit costs there, not here.

// ─── Quality label helpers ───────────────────────────────────────────────────

function artQuality(rarity)  { return QUALITY[rarity]           ?? { label: rarity,  color: '#aaa' }; }
function techQuality(quality){ return TECHNIQUE_QUALITY[quality] ?? { label: quality, color: '#aaa' }; }
function lawQuality(rarity)  { return LAW_RARITY[rarity]         ?? { label: rarity,  color: '#aaa' }; }

// ─── Value display helpers ────────────────────────────────────────────────────
// STAT_LABELS, PCT_FLAT_STATS, UNIQUE_COLOR and formatAffixValue live in
// src/data/affixDisplay.js so the Equip tab renders identical strings.

// formatMultLabel is called inside components that have t() available
function formatMultLabel(key, t) {
  switch (key) {
    case 'cultivationSpeedMult': return t('statNames.cultivation_speed');
    default:                     return key;
  }
}

// ─── Cost helpers ─────────────────────────────────────────────────────────────

function CostBadge({ costs, inventory }) {
  return (
    <span className="tx-craft-cost">
      {costs.map(c => {
        const mat  = ITEMS_BY_ID[c.itemId];
        const have = inventory.getQuantity(c.itemId);
        const ok   = have >= c.qty;
        return (
          <span key={c.itemId} className={`tx-craft-cost-item ${ok ? 'tx-cost-ok' : 'tx-cost-short'}`}>
            {mat?.name ?? c.itemId} x{c.qty}
          </span>
        );
      })}
    </span>
  );
}

function canAfford(costs, inventory) {
  return costs.every(c => inventory.getQuantity(c.itemId) >= c.qty);
}

function spend(costs, inventory) {
  for (const c of costs) inventory.removeItem(c.itemId, c.qty);
}

function CostRow({ itemId, needed, owned }) {
  const mat  = ITEMS_BY_ID[itemId];
  const name = mat?.name ?? itemId;
  const has  = owned >= needed;
  return (
    <div className="tx-cost-row">
      <span className="tx-cost-name">{name}</span>
      <span className={`tx-cost-qty ${has ? 'tx-cost-ok' : 'tx-cost-short'}`}>
        {needed} <span className="tx-cost-sep">/</span> {owned}
      </span>
    </div>
  );
}

// ─── Modifier rows ────────────────────────────────────────────────────────────

function AffixRow({ affix, gIdx, color, mineralStat, mineralMod, craftCount = 0, inventory, onHone, onReplace }) {
  const isUnique = !!affix.unique;
  const rowColor = isUnique ? UNIQUE_COLOR : color;
  const honeCosts    = bracketCost(mineralStat, mineralMod, 'hone',    craftCount);
  const replaceCosts = bracketCost(mineralStat, mineralMod, 'replace', craftCount);
  return (
    <div
      className={`tx-mod-row${isUnique ? ' tx-mod-row-unique' : ''}`}
      style={{ borderLeft: `3px solid ${rowColor}` }}
    >
      <div className="tx-mod-left">
        {isUnique && <span className="tx-mod-unique-tag" style={{ color: rowColor }}>★ {affix.name}</span>}
        <span className="tx-mod-value" style={{ color: rowColor }}>{formatAffixValue(affix)}</span>
      </div>
      {(!isUnique || affix.tier === 'Transcendent') && (
        <div className="tx-mod-actions">
          <button
            className={`tx-craft-btn ${canAfford(honeCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
            onClick={() => { if (canAfford(honeCosts, inventory)) { spend(honeCosts, inventory); onHone(gIdx); } }}
            title="Hone — randomize value"
          >
            ⟳
            <CostBadge costs={honeCosts} inventory={inventory} />
          </button>
          <button
            className={`tx-craft-btn ${canAfford(replaceCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
            onClick={() => { if (canAfford(replaceCosts, inventory)) { spend(replaceCosts, inventory); onReplace(gIdx); } }}
            title="Replace — swap for a different modifier"
          >
            ↺
            <CostBadge costs={replaceCosts} inventory={inventory} />
          </button>
        </div>
      )}
    </div>
  );
}

function PassiveRow({ passive, gIdx, color, mineralMod, inventory, onReplace }) {
  const replaceCosts = bracketCost(null, mineralMod, 'replace');
  return (
    <div className="tx-mod-row" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="tx-mod-left">
        <span className="tx-mod-desc" style={{ color }}>{passive.description}</span>
      </div>
      <div className="tx-mod-actions">
        <button
          className={`tx-craft-btn ${canAfford(replaceCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
          onClick={() => { if (canAfford(replaceCosts, inventory)) { spend(replaceCosts, inventory); onReplace(gIdx); } }}
          title="Replace — swap for a different passive"
        >
          ↺
          <CostBadge costs={replaceCosts} inventory={inventory} />
        </button>
      </div>
    </div>
  );
}

function MultRow({ label, value, multKey, mineralStat, inventory, onHone }) {
  const honeCosts = bracketCost(mineralStat, null, 'hone');
  return (
    <div className="tx-mod-row">
      <div className="tx-mod-left">
        <span className="tx-mod-name">{label}</span>
        <span className="tx-mod-value">x{value.toFixed(2)}</span>
      </div>
      <div className="tx-mod-actions">
        <button
          className={`tx-craft-btn ${canAfford(honeCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
          onClick={() => { if (canAfford(honeCosts, inventory)) { spend(honeCosts, inventory); onHone(multKey); } }}
          title="Hone — randomize value"
        >
          ⟳
          <CostBadge costs={honeCosts} inventory={inventory} />
        </button>
      </div>
    </div>
  );
}

function EmptySlotRow({ color, mineralStat, craftCount = 0, inventory, onAdd }) {
  const { t } = useTranslation('ui');
  const addCosts = bracketCost(mineralStat, null, 'add', craftCount);
  return (
    <div className="tx-mod-row tx-mod-row-empty" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="tx-mod-left">
        <span className="tx-mod-empty" style={{ color }}>{t('production.emptySlot')}</span>
      </div>
      <div className="tx-mod-actions">
        <button
          className={`tx-craft-btn tx-craft-btn-add ${canAfford(addCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
          onClick={() => { if (canAfford(addCosts, inventory)) { spend(addCosts, inventory); onAdd(); } }}
          title="Add — fill with a random modifier"
        >
          +
          <CostBadge costs={addCosts} inventory={inventory} />
        </button>
      </div>
    </div>
  );
}

// ─── Bracket section renderer ────────────────────────────────────────────────

function BracketSection({ bracket, renderFilled, renderEmpty }) {
  if (!bracket.slots.length) return null;
  return (
    <div className="tx-bracket">
      <div className="tx-bracket-label" style={{ color: bracket.color }}>
        {bracket.label}
      </div>
      <div className="tx-mod-list">
        {bracket.slots.map((slot, i) =>
          slot.filled
            ? renderFilled(slot, i, bracket)
            : renderEmpty(i, bracket)
        )}
      </div>
    </div>
  );
}

// ─── Upgrade section ──────────────────────────────────────────────────────────

function UpgradeSection({ rarity, nextQ, inventory, onUpgrade, kind = 'artefact' }) {
  const { t } = useTranslation('ui');
  // Laws have their own (heavier) cost table.
  const upgCost   = getUpgradeCosts(kind, rarity);
  const upgAfford = upgCost?.every(c => inventory.getQuantity(c.itemId) >= c.qty) ?? false;

  if (!nextQ) return <p className="tx-max-quality">{t('production.alreadyMaxQuality')}</p>;

  return (
    <div className="tx-upgrade-section">
      <div className="tx-upgrade-arrow">
        <span style={{ color: nextQ.color, fontWeight: 700 }}>
          {t('production.upgradeTo', { quality: t(`quality.${nextQ.label}`, { defaultValue: nextQ.label }) })}
        </span>
      </div>
      <div className="tx-cost-list">
        {upgCost.map(c => (
          <CostRow key={c.itemId} itemId={c.itemId} needed={c.qty} owned={inventory.getQuantity(c.itemId)} />
        ))}
      </div>
      <button
        className={`tx-upgrade-btn ${upgAfford ? '' : 'tx-upgrade-btn-disabled'}`}
        onClick={() => {
          if (!upgAfford) return;
          for (const c of upgCost) inventory.removeItem(c.itemId, c.qty);
          onUpgrade();
        }}
        disabled={!upgAfford}
      >
        {t('common.upgrade')}
      </button>
    </div>
  );
}

// ─── Detail panels ─────────────────────────────────────────────────────────

function ArtefactDetail({ inst, artefacts, inventory }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');
  const art    = ARTEFACTS_BY_ID[inst.catalogueId];
  const rarity = inst.rarity ?? art?.rarity ?? 'Iron';
  const q      = artQuality(rarity);
  const affixes  = inst.affixes ?? [];
  const brackets = buildBracketSlots(affixes, rarity, getActiveArtefactBrackets);

  const totalFilled = affixes.length;
  const totalCapacity = getActiveArtefactBrackets(rarity).reduce((s, b) => s + b.count, 0);
  const nextRar     = ARTEFACT_NEXT_RARITY[rarity];
  const nextQ       = nextRar ? artQuality(nextRar) : null;

  return (
    <div className="tx-detail-panel">
      <div className="tx-detail-header">
        <div>
          <span className="tx-item-name">{art ? (formatArtefactName(inst) ?? tGame(`artefacts.${art.id}.name`, { defaultValue: art.name })) : inst.catalogueId}</span>
          <span className="tx-item-sub">{art?.slot ? t(`build.slots.${art.slot}`, { defaultValue: art.slot }) : ''}</span>
        </div>
        <span className="tx-quality-badge" style={{ color: q.color, borderColor: q.color }}>{t(`quality.${rarity}`, { defaultValue: q.label })}</span>
      </div>

      <div className="tx-section-title">{t('production.modifiers', { filled: totalFilled, capacity: totalCapacity })}</div>
      {brackets.map((b, bi) => (
        <BracketSection
          key={bi}
          bracket={b}
          renderFilled={(slot, i) => (
            <AffixRow
              key={`f-${bi}-${i}`}
              affix={slot.item}
              gIdx={slot.gIdx}
              color={b.color}
              mineralStat={b.mineralStat}
              mineralMod={b.mineralMod}
              craftCount={inst.craftCount ?? 0}
              inventory={inventory}
              onHone={(idx)    => artefacts.honeAffix(inst.uid, idx)}
              onReplace={(idx) => artefacts.replaceAffix(inst.uid, idx)}
            />
          )}
          renderEmpty={(i) => (
            <EmptySlotRow
              key={`e-${bi}-${i}`}
              color={b.color}
              mineralStat={b.mineralStat}
              craftCount={inst.craftCount ?? 0}
              inventory={inventory}
              onAdd={() => artefacts.addAffix(inst.uid, b.label)}
            />
          )}
        />
      ))}

      <div className="tx-section-title">{t('production.upgradeQuality')}</div>
      <UpgradeSection
        rarity={rarity}
        nextQ={nextQ}
        inventory={inventory}
        onUpgrade={() => artefacts.upgradeArtefact(inst.uid)}
      />
    </div>
  );
}

function TechniqueDetail({ tech, techniques, inventory }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');
  const q        = techQuality(tech.quality);
  const passives = tech.passives ?? [];
  const brackets = buildBracketSlots(passives, tech.quality);

  const totalFilled = passives.length;
  const totalCapacity = getActiveBrackets(tech.quality).reduce((s, b) => s + b.count, 0);
  const nextQn      = TECH_NEXT_QUALITY[tech.quality];
  const nextQ       = nextQn ? techQuality(nextQn) : null;

  return (
    <div className="tx-detail-panel">
      <div className="tx-detail-header">
        <div>
          <span className="tx-item-name">{tGame(`techniques.${tech.id}.name`, { defaultValue: tech.name })}</span>
          <span className="tx-item-sub">{t(`techniqueTypes.${tech.type}`, { defaultValue: tech.type })} · {t(`techniqueRanks.${tech.rank}`, { defaultValue: tech.rank })} · {t(`elements.${tech.element}`, { defaultValue: tech.element })}</span>
        </div>
        <span className="tx-quality-badge" style={{ color: q.color, borderColor: q.color }}>{t(`quality.${tech.quality}`, { defaultValue: q.label })}</span>
      </div>

      {/* Stats */}
      <div className="tx-section-title">{t('production.stats')}</div>
      <div className="tx-stat-list">
        {tech.type === 'Attack' && (
          <>
            {tech.arteMult   != null && <div className="tx-stat-row"><span>Arte Mult.</span><span>x{tech.arteMult.toFixed(2)}</span></div>}
            {tech.elemBonus  != null && tech.elemBonus !== 1 && <div className="tx-stat-row"><span>Elem. Bonus</span><span>x{tech.elemBonus.toFixed(2)}</span></div>}
          </>
        )}
        {tech.type === 'Heal' && tech.healPercent != null && (
          <div className="tx-stat-row"><span>Heal</span><span>{Math.round(tech.healPercent * 100)}% HP</span></div>
        )}
        {tech.type === 'Defend' && (
          <>
            {tech.defMult     != null && <div className="tx-stat-row"><span>DEF Mult.</span><span>x{tech.defMult.toFixed(2)}</span></div>}
            {tech.buffAttacks != null && <div className="tx-stat-row"><span>Covers</span><span>{tech.buffAttacks} hits</span></div>}
          </>
        )}
        {tech.type === 'Dodge' && (
          <>
            {tech.dodgeChance != null && <div className="tx-stat-row"><span>Dodge Chance</span><span>{Math.round(tech.dodgeChance * 100)}%</span></div>}
            {tech.buffAttacks != null && <div className="tx-stat-row"><span>Covers</span><span>{tech.buffAttacks} hits</span></div>}
          </>
        )}
      </div>

      {/* Passives */}
      <div className="tx-section-title">{t('production.passives', { filled: totalFilled, capacity: totalCapacity })}</div>
      {brackets.map((b, bi) => (
        <BracketSection
          key={bi}
          bracket={b}
          renderFilled={(slot, i) => (
            <PassiveRow
              key={`f-${bi}-${i}`}
              passive={slot.item}
              gIdx={slot.gIdx}
              color={b.color}
              mineralMod={b.mineralMod}
              inventory={inventory}
              onReplace={(idx) => techniques.replacePassive(tech.id, idx)}
            />
          )}
          renderEmpty={(i) => (
            <EmptySlotRow
              key={`e-${bi}-${i}`}
              color={b.color}
              mineralStat={b.mineralStat}
              inventory={inventory}
              onAdd={() => techniques.addPassive(tech.id, b.label)}
            />
          )}
        />
      ))}

      {/* Upgrade */}
      <div className="tx-section-title">{t('production.upgradeQuality')}</div>
      <UpgradeSection
        rarity={tech.quality}
        nextQ={nextQ}
        inventory={inventory}
        onUpgrade={() => techniques.upgradeTechnique(tech.id)}
      />
    </div>
  );
}

function LawUniqueRow({ tier, color, mineralStat, mineralMod, entry, inventory, onHone, onReplace }) {
  const honeCosts    = bracketCost(mineralStat, mineralMod, 'hone');
  const replaceCosts = bracketCost(mineralStat, mineralMod, 'replace');
  const text = entry ? formatUniqueDescription(entry.id, entry.value) : '— Empty —';
  return (
    <div className="tx-mod-row" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="tx-mod-left">
        <span className="tx-mod-desc" style={{ color }}>{text}</span>
      </div>
      <div className="tx-mod-actions">
        <button
          className={`tx-craft-btn ${canAfford(honeCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
          onClick={() => { if (canAfford(honeCosts, inventory)) { spend(honeCosts, inventory); onHone(); } }}
          title="Hone — reroll the value"
        >
          ⟳
          <CostBadge costs={honeCosts} inventory={inventory} />
        </button>
        <button
          className={`tx-craft-btn ${canAfford(replaceCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
          onClick={() => { if (canAfford(replaceCosts, inventory)) { spend(replaceCosts, inventory); onReplace(); } }}
          title="Replace — swap for a different unique modifier"
        >
          ↺
          <CostBadge costs={replaceCosts} inventory={inventory} />
        </button>
      </div>
    </div>
  );
}

function LawDetail({ law, cultivation, inventory }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');
  const q        = lawQuality(law.rarity);
  const uniques  = law.uniques ?? {};
  const activeBrackets = getActiveBrackets(law.rarity);
  const nextRn   = LAW_NEXT_RARITY[law.rarity];
  const nextQ       = nextRn ? lawQuality(nextRn) : null;

  // Law multipliers: hone (stat roll) uses mineralStat, replace uses mineralMod
  const baseTier       = RARITY_TIER[law.rarity] ?? 1;
  const baseMineralStat = SLOT_BRACKETS[baseTier - 1]?.mineralStat ?? 'iron_mineral_1';
  const baseMineralMod  = SLOT_BRACKETS[baseTier - 1]?.mineralMod  ?? 'iron_mineral_2';

  // Only cultivation speed is honable. Essence/Soul/Body are balanced by design
  // (their sum is fixed) — modifying them individually would break that balance.
  const MULT_KEYS = ['cultivationSpeedMult'];

  return (
    <div className="tx-detail-panel">
      <div className="tx-detail-header">
        <div>
          <span className="tx-item-name">{tGame(`laws.${law.id}.name`, { defaultValue: law.name })}</span>
          <span className="tx-item-sub">{t(`elements.${law.element}`, { defaultValue: law.element })} · {law.realmRequirementLabel ?? ''}</span>
        </div>
        <span className="tx-quality-badge" style={{ color: q.color, borderColor: q.color }}>{t(`quality.${law.rarity}`, { defaultValue: q.label })}</span>
      </div>

      {/* Multipliers */}
      <div className="tx-section-title">{t('production.multipliers')}</div>
      <div className="tx-mod-list">
        {MULT_KEYS.map(key => (
          <MultRow
            key={key}
            label={formatMultLabel(key, t)}
            value={law[key] ?? 0}
            multKey={key}
            mineralStat={baseMineralStat}
            inventory={inventory}
            onHone={(mk) => cultivation.honeLawMult(law.id, mk)}
          />
        ))}
      </div>

      {/* Unique Modifiers (one per tier, up to law rarity) */}
      <div className="tx-section-title">{t('production.uniqueModifiers', { active: activeBrackets.length, total: activeBrackets.length })}</div>
      {activeBrackets.map((b) => {
        const entry = uniques[b.label];
        return (
          <LawUniqueRow
            key={b.label}
            tier={b.label}
            color={b.color}
            mineralStat={b.mineralStat}
            mineralMod={b.mineralMod}
            entry={entry}
            inventory={inventory}
            onHone={() => cultivation.honeLawUnique(law.id, b.label)}
            onReplace={() => cultivation.replaceLawUnique(law.id, b.label)}
          />
        );
      })}

      {/* Upgrade */}
      <div className="tx-section-title">{t('production.upgradeQuality')}</div>
      <UpgradeSection
        rarity={law.rarity}
        nextQ={nextQ}
        inventory={inventory}
        kind="law"
        onUpgrade={() => cultivation.upgradeLaw(law.id)}
      />
    </div>
  );
}

// ─── TransmutationPanel ──────────────────────────────────────────────────────

function TransmutationPanel({ inventory, artefacts, techniques, cultivation }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');
  const [itemTab,  setItemTab]  = useState('artefacts');
  const [selected, setSelected] = useState(null);
  const artTooltip = useTooltipPos();
  const [hoveredArtUid, setHoveredArtUid] = useState(null);

  const ITEM_TABS = [
    { key: 'artefacts',  tKey: 'inventory.tabArtefacts'  },
    { key: 'techniques', tKey: 'inventory.tabTechniques' },
    { key: 'laws',       tKey: 'inventory.tabLaws'       },
  ];

  const switchTab = (tab) => { setItemTab(tab); setSelected(null); };

  let selectedInst = null;
  if (selected) {
    if (itemTab === 'artefacts')  selectedInst = artefacts.owned.find(o => o.uid === selected) ?? null;
    if (itemTab === 'techniques') selectedInst = techniques.ownedTechniques[selected] ?? null;
    if (itemTab === 'laws')       selectedInst = cultivation.ownedLaws.find(l => l.id === selected) ?? null;
  }

  return (
    <div className="tx-panel">
      <div className="inv-tabs">
        {ITEM_TABS.map(tab => (
          <button
            key={tab.key}
            className={`inv-tab ${itemTab === tab.key ? 'inv-tab-active' : ''}`}
            onClick={() => switchTab(tab.key)}
          >
            {t(tab.tKey)}
          </button>
        ))}
      </div>

      <div className="inv-grid tx-item-grid">
        {itemTab === 'artefacts' && [...artefacts.owned]
          .sort((a, b) => {
            const aEq = !!artefacts.equippedInSlot(a.uid);
            const bEq = !!artefacts.equippedInSlot(b.uid);
            if (aEq === bEq) return 0;
            return aEq ? -1 : 1;
          })
          .map(inst => {
            const art    = ARTEFACTS_BY_ID[inst.catalogueId];
            const rarity = inst.rarity ?? art?.rarity ?? 'Iron';
            const q      = artQuality(rarity);
            const isEquipped = !!artefacts.equippedInSlot(inst.uid);
            return (
              <button
                key={inst.uid}
                className={`inv-slot tx-slot${selected === inst.uid ? ' tx-slot-selected' : ''}${isEquipped ? ' inv-slot-equipped' : ''}`}
                style={{ borderColor: q.color }}
                onClick={() => setSelected(inst.uid === selected ? null : inst.uid)}
                onMouseEnter={(e) => {
                  setHoveredArtUid(inst.uid);
                  artTooltip.handlers.onMouseEnter(e);
                }}
                onMouseMove={artTooltip.handlers.onMouseMove}
                onMouseLeave={(e) => {
                  setHoveredArtUid(null);
                  artTooltip.handlers.onMouseLeave(e);
                }}
                onTouchStart={(e) => {
                  setHoveredArtUid(inst.uid);
                  artTooltip.handlers.onTouchStart(e);
                }}
                onTouchEnd={(e) => {
                  setHoveredArtUid(null);
                  artTooltip.handlers.onTouchEnd(e);
                }}
                onTouchMove={artTooltip.handlers.onTouchMove}
              >
                <span className="inv-quality-gem" style={{ color: q.color }}>◆</span>
                <span className="inv-name" style={{ color: q.color }}>{art ? (formatArtefactName(inst) ?? tGame(`artefacts.${art.id}.name`, { defaultValue: art.name })) : inst.catalogueId}</span>
                <span className="inv-slot-label">{art?.slot ? t(`build.slots.${art.slot}`, { defaultValue: art.slot }) : ''}</span>
                {isEquipped && <span className="inv-equipped-badge">{t('common.equipped')}</span>}
              </button>
            );
          })}

        {itemTab === 'techniques' && Object.values(techniques.ownedTechniques).map(tech => {
          const q = techQuality(tech.quality);
          return (
            <button
              key={tech.id}
              className={`inv-slot tx-slot ${selected === tech.id ? 'tx-slot-selected' : ''}`}
              style={{ borderColor: q.color }}
              onClick={() => setSelected(tech.id === selected ? null : tech.id)}
            >
              <span className="inv-quality-gem" style={{ color: q.color }}>◆</span>
              <span className="inv-name" style={{ color: q.color }}>{tGame(`techniques.${tech.id}.name`, { defaultValue: tech.name })}</span>
              <span className="inv-slot-label">{t(`techniqueTypes.${tech.type}`, { defaultValue: tech.type })}</span>
            </button>
          );
        })}

        {itemTab === 'laws' && cultivation.ownedLaws.map(law => {
          const q = lawQuality(law.rarity);
          return (
            <button
              key={law.id}
              className={`inv-slot tx-slot ${selected === law.id ? 'tx-slot-selected' : ''}`}
              style={{ borderColor: q.color }}
              onClick={() => setSelected(law.id === selected ? null : law.id)}
            >
              <span className="inv-quality-gem" style={{ color: q.color }}>◆</span>
              <span className="inv-name" style={{ color: q.color }}>{tGame(`laws.${law.id}.name`, { defaultValue: law.name })}</span>
              <span className="inv-slot-label">{t(`elements.${law.element}`, { defaultValue: law.element })}</span>
            </button>
          );
        })}
      </div>

      {itemTab === 'artefacts' && artTooltip.pos && hoveredArtUid && (() => {
        const inst = artefacts.owned.find(o => o.uid === hoveredArtUid);
        if (!inst) return null;
        const cat = ARTEFACTS_BY_ID[inst.catalogueId];
        if (!cat) return null;
        const rarity = inst.rarity ?? cat.rarity;
        const name = formatArtefactName(inst) ?? tGame(`artefacts.${cat.id}.name`, { defaultValue: cat.name });
        return (
          <ArtefactTooltip
            artefact={{ ...cat, rarity, name }}
            affixes={inst.affixes ?? []}
            style={{ position: 'fixed', left: artTooltip.pos.x, top: artTooltip.pos.y, zIndex: 100 }}
          />
        );
      })()}

      {selectedInst && itemTab === 'artefacts' && (
        <ArtefactDetail inst={selectedInst} artefacts={artefacts} inventory={inventory} />
      )}
      {selectedInst && itemTab === 'techniques' && (
        <TechniqueDetail tech={selectedInst} techniques={techniques} inventory={inventory} />
      )}
      {selectedInst && itemTab === 'laws' && (
        <LawDetail law={selectedInst} cultivation={cultivation} inventory={inventory} />
      )}

      {!selected && (
        <p className="tx-hint">{t('production.selectInspect')}</p>
      )}
    </div>
  );
}

// ─── AlchemyPanel ────────────────────────────────────────────────────────────

const STAT_DISPLAY = {
  qi_speed:             'Qi Speed',
  defense:              'Defense',
  health:               'Health',
  physical_damage:      'Physical Damage',
  elemental_damage:     'Elemental Damage',
  harvest_speed:        'Harvest Speed',
  mining_speed:         'Mining Speed',
  harvest_luck:         'Harvest Luck',
  mining_luck:          'Mining Luck',
  elemental_defense:    'Elemental Defense',
  essence:              'Essence',
  soul:                 'Soul',
  body:                 'Body',
  exploit_chance:       'Exploit Chance',
  exploit_attack_mult:  'Exploit Multiplier',
};

function formatEffect(eff) {
  const label = STAT_DISPLAY[eff.stat] ?? eff.stat;
  if (eff.type === 'increased') {
    return `+${Math.round(eff.value * 100)}% ${label}`;
  }
  return `+${eff.value} ${label}`;
}

// HerbSelector replaced by inline herb picker in AlchemyPanel.

// ─── RefiningPanel ───────────────────────────────────────────────────────────

const REFINE_RARITIES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];

// Per-rarity recipes — each tier uses materials of matching rarity.
// `costMult` (0..1) shrinks every entry's qty (rounded up, min 1) — used by
// the fp_3 Connoisseur reincarnation node which sets the mult to 0.7.
function getRefineCost(type, rarity, costMult = 1) {
  const base = REFINE_COSTS[type]?.[rarity] ?? [];
  if (costMult >= 1) return base;
  return base.map(c => ({ ...c, qty: Math.max(1, Math.ceil(c.qty * costMult)) }));
}

const REFINE_ICONS = { artefact: '⚔', technique: '✦', law: '☯' };

// Group artefacts by rarity for random picking
const ARTEFACTS_BY_RARITY = {};
for (const a of ARTEFACTS) {
  (ARTEFACTS_BY_RARITY[a.rarity] ??= []).push(a);
}

// Map rarity to worldId for technique generation (1-5 tier scaling)
const RARITY_TO_WORLD = { Iron: 1, Bronze: 2, Silver: 3, Gold: 4, Transcendent: 5 };

// Rarity colors (mirror QUALITY/LAW_RARITY)
const RARITY_COLOR = {
  Iron: '#9ca3af', Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: '#f5c842', Transcendent: '#c084fc',
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function RefineCard({ type, inventory, onRefine, inventoryFull = false, refineCostMult = 1 }) {
  const { t } = useTranslation('ui');
  const [rarity, setRarity] = useState('Iron');

  const REFINE_INFO = {
    artefact:  { title: t('production.refineArtefactTitle'), description: t('production.refineArtefactDesc'), icon: REFINE_ICONS.artefact },
    technique: { title: t('production.refineTechTitle'),    description: t('production.refineTechDesc'),    icon: REFINE_ICONS.technique },
  };
  const info  = REFINE_INFO[type];
  const costs = getRefineCost(type, rarity, refineCostMult);
  const afford = costs.every(c => inventory.getQuantity(c.itemId) >= c.qty);
  const canRefine = afford && !inventoryFull;
  const rColor = RARITY_COLOR[rarity];

  return (
    <div className="refine-card">
      <div className="refine-card-header">
        <span className="refine-card-icon">{info.icon}</span>
        <div className="refine-card-title-block">
          <span className="refine-card-title">{info.title}</span>
          <span className="refine-card-desc">{info.description}</span>
        </div>
      </div>

      {/* Rarity selector */}
      <div className="refine-rarity-tabs">
        {REFINE_RARITIES.map(r => {
          const c = RARITY_COLOR[r];
          const active = r === rarity;
          return (
            <button
              key={r}
              className={`refine-rarity-tab ${active ? 'refine-rarity-tab-active' : ''}`}
              style={active ? { color: c, borderColor: c } : undefined}
              onClick={() => setRarity(r)}
            >
              {r}
            </button>
          );
        })}
      </div>

      <div className="refine-cost-list">
        {costs.map(c => {
          const mat  = ITEMS_BY_ID[c.itemId];
          const have = inventory.getQuantity(c.itemId);
          const ok   = have >= c.qty;
          return (
            <div key={c.itemId} className="tx-cost-row">
              <span className="tx-cost-name">{mat?.name ?? c.itemId}</span>
              <span className={`tx-cost-qty ${ok ? 'tx-cost-ok' : 'tx-cost-short'}`}>
                {c.qty} <span className="tx-cost-sep">/</span> {have}
              </span>
            </div>
          );
        })}
      </div>
      <button
        className={`refine-btn ${canRefine ? '' : 'refine-btn-disabled'}`}
        style={canRefine ? { color: rColor, borderColor: rColor, background: `${rColor}22` } : undefined}
        onClick={() => canRefine && onRefine(type, rarity)}
        disabled={!canRefine}
        title={inventoryFull ? t('production.inventoryFull', { defaultValue: 'Inventory full — dismantle something first.' }) : undefined}
      >
        {t('production.refineBtn', { rarity: t(`quality.${rarity}`, { defaultValue: rarity }) })}
      </button>
    </div>
  );
}

function RefiningPanel({ inventory, artefacts, techniques, cultivation, tree }) {
  const { t } = useTranslation('ui');
  const [flashMsg, setFlashMsg] = useState(null);

  // fp_3 Connoisseur — multiplier on every refine cost (×0.7 when owned).
  const refineCostMult = tree?.modifiers?.refineCostMult ?? 1;
  // fp_1 Lucky Star — 10% chance the refined output bumps one rarity.
  const craftRarityUpChance = tree?.modifiers?.craftRarityUpChance ?? 0;
  // md_4 Veteran's Eye — all crafted techniques arrive +1 quality tier.
  const techQualityBump = tree?.modifiers?.craftedTechQualityBump ?? 0;

  const RARITY_LADDER = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];
  const bumpRarity = (r) => {
    const i = RARITY_LADDER.indexOf(r);
    return i >= 0 && i < RARITY_LADDER.length - 1 ? RARITY_LADDER[i + 1] : r;
  };

  const refine = (type, rarity) => {
    const costs = getRefineCost(type, rarity, refineCostMult);
    if (!costs.every(c => inventory.getQuantity(c.itemId) >= c.qty)) return;
    for (const c of costs) inventory.removeItem(c.itemId, c.qty);

    // fp_1 Lucky Star — 10% chance to upgrade output rarity by one tier.
    let outRarity = rarity;
    if (craftRarityUpChance > 0 && Math.random() < craftRarityUpChance) {
      outRarity = bumpRarity(rarity);
    }

    let resultName = '';
    if (type === 'artefact') {
      const pool = ARTEFACTS_BY_RARITY[outRarity] ?? ARTEFACTS_BY_RARITY[rarity] ?? [];
      if (pool.length === 0) return;
      const cat = pickRandom(pool);
      artefacts.addArtefact(cat.id);
      resultName = cat.name;
    } else if (type === 'technique') {
      // md_4 stacks on top of fp_1 — bump rarity once more if owned.
      const finalRarity = techQualityBump > 0 ? bumpRarity(outRarity) : outRarity;
      const worldId = RARITY_TO_WORLD[finalRarity] ?? RARITY_TO_WORLD[rarity] ?? 1;
      const tech = generateTechnique(worldId);
      techniques.addOwnedTechnique(tech);
      resultName = tech.name;
    }
    // Laws no longer refine — they come from major-realm breakthrough
    // selections (see useSelections).

    setFlashMsg(t('production.refinedFlash', { rarity: t(`quality.${rarity}`, { defaultValue: rarity }), name: resultName }));
    setTimeout(() => setFlashMsg(null), 2000);
  };

  // Cap checks — refining is refused at the cap (button grey-out +
  // tooltip). The player must dismantle something from the Collection
  // screen before rolling another item.
  const artefactsFull  = (artefacts?.owned?.length ?? 0) >= MAX_ARTEFACTS;
  const techniquesFull = Object.keys(techniques?.ownedTechniques ?? {}).length >= MAX_TECHNIQUES;

  return (
    <div className="refining-panel">
      <RefineCard type="artefact"  inventory={inventory} onRefine={refine} inventoryFull={artefactsFull} refineCostMult={refineCostMult} />
      <RefineCard type="technique" inventory={inventory} onRefine={refine} inventoryFull={techniquesFull} refineCostMult={refineCostMult} />
      {flashMsg && <div className="refine-flash">{flashMsg}</div>}
    </div>
  );
}

/** Check if the player can afford a recipe key ("herb|herb|herb"). */
function canAffordRecipe(key, inventory) {
  const ids = key.split('|');
  const needed = {};
  for (const id of ids) needed[id] = (needed[id] || 0) + 1;
  for (const [id, qty] of Object.entries(needed)) {
    if (inventory.getQuantity(id) < qty) return false;
  }
  return true;
}

// ─── RecipeBrowser — flat scrollable list, no accordion ─────────────────────

function RecipeBrowser({ inventory, pills, onFillSlots }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const craftable = useMemo(() => {
    const rows = [];
    for (const pill of PILLS) {
      if (!pills.isDiscovered(pill.id)) continue;
      const recipes = RECIPES_BY_PILL[pill.id] ?? [];
      for (const key of recipes) {
        if (canAffordRecipe(key, inventory)) rows.push({ pill, key });
      }
    }
    return rows;
  }, [inventory, pills]);

  return (
    <div className="recipe-browser">
      <div className="tx-section-title">{t('production.craftableRecipes')}</div>
      <div className="recipe-browser-list">
        {craftable.length === 0 ? (
          <p className="recipe-browser-empty">{t('production.noRecipes')}</p>
        ) : craftable.map(({ pill, key }) => {
          const herbs      = key.split('|');
          const herbNames  = herbs.map(id => {
            const h = ITEMS_BY_ID[id];
            return h ? tGame(`items.${h.id}.name`, { defaultValue: h.name }) : id;
          });
          const color    = RARITY[pill.rarity]?.color ?? '#aaa';
          const pillName = tGame(`items.${pill.id}.name`, { defaultValue: pill.name });
          return (
            <button key={key} className="recipe-flat-row" onClick={() => onFillSlots(herbs)}>
              <span className="recipe-flat-herbs">{herbNames.join(' + ')}</span>
              <span className="recipe-flat-pill" style={{ color }}>→ {pillName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CRAFT_QTY_OPTIONS = [1, 5, 10];

function AlchemyPanel({ inventory, pills, tree }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const [slots,      setSlots]      = useState([null, null, null]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [craftQty,   setCraftQty]   = useState(1);
  const [floatMsgs,  setFloatMsgs]  = useState([]);
  const floatIdRef = useRef(0);

  const ownedHerbs = useMemo(
    () => HERB_ITEMS.filter(h => inventory.getQuantity(h.id) > 0),
    [inventory],
  );

  // Assign a herb to the active slot, then auto-advance to the next empty slot.
  const assignHerb = (herbId) => {
    const newSlots = [...slots];
    newSlots[activeSlot] = herbId;
    setSlots(newSlots);
    for (let i = 1; i <= 3; i++) {
      const candidate = (activeSlot + i) % 3;
      if (newSlots[candidate] === null) { setActiveSlot(candidate); return; }
    }
    setActiveSlot((activeSlot + 1) % 3);
  };

  const clearSlot = (index) => {
    setSlots(prev => { const n = [...prev]; n[index] = null; return n; });
    setActiveSlot(index);
  };

  const fillSlots = (herbs) =>
    setSlots([herbs[0] ?? null, herbs[1] ?? null, herbs[2] ?? null]);

  const allFilled  = slots[0] && slots[1] && slots[2];
  const resultPill = allFilled ? findPill(slots[0], slots[1], slots[2]) : null;
  const rarityColor = resultPill ? (RARITY[resultPill.rarity]?.color ?? '#aaa') : null;

  const maxAffordable = useMemo(() => {
    if (!allFilled) return 0;
    const needed = {};
    for (const id of slots) needed[id] = (needed[id] || 0) + 1;
    let max = Infinity;
    for (const [id, qty] of Object.entries(needed)) {
      max = Math.min(max, Math.floor(inventory.getQuantity(id) / qty));
    }
    return Number.isFinite(max) ? max : 0;
  }, [slots, allFilled, inventory]);

  const effectiveQty = Math.min(craftQty, maxAffordable);
  const canCraft     = allFilled && resultPill && effectiveQty >= 1;

  const handleCraft = () => {
    if (!canCraft) return;
    const n = effectiveQty;
    const needed = {};
    for (const id of slots) needed[id] = (needed[id] || 0) + 1;
    for (const [id, qty] of Object.entries(needed)) inventory.removeItem(id, qty * n);
    pills.craftPill(resultPill.id, n);

    const luckChance = tree?.modifiers?.craftRarityUpChance ?? 0;
    if (luckChance > 0) {
      let bonus = 0;
      for (let i = 0; i < n; i++) if (Math.random() < luckChance) bonus++;
      if (bonus > 0) pills.craftPill(resultPill.id, bonus);
    }

    const msgId = ++floatIdRef.current;
    const text  = t('production.craftedFloat', {
      count: n,
      name:  tGame(`items.${resultPill.id}.name`, { defaultValue: resultPill.name }),
    });
    const color = RARITY[resultPill.rarity]?.color ?? '#aaa';
    setFloatMsgs(prev => [...prev, { id: msgId, text, color }]);
    setTimeout(() => setFloatMsgs(prev => prev.filter(m => m.id !== msgId)), 1300);
  };

  return (
    <div className="alchemy-panel">

      {/* ── Workspace: slot targets (left) + herb picker (right) ── */}
      <div className="alchemy-workspace">
        <div className="alchemy-slots-col">
          {[0, 1, 2].map(i => {
            const herb  = slots[i] ? ITEMS_BY_ID[slots[i]] : null;
            const color = herb ? (RARITY[herb.rarity]?.color ?? '#aaa') : null;
            return (
              <button
                key={i}
                className={`alchemy-slot-btn${activeSlot === i ? ' alchemy-slot-active' : ''}`}
                style={color ? { borderColor: color } : undefined}
                onClick={() => setActiveSlot(i)}
              >
                <span className="alchemy-slot-label" style={color ? { color } : undefined}>
                  {herb
                    ? tGame(`items.${herb.id}.name`, { defaultValue: herb.name })
                    : t('production.slot', { n: i + 1 })}
                </span>
                {herb && (
                  <span
                    className="alchemy-slot-clear"
                    role="button"
                    onClick={e => { e.stopPropagation(); clearSlot(i); }}
                  >×</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="alchemy-herb-picker">
          {ownedHerbs.length === 0 ? (
            <div className="alchemy-herb-empty">{t('production.noHerbsOwned')}</div>
          ) : ownedHerbs.map(h => {
            const color = RARITY[h.rarity]?.color ?? '#aaa';
            return (
              <button key={h.id} className="alchemy-herb-opt" onClick={() => assignHerb(h.id)}>
                <span className="alchemy-herb-name" style={{ color }}>
                  {tGame(`items.${h.id}.name`, { defaultValue: h.name })}
                </span>
                <span className="alchemy-herb-qty">×{inventory.getQuantity(h.id)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Furnace + result strip ── */}
      <div className="alchemy-result">
        <span className="alchemy-furnace" aria-hidden="true">
          🔥
          {floatMsgs.map(m => (
            <span key={m.id} className="alchemy-float-msg" style={{ color: m.color }}>{m.text}</span>
          ))}
        </span>
        <div className="alchemy-result-body">
          {allFilled && resultPill && pills.isDiscovered(resultPill.id) && (
            <div className="alchemy-result-pill">
              <span className="alchemy-result-name" style={{ color: rarityColor }}>
                {tGame(`items.${resultPill.id}.name`, { defaultValue: resultPill.name })}
              </span>
              <span className="alchemy-result-rarity" style={{ color: rarityColor }}>
                ({t(`rarity.${resultPill.rarity}`, { defaultValue: resultPill.rarity })})
              </span>
              <div className="alchemy-result-effects">
                {resultPill.effects.map((eff, i) => (
                  <span key={i} className="alchemy-result-effect">{formatEffect(eff)}</span>
                ))}
              </div>
            </div>
          )}
          {allFilled && resultPill && !pills.isDiscovered(resultPill.id) && (
            <div className="alchemy-result-unknown">{t('production.unknownRecipe')}</div>
          )}
          {allFilled && !resultPill && (
            <div className="alchemy-result-invalid">{t('production.invalidCombination')}</div>
          )}
          {!allFilled && (
            <div className="alchemy-result-hint">{t('production.select3Herbs')}</div>
          )}
        </div>
      </div>

      {/* ── Craft controls ── */}
      <div className="alchemy-craft-row">
        <div className="alchemy-qty-selector" role="group">
          {CRAFT_QTY_OPTIONS.map(opt => (
            <button
              key={opt}
              className={`alchemy-qty-btn ${craftQty === opt ? 'alchemy-qty-btn-active' : ''}`}
              onClick={() => setCraftQty(opt)}
              type="button"
            >×{opt}</button>
          ))}
        </div>
        <button
          className={`alchemy-craft-btn ${canCraft ? '' : 'alchemy-craft-btn-disabled'}`}
          onClick={handleCraft}
          disabled={!canCraft}
        >
          {t('common.craft')}{canCraft && effectiveQty > 1 ? ` ×${effectiveQty}` : ''}
        </button>
      </div>

      {/* ── Recipe browser ── */}
      <RecipeBrowser inventory={inventory} pills={pills} onFillSlots={fillSlots} />
    </div>
  );
}

// ─── ProductionScreen ─────────────────────────────────────────────────────────

function ProductionScreen({ inventory, artefacts, techniques, cultivation, pills, tree, isUnlocked = () => true, getHint = () => null, getDesc = () => null }) {
  const { t } = useTranslation('ui');

  const PROD_TABS = [
    { key: 'refining',      tKey: 'production.tabRefining',      feature: 'refining'      },
    { key: 'alchemy',       tKey: 'production.tabAlchemy',       feature: 'alchemy'       },
    { key: 'transmutation', tKey: 'production.tabTransmutation', feature: 'transmutation' },
  ];

  // Default to the first unlocked tab so a freshly-unlocked player doesn't land
  // on a locked tab. Falls back to transmutation when everything is unlocked.
  const firstUnlocked = PROD_TABS.find(tb => isUnlocked(tb.feature))?.key ?? 'transmutation';
  const [activeTab, setActiveTab] = useState(firstUnlocked);

  const activeUnlocked = isUnlocked(
    PROD_TABS.find(tb => tb.key === activeTab)?.feature ?? activeTab,
  );

  return (
    <div className="screen production-screen">
      <h1>{t('production.title')}</h1>
      <p className="subtitle">{t('production.subtitle')}</p>

      <div className="inv-tabs">
        {PROD_TABS.map(tab => {
          const unlocked = isUnlocked(tab.feature);
          const hint     = !unlocked ? getHint(tab.feature) : null;
          const desc     = !unlocked ? getDesc(tab.feature) : null;
          return (
            <button
              key={tab.key}
              className={`inv-tab ${activeTab === tab.key ? 'inv-tab-active' : ''}${!unlocked ? ' inv-tab-locked' : ''}`}
              onClick={() => unlocked && setActiveTab(tab.key)}
            >
              <span className="inv-tab-label">{!unlocked && '🔒 '}{t(tab.tKey)}</span>
              {!unlocked && <LockTooltip desc={desc} hint={hint} position="below" />}
            </button>
          );
        })}
      </div>

      {activeUnlocked && activeTab === 'refining' && (
        <RefiningPanel
          inventory={inventory}
          artefacts={artefacts}
          techniques={techniques}
          cultivation={cultivation}
          tree={tree}
        />
      )}

      {activeUnlocked && activeTab === 'alchemy' && (
        <AlchemyPanel inventory={inventory} pills={pills} tree={tree} />
      )}

      {activeUnlocked && activeTab === 'transmutation' && (
        <TransmutationPanel
          inventory={inventory}
          artefacts={artefacts}
          techniques={techniques}
          cultivation={cultivation}
        />
      )}
    </div>
  );
}

export default ProductionScreen;
