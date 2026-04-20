import { useState, useEffect, useCallback } from 'react';
import { saveTechniques, loadTechniques, saveOwnedTechniques, loadOwnedTechniques } from '../systems/save';
import { getTechnique, TECHNIQUE_QUALITY } from '../data/techniques';
import { TIER_SLOT_COUNT } from '../data/affixPools';

// Passive pools re-exported from techniqueDrops for use in transmutation
const PASSIVE_POOLS = {
  Attack: [
    { name: 'Penetrating',    description: 'Ignores 15% of enemy DEF.' },
    { name: 'Sharpened',      description: 'Deals 10% bonus damage.' },
    { name: 'Swift Strike',   description: 'Cooldown reduced by 0.5s on hit.' },
    { name: 'Vicious',        description: '20% chance to deal double damage.' },
    { name: 'Focus',          description: '+10% critical hit chance.' },
  ],
  Heal: [
    { name: 'Restorative',    description: 'Heals an additional 5% HP over 3s.' },
    { name: 'Calm Mind',      description: 'Reduces all cooldowns by 5% for 5s.' },
    { name: 'Inner Peace',    description: 'Increases DEF by 10% for 4s after heal.' },
    { name: 'Swift Recovery', description: 'Cooldown reduced by 1s.' },
    { name: 'Overflow',       description: 'Can overheal up to 110% max HP.' },
  ],
  Defend: [
    { name: 'Enduring',         description: 'Duration extended by 1s.' },
    { name: 'Counterforce',     description: '10% of blocked damage returned to attacker.' },
    { name: 'Qi Fortification', description: 'Restores 5% HP when activated.' },
    { name: 'Ironclad',         description: 'Cannot be reduced below 1 HP while active.' },
    { name: 'Hardened',         description: 'DEF bonus increased by 15%.' },
  ],
  Dodge: [
    { name: 'Swift',      description: 'Dodge window extended by 0.5s.' },
    { name: 'Afterimage', description: 'Afterimage distracts enemy for 0.5s.' },
    { name: 'Fleet Foot', description: 'Cooldown reduced by 1s on successful dodge.' },
    { name: 'Phase',      description: 'Next attack after dodge deals ×1.3 dmg.' },
    { name: 'Ghost',      description: 'Dodge chance increased by +10%.' },
  ],
};

function pickRandomPassive(type, excludeNames = []) {
  const pool = (PASSIVE_POOLS[type] ?? []).filter(p => !excludeNames.includes(p.name));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Base slot count is 3; the reincarnation tree node `md_3` (The Fourth
// Form) raises it to 4. Hook accepts an `extraSlots` arg from App.jsx so
// the base value lives here and the augment lives in the tree hook.
const SLOT_COUNT = 3;
export const MAX_SLOT_COUNT = 4;
export const MAX_TECHNIQUES = 100;

export const TECH_NEXT_QUALITY = {
  Iron:   'Bronze',
  Bronze: 'Silver',
  Silver: 'Gold',
  Gold:   'Transcendent',
};

export default function useTechniques({ extraSlots = 0 } = {}) {
  const totalSlots = Math.min(MAX_SLOT_COUNT, SLOT_COUNT + extraSlots);
  const [slots, setSlots] = useState(() => {
    const saved = loadTechniques();
    return Array.from({ length: MAX_SLOT_COUNT }, (_, i) => saved?.[i] ?? null);
  });

  // { [id]: techniqueObj } — all acquired techniques (drops only, no starter seeding)
  const [ownedTechniques, setOwned] = useState(() => {
    return loadOwnedTechniques();
  });

  useEffect(() => {
    saveOwnedTechniques(ownedTechniques);
  }, [ownedTechniques]);

  /** Add a dropped technique to the owned collection. Silently ignored when full. */
  const addOwnedTechnique = useCallback((tech) => {
    setOwned(prev => {
      if (Object.keys(prev).length >= MAX_TECHNIQUES) return prev;
      return { ...prev, [tech.id]: tech };
    });
  }, []);

  /** Look up a technique by id — static catalogue first, then owned drops. */
  const getTechById = useCallback((id) => {
    if (!id) return null;
    return getTechnique(id) ?? ownedTechniques[id] ?? null;
  }, [ownedTechniques]);

  /** Upgrade a technique's quality by one tier. */
  const upgradeTechnique = useCallback((id) => {
    setOwned(prev => {
      const tech = prev[id];
      if (!tech) return prev;
      const next = TECH_NEXT_QUALITY[tech.quality];
      if (!next) return prev;
      return { ...prev, [id]: { ...tech, quality: next } };
    });
  }, []);

  /** Replace one passive at index with a different one from the pool. */
  /** Replace passive at index — exclusion is per-tier only. */
  const replacePassive = useCallback((id, idx) => {
    setOwned(prev => {
      const tech = prev[id];
      if (!tech) return prev;
      const passives    = tech.passives ?? [];
      const oldPassive  = passives[idx];
      if (!oldPassive) return prev;
      const tier = oldPassive.tier ?? 'Iron';
      const excludeNames = passives
        .filter((p, i) => i !== idx && (p.tier ?? 'Iron') === tier)
        .map(p => p.name);
      const newPassive  = pickRandomPassive(tech.type, excludeNames);
      if (!newPassive) return prev;
      const tagged = { ...newPassive, tier };
      const updated = passives.map((p, i) => (i === idx ? tagged : p));
      return { ...prev, [id]: { ...tech, passives: updated } };
    });
  }, []);

  /** Add a passive at a specific tier — exclusion is per-tier only. */
  const addPassive = useCallback((id, tier = 'Iron') => {
    setOwned(prev => {
      const tech = prev[id];
      if (!tech) return prev;
      const passives  = tech.passives ?? [];
      const tierMax   = TIER_SLOT_COUNT[tier] ?? 0;
      const tierCount = passives.filter(p => (p.tier ?? 'Iron') === tier).length;
      if (tierCount >= tierMax) return prev;
      const excludeNames = passives
        .filter(p => (p.tier ?? 'Iron') === tier)
        .map(p => p.name);
      const newPassive   = pickRandomPassive(tech.type, excludeNames);
      if (!newPassive) return prev;
      const tagged = { ...newPassive, tier };
      return { ...prev, [id]: { ...tech, passives: [...passives, tagged] } };
    });
  }, []);

  const equip = useCallback((slotIndex, techniqueId) => {
    setSlots(prev => {
      const next = [...prev];
      if (techniqueId === null) {
        next[slotIndex] = null;
      } else {
        // Remove the same technique from any other slot first
        for (let i = 0; i < next.length; i++) {
          if (i !== slotIndex && next[i] === techniqueId) next[i] = null;
        }
        next[slotIndex] = techniqueId;
      }
      saveTechniques(next);
      return next;
    });
  }, []);

  const unequip = useCallback((slotIndex) => {
    setSlots(prev => {
      const next = [...prev];
      next[slotIndex] = null;
      saveTechniques(next);
      return next;
    });
  }, []);

  /**
   * Dismantle an owned technique. Refuses if it's currently equipped in
   * any slot. Returns the quality on success (so caller can grant the
   * matching mineral) or null if it's locked / missing.
   */
  const dismantleTechnique = useCallback((id) => {
    // Equipped check — can't dismantle while slotted.
    if (slots.includes(id)) return null;
    let quality = null;
    setOwned(prev => {
      const tech = prev[id];
      if (!tech) return prev;
      quality = tech.quality ?? 'Iron';
      const next = { ...prev };
      delete next[id];
      return next;
    });
    return quality;
  }, [slots]);

  // Slice both `slots` and `equippedTechniques` to `totalSlots` so the
  // UI / combat loops that consume them see only the unlocked ones.
  // Underlying state always carries MAX_SLOT_COUNT positions so a player
  // who unlocks the 4th slot mid-life keeps any tech they had stored
  // there (e.g. via debug commands) without losing it.
  const visibleSlots = slots.slice(0, totalSlots);
  return {
    slots: visibleSlots,
    slotCount: totalSlots,
    ownedTechniques,
    upgradeTechnique,
    replacePassive,
    addPassive,
    equippedTechniques: visibleSlots.map(getTechById),
    addOwnedTechnique,
    dismantleTechnique,
    equip,
    unequip,
  };
}
