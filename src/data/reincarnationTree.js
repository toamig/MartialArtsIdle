import { mergeRecordArray } from './config/loader';

/**
 * Reincarnation — Eternal Tree definitions.
 *
 * 5 branches radiating from a root, plus 3 cross-branch connectors.
 * The Yin Yang branch is sealed until 2 of the 4 main keystones (★) are bought.
 * The `cb_pt` capstone connector requires all 4 main keystones (every main
 * branch fully cleared).
 *
 * prereqMode:
 *   'or'       — any one prereq satisfies (default, rarely used)
 *   'and'      — every prereq must be satisfied (sequential / cross-branch)
 *   'yyUnlock' — special: requires ≥ 2 of the 4 main keystones
 *
 * Total tree cost = 143 — exactly what one peak life awards. Players reincarnate
 * only when they have reached a higher realm than any previous life (each realm
 * grants karma once via `maxAwarded` tracking). No farming loops.
 */

export const SAINT_UNLOCK_INDEX = 24;
export const PEAK_INDEX         = 50;

// Karma awarded for the breakthrough INTO realm index i (first time only).
export function karmaForReachingIndex(i) {
  if (i <= 0) return 0;
  if (i <= 9)  return 1;
  if (i <= 13) return 1;
  if (i <= 17) return 1;
  if (i <= 20) return 2;
  if (i <= 23) return 2;
  if (i <= 26) return 2;
  if (i <= 29) return 3;
  if (i <= 32) return 3;
  if (i <= 35) return 4;
  if (i <= 38) return 4;
  if (i <= 41) return 5;
  if (i <= 44) return 5;
  return 6;
}

export function totalKarmaForPeak(maxIndex) {
  let total = 0;
  for (let i = 1; i <= maxIndex; i++) total += karmaForReachingIndex(i);
  return total;
}

// Branch metadata for colours and labels
export const BRANCHES = {
  legacy:  { label: "🏛 Ancestor's Legacy", color: '#f5c842', colorRgb: '245,200,66' },
  martial: { label: '⚔ Martial Dao',        color: '#ef4444', colorRgb: '239,68,68'  },
  fate:    { label: "🌟 Fate's Path",        color: '#22d3ee', colorRgb: '34,211,238' },
  will:    { label: '💪 Heavenly Will',      color: '#4ade80', colorRgb: '74,222,128' },
  yinyang: { label: '☯ Yin Yang',            color: '#a855f7', colorRgb: '168,85,247' },
  cross:   { label: 'Cross-Branch',          color: '#94a3b8', colorRgb: '148,163,184' },
};

const NODES_RAW = [

  // ── Ancestor's Legacy ────────────────────────────────────────────────────
  {
    id: 'al_1', branch: 'legacy', step: 0,
    label: 'Inherited Meridians', icon: '🏛',
    desc: '+25% qi/s permanently.',
    cost: 3, prereqs: [], prereqMode: 'or',
  },
  {
    id: 'al_2', branch: 'legacy', step: 1,
    label: 'Echo of Mastery', icon: '📜',
    desc: 'Each new life starts with all crafting and alchemy recipes from your previous life still discovered.',
    cost: 4, prereqs: ['al_1'], prereqMode: 'and',
  },
  {
    id: 'al_3', branch: 'legacy', step: 2,
    label: "Ancestor's Shelter", icon: '⛩️',
    desc: 'Offline gains cap raised from 8 h → 16 h.',
    cost: 5, prereqs: ['al_2'], prereqMode: 'and',
  },
  {
    id: 'al_4', branch: 'legacy', step: 3,
    label: 'Bloodline Vigor', icon: '🩸',
    desc: 'Each new life starts with +50 Blood Lotus and one banked free Selection re-roll.',
    cost: 6, prereqs: ['al_3'], prereqMode: 'and',
  },
  {
    id: 'al_k', branch: 'legacy', step: 4,
    label: 'Living Memory', icon: '🌿',
    desc: 'At the start of every new life, gain a 1-hour ×2 cultivation buff.',
    cost: 7, prereqs: ['al_4'], prereqMode: 'and', keystone: true,
  },

  // ── Martial Dao ──────────────────────────────────────────────────────────
  {
    id: 'md_1', branch: 'martial', step: 0,
    label: 'Steady Hands', icon: '🤲',
    desc: 'All technique cooldowns −10%.',
    cost: 3, prereqs: [], prereqMode: 'or',
  },
  {
    id: 'md_2', branch: 'martial', step: 1,
    label: 'Combat Instinct', icon: '🎯',
    desc: '+20% exploit chance permanently.',
    cost: 4, prereqs: ['md_1'], prereqMode: 'and',
  },
  {
    id: 'md_3', branch: 'martial', step: 2,
    label: 'The Fourth Form', icon: '🔮',
    desc: 'Unlocks a 4th technique slot.',
    cost: 5, prereqs: ['md_2'], prereqMode: 'and',
  },
  {
    id: 'md_4', branch: 'martial', step: 3,
    label: "Veteran's Eye", icon: '👁️',
    desc: 'All crafted techniques arrive one quality tier higher.',
    cost: 6, prereqs: ['md_3'], prereqMode: 'and',
  },
  {
    id: 'md_k', branch: 'martial', step: 4,
    label: 'Killing Stride', icon: '⚡',
    desc: 'After defeating an enemy, your next technique cast is a guaranteed exploit and deals +50% damage.',
    cost: 7, prereqs: ['md_4'], prereqMode: 'and', keystone: true,
  },

  // ── Fate's Path ──────────────────────────────────────────────────────────
  {
    id: 'fp_1', branch: 'fate', step: 0,
    label: 'Lucky Star', icon: '⭐',
    desc: '+10% chance any artefact craft or pill brew rolls one rarity tier higher than its inputs would normally allow.',
    cost: 3, prereqs: [], prereqMode: 'or',
  },
  {
    id: 'fp_2', branch: 'fate', step: 1,
    label: 'Heavenly Nose', icon: '🌺',
    desc: '10% chance any gathered or mined material is +1 rarity.',
    cost: 4, prereqs: ['fp_1'], prereqMode: 'and',
  },
  {
    id: 'fp_3', branch: 'fate', step: 2,
    label: 'Reserved', icon: '💎',
    desc: 'No effect yet — reserved for a future perk.',
    cost: 5, prereqs: ['fp_2'], prereqMode: 'and',
  },
  {
    id: 'fp_4', branch: 'fate', step: 3,
    label: "Sage's Foresight", icon: '🔭',
    desc: 'Selection screens at every major-realm breakthrough show 4 options instead of 3.',
    cost: 6, prereqs: ['fp_3'], prereqMode: 'and',
  },
  {
    id: 'fp_k', branch: 'fate', step: 4,
    label: 'Twofold Path', icon: '🌟',
    desc: 'Auto-Farm can run two zone assignments simultaneously.',
    cost: 7, prereqs: ['fp_4'], prereqMode: 'and', keystone: true,
  },

  // ── Heavenly Will ────────────────────────────────────────────────────────
  {
    id: 'hw_1', branch: 'will', step: 0,
    label: 'Soul Tempering', icon: '💪',
    desc: '+20% to all primary stats (Essence / Body / Soul).',
    cost: 3, prereqs: [], prereqMode: 'or',
  },
  {
    id: 'hw_2', branch: 'will', step: 1,
    label: 'Iron Will', icon: '🛡️',
    desc: '+50% max HP permanently.',
    cost: 4, prereqs: ['hw_1'], prereqMode: 'and',
  },
  {
    id: 'hw_3', branch: 'will', step: 2,
    label: 'Undying Resolve', icon: '❤️',
    desc: 'Once per fight, surviving a lethal hit leaves you at 1 HP instead of dying.',
    cost: 5, prereqs: ['hw_2'], prereqMode: 'and',
  },
  {
    id: 'hw_4', branch: 'will', step: 3,
    label: 'Soul Crucible', icon: '🔥',
    desc: 'All permanent pill stat bonuses are increased by 25%.',
    cost: 6, prereqs: ['hw_3'], prereqMode: 'and',
  },
  {
    id: 'hw_k', branch: 'will', step: 4,
    label: 'Heavenly Constitution', icon: '🌌',
    desc: '+25% MORE all primary stats and +25% MORE max HP (multiplicative on top of every other modifier).',
    cost: 7, prereqs: ['hw_4'], prereqMode: 'and', keystone: true,
  },

  // ── Yin Yang — Sealed (unlocks at ≥ 2 main keystones) ────────────────────
  {
    id: 'yy_1', branch: 'yinyang', step: 0,
    label: 'Wisdom of Lives', icon: '☯️',
    desc: '+5% to all damage and Health per completed life, capped at +50% (10 lives).',
    cost: 4, prereqs: [], prereqMode: 'yyUnlock',
  },
  {
    id: 'yy_2', branch: 'yinyang', step: 1,
    label: 'Yin Reservoir', icon: '🌙',
    desc: 'Every realm starts with 20% of its breakthrough qi cost already accumulated.',
    cost: 5, prereqs: ['yy_1'], prereqMode: 'and',
  },
  {
    id: 'yy_3', branch: 'yinyang', step: 2,
    label: 'Yang Resolve', icon: '☀️',
    desc: 'In combat, regenerate +5% max HP per second while above 50% HP.',
    cost: 5, prereqs: ['yy_2'], prereqMode: 'and',
  },
  {
    id: 'yy_4', branch: 'yinyang', step: 3,
    label: 'Equilibrium', icon: '🔄',
    desc: 'Every 5th technique cast is free (no cooldown applied to that cast).',
    cost: 6, prereqs: ['yy_3'], prereqMode: 'and',
  },
  {
    id: 'yy_k', branch: 'yinyang', step: 4,
    label: 'Primordial Balance', icon: '⚖',
    desc: 'All artefact affix values you own gain a permanent +10% engine-side multiplier.',
    cost: 8, prereqs: ['yy_4'], prereqMode: 'and', keystone: true,
  },

  // ── Cross-Branch Connectors ──────────────────────────────────────────────
  {
    id: 'cb_is', branch: 'cross', step: 0,
    label: 'Inherited Strength', icon: '🔗',
    desc: '+25% basic-attack damage.',
    cost: 4, prereqs: ['al_k', 'hw_1'], prereqMode: 'and',
  },
  {
    id: 'cb_ts', branch: 'cross', step: 0,
    label: "Veteran's Hunt", icon: '🔗',
    desc: 'After defeating 10 enemies in a region, the next gather/mine cycle in that region drops one material at +1 rarity.',
    cost: 5, prereqs: ['md_k', 'fp_k'], prereqMode: 'and',
  },
  {
    id: 'cb_pt', branch: 'cross', step: 0,
    label: 'Phase Technique', icon: '☯',
    desc: 'Grants the Phase Technique law — Transcendent rarity, all 9 types, cannot be unequipped, crafting on it stays at base cost.',
    cost: 6, prereqs: ['al_k', 'md_k', 'fp_k', 'hw_k'], prereqMode: 'and',
  },
];

export const NODES = mergeRecordArray(NODES_RAW, 'reincarnationTree', 'id');
export const NODES_BY_ID     = Object.fromEntries(NODES.map(n => [n.id, n]));
export const TREE_TOTAL_COST = NODES.reduce((s, n) => s + n.cost, 0);

// The 4 main branch keystones — Yin Yang branch unlocks when ≥ 2 are owned.
export const MAIN_KEYSTONES = ['al_k', 'md_k', 'fp_k', 'hw_k'];

// Removed in this redesign — kept here so the migration in useReincarnationTree
// can refund their old cost when an old save still has them purchased.
export const RETIRED_NODE_IDS = ['yy_5', 'cb_pt_legacy'];
