import { useState, useEffect, useCallback } from 'react';
import { saveTechniques, loadTechniques, saveOwnedTechniques, loadOwnedTechniques } from '../systems/save';
import { getTechnique, TECHNIQUE_QUALITY } from '../data/techniques';
import { AFFIX_SLOT_COUNT } from '../data/affixPools';

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

const SLOT_COUNT = 3;
export const MAX_TECHNIQUES = 100;

export const TECH_NEXT_QUALITY = {
  Iron:   'Bronze',
  Bronze: 'Silver',
  Silver: 'Gold',
  Gold:   'Transcendent',
};

export default function useTechniques() {
  const [slots, setSlots] = useState(() => {
    const saved = loadTechniques();
    return Array.from({ length: SLOT_COUNT }, (_, i) => saved?.[i] ?? null);
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
  const replacePassive = useCallback((id, idx) => {
    setOwned(prev => {
      const tech = prev[id];
      if (!tech) return prev;
      const passives    = tech.passives ?? [];
      const excludeNames = passives.map(p => p.name).filter((_, i) => i !== idx);
      const newPassive  = pickRandomPassive(tech.type, excludeNames);
      if (!newPassive) return prev;
      const updated = passives.map((p, i) => (i === idx ? newPassive : p));
      return { ...prev, [id]: { ...tech, passives: updated } };
    });
  }, []);

  /** Add a passive to the next empty slot (if quality allows more). */
  const addPassive = useCallback((id) => {
    setOwned(prev => {
      const tech = prev[id];
      if (!tech) return prev;
      const passives = tech.passives ?? [];
      const maxSlots = AFFIX_SLOT_COUNT[tech.quality] ?? 3;
      if (passives.length >= maxSlots) return prev;
      const excludeNames = passives.map(p => p.name);
      const newPassive   = pickRandomPassive(tech.type, excludeNames);
      if (!newPassive) return prev;
      return { ...prev, [id]: { ...tech, passives: [...passives, newPassive] } };
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

  return {
    slots,
    ownedTechniques,
    upgradeTechnique,
    replacePassive,
    addPassive,
    equippedTechniques: slots.map(getTechById),
    addOwnedTechnique,
    equip,
    unequip,
  };
}
