import { useState } from 'react';
import { QUALITY, ARTEFACTS_BY_ID } from '../data/artefacts';
import { LAW_RARITY } from '../data/laws';
import { TECHNIQUE_QUALITY } from '../data/techniques';
import { ITEMS_BY_ID } from '../data/items';
import { ARTEFACT_NEXT_RARITY } from '../hooks/useArtefacts';
import { TECH_NEXT_QUALITY } from '../hooks/useTechniques';
import { LAW_NEXT_RARITY } from '../hooks/useCultivation';

// ─── Unified upgrade costs — minerals only, same for all item types ───────────
// Based on the quality jump: two bracket minerals in increasing amounts.
const UPGRADE_COST = {
  // Artefact rarity keys  (current quality → cost)
  common:   [ { itemId: 'black_tortoise_iron',    qty: 10 }, { itemId: 'crimson_flame_crystal', qty: 3  } ],
  uncommon: [ { itemId: 'crimson_flame_crystal',  qty: 8  }, { itemId: 'void_stone',            qty: 3  } ],
  rare:     [ { itemId: 'void_stone',             qty: 5  }, { itemId: 'star_metal_ore',        qty: 3  } ],
  epic:     [ { itemId: 'star_metal_ore',         qty: 8  }, { itemId: 'heavenly_profound_metal', qty: 2 } ],
  // Technique / Law quality keys
  Iron:         [ { itemId: 'black_tortoise_iron',    qty: 10 }, { itemId: 'crimson_flame_crystal', qty: 3  } ],
  Bronze:       [ { itemId: 'crimson_flame_crystal',  qty: 8  }, { itemId: 'void_stone',            qty: 3  } ],
  Silver:       [ { itemId: 'void_stone',             qty: 5  }, { itemId: 'star_metal_ore',        qty: 3  } ],
  Gold:         [ { itemId: 'star_metal_ore',         qty: 8  }, { itemId: 'heavenly_profound_metal', qty: 2 } ],
};

// ─── Cost calculators — single unified function ───────────────────────────────
function upgradeCost(currentQuality, nextQualityFn) {
  if (!nextQualityFn(currentQuality)) return null;   // already max
  return UPGRADE_COST[currentQuality] ?? null;
}

function artefactUpgradeCost(currentRarity)  { return upgradeCost(currentRarity,  q => ARTEFACT_NEXT_RARITY[q]); }
function techniqueUpgradeCost(currentQuality){ return upgradeCost(currentQuality, q => TECH_NEXT_QUALITY[q]);    }
function lawUpgradeCost(currentRarity)       { return upgradeCost(currentRarity,  q => LAW_NEXT_RARITY[q]);     }

// ─── Quality label + colour helpers ──────────────────────────────────────────
function artQuality(rarity) {
  return QUALITY[rarity] ?? { label: rarity, color: '#aaa' };
}
function techQuality(quality) {
  return TECHNIQUE_QUALITY[quality] ?? { label: quality, color: '#aaa' };
}
function lawQuality(rarity) {
  return LAW_RARITY[rarity] ?? { label: rarity, color: '#aaa' };
}

// ─── CostRow ─────────────────────────────────────────────────────────────────
function CostRow({ itemId, needed, owned }) {
  const mat    = ITEMS_BY_ID[itemId];
  const name   = mat?.name ?? itemId;
  const has    = owned >= needed;
  return (
    <div className="tx-cost-row">
      <span className="tx-cost-name">{name}</span>
      <span className={`tx-cost-qty ${has ? 'tx-cost-ok' : 'tx-cost-short'}`}>
        {needed} <span className="tx-cost-sep">/</span> {owned}
      </span>
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
  const [selected, setSelected] = useState(null); // uid / id / lawId

  // Reset selection when switching item type
  const switchTab = (tab) => { setItemTab(tab); setSelected(null); };

  // ── Derive selected item data ───────────────────────────────────────────
  let selectedData = null;  // { label, currentQuality, cost, onUpgrade, qualityObj }
  if (selected) {
    if (itemTab === 'artefacts') {
      const inst    = artefacts.owned.find(o => o.uid === selected);
      if (inst) {
        const art     = ARTEFACTS_BY_ID[inst.catalogueId];
        const rarity  = inst.rarity ?? art?.rarity ?? 'common';
        const q       = artQuality(rarity);
        const nextRar = ARTEFACT_NEXT_RARITY[rarity];
        const nextQ   = nextRar ? artQuality(nextRar) : null;
        const cost    = artefactUpgradeCost(rarity);
        selectedData  = {
          label:     art?.name ?? inst.catalogueId,
          sub:       art?.slot ?? '',
          qualityObj: q,
          nextQuality: nextQ,
          cost,
          onUpgrade: () => artefacts.upgradeArtefact(selected),
        };
      }
    } else if (itemTab === 'techniques') {
      const tech = techniques.ownedTechniques[selected];
      if (tech) {
        const q      = techQuality(tech.quality);
        const nextQn = TECH_NEXT_QUALITY[tech.quality];
        const nextQ  = nextQn ? techQuality(nextQn) : null;
        const cost   = techniqueUpgradeCost(tech.quality);
        selectedData = {
          label:      tech.name,
          sub:        `${tech.type} · ${tech.rank}`,
          qualityObj: q,
          nextQuality: nextQ,
          cost,
          onUpgrade: () => techniques.upgradeTechnique(selected),
        };
      }
    } else {
      const law = cultivation.ownedLaws.find(l => l.id === selected);
      if (law) {
        const q      = lawQuality(law.rarity);
        const nextRn = LAW_NEXT_RARITY[law.rarity];
        const nextQ  = nextRn ? lawQuality(nextRn) : null;
        const cost   = lawUpgradeCost(law.rarity);
        selectedData = {
          label:      law.name,
          sub:        law.element,
          qualityObj: q,
          nextQuality: nextQ,
          cost,
          onUpgrade: () => cultivation.upgradeLaw(selected),
        };
      }
    }
  }

  // Can the player afford the upgrade?
  const canAfford = selectedData?.cost?.every(
    c => inventory.getQuantity(c.itemId) >= c.qty
  ) ?? false;

  const handleUpgrade = () => {
    if (!selectedData || !canAfford) return;
    // Deduct materials
    for (const c of selectedData.cost) {
      inventory.removeItem(c.itemId, c.qty);
    }
    selectedData.onUpgrade();
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="tx-panel">
      {/* Item-type tabs */}
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

      {/* ── Item grid ────────────────────────────────────────────────────── */}
      <div className="inv-grid tx-item-grid">
        {itemTab === 'artefacts' && artefacts.owned.map(inst => {
          const art    = ARTEFACTS_BY_ID[inst.catalogueId];
          const rarity = inst.rarity ?? art?.rarity ?? 'common';
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

      {/* ── Upgrade panel ────────────────────────────────────────────────── */}
      {selectedData && (
        <div className="tx-upgrade-panel">
          <div className="tx-upgrade-header">
            <div>
              <span className="tx-item-name">{selectedData.label}</span>
              <span className="tx-item-sub">{selectedData.sub}</span>
            </div>
            <span className="tx-quality-badge" style={{ color: selectedData.qualityObj.color, borderColor: selectedData.qualityObj.color }}>
              {selectedData.qualityObj.label}
            </span>
          </div>

          {selectedData.cost ? (
            <>
              <div className="tx-upgrade-arrow">
                ↓ Upgrade to{' '}
                <span style={{ color: selectedData.nextQuality.color, fontWeight: 700 }}>
                  {selectedData.nextQuality.label}
                </span>
              </div>

              <div className="tx-cost-list">
                {selectedData.cost.map(c => (
                  <CostRow
                    key={c.itemId}
                    itemId={c.itemId}
                    needed={c.qty}
                    owned={inventory.getQuantity(c.itemId)}
                  />
                ))}
              </div>

              <button
                className={`tx-upgrade-btn ${canAfford ? '' : 'tx-upgrade-btn-disabled'}`}
                onClick={handleUpgrade}
                disabled={!canAfford}
              >
                Upgrade
              </button>
            </>
          ) : (
            <p className="tx-max-quality">Already at maximum quality.</p>
          )}
        </div>
      )}

      {!selected && (
        <p className="tx-hint">Select an item above to upgrade its quality.</p>
      )}
    </div>
  );
}

// ─── ProductionScreen ─────────────────────────────────────────────────────────
const PROD_TABS = [
  { key: 'refining',       label: 'Refining'       },
  { key: 'alchemy',        label: 'Alchemy'         },
  { key: 'transmutation',  label: 'Transmutation'   },
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
