import { useState, useCallback } from 'react';
import { ARTEFACTS_BY_ID } from '../data/artefacts';
import { generateAffixes, AFFIX_POOL_BY_SLOT } from '../data/affixPools';
import { generateArtefactName, formatArtefactName } from '../data/artefactNames';
import { evaluateArtefactUniques } from '../systems/artefactEngine';
import { rollElementAndSet, getSetBonusModifiers } from '../data/artefactSets';
import {
  MAX_UPGRADE_BY_RARITY, effectiveAffixValue, upgradeCost, rollUpgradeBonus, isBonusLevel,
} from '../data/artefactUpgrades';

const SAVE_KEY = 'mai_artefacts';
// Bump whenever the artefact schema changes in a way existing saves can't
// be trusted to honour (e.g. new slot layout, new affix shape). On load we
// wipe owned + equipped when the stored version is behind.
const ARTEFACT_SCHEMA_VERSION = 2;
export const MAX_ARTEFACTS = 100;

// Legacy rarity-bump table removed in stage 14 of the overhaul — artefacts
// no longer change rarity. Upgrade ladder (+0..+20) lives in
// src/data/artefactUpgrades.js.

function resolveInstance(o) {
  const cat = ARTEFACTS_BY_ID[o.catalogueId];
  if (!cat) return null;
  const displayName = formatArtefactName({
    firstName:  o.firstName,
    secondName: o.secondName,
    upgraded:   o.upgraded,
  });
  return {
    ...cat,
    uid:        o.uid,
    ...(o.rarity ? { rarity: o.rarity } : {}),
    // Preserve name parts + flag for downstream UI/tooling
    firstName:  o.firstName,
    secondName: o.secondName,
    upgraded:   Boolean(o.upgraded),
    craftCount: o.craftCount ?? 0,
    // Element + set membership (rolled at drop time, frozen afterwards).
    element:    o.element ?? null,
    setIds:     Array.isArray(o.setIds) ? o.setIds : [],
    // Upgrade ladder (+0 .. +MAX). affixBonuses[i] adds to affix i's value
    // before the per-level multiplier is applied.
    upgradeLevel: o.upgradeLevel ?? 0,
    affixBonuses: (o.affixBonuses && typeof o.affixBonuses === 'object') ? o.affixBonuses : {},
    // Generated name overrides the catalog name when present; fall back
    // to the catalog name for legacy instances without rolled parts.
    name:       displayName ?? cat.name,
  };
}

// Players start with no equipment — every item is earned through play.
const STARTER_OWNED = [];
const STARTER_EQUIPPED = {};

function ensureAffixes(owned) {
  let changed = false;
  const result = owned.map(o => {
    const art = ARTEFACTS_BY_ID[o.catalogueId];
    if (!art) return o;
    let next = o;
    if (!next.affixes) {
      const rarity = next.rarity ?? art.rarity ?? 'Iron';
      next = { ...next, affixes: generateAffixes(art.slot, rarity) };
      changed = true;
    }
    // Back-fill generated names for instances from older saves or starters.
    if (!next.firstName || !next.secondName) {
      const rarity = next.rarity ?? art.rarity ?? 'Iron';
      const { firstName, secondName } = generateArtefactName(rarity);
      next = { ...next, firstName, secondName };
      changed = true;
    }
    // Back-fill hidden craft counter (drives geometric cost ramp on transmutes).
    if (typeof next.craftCount !== 'number') {
      next = { ...next, craftCount: 0 };
      changed = true;
    }
    // Back-fill element + setIds (added in Stage 8 of the overhaul). Legacy
    // drops roll one on first load so set-counting always has something to work
    // with. The roll uses the instance's current rarity.
    if (!next.element || !Array.isArray(next.setIds) || next.setIds.length === 0) {
      const rarity = next.rarity ?? art.rarity ?? 'Iron';
      const { element, setIds } = rollElementAndSet(rarity);
      next = { ...next, element, setIds };
      changed = true;
    }
    // Back-fill upgrade state (Stage 9). All pre-existing drops start at +0
    // with no bonuses — players retrofit via the new upgrade flow.
    if (typeof next.upgradeLevel !== 'number') {
      next = { ...next, upgradeLevel: 0 };
      changed = true;
    }
    if (!next.affixBonuses || typeof next.affixBonuses !== 'object') {
      next = { ...next, affixBonuses: {} };
      changed = true;
    }
    return next;
  });
  return { result, changed };
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {}
}

export default function useArtefacts() {
  const [state, setState] = useState(() => {
    const loaded = load();
    // Wipe on schema mismatch — pre-v2 items have the wrong slot layout
    // (up to 11 affixes per item, per-tier instead of item-wide uniqueness).
    // Simpler to reset than to migrate every legacy shape in place.
    if (!loaded || loaded.schemaVersion !== ARTEFACT_SCHEMA_VERSION) {
      const fresh = {
        schemaVersion: ARTEFACT_SCHEMA_VERSION,
        owned: STARTER_OWNED,
        equipped: STARTER_EQUIPPED,
      };
      save(fresh);
      return fresh;
    }
    const { result: owned, changed } = ensureAffixes(loaded.owned);
    const initial = { ...loaded, owned, schemaVersion: ARTEFACT_SCHEMA_VERSION };
    if (changed) save(initial);
    return initial;
  });

  /** Add a dropped artefact to the owned collection. Silently ignored when full. */
  const addArtefact = useCallback((catalogueId) => {
    setState(prev => {
      if (prev.owned.length >= MAX_ARTEFACTS) return prev;
      const uid     = `art_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const art     = ARTEFACTS_BY_ID[catalogueId];
      const rarity  = art?.rarity ?? 'Iron';
      const affixes = generateAffixes(art?.slot ?? 'weapon', rarity);
      const { firstName, secondName } = generateArtefactName(rarity);
      const { element, setIds } = rollElementAndSet(rarity);
      const instance = {
        uid, catalogueId, affixes, firstName, secondName, element, setIds,
        upgradeLevel: 0, affixBonuses: {},
        upgraded: false, craftCount: 0,
      };
      const next = { ...prev, owned: [...prev.owned, instance] };
      save(next);
      return next;
    });
  }, []);

  // Equip an owned artefact (by uid) into a slot.
  // If the uid is already equipped elsewhere, it is moved (prevents double-equip).
  const equip = useCallback((slotId, uid) => {
    setState(prev => {
      const equipped = { ...prev.equipped };
      // Remove the uid from any other slot it currently occupies
      for (const [sid, suid] of Object.entries(equipped)) {
        if (suid === uid && sid !== slotId) delete equipped[sid];
      }
      equipped[slotId] = uid;
      const next = { ...prev, equipped };
      save(next);
      return next;
    });
  }, []);

  // Remove whatever is in a slot.
  const unequip = useCallback((slotId) => {
    setState(prev => {
      const equipped = { ...prev.equipped };
      delete equipped[slotId];
      const next = { ...prev, equipped };
      save(next);
      return next;
    });
  }, []);

  // Full artefact object for the item equipped in a slot, or null.
  const getEquipped = useCallback((slotId) => {
    const uid = state.equipped[slotId];
    if (!uid) return null;
    const instance = state.owned.find(o => o.uid === uid);
    if (!instance) return null;
    return resolveInstance(instance);
  }, [state]);

  // All owned artefacts that can go in a given slot type, with catalogue data merged.
  const getOwnedForSlot = useCallback((slotType) => {
    return state.owned
      .map(resolveInstance)
      .filter(a => a && a.slot === slotType);
  }, [state]);

  // Which slotId a given uid is currently equipped in (or null).
  const equippedInSlot = useCallback((uid) => {
    for (const [sid, suid] of Object.entries(state.equipped)) {
      if (suid === uid) return sid;
    }
    return null;
  }, [state]);

  /**
   * Dismantle an owned artefact. Refuses if currently equipped.
   * Returns the rarity on success so callers can grant the matching
   * mineral; null if the item is missing / locked.
   */
  const dismantleArtefact = useCallback((uid) => {
    let dismantledRarity = null;
    setState(prev => {
      // Refuse if equipped anywhere.
      for (const equippedUid of Object.values(prev.equipped ?? {})) {
        if (equippedUid === uid) return prev;
      }
      const inst = prev.owned.find(o => o.uid === uid);
      if (!inst) return prev;
      const art = ARTEFACTS_BY_ID[inst.catalogueId];
      dismantledRarity = inst.rarity ?? art?.rarity ?? 'Iron';
      const next = { ...prev, owned: prev.owned.filter(o => o.uid !== uid) };
      save(next);
      return next;
    });
    return dismantledRarity;
  }, []);

  /**
   * Bump an artefact's upgrade level by one. Rolls a bonus addition into
   * `affixBonuses` at milestone levels (every 4 levels up to the rarity
   * cap — see artefactUpgrades.BONUS_LEVELS). Material payment is the
   * caller's responsibility (see `getUpgradeCost` for the ladder).
   *
   * @returns {object|null} the new instance, or null if at cap / unknown uid.
   */
  const levelUpArtefact = useCallback((uid) => {
    let resultInstance = null;
    setState(prev => {
      const owned = prev.owned.map(o => {
        if (o.uid !== uid) return o;
        const rarity = o.rarity ?? ARTEFACTS_BY_ID[o.catalogueId]?.rarity ?? 'Iron';
        const cap    = MAX_UPGRADE_BY_RARITY[rarity] ?? 0;
        const cur    = o.upgradeLevel ?? 0;
        if (cur >= cap) return o;
        const nextLevel = cur + 1;
        let affixBonuses = { ...(o.affixBonuses ?? {}) };
        if (isBonusLevel(nextLevel)) {
          const slot = ARTEFACTS_BY_ID[o.catalogueId]?.slot ?? 'weapon';
          const roll = rollUpgradeBonus(o.affixes ?? [], rarity, AFFIX_POOL_BY_SLOT, slot);
          if (roll) {
            affixBonuses[roll.affixIndex] = (affixBonuses[roll.affixIndex] ?? 0) + roll.bonus;
          }
        }
        const updated = { ...o, upgradeLevel: nextLevel, affixBonuses };
        resultInstance = updated;
        return updated;
      });
      const next = { ...prev, owned };
      save(next);
      return next;
    });
    return resultInstance;
  }, []);

  /**
   * Cost (item list) for the next upgrade level of an artefact, or null if
   * at cap. Caller pays via useInventory.removeItem.
   */
  const getUpgradeCost = useCallback((uid) => {
    const o = state.owned.find(x => x.uid === uid);
    if (!o) return null;
    const rarity = o.rarity ?? ARTEFACTS_BY_ID[o.catalogueId]?.rarity ?? 'Iron';
    return upgradeCost(o.upgradeLevel ?? 0, rarity);
  }, [state.owned]);

  // honeAffix / replaceAffix / addAffix removed in stage 14 — affixes are
  // now locked at drop time (see obsidian/Artefacts.md). Upgrade growth
  // happens through levelUpArtefact instead.

  // Collect the equipped artefact instances once so both stat and flag
  // builders iterate the same working set.
  const collectEquippedInstances = useCallback(() => {
    const out = [];
    for (const [, uid] of Object.entries(state.equipped)) {
      if (!uid) continue;
      const instance = state.owned.find(o => o.uid === uid);
      if (instance) out.push(instance);
    }
    return out;
  }, [state]);

  // Build the modifiers object expected by computeAllStats.
  //
  // Three contribution layers are merged:
  //   1. Slot bonuses (type-based catalogue defaults)
  //   2. Normal (non-unique) affixes from transmutation
  //   3. Unique affixes resolved through artefactEngine → declarative effects
  //
  // Layer 3 means equipped unique affixes now actually influence stats — the
  // old filter (`if (affix.unique) continue;`) is gone for entries that have
  // a corresponding entry in ARTEFACT_UNIQUE_EFFECTS.
  const getStatModifiers = useCallback(() => {
    const mods = {};
    const equippedInstances = collectEquippedInstances();
    for (const instance of equippedInstances) {
      const art = resolveInstance(instance);
      if (!art) continue;
      // Slot base bonuses removed — artefact stats are now exactly the
      // rolled affixes (1–5 per rarity). See obsidian/Artefacts.md.
      const level    = instance.upgradeLevel ?? 0;
      const bonuses  = instance.affixBonuses ?? {};
      const affixArr = instance.affixes ?? [];
      for (let i = 0; i < affixArr.length; i++) {
        const affix = affixArr[i];
        if (affix.unique || !affix.stat) continue;
        const bonus = bonuses[i] ?? 0;
        const value = effectiveAffixValue(affix, level, bonus);
        (mods[affix.stat] ??= []).push({ type: affix.type, value });
      }
    }
    // Layer 3: unique affix effects.
    const { statMods } = evaluateArtefactUniques(equippedInstances);
    for (const [stat, list] of Object.entries(statMods)) {
      (mods[stat] ??= []).push(...list);
    }
    // Layer 4: active set bonuses (2-piece / 4-piece). Placeholder payloads
    // per-element for now — see artefactSets.TWO_PIECE_STAT / FOUR_PIECE_STAT.
    const setMods = getSetBonusModifiers(state.equipped, state.owned);
    for (const [stat, list] of Object.entries(setMods)) {
      (mods[stat] ??= []).push(...list);
    }
    return mods;
  }, [collectEquippedInstances, state.equipped, state.owned]);

  /**
   * Flag bag produced by unique affixes. Combat / cultivation / autofarm
   * screens read this to drive conditional effects (executeBonus, phoenix
   * revive, first-attack crit, loot bonus, etc.).
   */
  const getUniqueFlags = useCallback(() => {
    const equippedInstances = collectEquippedInstances();
    const { artefactFlags } = evaluateArtefactUniques(equippedInstances);
    return artefactFlags;
  }, [collectEquippedInstances]);

  return {
    owned:          state.owned,
    equipped:       state.equipped,
    addArtefact,
    levelUpArtefact,
    getUpgradeCost,
    equip,
    unequip,
    getEquipped,
    getOwnedForSlot,
    equippedInSlot,
    dismantleArtefact,
    getStatModifiers,
    getUniqueFlags,
  };
}
