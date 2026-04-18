import { useState, useCallback } from 'react';
import { ARTEFACTS_BY_ID, getSlotBonuses } from '../data/artefacts';
import {
  generateAffixes, rollAffix, pickRandomAffix, pickArtefactAffix,
  AFFIX_POOL_BY_SLOT, ARTEFACT_TIER_SLOTS,
} from '../data/affixPools';
import { generateArtefactName, formatArtefactName } from '../data/artefactNames';

const SAVE_KEY = 'mai_artefacts';
// Bump whenever the artefact schema changes in a way existing saves can't
// be trusted to honour (e.g. new slot layout, new affix shape). On load we
// wipe owned + equipped when the stored version is behind.
const ARTEFACT_SCHEMA_VERSION = 2;
export const MAX_ARTEFACTS = 100;

// Quality progression for artefacts (rarity keys)
export const ARTEFACT_NEXT_RARITY = {
  Iron:   'Bronze',
  Bronze: 'Silver',
  Silver: 'Gold',
  Gold:   'Transcendent',
};

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
      const instance = { uid, catalogueId, affixes, firstName, secondName, upgraded: false, craftCount: 0 };
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

  // Upgrade an owned artefact's quality by one tier.
  // Keeps the original rolled name and marks the instance as upgraded so the
  // display layer appends an "(upgraded)" suffix.
  const upgradeArtefact = useCallback((uid) => {
    setState(prev => {
      const owned = prev.owned.map(o => {
        if (o.uid !== uid) return o;
        const currentRarity = o.rarity ?? ARTEFACTS_BY_ID[o.catalogueId]?.rarity ?? 'Iron';
        const nextRarity = ARTEFACT_NEXT_RARITY[currentRarity];
        if (!nextRarity) return o;
        return { ...o, rarity: nextRarity, upgraded: true };
      });
      const next = { ...prev, owned };
      save(next);
      return next;
    });
  }, []);

  /** Re-roll one affix's value. Unique affixes are locked and can't be honed. */
  const honeAffix = useCallback((uid, idx) => {
    setState(prev => {
      const owned = prev.owned.map(o => {
        if (o.uid !== uid) return o;
        const art  = ARTEFACTS_BY_ID[o.catalogueId];
        const pool = AFFIX_POOL_BY_SLOT[art?.slot ?? 'weapon'] ?? [];
        const affixes = (o.affixes ?? []).map((a, i) => {
          if (i !== idx) return a;
          if (a.unique) return a; // uniques are locked
          const entry = pool.find(e => e.id === a.id);
          if (!entry) return a;
          return rollAffix(entry, a.tier ?? 'Iron');
        });
        return { ...o, affixes, craftCount: (o.craftCount ?? 0) + 1 };
      });
      const next = { ...prev, owned };
      save(next);
      return next;
    });
  }, []);

  /**
   * Replace one affix with a different one from the NORMAL pool.
   * Uniqueness is enforced item-wide (no id can repeat anywhere). Unique
   * affixes can't be replaced, and replace never rolls into a unique.
   */
  const replaceAffix = useCallback((uid, idx) => {
    setState(prev => {
      const owned = prev.owned.map(o => {
        if (o.uid !== uid) return o;
        const art     = ARTEFACTS_BY_ID[o.catalogueId];
        const affixes = o.affixes ?? [];
        const oldAffix = affixes[idx];
        if (!oldAffix) return o;
        if (oldAffix.unique) return o; // uniques are locked
        const tier = oldAffix.tier ?? 'Iron';
        // Item-wide exclusion — no affix id may repeat anywhere on the item.
        const excludeIds = affixes
          .filter((_, i) => i !== idx)
          .map(a => a.id);
        const newAffix = pickRandomAffix(art?.slot ?? 'weapon', tier, excludeIds);
        if (!newAffix) return o;
        const updated = affixes.map((a, i) => (i === idx ? newAffix : a));
        return { ...o, affixes: updated, craftCount: (o.craftCount ?? 0) + 1 };
      });
      const next = { ...prev, owned };
      save(next);
      return next;
    });
  }, []);

  /**
   * Add a new affix at a specific tier. Item-wide dedupe. On the Transcendent
   * tier the pool is merged with artefact uniques (uniform weighting) so Add
   * there can produce a unique.
   */
  const addAffix = useCallback((uid, tier = 'Iron') => {
    setState(prev => {
      const owned = prev.owned.map(o => {
        if (o.uid !== uid) return o;
        const art       = ARTEFACTS_BY_ID[o.catalogueId];
        const affixes   = o.affixes ?? [];
        const tierMax   = ARTEFACT_TIER_SLOTS[tier] ?? 0;
        const tierCount = affixes.filter(a => (a.tier ?? 'Iron') === tier).length;
        if (tierCount >= tierMax) return o;
        const excludeIds = affixes.map(a => a.id);
        const slot = art?.slot ?? 'weapon';
        // Dynamically import to avoid pulling pickArtefactAffix when not needed,
        // but keep the hook small — just call pickRandomAffix for non-Trans and
        // the merged picker for Transcendent.
        const newAffix = tier === 'Transcendent'
          ? pickArtefactAffix(slot, tier, excludeIds)
          : pickRandomAffix(slot, tier, excludeIds);
        if (!newAffix) return o;
        return { ...o, affixes: [...affixes, newAffix], craftCount: (o.craftCount ?? 0) + 1 };
      });
      const next = { ...prev, owned };
      save(next);
      return next;
    });
  }, []);

  // Build the modifiers object expected by computeAllStats.
  const getStatModifiers = useCallback(() => {
    const mods = {};
    for (const [, uid] of Object.entries(state.equipped)) {
      if (!uid) continue;
      const instance = state.owned.find(o => o.uid === uid);
      if (!instance) continue;
      const art = resolveInstance(instance);
      if (!art) continue;
      for (const bonus of getSlotBonuses(art.slot, art.rarity)) {
        (mods[bonus.stat] ??= []).push({ type: bonus.type, value: bonus.value });
      }
      // Include per-instance affixes from transmutation. Uniques are
      // presentation-only for now — they carry a description but no
      // (stat, type, value) triple, so skip them here.
      for (const affix of (instance.affixes ?? [])) {
        if (affix.unique || !affix.stat) continue;
        (mods[affix.stat] ??= []).push({ type: affix.type, value: affix.value });
      }
    }
    return mods;
  }, [state]);

  return {
    owned:          state.owned,
    equipped:       state.equipped,
    addArtefact,
    upgradeArtefact,
    honeAffix,
    replaceAffix,
    addAffix,
    equip,
    unequip,
    getEquipped,
    getOwnedForSlot,
    equippedInSlot,
    getStatModifiers,
  };
}
