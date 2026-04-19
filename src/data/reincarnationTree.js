/**
 * Reincarnation — Eternal Tree definitions.
 *
 * 5 branches radiating from the root, each with sequential nodes.
 * The Yin Yang branch is sealed until 2 keystones (★) are purchased.
 * Cross-branch connector nodes require both adjacent keystones (AND logic).
 *
 * prereqMode:
 *   'or'       — any one prereq satisfies (default, rarely used)
 *   'and'      — every prereq must be satisfied (sequential / cross-branch)
 *   'yyUnlock' — special: requires ≥ 2 of the 4 main keystones
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

export const NODES = [

  // ── Ancestor's Legacy (135°) ──────────────────────────────────────────────
  {
    id: 'al_1', branch: 'legacy', step: 0,
    label: 'Inherited Meridians', icon: '🏛',
    desc: '+10% cultivation speed permanently.',
    cost: 50, prereqs: [], prereqMode: 'or',
  },
  {
    id: 'al_2', branch: 'legacy', step: 1,
    label: 'Faint Memories', icon: '📜',
    desc: 'Best technique from previous life auto-appears as a guaranteed World 1 drop within first 30 fights.',
    cost: 75, prereqs: ['al_1'], prereqMode: 'and',
  },
  {
    id: 'al_3', branch: 'legacy', step: 2,
    label: 'Bloodline Resonance', icon: '🩸',
    desc: 'Each new life begins at Realm 3 instead of 1.',
    cost: 100, prereqs: ['al_2'], prereqMode: 'and',
  },
  {
    id: 'al_4', branch: 'legacy', step: 3,
    label: "Ancestor's Shelter", icon: '⛩️',
    desc: 'Offline gains cap raised from 8 h → 12 h.',
    cost: 125, prereqs: ['al_3'], prereqMode: 'and',
  },
  {
    id: 'al_k', branch: 'legacy', step: 4,
    label: 'Ancient Roots', icon: '🌿',
    desc: 'Start each life with your previous Law already in your collection — no crafting required.',
    cost: 300, prereqs: ['al_4'], prereqMode: 'and', keystone: true,
  },

  // ── Martial Dao (45°) ────────────────────────────────────────────────────
  {
    id: 'md_1', branch: 'martial', step: 0,
    label: "Veteran's Eye", icon: '👁️',
    desc: 'Dropped techniques arrive one quality tier higher than rolled.',
    cost: 75, prereqs: [], prereqMode: 'or',
  },
  {
    id: 'md_2', branch: 'martial', step: 1,
    label: 'Third Slot Mastery', icon: '⚔️',
    desc: 'Technique slot 3 has −15% cooldown permanently.',
    cost: 100, prereqs: ['md_1'], prereqMode: 'and',
  },
  {
    id: 'md_3', branch: 'martial', step: 2,
    label: 'Combat Instinct', icon: '🎯',
    desc: '+3% exploit chance permanently.',
    cost: 125, prereqs: ['md_2'], prereqMode: 'and',
  },
  {
    id: 'md_4', branch: 'martial', step: 3,
    label: 'The Fourth Form', icon: '🔮',
    desc: 'Unlocks a 4th technique slot.',
    cost: 250, prereqs: ['md_3'], prereqMode: 'and',
  },
  {
    id: 'md_k', branch: 'martial', step: 4,
    label: "Heaven's Bladework", icon: '⚡',
    desc: 'Once per life your highest-quality technique auto-upgrades one rarity tier at the midpoint realm of its tier.',
    cost: 400, prereqs: ['md_4'], prereqMode: 'and', keystone: true,
  },

  // ── Fate's Path (320°) ───────────────────────────────────────────────────
  {
    id: 'fp_1', branch: 'fate', step: 0,
    label: 'Lucky Star', icon: '⭐',
    desc: '+1% technique drop rate on all enemies.',
    cost: 50, prereqs: [], prereqMode: 'or',
  },
  {
    id: 'fp_2', branch: 'fate', step: 1,
    label: 'Heavenly Nose', icon: '🌺',
    desc: '10% chance for any gathered or mined material to be one rarity tier higher.',
    cost: 75, prereqs: ['fp_1'], prereqMode: 'and',
  },
  {
    id: 'fp_3', branch: 'fate', step: 2,
    label: 'Destiny Read', icon: '🔭',
    desc: 'Once per life, preview one of your next three Selection options before the breakthrough.',
    cost: 150, prereqs: ['fp_2'], prereqMode: 'and',
  },
  {
    id: 'fp_4', branch: 'fate', step: 3,
    label: "Collector's Eye", icon: '💎',
    desc: 'Duplicate techniques convert to quality upgrades for your existing copy instead of being discarded.',
    cost: 200, prereqs: ['fp_3'], prereqMode: 'and',
  },
  {
    id: 'fp_k', branch: 'fate', step: 4,
    label: "Fortune's Thread", icon: '🌟',
    desc: 'First technique drop in each world is guaranteed to be the highest quality tier available in that world.',
    cost: 350, prereqs: ['fp_4'], prereqMode: 'and', keystone: true,
  },

  // ── Heavenly Will (220°) ─────────────────────────────────────────────────
  {
    id: 'hw_1', branch: 'will', step: 0,
    label: 'Soul Tempering', icon: '💪',
    desc: '+5% Cultivation Power permanently (purchasable up to 5×).',
    cost: 100, prereqs: [], prereqMode: 'or',
  },
  {
    id: 'hw_2', branch: 'will', step: 1,
    label: 'Iron Will', icon: '🛡️',
    desc: '+10% max HP permanently.',
    cost: 100, prereqs: ['hw_1'], prereqMode: 'and',
  },
  {
    id: 'hw_3', branch: 'will', step: 2,
    label: 'Undying Resolve', icon: '❤️',
    desc: 'Once per fight, surviving a lethal hit leaves you at 1 HP instead of dying.',
    cost: 175, prereqs: ['hw_2'], prereqMode: 'and',
  },
  {
    id: 'hw_4', branch: 'will', step: 3,
    label: 'Exploit Refinement', icon: '🗡️',
    desc: '+10% exploit multiplier permanently.',
    cost: 150, prereqs: ['hw_3'], prereqMode: 'and',
  },
  {
    id: 'hw_k', branch: 'will', step: 4,
    label: 'Heavenly Constitution', icon: '🌌',
    desc: 'Cultivation Power growth curve permanently steepened — each realm breakthrough yields more Power.',
    cost: 500, prereqs: ['hw_4'], prereqMode: 'and', keystone: true,
  },

  // ── Yin Yang — Sealed (270°) ─────────────────────────────────────────────
  // yy_1 unlocks when ≥ 2 of the 4 main keystones are purchased.
  {
    id: 'yy_1', branch: 'yinyang', step: 0,
    label: 'Taiji Manual', icon: '☯️',
    desc: 'The Yin Yang law is added to your collection permanently. Combat alternates between Yin phase (−20% dmg taken, DoT) and Yang phase (+30% dmg, ×2 exploit chance) every 10 s.',
    cost: 400, prereqs: [], prereqMode: 'yyUnlock',
  },
  {
    id: 'yy_2', branch: 'yinyang', step: 1,
    label: 'Deepen the Yin', icon: '🌙',
    desc: 'Yin phase also regenerates +3% HP per second.',
    cost: 300, prereqs: ['yy_1'], prereqMode: 'and',
  },
  {
    id: 'yy_3', branch: 'yinyang', step: 2,
    label: 'Sharpen the Yang', icon: '☀️',
    desc: 'Yang phase exploit procs deal ×2.5 instead of ×1.5.',
    cost: 300, prereqs: ['yy_2'], prereqMode: 'and',
  },
  {
    id: 'yy_4', branch: 'yinyang', step: 3,
    label: 'Harmony Scroll', icon: '📿',
    desc: 'Unlocks Taiji Strike — a unique technique. Passive: 15% of Yang phase damage converts to healing in the next Yin phase.',
    cost: 350, prereqs: ['yy_3'], prereqMode: 'and',
  },
  {
    id: 'yy_5', branch: 'yinyang', step: 4,
    label: 'Phase Mastery', icon: '🔄',
    desc: 'Burst during Yang = max damage; Burst during Yin = 5 s full damage immunity.',
    cost: 400, prereqs: ['yy_4'], prereqMode: 'and',
  },
  {
    id: 'yy_k', branch: 'yinyang', step: 5,
    label: 'Primordial Balance', icon: '⚖️',
    desc: 'Taiji Manual permanently ascends to Transcendent rarity and gains a 6th passive slot: killing blow during Yang does not trigger phase switch.',
    cost: 800, prereqs: ['yy_5'], prereqMode: 'and', keystone: true,
  },

  // ── Cross-Branch Connectors ──────────────────────────────────────────────
  {
    id: 'cb_is', branch: 'cross', step: 0,
    label: 'Inherited Strength', icon: '🔗',
    desc: "Ancestor's Legacy cultivation speed bonus also scales the Heavenly Constitution power curve.",
    cost: 150, prereqs: ['al_k', 'hw_1'], prereqMode: 'and',
  },
  {
    id: 'cb_ts', branch: 'cross', step: 0,
    label: 'Technique Savant', icon: '🔗',
    desc: "Fortune's Thread's guaranteed world drop also triggers a 2nd technique drop from the same fight.",
    cost: 200, prereqs: ['md_k', 'fp_k'], prereqMode: 'and',
  },
  {
    id: 'cb_pt', branch: 'cross', step: 0,
    label: 'Phase Technique', icon: '🔗',
    desc: '4th technique slot can be designated Yin-only or Yang-only — fires exclusively during its phase.',
    cost: 300, prereqs: ['md_k', 'yy_5'], prereqMode: 'and',
  },
];

export const NODES_BY_ID     = Object.fromEntries(NODES.map(n => [n.id, n]));
export const TREE_TOTAL_COST = NODES.reduce((s, n) => s + n.cost, 0);

// The 4 main branch keystones — Yin Yang branch unlocks when ≥ 2 are owned.
export const MAIN_KEYSTONES = ['al_k', 'md_k', 'fp_k', 'hw_k'];
