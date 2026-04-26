/**
 * techniqueDrops.js — drop generation for the unique-pool secret-tech catalogue.
 *
 * Quality is rolled per world (same rarity table as materials). Once quality
 * is decided, a uniform-random pick from the matching subset of TECHNIQUES is
 * cloned and tagged with: a fresh drop id (`${baseId}__suffix`) so duplicates
 * stack distinctly in `ownedTechniques`, and a `rank` derived from the world
 * tier (W1=Mortal … W6=Heaven) — the K_TABLE indexes by rank × quality.
 */

import { TECHNIQUES } from './techniques';

// ─── World-tier tables ────────────────────────────────────────────────────────

/** Quality weights per world (index = worldId - 1). Mirrors the DD rarity table. */
export const WORLD_QUALITY_WEIGHTS = [
  { Iron: 60, Bronze: 30, Silver: 9,  Gold: 1,  Transcendent: 0  }, // World 1
  { Iron: 20, Bronze: 40, Silver: 30, Gold: 9,  Transcendent: 1  }, // World 2
  { Iron: 5,  Bronze: 20, Silver: 40, Gold: 30, Transcendent: 5  }, // World 3
  { Iron: 0,  Bronze: 8,  Silver: 28, Gold: 47, Transcendent: 17 }, // World 4
  { Iron: 0,  Bronze: 2,  Silver: 10, Gold: 43, Transcendent: 45 }, // World 5
  { Iron: 0,  Bronze: 0,  Silver: 3,  Gold: 20, Transcendent: 77 }, // World 6
];

/** Rank of dropped techniques per world. */
export const WORLD_RANK = [
  'Mortal', 'Earth', 'Sky', 'Saint', 'Emperor', 'Heaven',
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function weightedPick(weights) {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return Object.keys(weights).at(-1);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Pick a unique technique from the catalogue, tagged for a specific drop.
 *
 * @param {number} worldId  1–6
 * @returns Technique drop instance (catalogue entry clone with a fresh drop
 *          id + world-derived rank). All stats are baked into the catalogue
 *          entry itself — no random rolls beyond which entry was picked.
 */
export function pickTechnique(worldId) {
  const wIdx    = Math.max(0, Math.min(5, worldId - 1));
  const quality = weightedPick(WORLD_QUALITY_WEIGHTS[wIdx]);
  const rank    = WORLD_RANK[wIdx];

  const pool = TECHNIQUES.filter(t => t.quality === quality);
  if (pool.length === 0) return null;
  const base = pick(pool);

  return {
    ...base,
    rank,
    id: `${base.id}__${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
  };
}

// Backcompat alias for callers still using the old name. Same return shape;
// safe to drop once external references are cleaned up.
export const generateTechnique = pickTechnique;
