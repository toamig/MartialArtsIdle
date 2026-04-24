/**
 * artefactSets.js — authoritative set catalogue.
 *
 * 15 sets: 3 per element. Every artefact drops with a `setId` constrained
 * to its rolled element (see obsidian/Artefact Sets.md). Transcendent
 * artefacts get a 3% chance to carry a *second* setId from a different
 * element — the engine treats them as contributing to both sets.
 *
 * Bonus content is intentionally placeholder during the overhaul.
 * `twoPiece` / `fourPiece` hold a short descriptor the UI can render; the
 * stat-engine integration ships in a later stage.
 */

import { ELEMENTS } from './elements';

const SET_NAMES = {
  fire:  ['Ember Legacy',   'Phoenix Coterie',  'Sunforge Compact'],
  water: ['Tidebound Rite', 'Frost Mirror',     'Abyssal Pact'],
  earth: ['Stoneblood Oath','Mountain Chapel',  'Dune Wanderers'],
  wood:  ['Verdant Accord', 'Root Conclave',    'Bloomward'],
  metal: ['Iron Bastion',   'Razor Hierarchy',  'Sovereign Plate'],
};

function buildCatalogue() {
  const out = {};
  for (const el of ELEMENTS) {
    for (let i = 0; i < 3; i++) {
      const id = `set_${el}_${i + 1}`;
      out[id] = {
        id,
        element: el,
        name:      SET_NAMES[el][i],
        twoPiece:  { description: `${SET_NAMES[el][i]} — 2-piece bonus (placeholder)`, effect: null },
        fourPiece: { description: `${SET_NAMES[el][i]} — 4-piece bonus (placeholder)`, effect: null },
      };
    }
  }
  return out;
}

export const ARTEFACT_SETS = buildCatalogue();

export const SETS_BY_ELEMENT = (() => {
  const out = {};
  for (const set of Object.values(ARTEFACT_SETS)) {
    (out[set.element] ??= []).push(set.id);
  }
  return out;
})();

/** Chance that a Transcendent artefact carries a *second* setId from another element. */
export const TRANSCENDENT_DUAL_SET_CHANCE = 0.03;

/**
 * Roll element + setIds for a dropping artefact.
 * Transcendent rarity has a 3% chance to carry a second setId from a
 * different element; all other rarities carry exactly one.
 *
 * @param {string} rarity
 * @returns {{ element: string, setIds: string[] }}
 */
export function rollElementAndSet(rarity) {
  const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
  const pool    = SETS_BY_ELEMENT[element];
  const setIds  = [pool[Math.floor(Math.random() * pool.length)]];

  if (rarity === 'Transcendent' && Math.random() < TRANSCENDENT_DUAL_SET_CHANCE) {
    const otherElements = ELEMENTS.filter(e => e !== element);
    const otherEl       = otherElements[Math.floor(Math.random() * otherElements.length)];
    const otherPool     = SETS_BY_ELEMENT[otherEl];
    setIds.push(otherPool[Math.floor(Math.random() * otherPool.length)]);
  }

  return { element, setIds };
}

/**
 * Count equipped pieces per setId. Dual-set Transcendent artefacts
 * contribute to *every* setId they carry.
 *
 * @param {object} equipped  — { slot: uid, ... } mapping (or array of instances)
 * @param {object[]} owned   — list of artefact instances
 * @returns {Record<string, number>}
 */
export function countEquippedSets(equipped, owned) {
  const byUid = Object.fromEntries(owned.map(a => [a.uid, a]));
  const uids  = Array.isArray(equipped)
    ? equipped.filter(Boolean)
    : Object.values(equipped ?? {}).filter(Boolean);
  const counts = {};
  for (const uid of uids) {
    const inst = byUid[uid];
    if (!inst) continue;
    const ids = inst.setIds ?? (inst.setId ? [inst.setId] : []);
    for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}
