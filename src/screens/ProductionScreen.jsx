import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { QUALITY, ARTEFACTS_BY_ID } from '../data/artefacts';
import { formatArtefactName } from '../data/artefactNames';
import { LAW_RARITY } from '../data/laws';
import { TECHNIQUE_QUALITY } from '../data/techniques';
import { HERB_ITEMS, ALL_MATERIALS, RARITY } from '../data/materials';
import { MOD } from '../data/stats';
import { RARITY_TIER } from '../data/affixPools';
import { findPill, PILLS, PILLS_BY_ID, RECIPES_BY_PILL } from '../data/pills';

const ITEMS_BY_ID = { ...ALL_MATERIALS, ...PILLS_BY_ID };
import { formatUniqueDescription } from '../data/lawUniques';
import { ARTEFACTS } from '../data/artefacts';
import { generateTechnique } from '../data/techniqueDrops';
import { generateLaw } from '../data/affixPools';
import { ARTEFACT_NEXT_RARITY } from '../hooks/useArtefacts';
import { TECH_NEXT_QUALITY } from '../hooks/useTechniques';
import { LAW_NEXT_RARITY } from '../hooks/useCultivation';
import {
  SLOT_BRACKETS,
  getActiveBrackets,
  getBracketCost as bracketCost,
  UPGRADE_COSTS,
  REFINE_COSTS,
} from '../data/crafting';

/**
 * Group items by their actual `tier` field into rarity brackets.
 * Each bracket shows all filled items of that tier, plus ONE empty slot
 * when the tier is below its limit. The same affix ID can repeat across
 * different tiers (e.g. Iron Sharpness + Bronze Sharpness).
 */
function buildBracketSlots(items, rarity) {
  const brackets = getActiveBrackets(rarity);
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

const STAT_LABELS = {
  physical_damage:   'Phys. Dmg',
  elemental_damage:  'Elem. Dmg',
  psychic_damage:    'Psy. Dmg',
  defense:           'Defense',
  elemental_defense: 'Elem. Def',
  soul_toughness:    'Soul Tough.',
  health:            'Health',
  essence:           'Essence',
  soul:              'Soul',
  body:              'Body',
  exploit_chance:    'Exploit %',
};

function formatAffixValue(affix) {
  const label = STAT_LABELS[affix.stat] ?? affix.stat;
  if (affix.type === MOD.INCREASED) {
    return `+${Math.round(affix.value * 100)}% ${label}`;
  }
  if (affix.type === MOD.MORE) {
    // Stored as multiplier (e.g. 1.10) — display as ×1.10
    return `×${affix.value.toFixed(2)} ${label}`;
  }
  return `+${affix.value} ${label}`;
}

// formatMultLabel is called inside components that have t() available
function formatMultLabel(key, t) {
  switch (key) {
    case 'cultivationSpeedMult': return t('statNames.cultivation_speed');
    case 'essenceMult': return t('statNames.essence_mult');
    case 'soulMult':    return t('statNames.soul_mult');
    case 'bodyMult':    return t('statNames.body_mult');
    default:            return key;
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

function AffixRow({ affix, gIdx, color, mineralStat, mineralMod, inventory, onHone, onReplace }) {
  const honeCosts    = bracketCost(mineralStat, mineralMod, 'hone');
  const replaceCosts = bracketCost(mineralStat, mineralMod, 'replace');
  return (
    <div className="tx-mod-row" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="tx-mod-left">
        <span className="tx-mod-value" style={{ color }}>{formatAffixValue(affix)}</span>
      </div>
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

function EmptySlotRow({ color, mineralStat, inventory, onAdd }) {
  const { t } = useTranslation('ui');
  const addCosts = bracketCost(mineralStat, null, 'add');
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

function UpgradeSection({ rarity, nextQ, inventory, onUpgrade }) {
  const { t } = useTranslation('ui');
  const upgCost   = UPGRADE_COSTS[rarity];
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
  const brackets = buildBracketSlots(affixes, rarity);

  const totalFilled = affixes.length;
  const totalCapacity = getActiveBrackets(rarity).reduce((s, b) => s + b.count, 0);
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
            {tech.defMult      != null && <div className="tx-stat-row"><span>DEF Mult.</span><span>x{tech.defMult.toFixed(2)}</span></div>}
            {tech.buffDuration != null && <div className="tx-stat-row"><span>Duration</span><span>{tech.buffDuration}s</span></div>}
          </>
        )}
        {tech.type === 'Dodge' && (
          <>
            {tech.dodgeChance  != null && <div className="tx-stat-row"><span>Dodge Chance</span><span>{Math.round(tech.dodgeChance * 100)}%</span></div>}
            {tech.buffDuration != null && <div className="tx-stat-row"><span>Duration</span><span>{tech.buffDuration}s</span></div>}
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
        {/* Primary stat multipliers — read-only (balanced by sum) */}
        <div className="tx-mod-row">
          <div className="tx-mod-left">
            <span className="tx-mod-name">{t('statNames.essence_mult')}</span>
            <span className="tx-mod-value">x{(law.essenceMult ?? 0).toFixed(2)}</span>
          </div>
        </div>
        <div className="tx-mod-row">
          <div className="tx-mod-left">
            <span className="tx-mod-name">{t('statNames.soul_mult')}</span>
            <span className="tx-mod-value">x{(law.soulMult ?? 0).toFixed(2)}</span>
          </div>
        </div>
        <div className="tx-mod-row">
          <div className="tx-mod-left">
            <span className="tx-mod-name">{t('statNames.body_mult')}</span>
            <span className="tx-mod-value">x{(law.bodyMult ?? 0).toFixed(2)}</span>
          </div>
        </div>
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
        {itemTab === 'artefacts' && artefacts.owned.map(inst => {
          const art    = ARTEFACTS_BY_ID[inst.catalogueId];
          const rarity = inst.rarity ?? art?.rarity ?? 'Iron';
          const q      = artQuality(rarity);
          return (
            <button
              key={inst.uid}
              className={`inv-slot tx-slot ${selected === inst.uid ? 'tx-slot-selected' : ''}`}
              style={{ borderColor: q.color }}
              onClick={() => setSelected(inst.uid === selected ? null : inst.uid)}
            >
              <span className="inv-quality-gem" style={{ color: q.color }}>◆</span>
              <span className="inv-name" style={{ color: q.color }}>{art ? (formatArtefactName(inst) ?? tGame(`artefacts.${art.id}.name`, { defaultValue: art.name })) : inst.catalogueId}</span>
              <span className="inv-slot-label">{art?.slot ? t(`build.slots.${art.slot}`, { defaultValue: art.slot }) : ''}</span>
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
  qi_speed:          'Qi Speed',
  defense:           'Defense',
  health:            'Health',
  physical_damage:   'Phys. Dmg',
  elemental_damage:  'Elem. Dmg',
  harvest_speed:     'Harvest Speed',
  mining_speed:      'Mining Speed',
  harvest_luck:      'Harvest Luck',
  mining_luck:       'Mining Luck',
  soul_toughness:    'Soul Tough.',
  elemental_defense: 'Elem. Def',
  essence:           'Essence',
};

function formatEffect(eff, duration) {
  const label = STAT_DISPLAY[eff.stat] ?? eff.stat;
  if (eff.stat === 'qi_speed') {
    return `+${Math.round(eff.value * 100)}% ${label} (${duration}s)`;
  }
  if (eff.type === 'increased') {
    return `+${Math.round(eff.value * 100)}% ${label} (${duration}s)`;
  }
  return `+${eff.value} ${label} (${duration}s)`;
}

function HerbSelector({ slotIndex, selectedHerbId, onSelect, inventory }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');
  const [open, setOpen] = useState(false);

  const ownedHerbs = useMemo(() => {
    return HERB_ITEMS.filter(h => (inventory.getQuantity(h.id) > 0));
  }, [inventory]);

  const selectedHerb = selectedHerbId ? ITEMS_BY_ID[selectedHerbId] : null;
  const rarityColor = selectedHerb ? (RARITY[selectedHerb.rarity]?.color ?? '#aaa') : 'var(--text-muted)';

  return (
    <div className="alchemy-slot">
      <button
        className="alchemy-slot-btn"
        style={{ borderColor: selectedHerb ? rarityColor : 'var(--border)' }}
        onClick={() => setOpen(!open)}
      >
        {selectedHerb ? (
          <span style={{ color: rarityColor }}>{tGame(`items.${selectedHerb.id}.name`, { defaultValue: selectedHerb.name })}</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>{t('production.slot', { n: slotIndex + 1 })}</span>
        )}
      </button>
      {open && (
        <div className="herb-selector">
          {ownedHerbs.length === 0 && (
            <div className="herb-selector-empty">{t('production.noHerbsOwned')}</div>
          )}
          {ownedHerbs.map(h => {
            const hColor = RARITY[h.rarity]?.color ?? '#aaa';
            const qty = inventory.getQuantity(h.id);
            const hName = tGame(`items.${h.id}.name`, { defaultValue: h.name });
            return (
              <button
                key={h.id}
                className="herb-selector-item"
                onClick={() => { onSelect(h.id); setOpen(false); }}
              >
                <span style={{ color: hColor }}>{hName}</span>
                <span className="herb-selector-qty">x{qty}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── RefiningPanel ───────────────────────────────────────────────────────────

const REFINE_RARITIES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];

// Per-rarity recipes — each tier uses materials of matching rarity.
function getRefineCost(type, rarity) {
  return REFINE_COSTS[type]?.[rarity] ?? [];
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

function RefineCard({ type, inventory, onRefine }) {
  const { t } = useTranslation('ui');
  const [rarity, setRarity] = useState('Iron');

  const REFINE_INFO = {
    artefact:  { title: t('production.refineArtefactTitle'), description: t('production.refineArtefactDesc'), icon: REFINE_ICONS.artefact },
    technique: { title: t('production.refineTechTitle'),    description: t('production.refineTechDesc'),    icon: REFINE_ICONS.technique },
    law:       { title: t('production.refineLawTitle'),     description: t('production.refineLawDesc'),     icon: REFINE_ICONS.law },
  };
  const info  = REFINE_INFO[type];
  const costs = getRefineCost(type, rarity);
  const afford = costs.every(c => inventory.getQuantity(c.itemId) >= c.qty);
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
        className={`refine-btn ${afford ? '' : 'refine-btn-disabled'}`}
        style={afford ? { color: rColor, borderColor: rColor, background: `${rColor}22` } : undefined}
        onClick={() => afford && onRefine(type, rarity)}
        disabled={!afford}
      >
        {t('production.refineBtn', { rarity: t(`quality.${rarity}`, { defaultValue: rarity }) })}
      </button>
    </div>
  );
}

function RefiningPanel({ inventory, artefacts, techniques, cultivation }) {
  const { t } = useTranslation('ui');
  const [flashMsg, setFlashMsg] = useState(null);

  const refine = (type, rarity) => {
    const costs = getRefineCost(type, rarity);
    if (!costs.every(c => inventory.getQuantity(c.itemId) >= c.qty)) return;
    for (const c of costs) inventory.removeItem(c.itemId, c.qty);

    let resultName = '';
    if (type === 'artefact') {
      const pool = ARTEFACTS_BY_RARITY[rarity] ?? [];
      if (pool.length === 0) return;
      const cat = pickRandom(pool);
      artefacts.addArtefact(cat.id);
      resultName = cat.name;
    } else if (type === 'technique') {
      const worldId = RARITY_TO_WORLD[rarity] ?? 1;
      const tech = generateTechnique(worldId);
      techniques.addOwnedTechnique(tech);
      resultName = tech.name;
    } else if (type === 'law') {
      const law = generateLaw(rarity);
      cultivation.addOwnedLaw(law);
      resultName = law.name;
    }

    setFlashMsg(t('production.refinedFlash', { rarity: t(`quality.${rarity}`, { defaultValue: rarity }), name: resultName }));
    setTimeout(() => setFlashMsg(null), 2000);
  };

  return (
    <div className="refining-panel">
      <RefineCard type="artefact"  inventory={inventory} onRefine={refine} />
      <RefineCard type="technique" inventory={inventory} onRefine={refine} />
      <RefineCard type="law"       inventory={inventory} onRefine={refine} />
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

function CraftableRecipes({ inventory, onFillSlots }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');
  const [expanded, setExpanded] = useState(null); // pill id or null

  const craftable = useMemo(() => {
    const result = [];
    for (const pill of PILLS) {
      const recipes = RECIPES_BY_PILL[pill.id] ?? [];
      const affordable = recipes.filter(key => canAffordRecipe(key, inventory));
      if (affordable.length > 0) {
        result.push({ pill, recipes: affordable });
      }
    }
    return result;
  }, [inventory]);

  if (craftable.length === 0) {
    return (
      <div className="recipe-book">
        <div className="recipe-book-title">{t('production.craftableRecipes')}</div>
        <p className="recipe-book-empty">{t('production.noRecipes')}</p>
      </div>
    );
  }

  return (
    <div className="recipe-book">
      <div className="recipe-book-title">{t('production.craftableRecipes')}</div>
      {craftable.map(({ pill, recipes }) => {
        const color = RARITY[pill.rarity]?.color ?? '#aaa';
        const isOpen = expanded === pill.id;
        return (
          <div key={pill.id} className="recipe-pill-group">
            <button
              className="recipe-pill-header"
              onClick={() => setExpanded(isOpen ? null : pill.id)}
            >
              <div className="recipe-pill-header-left">
                <span className="recipe-pill-name" style={{ color }}>{tGame(`items.${pill.id}.name`, { defaultValue: pill.name })}</span>
                <span className="recipe-pill-effects-inline">
                  {pill.effects.map((eff, i) => (
                    <span key={i} className="recipe-pill-effect">{formatEffect(eff, pill.duration)}</span>
                  ))}
                </span>
              </div>
              <span className="recipe-pill-chevron">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="recipe-list">
                {recipes.map(key => {
                  const herbs = key.split('|');
                  const herbNames = herbs.map(id => {
                    const h = ITEMS_BY_ID[id];
                    return h ? tGame(`items.${h.id}.name`, { defaultValue: h.name }) : id;
                  });
                  return (
                    <button
                      key={key}
                      className="recipe-row"
                      onClick={() => onFillSlots(herbs)}
                    >
                      {herbNames.map((name, i) => (
                        <span key={i} className="recipe-herb">
                          {name}{i < 2 ? ' + ' : ''}
                        </span>
                      ))}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AlchemyPanel({ inventory, pills }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');
  const [slots, setSlots] = useState([null, null, null]);
  const [flashMsg, setFlashMsg] = useState(null);

  const setSlot = (index, herbId) => {
    setSlots(prev => {
      const next = [...prev];
      next[index] = herbId;
      return next;
    });
  };

  const allFilled = slots[0] && slots[1] && slots[2];
  const resultPill = allFilled ? findPill(slots[0], slots[1], slots[2]) : null;

  // Check if player has herbs (accounting for duplicates in slots)
  const hasHerbs = useMemo(() => {
    if (!allFilled) return false;
    const needed = {};
    for (const id of slots) {
      needed[id] = (needed[id] || 0) + 1;
    }
    for (const [id, qty] of Object.entries(needed)) {
      if (inventory.getQuantity(id) < qty) return false;
    }
    return true;
  }, [slots, allFilled, inventory]);

  const canCraft = allFilled && resultPill && hasHerbs;

  const handleCraft = () => {
    if (!canCraft) return;
    // Remove herbs
    const needed = {};
    for (const id of slots) {
      needed[id] = (needed[id] || 0) + 1;
    }
    for (const [id, qty] of Object.entries(needed)) {
      inventory.removeItem(id, qty);
    }
    // Craft pill
    pills.craftPill(resultPill.id);
    setFlashMsg(t('production.craftedFlash', { name: tGame(`items.${resultPill.id}.name`, { defaultValue: resultPill.name }) }));
    setTimeout(() => setFlashMsg(null), 1500);
  };

  const rarityColor = resultPill ? (RARITY[resultPill.rarity]?.color ?? '#aaa') : null;

  return (
    <div className="alchemy-panel">
      <div className="alchemy-triangle">
        <div className="alchemy-triangle-top">
          <HerbSelector slotIndex={0} selectedHerbId={slots[0]} onSelect={(id) => setSlot(0, id)} inventory={inventory} />
        </div>
        <div className="alchemy-furnace">🔥</div>
        <div className="alchemy-triangle-bottom">
          <HerbSelector slotIndex={1} selectedHerbId={slots[1]} onSelect={(id) => setSlot(1, id)} inventory={inventory} />
          <HerbSelector slotIndex={2} selectedHerbId={slots[2]} onSelect={(id) => setSlot(2, id)} inventory={inventory} />
        </div>
      </div>

      <div className="alchemy-result">
        {allFilled && resultPill && (
          <div className="alchemy-result-pill">
            <span className="alchemy-result-name" style={{ color: rarityColor }}>{tGame(`items.${resultPill.id}.name`, { defaultValue: resultPill.name })}</span>
            <span className="alchemy-result-rarity" style={{ color: rarityColor }}>({t(`rarity.${resultPill.rarity}`, { defaultValue: resultPill.rarity })})</span>
            <div className="alchemy-result-effects">
              {resultPill.effects.map((eff, i) => (
                <span key={i} className="alchemy-result-effect">{formatEffect(eff, resultPill.duration)}</span>
              ))}
            </div>
          </div>
        )}
        {allFilled && !resultPill && (
          <div className="alchemy-result-invalid">{t('production.invalidCombination')}</div>
        )}
        {!allFilled && (
          <div className="alchemy-result-hint">{t('production.select3Herbs')}</div>
        )}
      </div>

      {flashMsg && <div className="alchemy-flash">{flashMsg}</div>}

      <button
        className={`alchemy-craft-btn ${canCraft ? '' : 'alchemy-craft-btn-disabled'}`}
        onClick={handleCraft}
        disabled={!canCraft}
      >
        {t('common.craft')}
      </button>

      <CraftableRecipes inventory={inventory} onFillSlots={(herbs) => setSlots(herbs)} />
    </div>
  );
}

// ─── ProductionScreen ─────────────────────────────────────────────────────────

function ProductionScreen({ inventory, artefacts, techniques, cultivation, pills }) {
  const { t } = useTranslation('ui');
  const [activeTab, setActiveTab] = useState('transmutation');

  const PROD_TABS = [
    { key: 'refining',      tKey: 'production.tabRefining'      },
    { key: 'alchemy',       tKey: 'production.tabAlchemy'       },
    { key: 'transmutation', tKey: 'production.tabTransmutation' },
  ];

  return (
    <div className="screen production-screen">
      <h1>{t('production.title')}</h1>
      <p className="subtitle">{t('production.subtitle')}</p>

      <div className="inv-tabs">
        {PROD_TABS.map(tab => (
          <button
            key={tab.key}
            className={`inv-tab ${activeTab === tab.key ? 'inv-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(tab.tKey)}
          </button>
        ))}
      </div>

      {activeTab === 'refining' && (
        <RefiningPanel
          inventory={inventory}
          artefacts={artefacts}
          techniques={techniques}
          cultivation={cultivation}
        />
      )}

      {activeTab === 'alchemy' && (
        <AlchemyPanel inventory={inventory} pills={pills} />
      )}

      {activeTab === 'transmutation' && (
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
