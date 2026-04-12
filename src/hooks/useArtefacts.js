import { useState, useCallback } from 'react';
import { ARTEFACTS_BY_ID, getSlotBonuses } from '../data/artefacts';
import {
  generateAffixes, rollAffix, pickRandomAffix,
  AFFIX_POOL_BY_SLOT, AFFIX_SLOT_COUNT,
} from '../data/affixPools';

const SAVE_KEY = 'mai_artefacts';
export const MAX_ARTEFACTS = 100;

// Quality progression for artefacts (rarity keys)
export const ARTEFACT_NEXT_RARITY = {
  Iron:   'Bronze',
  Bronze: 'Silver',
  Silver: 'Gold',
  Gold:   'Transcendent',
};

// Merge catalogue data with per-instance overrides (e.g. upgraded rarity)
function resolveInstance(o) {
  const cat = ARTEFACTS_BY_ID[o.catalogueId];
  if (!cat) return null;
  return { ...cat, uid: o.uid, ...(o.rarity ? { rarity: o.rarity } : {}) };
}

// One common artefact per slot type, auto-equipped at game start.
const STARTER_OWNED = [
  { uid: 'start_weapon', catalogueId: 'iron_sword'              },
  { uid: 'start_head',   catalogueId: 'spirit_headband'         },
  { uid: 'start_body',   catalogueId: 'cotton_spirit_robe'      },
  { uid: 'start_hands',  catalogueId: 'iron_bracers'            },
  { uid: 'start_waist',  catalogueId: 'leather_cultivation_belt'},
  { uid: 'start_feet',   catalogueId: 'wind_step_boots'         },
  { uid: 'start_neck',   catalogueId: 'jade_spirit_pendant'     },
  { uid: 'start_ring_a', catalogueId: 'copper_spirit_ring'      },
  { uid: 'start_ring_b', catalogueId: 'copper_spirit_ring'      },
];

const STARTER_EQUIPPED = {
  weapon: 'start_weapon',
  head:   'start_head',
  body:   'start_body',
  hands:  'start_hands',
  waist:  'start_waist',
  feet:   'start_feet',
  neck:   'start_neck',
  ring_1: 'start_ring_a',
  ring_2: 'start_ring_b',
};

// Backfill affixes for instances that don't have them yet (e.g. from saves
// before the affix system was introduced).
function ensureAffixes(owned) {
  let changed = false;
  const result = owned.map(o => {
    if (o.affixes) return o;
    const art = ARTEFACTS_BY_ID[o.catalogueId];
    if (!art) return o;
    const rarity = o.rarity ?? art.rarity ?? 'Iron';
    changed = true;
    return { ...o, affixes: generateAffixes(art.slot, rarity) };
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
    const loaded = load() ?? { owned: STARTER_OWNED, equipped: STARTER_EQUIPPED };
    const { result: owned, changed } = ensureAffixes(loaded.owned);
    const initial = { ...loaded, owned };
    if (changed) save(initial);
    return initial;
  });

  /** Add a dropped artefact to the owned collection. Silently ignored when full. */
  const addArtefact = useCallback((catalogueId) => {
    setState(prev => {
      if (prev.owned.length >= MAX_ARTEFACTS) return prev;
      const uid    = `art_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const art    = ARTEFACTS_BY_ID[catalogueId];
      const rarity = art?.rarity ?? 'Iron';
      const affixes = generateAffixes(art?.slot ?? 'weapon', rarity);
      const next = { ...prev, owned: [...prev.owned, { uid, catalogueId, affixes }] };
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
  const upgradeArtefact = useCallback((uid) => {
    setState(prev => {
      const owned = prev.owned.map(o => {
        if (o.uid !== uid) return o;
        const currentRarity = o.rarity ?? ARTEFACTS_BY_ID[o.catalogueId]?.rarity ?? 'Iron';
        const nextRarity = ARTEFACT_NEXT_RARITY[currentRarity];
        if (!nextRarity) return o;
        return { ...o, rarity: nextRarity };
      });
      const next = { ...prev, owned };
      save(next);
      return next;
    });
  }, []);

  /** Re-roll one affix's value within the current rarity range. */
  const honeAffix = useCallback((uid, idx) => {
    setState(prev => {
      const owned = prev.owned.map(o => {
        if (o.uid !== uid) return o;
        const art    = ARTEFACTS_BY_ID[o.catalogueId];
        const rarity = o.rarity ?? art?.rarity ?? 'Iron';
        const pool   = AFFIX_POOL_BY_SLOT[art?.slot ?? 'weapon'] ?? [];
        const affixes = (o.affixes ?? []).map((a, i) => {
          if (i !== idx) return a;
          const entry = pool.find(e => e.id === a.id);
          if (!entry) return a;
          return rollAffix(entry, rarity);
        });
        return { ...o, affixes };
      });
      const next = { ...prev, owned };
      save(next);
      return next;
    });
  }, []);

  /** Replace one affix with a random different one from the pool. */
  const replaceAffix = useCallback((uid, idx) => {
    setState(prev => {
      const owned = prev.owned.map(o => {
        if (o.uid !== uid) return o;
        const art     = ARTEFACTS_BY_ID[o.catalogueId];
        const rarity  = o.rarity ?? art?.rarity ?? 'Iron';
        const affixes = o.affixes ?? [];
        const excludeIds = affixes.map(a => a.id).filter((_, i) => i !== idx);
        const newAffix = pickRandomAffix(art?.slot ?? 'weapon', rarity, excludeIds);
        if (!newAffix) return o;
        const updated = affixes.map((a, i) => (i === idx ? newAffix : a));
        return { ...o, affixes: updated };
      });
      const next = { ...prev, owned };
      save(next);
      return next;
    });
  }, []);

  /** Add a new affix to an empty slot (if the item still has capacity). */
  const addAffix = useCallback((uid) => {
    setState(prev => {
      const owned = prev.owned.map(o => {
        if (o.uid !== uid) return o;
        const art      = ARTEFACTS_BY_ID[o.catalogueId];
        const rarity   = o.rarity ?? art?.rarity ?? 'Iron';
        const affixes  = o.affixes ?? [];
        const maxSlots = AFFIX_SLOT_COUNT[rarity] ?? 3;
        if (affixes.length >= maxSlots) return o;
        const excludeIds = affixes.map(a => a.id);
        const newAffix = pickRandomAffix(art?.slot ?? 'weapon', rarity, excludeIds);
        if (!newAffix) return o;
        return { ...o, affixes: [...affixes, newAffix] };
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
      // Include per-instance affixes from transmutation
      for (const affix of (instance.affixes ?? [])) {
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
