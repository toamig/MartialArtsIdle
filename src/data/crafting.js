/**
 * crafting.js — single source of truth for all crafting, transmutation, and upgrade costs.
 *
 * ── Design contract ───────────────────────────────────────────────────────────
 *  artefact  refine  → minerals only          (physical forging)
 *  technique refine  → mineral + cultivation_2 (combat essence inscribed into scroll)
 *  law       refine  → mineral + cultivation_1 (qi condensate compiled into law)
 *  upgrade   (all)   → current + next mineral  (gateway material from next world tier)
 *  hone/add          → mineralStat ×TRANSMUTE_QTY.hone / .add
 *  replace           → mineralMod  ×TRANSMUTE_QTY.replace
 *
 * ── Dev panel note ────────────────────────────────────────────────────────────
 *  Every exported object here is directly editable config.
 *  A future dev panel should expose SLOT_BRACKETS, TRANSMUTE_QTY, UPGRADE_COSTS,
 *  and REFINE_COSTS as editable fields. No numeric constants are buried in
 *  component code — everything flows from this file.
 *
 * ── Adding a new tier ─────────────────────────────────────────────────────────
 *  1. Add a bracket entry to SLOT_BRACKETS.
 *  2. Add a row to UPGRADE_COSTS (current rarity → next).
 *  3. Add a row to each REFINE_COSTS[type] object.
 *  That's it — UI components derive everything else from these tables.
 */

import { RARITY_TIER } from './affixPools';
import { mergeSingleton } from './config/loader';

// ── Transmutation slot brackets ───────────────────────────────────────────────
// Each bracket defines the affix-slot group for one quality tier.
//   count       — max affix slots in this bracket
//   color       — UI accent colour for this tier
//   mineralStat — used for Hone and Add operations
//   mineralMod  — used for Replace operations

const SLOT_BRACKETS_RAW = [
  { label: 'Iron',         tier: 1, count: 3, color: '#9ca3af', mineralStat: 'iron_mineral_1',         mineralMod: 'iron_mineral_2'         },
  { label: 'Bronze',       tier: 2, count: 2, color: '#cd7f32', mineralStat: 'bronze_mineral_1',       mineralMod: 'bronze_mineral_2'       },
  { label: 'Silver',       tier: 3, count: 2, color: '#c0c0c0', mineralStat: 'silver_mineral_1',       mineralMod: 'silver_mineral_2'       },
  { label: 'Gold',         tier: 4, count: 2, color: '#f5c842', mineralStat: 'gold_mineral_1',         mineralMod: 'gold_mineral_2'         },
  { label: 'Transcendent', tier: 5, count: 2, color: '#c084fc', mineralStat: 'transcendent_mineral_1', mineralMod: 'transcendent_mineral_2' },
];
export const SLOT_BRACKETS = mergeSingleton(SLOT_BRACKETS_RAW, 'crafting', 'SLOT_BRACKETS');

/** Return the active brackets for a given item rarity (all tiers up to and including it). */
export function getActiveBrackets(rarity) {
  const tier = RARITY_TIER[rarity] ?? 1;
  return SLOT_BRACKETS.slice(0, tier);
}

// ── Transmutation operation quantities ───────────────────────────────────────
// Number of minerals consumed per operation type.
// Dev panel: expose and edit these to tune transmutation economy.

const TRANSMUTE_QTY_RAW = {
  hone:    3,  // qty of mineralStat per Hone (randomise value)
  replace: 5,  // qty of mineralMod  per Replace (swap modifier type)
  add:     8,  // qty of mineralStat per Add (fill empty slot)
};
export const TRANSMUTE_QTY = mergeSingleton(TRANSMUTE_QTY_RAW, 'crafting', 'TRANSMUTE_QTY');

/**
 * Build the cost array for a single transmutation operation.
 * @param {string|null} mineralStat  — the tier's mineralStat ID
 * @param {string|null} mineralMod   — the tier's mineralMod ID
 * @param {'hone'|'replace'|'add'} op
 * @returns {{ itemId: string, qty: number }[]}
 */
export function getBracketCost(mineralStat, mineralMod, op) {
  if (op === 'hone')    return [{ itemId: mineralStat, qty: TRANSMUTE_QTY.hone    }];
  if (op === 'replace') return [{ itemId: mineralMod,  qty: TRANSMUTE_QTY.replace }];
  return                       [{ itemId: mineralStat, qty: TRANSMUTE_QTY.add     }];
}

// ── Item upgrade costs ────────────────────────────────────────────────────────
// Cost to upgrade an artefact / technique / law to the next quality tier.
// Key = current rarity. No entry = already at Transcendent (maximum).
//
// Pattern: current-tier mineral (bulk) + next-tier mineral (gateway taste).
// Dev panel: edit qty values to tune upgrade pacing.

const UPGRADE_COSTS_RAW = {
  Iron:   [ { itemId: 'iron_mineral_1',   qty: 10 }, { itemId: 'bronze_mineral_1',        qty: 3 } ],
  Bronze: [ { itemId: 'bronze_mineral_1', qty: 8  }, { itemId: 'silver_mineral_1',        qty: 3 } ],
  Silver: [ { itemId: 'silver_mineral_1', qty: 5  }, { itemId: 'gold_mineral_1',          qty: 3 } ],
  Gold:   [ { itemId: 'gold_mineral_1',   qty: 8  }, { itemId: 'transcendent_mineral_1',  qty: 2 } ],
};
export const UPGRADE_COSTS = mergeSingleton(UPGRADE_COSTS_RAW, 'crafting', 'UPGRADE_COSTS');

// ── Refine costs ──────────────────────────────────────────────────────────────
// Cost to forge a random item of a given rarity.
//
// artefact  → minerals only        (forged from raw ore)
// technique → mineral + cult_2     (combat essence pressed into scroll)
// law       → mineral + cult_1     (qi condensate compiled into law structure)
//
// cultivation_1 materials: Beast Qi Core / Ancient Qi Marrow / Saint Qi Relic / Primal Qi Core
//   → dropped by beasts, frontier creatures, saint-realm undead, primordial entities
//   → consumed to compile Cultivation Laws (qi structural work)
//
// cultivation_2 materials: Corrupted Qi Shard / Immortal Soul Remnant / Void Qi Pearl / Heaven Qi Crystal
//   → dropped by corrupted cultivators, immortal-grade entities, void-touched creatures, heaven entities
//   → consumed to inscribe Secret Techniques (volatile combat essences)
//
// Dev panel: edit qty values or swap itemId references to retarget material sinks.

const REFINE_COSTS_RAW = {
  artefact: {
    Iron:         [ { itemId: 'iron_mineral_1',         qty: 5 } ],
    Bronze:       [ { itemId: 'bronze_mineral_1',       qty: 5 }, { itemId: 'bronze_mineral_2',        qty: 3 } ],
    Silver:       [ { itemId: 'silver_mineral_1',       qty: 5 }, { itemId: 'silver_mineral_2',        qty: 3 } ],
    Gold:         [ { itemId: 'gold_mineral_1',         qty: 5 }, { itemId: 'gold_mineral_2',          qty: 3 } ],
    Transcendent: [ { itemId: 'transcendent_mineral_1', qty: 5 }, { itemId: 'transcendent_mineral_2',  qty: 3 } ],
  },
  technique: {
    Iron:         [ { itemId: 'iron_mineral_1',         qty: 3 }, { itemId: 'iron_cultivation_2',         qty: 5 } ],
    Bronze:       [ { itemId: 'bronze_mineral_1',       qty: 3 }, { itemId: 'bronze_cultivation_2',       qty: 5 } ],
    Silver:       [ { itemId: 'silver_mineral_1',       qty: 3 }, { itemId: 'silver_cultivation_2',       qty: 5 } ],
    Gold:         [ { itemId: 'gold_mineral_1',         qty: 3 }, { itemId: 'gold_cultivation_2',         qty: 3 } ],
    Transcendent: [ { itemId: 'transcendent_mineral_1', qty: 3 }, { itemId: 'transcendent_cultivation_2', qty: 3 } ],
  },
  law: {
    Iron:         [ { itemId: 'iron_mineral_1',         qty: 3 }, { itemId: 'iron_cultivation_1',         qty: 10 } ],
    Bronze:       [ { itemId: 'bronze_mineral_1',       qty: 3 }, { itemId: 'bronze_cultivation_1',       qty: 5  } ],
    Silver:       [ { itemId: 'silver_mineral_1',       qty: 3 }, { itemId: 'silver_cultivation_1',       qty: 5  } ],
    Gold:         [ { itemId: 'gold_mineral_1',         qty: 3 }, { itemId: 'gold_cultivation_1',         qty: 3  } ],
    Transcendent: [ { itemId: 'transcendent_mineral_1', qty: 3 }, { itemId: 'transcendent_cultivation_1', qty: 3  } ],
  },
};
export const REFINE_COSTS = mergeSingleton(REFINE_COSTS_RAW, 'crafting', 'REFINE_COSTS');
