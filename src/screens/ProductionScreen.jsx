// @refresh reset
import { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HERB_ITEMS, ALL_MATERIALS, RARITY } from '../data/materials';
import { findPill, PILLS, PILLS_BY_ID, RECIPES_BY_PILL } from '../data/pills';

const ITEMS_BY_ID = { ...ALL_MATERIALS, ...PILLS_BY_ID };

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

function canAffordRecipe(key, inventory) {
  const ids = key.split('|');
  const needed = {};
  for (const id of ids) needed[id] = (needed[id] || 0) + 1;
  for (const [id, qty] of Object.entries(needed)) {
    if (inventory.getQuantity(id) < qty) return false;
  }
  return true;
}

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
      <div className="alchemy-section-title">{t('production.craftableRecipes')}</div>
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

      <RecipeBrowser inventory={inventory} pills={pills} onFillSlots={fillSlots} />
    </div>
  );
}

// ─── ProductionScreen ─────────────────────────────────────────────────────────
// Alchemy is the only production activity now. Artefacts and techniques drop
// from combat (modified in the Collection screen) and laws drop from major-realm
// ascension selections.

function ProductionScreen({ inventory, pills, tree }) {
  const { t } = useTranslation('ui');

  return (
    <div className="screen production-screen">
      <h1>{t('production.title')}</h1>
      <p className="subtitle">{t('production.subtitle')}</p>
      <AlchemyPanel inventory={inventory} pills={pills} tree={tree} />
    </div>
  );
}

export default ProductionScreen;
