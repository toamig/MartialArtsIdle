import { useState } from 'react';
import { QUALITY, ARTEFACTS_BY_ID } from '../data/artefacts';
import { LAW_RARITY } from '../data/laws';
import { TECHNIQUE_QUALITY } from '../data/techniques';
import { ITEMS_BY_ID } from '../data/items';
import { MOD } from '../data/stats';
import { RARITY_TIER, AFFIX_POOL_BY_SLOT } from '../data/affixPools';
import { ARTEFACT_NEXT_RARITY } from '../hooks/useArtefacts';
import { TECH_NEXT_QUALITY } from '../hooks/useTechniques';
import { LAW_NEXT_RARITY } from '../hooks/useCultivation';

// ─── Rarity bracket system ───────────────────────────────────────────────────
// Base 3 slots at Iron/common, +2 per quality tier above that.
// Each bracket has its own rarity color and mineral for craft costs.

const SLOT_BRACKETS = [
  { count: 3, tier: 1, color: '#9ca3af', label: 'Iron',         mineral: 'black_tortoise_iron'    },
  { count: 2, tier: 2, color: '#cd7f32', label: 'Bronze',       mineral: 'crimson_flame_crystal'  },
  { count: 2, tier: 3, color: '#c0c0c0', label: 'Silver',       mineral: 'void_stone'             },
  { count: 2, tier: 4, color: '#f5c842', label: 'Gold',         mineral: 'star_metal_ore'         },
  { count: 2, tier: 5, color: '#c084fc', label: 'Transcendent', mineral: 'heavenly_profound_metal' },
];

function getActiveBrackets(rarity) {
  const tier = RARITY_TIER[rarity] ?? 1;
  return SLOT_BRACKETS.slice(0, tier);
}

/** Assign items (affixes/passives) to rarity brackets, capped by pool size. */
function buildBracketSlots(items, rarity, poolSize) {
  const brackets = getActiveBrackets(rarity);
  let gi = 0;
  return brackets.map(b => {
    const slots = [];
    for (let i = 0; i < b.count; i++) {
      if (gi < items.length) {
        slots.push({ filled: true, item: items[gi], gIdx: gi });
        gi++;
      } else if (gi < poolSize) {
        slots.push({ filled: false });
        gi++;
      }
    }
    return { ...b, slots };
  });
}

// ─── Craft costs — mineral matches the bracket tier ──────────────────────────

function bracketCost(mineral, op) {
  const qty = op === 'hone' ? 3 : op === 'replace' ? 5 : 8; // add = 8
  return [{ itemId: mineral, qty }];
}

// Upgrade costs (quality jump)
const UPGRADE_COST = {
  Iron:   [ { itemId: 'black_tortoise_iron',    qty: 10 }, { itemId: 'crimson_flame_crystal',  qty: 3  } ],
  Bronze: [ { itemId: 'crimson_flame_crystal',  qty: 8  }, { itemId: 'void_stone',             qty: 3  } ],
  Silver: [ { itemId: 'void_stone',             qty: 5  }, { itemId: 'star_metal_ore',         qty: 3  } ],
  Gold:   [ { itemId: 'star_metal_ore',         qty: 8  }, { itemId: 'heavenly_profound_metal', qty: 2 } ],
};

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
  if (affix.type === MOD.INCREASED) {
    return `+${Math.round(affix.value * 100)}% ${STAT_LABELS[affix.stat] ?? affix.stat}`;
  }
  return `+${affix.value} ${STAT_LABELS[affix.stat] ?? affix.stat}`;
}

function formatMultLabel(key) {
  switch (key) {
    case 'cultivationSpeedMult': return 'Cultivation Speed';
    case 'essenceMult': return 'Essence Mult.';
    case 'soulMult':    return 'Soul Mult.';
    case 'bodyMult':    return 'Body Mult.';
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

function AffixRow({ affix, gIdx, color, mineral, inventory, onHone, onReplace }) {
  const honeCosts    = bracketCost(mineral, 'hone');
  const replaceCosts = bracketCost(mineral, 'replace');
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

function PassiveRow({ passive, gIdx, color, mineral, inventory, onReplace }) {
  const replaceCosts = bracketCost(mineral, 'replace');
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

function MultRow({ label, value, multKey, mineral, inventory, onHone }) {
  const honeCosts = bracketCost(mineral, 'hone');
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

function EmptySlotRow({ color, mineral, inventory, onAdd }) {
  const addCosts = bracketCost(mineral, 'add');
  return (
    <div className="tx-mod-row tx-mod-row-empty" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="tx-mod-left">
        <span className="tx-mod-empty" style={{ color }}>-- Empty Slot --</span>
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
  const upgCost   = UPGRADE_COST[rarity];
  const upgAfford = upgCost?.every(c => inventory.getQuantity(c.itemId) >= c.qty) ?? false;

  if (!nextQ) return <p className="tx-max-quality">Already at maximum quality.</p>;

  return (
    <div className="tx-upgrade-section">
      <div className="tx-upgrade-arrow">
        Upgrade to{' '}
        <span style={{ color: nextQ.color, fontWeight: 700 }}>{nextQ.label}</span>
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
        Upgrade
      </button>
    </div>
  );
}

// ─── Detail panels ─────────────────────────────────────────────────────────

function ArtefactDetail({ inst, artefacts, inventory }) {
  const art    = ARTEFACTS_BY_ID[inst.catalogueId];
  const rarity = inst.rarity ?? art?.rarity ?? 'Iron';
  const q      = artQuality(rarity);
  const affixes  = inst.affixes ?? [];
  const poolSize = (AFFIX_POOL_BY_SLOT[art?.slot ?? 'weapon'] ?? []).length;
  const brackets = buildBracketSlots(affixes, rarity, poolSize);

  const totalFilled = affixes.length;
  const totalSlots  = brackets.reduce((s, b) => s + b.slots.length, 0);
  const nextRar     = ARTEFACT_NEXT_RARITY[rarity];
  const nextQ       = nextRar ? artQuality(nextRar) : null;

  return (
    <div className="tx-detail-panel">
      <div className="tx-detail-header">
        <div>
          <span className="tx-item-name">{art?.name ?? inst.catalogueId}</span>
          <span className="tx-item-sub">{art?.slot}{art?.weaponType ? ` · ${art.weaponType}` : ''}</span>
        </div>
        <span className="tx-quality-badge" style={{ color: q.color, borderColor: q.color }}>{q.label}</span>
      </div>

      <div className="tx-section-title">Modifiers ({totalFilled}/{totalSlots})</div>
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
              mineral={b.mineral}
              inventory={inventory}
              onHone={(idx)    => artefacts.honeAffix(inst.uid, idx)}
              onReplace={(idx) => artefacts.replaceAffix(inst.uid, idx)}
            />
          )}
          renderEmpty={(i) => (
            <EmptySlotRow
              key={`e-${bi}-${i}`}
              color={b.color}
              mineral={b.mineral}
              inventory={inventory}
              onAdd={() => artefacts.addAffix(inst.uid)}
            />
          )}
        />
      ))}

      <div className="tx-section-title">Upgrade Quality</div>
      <UpgradeSection
        rarity={rarity}
        nextQ={nextQ}
        inventory={inventory}
        onUpgrade={() => artefacts.upgradeArtefact(inst.uid)}
      />
    </div>
  );
}

const TECH_PASSIVE_POOL_SIZE = 5;

function TechniqueDetail({ tech, techniques, inventory }) {
  const q        = techQuality(tech.quality);
  const passives = tech.passives ?? [];
  const brackets = buildBracketSlots(passives, tech.quality, TECH_PASSIVE_POOL_SIZE);

  const totalFilled = passives.length;
  const totalSlots  = brackets.reduce((s, b) => s + b.slots.length, 0);
  const nextQn      = TECH_NEXT_QUALITY[tech.quality];
  const nextQ       = nextQn ? techQuality(nextQn) : null;

  return (
    <div className="tx-detail-panel">
      <div className="tx-detail-header">
        <div>
          <span className="tx-item-name">{tech.name}</span>
          <span className="tx-item-sub">{tech.type} · {tech.rank} · {tech.element}</span>
        </div>
        <span className="tx-quality-badge" style={{ color: q.color, borderColor: q.color }}>{q.label}</span>
      </div>

      {/* Stats */}
      <div className="tx-section-title">Stats</div>
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
      <div className="tx-section-title">Passives ({totalFilled}/{totalSlots})</div>
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
              mineral={b.mineral}
              inventory={inventory}
              onReplace={(idx) => techniques.replacePassive(tech.id, idx)}
            />
          )}
          renderEmpty={(i) => (
            <EmptySlotRow
              key={`e-${bi}-${i}`}
              color={b.color}
              mineral={b.mineral}
              inventory={inventory}
              onAdd={() => techniques.addPassive(tech.id)}
            />
          )}
        />
      ))}

      {/* Upgrade */}
      <div className="tx-section-title">Upgrade Quality</div>
      <UpgradeSection
        rarity={tech.quality}
        nextQ={nextQ}
        inventory={inventory}
        onUpgrade={() => techniques.upgradeTechnique(tech.id)}
      />
    </div>
  );
}

const LAW_PASSIVE_POOL_SIZE = 10;

function LawDetail({ law, cultivation, inventory }) {
  const q        = lawQuality(law.rarity);
  const passives = law.passives ?? [];
  const brackets = buildBracketSlots(passives, law.rarity, LAW_PASSIVE_POOL_SIZE);

  const totalFilled = passives.length;
  const totalSlots  = brackets.reduce((s, b) => s + b.slots.length, 0);
  const nextRn      = LAW_NEXT_RARITY[law.rarity];
  const nextQ       = nextRn ? lawQuality(nextRn) : null;

  // Law multipliers use the item's base-tier mineral for Hone cost
  const baseTier   = RARITY_TIER[law.rarity] ?? 1;
  const baseMineral = SLOT_BRACKETS[baseTier - 1]?.mineral ?? 'black_tortoise_iron';

  const MULT_KEYS = ['cultivationSpeedMult', 'essenceMult', 'soulMult', 'bodyMult'];

  return (
    <div className="tx-detail-panel">
      <div className="tx-detail-header">
        <div>
          <span className="tx-item-name">{law.name}</span>
          <span className="tx-item-sub">{law.element} · {law.realmRequirementLabel ?? 'Unknown Realm'}</span>
        </div>
        <span className="tx-quality-badge" style={{ color: q.color, borderColor: q.color }}>{q.label}</span>
      </div>

      {/* Multipliers */}
      <div className="tx-section-title">Multipliers</div>
      <div className="tx-mod-list">
        {MULT_KEYS.map(key => (
          <MultRow
            key={key}
            label={formatMultLabel(key)}
            value={law[key] ?? 0}
            multKey={key}
            mineral={baseMineral}
            inventory={inventory}
            onHone={(mk) => cultivation.honeLawMult(law.id, mk)}
          />
        ))}
      </div>

      {/* Passives */}
      <div className="tx-section-title">Passives ({totalFilled}/{totalSlots})</div>
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
              mineral={b.mineral}
              inventory={inventory}
              onReplace={(idx) => cultivation.replaceLawPassive(law.id, idx)}
            />
          )}
          renderEmpty={(i) => (
            <EmptySlotRow
              key={`e-${bi}-${i}`}
              color={b.color}
              mineral={b.mineral}
              inventory={inventory}
              onAdd={() => cultivation.addLawPassive(law.id)}
            />
          )}
        />
      ))}

      {/* Upgrade */}
      <div className="tx-section-title">Upgrade Quality</div>
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

const ITEM_TABS = [
  { key: 'artefacts',  label: 'Artefacts'  },
  { key: 'techniques', label: 'Techniques' },
  { key: 'laws',       label: 'Laws'       },
];

function TransmutationPanel({ inventory, artefacts, techniques, cultivation }) {
  const [itemTab,  setItemTab]  = useState('artefacts');
  const [selected, setSelected] = useState(null);

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
        {ITEM_TABS.map(t => (
          <button
            key={t.key}
            className={`inv-tab ${itemTab === t.key ? 'inv-tab-active' : ''}`}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
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
              <span className="inv-name" style={{ color: q.color }}>{art?.name ?? inst.catalogueId}</span>
              <span className="inv-slot-label">{art?.slot}</span>
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
              <span className="inv-name" style={{ color: q.color }}>{tech.name}</span>
              <span className="inv-slot-label">{tech.type}</span>
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
              <span className="inv-name" style={{ color: q.color }}>{law.name}</span>
              <span className="inv-slot-label">{law.element}</span>
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
        <p className="tx-hint">Select an item above to inspect and modify it.</p>
      )}
    </div>
  );
}

// ─── ProductionScreen ─────────────────────────────────────────────────────────

const PROD_TABS = [
  { key: 'refining',      label: 'Refining'     },
  { key: 'alchemy',       label: 'Alchemy'      },
  { key: 'transmutation', label: 'Transmutation' },
];

function ProductionScreen({ inventory, artefacts, techniques, cultivation }) {
  const [activeTab, setActiveTab] = useState('transmutation');

  return (
    <div className="screen production-screen">
      <h1>Production</h1>
      <p className="subtitle">Refine, brew, and transmute</p>

      <div className="inv-tabs">
        {PROD_TABS.map(t => (
          <button
            key={t.key}
            className={`inv-tab ${activeTab === t.key ? 'inv-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'refining' && (
        <div className="prod-coming-soon">
          <span className="prod-coming-icon">⚒</span>
          <p>Artefact Refining — coming soon</p>
        </div>
      )}

      {activeTab === 'alchemy' && (
        <div className="prod-coming-soon">
          <span className="prod-coming-icon">⚗</span>
          <p>Alchemy — coming soon</p>
        </div>
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
