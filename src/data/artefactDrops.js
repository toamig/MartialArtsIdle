/**
 * artefactDrops.js — pick a random catalogue artefact for a combat drop.
 *
 * Rarity is biased by world tier using the same table techniques use, so
 * late-world enemies are more likely to drop Gold/Transcendent gear.
 */

import { ARTEFACTS } from './artefacts';
import { WORLD_QUALITY_WEIGHTS } from './techniqueDrops';

const BY_RARITY = (() => {
  const out = {};
  for (const a of ARTEFACTS) {
    (out[a.rarity] ??= []).push(a.id);
  }
  return out;
})();

function weightedPick(weights) {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return Object.keys(weights).at(-1);
}

/**
 * @param {number} worldId 1–6
 * @returns {string|null} catalogue artefact id, or null if no artefacts exist
 */
export function pickRandomArtefact(worldId) {
  const wIdx    = Math.max(0, Math.min(5, (worldId ?? 1) - 1));
  const weights = WORLD_QUALITY_WEIGHTS[wIdx];
  // Drop weights to 0 for rarities with no catalogue entries.
  const filtered = {};
  for (const [rar, w] of Object.entries(weights)) {
    if ((BY_RARITY[rar]?.length ?? 0) > 0) filtered[rar] = w;
  }
  const rarity = weightedPick(filtered);
  const pool   = rarity ? BY_RARITY[rarity] : null;
  if (!pool?.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
