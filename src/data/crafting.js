/**
 * crafting.js — slot bracket definitions used for displaying tier metadata
 * (name / colour / per-tier slot count).
 *
 * The previous transmutation flow (hone / replace / add / quality upgrade)
 * was removed when artefacts and techniques became drop-only and laws moved
 * to ascension selections. The cost tables (TRANSMUTE_QTY, UPGRADE_COSTS,
 * LAW_UPGRADE_COSTS) and helpers (getBracketCost, getCraftMultiplier,
 * getUpgradeCosts) were deleted with that flow.
 */

import { RARITY_TIER } from './affixPools';
import { mergeSingleton } from './config/loader';

// ── Slot brackets ─────────────────────────────────────────────────────────────
// Each bracket defines the affix-slot group for one quality tier.
//   count       — max affix slots in this bracket
//   color       — UI accent colour for this tier
//   mineralStat — material id paired with this tier (kept on the record so
//                 future systems can reference per-tier minerals)
//   mineralMod  — paired modifier mineral id (same reasoning)

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
