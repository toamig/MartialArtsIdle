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

// Placeholder 2-piece stat per element — a single increased bonus themed to
// the element's role. All three sets of an element share the same payload
// for now; designer tunes per-set later. 4-piece is a universal +10% MORE
// damage_all to give every set a meaningful power spike while content is
// still pending.
const TWO_PIECE_STAT = {
  fire:  { stat: 'physical_damage',   type: 'increased', value: 0.10 },
  water: { stat: 'elemental_defense', type: 'increased', value: 0.15 },
  earth: { stat: 'defense',           type: 'increased', value: 0.15 },
  wood:  { stat: 'health',            type: 'increased', value: 0.15 },
  metal: { stat: 'elemental_damage',  type: 'increased', value: 0.10 },
};

const FOUR_PIECE_STAT = { stat: 'damage_all', type: 'more', value: 1.10 };

function describeEffect(eff) {
  if (!eff) return '—';
  const pct = eff.value;
  if (eff.type === 'increased') return `+${Math.round(pct * 100)}% increased ${eff.stat.replace(/_/g, ' ')}`;
  if (eff.type === 'more')      return `×${eff.value.toFixed(2)} more ${eff.stat.replace(/_/g, ' ')}`;
  if (eff.type === 'flat')      return `+${eff.value} ${eff.stat.replace(/_/g, ' ')}`;
  return `${eff.stat}: ${eff.value}`;
}

function buildCatalogue() {
  const out = {};
  for (const el of ELEMENTS) {
    const two = TWO_PIECE_STAT[el];
    for (let i = 0; i < 3; i++) {
      const id = `set_${el}_${i + 1}`;
      out[id] = {
        id,
        element: el,
        name:      SET_NAMES[el][i],
        twoPiece:  { description: describeEffect(two), effect: two },
        fourPiece: { description: describeEffect(FOUR_PIECE_STAT), effect: FOUR_PIECE_STAT },
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
 * Aggregate active set-bonus stat modifiers from the equipped loadout.
 * 2+ pieces applies twoPiece.effect; 4+ pieces layers fourPiece.effect on
 * top. Returns a `{ stat: [{ type, value }, ...] }` bundle shaped for
 * mergeModifiers.
 */
export function getSetBonusModifiers(equipped, owned) {
  const counts = countEquippedSets(equipped, owned);
  const mods   = {};
  const push = (eff) => {
    if (!eff) return;
    (mods[eff.stat] ??= []).push({ type: eff.type, value: eff.value });
  };
  for (const [sid, n] of Object.entries(counts)) {
    const set = ARTEFACT_SETS[sid];
    if (!set) continue;
    if (n >= 2) push(set.twoPiece?.effect);
    if (n >= 4) push(set.fourPiece?.effect);
  }
  return mods;
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
