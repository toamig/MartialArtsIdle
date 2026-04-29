// @refresh reset
import { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HERB_ITEMS, ALL_MATERIALS, RARITY } from '../data/materials';
import { findPill, PILLS, PILLS_BY_ID, RECIPES_BY_PILL } from '../data/pills';

const ITEMS_BY_ID = { ...ALL_MATERIALS, ...PILLS_BY_ID };

// ─── Display helpers ─────────────────────────────────────────────────────────

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

/** Build { itemId: qty } map of herb requirements from a recipe key. */
function recipeNeed(key) {
  const ids = key.split('|');
  const needed = {};
  for (const id of ids) needed[id] = (needed[id] || 0) + 1;
  return needed;
}

function isRecipeAffordable(key, inventory) {
  for (const [id, qty] of Object.entries(recipeNeed(key))) {
    if (inventory.getQuantity(id) < qty) return false;
  }
  return true;
}

/** Returns array of { id, missing } for shortfalls; empty if affordable. */
function recipeShortfall(key, inventory) {
  const out = [];
  for (const [id, qty] of Object.entries(recipeNeed(key))) {
    const have = inventory.getQuantity(id);
    if (have < qty) out.push({ id, missing: qty - have });
  }
  return out;
}

// ─── Forge — result + brew controls (anchored at top) ────────────────────────

const CRAFT_QTY_OPTIONS = [1, 5, 10];

function ForgeCard({
  resultPill, rarityColor, allFilled,
  craftQty, setCraftQty, effectiveQty, canCraft,
  floatMsgs, onBrew, isDiscoveredFn,
  t, tGame,
}) {
  const showPill   = allFilled && resultPill && isDiscoveredFn(resultPill.id);
  const isUnknown  = allFilled && resultPill && !isDiscoveredFn(resultPill.id);
  const isInvalid  = allFilled && !resultPill;

  const brewLabel = canCraft && effectiveQty > 1
    ? `${t('production.brewBtn')} ×${effectiveQty}`
    : t('production.brewBtn');

  return (
    <section className="alc-card alc-forge">
      <div className="alc-section-title">{t('production.forgeTitle')}</div>

      <div className="alc-forge-body">
        {showPill && (
          <>
            <div className="alc-forge-name" style={{ '--rarity-color': rarityColor }}>
              {tGame(`items.${resultPill.id}.name`, { defaultValue: resultPill.name })}
            </div>
            <ul className="alc-forge-effects">
              {resultPill.effects.map((eff, i) => (
                <li key={i} className="alc-forge-effect">{formatEffect(eff)}</li>
              ))}
            </ul>
          </>
        )}
        {isUnknown && (
          <>
            <div className="alc-forge-name alc-forge-name-unknown">{t('production.unknownRecipe')}</div>
            <div className="alc-forge-hint">{t('production.unknownRecipeHint')}</div>
          </>
        )}
        {isInvalid && (
          <>
            <div className="alc-forge-name alc-forge-name-invalid">{t('production.invalidCombination')}</div>
            <div className="alc-forge-hint">{t('production.invalidCombinationHint')}</div>
          </>
        )}
        {!allFilled && (
          <>
            <div className="alc-forge-name alc-forge-name-idle">—</div>
            <div className="alc-forge-hint">{t('production.select3Herbs')}</div>
          </>
        )}

        {/* Floating "+N Pill" feedback — anchored top-center over the body */}
        {floatMsgs.map(m => (
          <span key={m.id} className="alc-float-msg" style={{ '--float-color': m.color }}>
            {m.text}
          </span>
        ))}
      </div>

      <div className="alc-forge-actions">
        <div className="alc-qty-group" role="group" aria-label="Brew quantity">
          {CRAFT_QTY_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              className={`alc-qty-btn ${craftQty === opt ? 'alc-qty-btn-active' : ''}`}
              onClick={() => setCraftQty(opt)}
            >×{opt}</button>
          ))}
        </div>
        <button
          type="button"
          className="alc-brew-btn"
          onClick={onBrew}
          disabled={!canCraft}
        >
          {brewLabel}
        </button>
      </div>
    </section>
  );
}

// ─── Mixer — slots + cost + herbs (single integrated card) ──────────────────

function MixerCard({
  slots, activeSlot, setActiveSlot, clearSlot,
  ownedHerbs, assignHerb, costPreview, allFilled, inventory,
  t, tGame,
}) {
  return (
    <section className="alc-card alc-mixer">
      <div className="alc-section-title">{t('production.workshopTitle')}</div>

      <div className="alc-slots-row">
        {[0, 1, 2].map(i => {
          const herbId = slots[i];
          const herb   = herbId ? ITEMS_BY_ID[herbId] : null;
          const color  = herb ? (RARITY[herb.rarity]?.color ?? '#9ca3af') : null;
          const active = activeSlot === i;
          const cls = [
            'alc-slot',
            active ? 'alc-slot-active' : '',
            herb   ? 'alc-slot-filled' : 'alc-slot-empty',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={i}
              type="button"
              className={cls}
              style={color ? { '--rarity-color': color } : undefined}
              onClick={() => setActiveSlot(i)}
            >
              {herb ? (
                <>
                  <span className="alc-slot-name">
                    {tGame(`items.${herb.id}.name`, { defaultValue: herb.name })}
                  </span>
                  <span
                    className="alc-slot-clear"
                    role="button"
                    aria-label={t('production.clearSlot')}
                    onClick={e => { e.stopPropagation(); clearSlot(i); }}
                  >×</span>
                </>
              ) : (
                <span className="alc-slot-placeholder">+</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cost line — always rendered, plain text */}
      <div className="alc-cost-line">
        <span className="alc-cost-prefix">{t('production.uses')}</span>
        {allFilled && costPreview.length > 0 ? (
          costPreview.map((c, i) => {
            const mat  = ITEMS_BY_ID[c.id];
            const name = mat ? tGame(`items.${c.id}.name`, { defaultValue: mat.name }) : c.id;
            const have = inventory.getQuantity(c.id);
            const ok   = have >= c.qty;
            return (
              <span key={c.id} className={ok ? 'alc-cost-item' : 'alc-cost-item alc-cost-item-short'}>
                {i > 0 ? ', ' : ' '}{c.qty}× {name}
              </span>
            );
          })
        ) : (
          <span className="alc-cost-placeholder"> —</span>
        )}
      </div>

      <div className="alc-herbs-section">
        <div className="alc-section-title alc-section-title-quiet">{t('production.herbsTitle')}</div>
        <div className="alc-herbs-list">
          {ownedHerbs.length === 0 ? (
            <div className="alc-herbs-empty">{t('production.noHerbsOwned')}</div>
          ) : ownedHerbs.map(h => {
            const color = RARITY[h.rarity]?.color ?? '#9ca3af';
            return (
              <button
                key={h.id}
                type="button"
                className="alc-herb"
                style={{ '--rarity-color': color }}
                onClick={() => assignHerb(h.id)}
              >
                <span className="alc-herb-name">
                  {tGame(`items.${h.id}.name`, { defaultValue: h.name })}
                </span>
                <span className="alc-herb-qty">×{inventory.getQuantity(h.id)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Recipe Codex — pinned/affordable/all browser ───────────────────────────

const CODEX_TABS = [
  { key: 'pinned',     tKey: 'production.tabPinned' },
  { key: 'affordable', tKey: 'production.tabAffordable' },
  { key: 'all',        tKey: 'production.tabAllRecipes' },
];

function RecipeBrowser({ inventory, pills, onFillSlots }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const allRows = useMemo(() => {
    const rows = [];
    for (const pill of PILLS) {
      if (!pills.isDiscovered(pill.id)) continue;
      const recipes = RECIPES_BY_PILL[pill.id] ?? [];
      for (const key of recipes) {
        const affordable = isRecipeAffordable(key, inventory);
        const missing    = affordable ? [] : recipeShortfall(key, inventory);
        rows.push({ pill, key, affordable, missing });
      }
    }
    return rows;
  }, [inventory, pills]);

  const pinnedRows     = useMemo(() => allRows.filter(r => pills.isPinned(r.key)), [allRows, pills]);
  const affordableRows = useMemo(() => allRows.filter(r => r.affordable),           [allRows]);

  const defaultTab = pinnedRows.length > 0 ? 'pinned' : 'affordable';
  const [tab, setTab] = useState(defaultTab);

  const visibleRows =
    tab === 'pinned'     ? pinnedRows :
    tab === 'affordable' ? affordableRows :
                           allRows;

  const counts = {
    pinned:     pinnedRows.length,
    affordable: affordableRows.length,
    all:        allRows.length,
  };

  const emptyText =
    tab === 'pinned'     ? t('production.noPinned') :
    tab === 'affordable' ? t('production.noRecipes') :
                           t('production.noDiscovered');

  return (
    <section className="alc-card alc-codex">
      <div className="alc-section-title">{t('production.codexTitle')}</div>

      <div className="alc-codex-tabs" role="tablist">
        {CODEX_TABS.map(tb => (
          <button
            key={tb.key}
            type="button"
            role="tab"
            aria-selected={tab === tb.key}
            className={`alc-codex-tab ${tab === tb.key ? 'alc-codex-tab-active' : ''}`}
            onClick={() => setTab(tb.key)}
          >
            {t(tb.tKey)} <span className="alc-codex-tab-count">({counts[tb.key]})</span>
          </button>
        ))}
      </div>

      <div className="alc-codex-list">
        {visibleRows.length === 0 ? (
          <div className="alc-codex-empty">{emptyText}</div>
        ) : visibleRows.map(({ pill, key, affordable, missing }) => {
          const herbs      = key.split('|');
          const herbNames  = herbs.map(id => {
            const h = ITEMS_BY_ID[id];
            return h ? tGame(`items.${h.id}.name`, { defaultValue: h.name }) : id;
          });
          const color    = RARITY[pill.rarity]?.color ?? '#9ca3af';
          const pillName = tGame(`items.${pill.id}.name`, { defaultValue: pill.name });
          const pinned   = pills.isPinned(key);
          return (
            <div
              key={key}
              className={`alc-recipe ${affordable ? '' : 'alc-recipe-disabled'}`}
            >
              <button
                type="button"
                className={`alc-recipe-pin ${pinned ? 'alc-recipe-pin-on' : ''}`}
                aria-label={pinned ? t('production.unpinRecipe') : t('production.pinRecipe')}
                aria-pressed={pinned}
                onClick={(e) => { e.stopPropagation(); pills.togglePin(key); }}
              >
                {pinned ? '★' : '☆'}
              </button>
              <button
                type="button"
                className="alc-recipe-body"
                onClick={() => onFillSlots(herbs)}
              >
                <span className="alc-recipe-herbs">{herbNames.join(' + ')}</span>
                <span className="alc-recipe-pill" style={{ '--rarity-color': color }}>{pillName}</span>
                {!affordable && missing.length > 0 && (
                  <span className="alc-recipe-missing">
                    {t('production.missing')}{' '}
                    {missing.map((m, i) => {
                      const mat  = ITEMS_BY_ID[m.id];
                      const name = mat ? tGame(`items.${m.id}.name`, { defaultValue: mat.name }) : m.id;
                      return (
                        <span key={m.id}>{i > 0 ? ', ' : ''}{m.missing}× {name}</span>
                      );
                    })}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── AlchemyPanel — orchestrates the three cards ────────────────────────────

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
  const rarityColor = resultPill ? (RARITY[resultPill.rarity]?.color ?? '#9ca3af') : null;

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
  const canCraft     = !!(allFilled && resultPill && effectiveQty >= 1);

  const costPreview = useMemo(() => {
    if (!allFilled) return [];
    const perCraft = {};
    for (const id of slots) perCraft[id] = (perCraft[id] || 0) + 1;
    const mult = Math.max(1, effectiveQty);
    return Object.entries(perCraft).map(([id, qty]) => ({ id, qty: qty * mult }));
  }, [slots, allFilled, effectiveQty]);

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
    const color = RARITY[resultPill.rarity]?.color ?? '#9ca3af';
    setFloatMsgs(prev => [...prev, { id: msgId, text, color }]);
    setTimeout(() => setFloatMsgs(prev => prev.filter(m => m.id !== msgId)), 1300);
  };

  return (
    <div className="alchemy-panel">
      <ForgeCard
        resultPill={resultPill}
        rarityColor={rarityColor}
        allFilled={allFilled}
        craftQty={craftQty}
        setCraftQty={setCraftQty}
        effectiveQty={effectiveQty}
        canCraft={canCraft}
        floatMsgs={floatMsgs}
        onBrew={handleCraft}
        isDiscoveredFn={pills.isDiscovered}
        t={t}
        tGame={tGame}
      />
      <MixerCard
        slots={slots}
        activeSlot={activeSlot}
        setActiveSlot={setActiveSlot}
        clearSlot={clearSlot}
        ownedHerbs={ownedHerbs}
        assignHerb={assignHerb}
        costPreview={costPreview}
        allFilled={allFilled}
        inventory={inventory}
        t={t}
        tGame={tGame}
      />
      <RecipeBrowser inventory={inventory} pills={pills} onFillSlots={fillSlots} />
    </div>
  );
}

// ─── ProductionScreen ───────────────────────────────────────────────────────
// Alchemy is the only production activity. Artefacts and techniques drop from
// combat (modified in Collection); laws come from major-realm ascension.

function ProductionScreen({ inventory, pills, tree }) {
  const { t } = useTranslation('ui');

  return (
    <div className="screen production-screen">
      <header className="coll-page-header">
        <h1>{t('production.title')}</h1>
        <span className="coll-page-subtitle">{t('production.subtitle')}</span>
      </header>
      <AlchemyPanel inventory={inventory} pills={pills} tree={tree} />
    </div>
  );
}

export default ProductionScreen;
