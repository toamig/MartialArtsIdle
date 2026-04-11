import { useState, useCallback } from 'react';
import { ARTEFACTS_BY_ID, getSlotBonuses } from '../data/artefacts';

const SAVE_KEY = 'mai_artefacts';

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
  const [state, setState] = useState(() =>
    load() ?? { owned: STARTER_OWNED, equipped: STARTER_EQUIPPED }
  );

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
    return { uid, ...ARTEFACTS_BY_ID[instance.catalogueId] };
  }, [state]);

  // All owned artefacts that can go in a given slot type, with catalogue data merged.
  const getOwnedForSlot = useCallback((slotType) => {
    return state.owned
      .map(o => ({ uid: o.uid, ...ARTEFACTS_BY_ID[o.catalogueId] }))
      .filter(a => a && a.slot === slotType);
  }, [state]);

  // Which slotId a given uid is currently equipped in (or null).
  const equippedInSlot = useCallback((uid) => {
    for (const [sid, suid] of Object.entries(state.equipped)) {
      if (suid === uid) return sid;
    }
    return null;
  }, [state]);

  // Build the modifiers object expected by computeAllStats.
  const getStatModifiers = useCallback(() => {
    const mods = {};
    for (const [, uid] of Object.entries(state.equipped)) {
      if (!uid) continue;
      const instance = state.owned.find(o => o.uid === uid);
      if (!instance) continue;
      const art = ARTEFACTS_BY_ID[instance.catalogueId];
      if (!art) continue;
      for (const bonus of getSlotBonuses(art.slot, art.rarity)) {
        (mods[bonus.stat] ??= []).push({ type: bonus.type, value: bonus.value });
      }
    }
    return mods;
  }, [state]);

  return {
    owned:          state.owned,
    equipped:       state.equipped,
    equip,
    unequip,
    getEquipped,
    getOwnedForSlot,
    equippedInSlot,
    getStatModifiers,
  };
}
