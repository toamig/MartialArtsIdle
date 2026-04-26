/**
 * artefactSets.js — authoritative set catalogue with full bonus content.
 *
 * 15 sets: 3 per element. Every artefact drops with a `setId` constrained
 * to its rolled element. Transcendent artefacts get a 3% chance to carry a
 * *second* setId from a different element — the engine treats them as
 * contributing to both sets.
 *
 * 2026-04-27: schema upgraded from single-effect to multi-effect bonuses
 * mirroring the law-uniques shape. Each `twoPiece` / `fourPiece` carries an
 * `effects: [{ kind, ... }]` list. Supported kinds:
 *   - 'stat'    → { stat, mod, value }                pushed to statMods
 *   - 'flag'    → { flag, value }                     pushed to setFlags
 *   - 'trigger' → { event, action }                   pushed to setTriggers
 *   - 'cd_mult' → { techType, mult }                  pushed to cdTypeMults
 *
 * The combat loop reads setFlags / setTriggers / cdTypeMults via the App.jsx
 * stats bundle (alongside the parallel law-side payloads).
 */

import { ELEMENTS } from './elements';
import { MOD } from './stats';

const SET_NAMES = {
  fire:  ['Ember Legacy',     'Phoenix Coterie',    'Sunforge Compact'],
  water: ['Tidebound Rite',   'Frost Mirror',       'Abyssal Pact'],
  earth: ['Stoneblood Oath',  'Mountain Chapel',    'Dune Wanderers'],
  wood:  ['Verdant Accord',   'Root Conclave',      'Bloomward'],
  metal: ['Iron Bastion',     'Razor Hierarchy',    'Sovereign Plate'],
};

// ─── 30 hand-authored bonuses ────────────────────────────────────────────────
// Convention: 2-piece is a stat bonus or single small effect; 4-piece is the
// signature mechanic that defines the set's identity.

const SET_BONUSES = {
  // ── FIRE ────────────────────────────────────────────────────────────────────
  set_fire_1: {
    twoPiece: {
      description: '20% more damage',
      effects: [{ kind: 'stat', stat: 'damage_all', mod: MOD.MORE, value: 1.20 }],
    },
    fourPiece: {
      description: '10% more damage for each artefact that matches the law',
      // Combat reads setFlags.damagePerLawMatchingArtefactPct as raw %.
      effects: [{ kind: 'flag', flag: 'damagePerLawMatchingArtefactPct', value: 10 }],
    },
  },
  set_fire_2: {
    twoPiece: {
      description: '100% increased elemental damage',
      effects: [{ kind: 'stat', stat: 'elemental_damage', mod: MOD.INCREASED, value: 1.00 }],
    },
    fourPiece: {
      description: 'Secret techniques trigger twice',
      effects: [{ kind: 'flag', flag: 'doubleSecretTechs', value: true }],
    },
  },
  set_fire_3: {
    twoPiece: {
      description: '2% of damage is healed as life',
      effects: [{ kind: 'stat', stat: 'lifesteal', mod: MOD.FLAT, value: 2 }],
    },
    fourPiece: {
      description: '8% of damage is healed as life. Cannot heal from other sources',
      effects: [
        { kind: 'stat', stat: 'lifesteal', mod: MOD.FLAT, value: 6 }, // 2 + 6 = 8 stacked with 2-piece
        { kind: 'flag', flag: 'cannotHeal', value: true },
      ],
    },
  },

  // ── WATER ───────────────────────────────────────────────────────────────────
  set_water_1: {
    twoPiece: {
      description: '20% increased healing effectiveness',
      effects: [{ kind: 'stat', stat: 'healing_received', mod: MOD.INCREASED, value: 0.20 }],
    },
    fourPiece: {
      description: 'Heal techniques only trigger when below 70% health. 60% increased healing effectiveness if below 50% health',
      effects: [
        { kind: 'flag', flag: 'healAt70Pct', value: true },
        { kind: 'stat', stat: 'healing_received', mod: MOD.INCREASED, value: 0.60,
          condition: { type: 'hp_below_pct', value: 50 } },
      ],
    },
  },
  set_water_2: {
    twoPiece: {
      description: '4% HP/s recovery',
      effects: [{ kind: 'stat', stat: 'hp_regen_in_combat', mod: MOD.FLAT, value: 0.04 }],
    },
    fourPiece: {
      description: '6% HP/s recovery. HP/s recovery is 50% more effective if a healing technique is on cooldown',
      // Stacks with 2-piece (4 + 2 = 6%). The "50% more if heal CD active"
      // lives as a flag; combat checks heal-tech cooldown state when applying.
      effects: [
        { kind: 'stat', stat: 'hp_regen_in_combat', mod: MOD.FLAT, value: 0.02 },
        { kind: 'flag', flag: 'hpRegenMoreIfHealCdActive', value: 0.50 },
      ],
    },
  },
  set_water_3: {
    twoPiece: {
      description: 'Damage enemies by 20% of healing received',
      effects: [{
        kind: 'trigger', event: 'on_heal',
        action: { type: 'damage_enemy_pct_of_payload', value: 0.20 },
      }],
    },
    fourPiece: {
      description: 'Damage enemies by 50% of healing received. Cannot use attack secret techniques',
      effects: [
        // Bumps from 20 → 50 by adding another 30% on top.
        { kind: 'trigger', event: 'on_heal',
          action: { type: 'damage_enemy_pct_of_payload', value: 0.30 } },
        { kind: 'flag', flag: 'cannotUseAttackSecrets', value: true },
      ],
    },
  },

  // ── EARTH ───────────────────────────────────────────────────────────────────
  set_earth_1: {
    twoPiece: {
      description: '20% more elemental defense',
      effects: [{ kind: 'stat', stat: 'elemental_defense', mod: MOD.MORE, value: 1.20 }],
    },
    fourPiece: {
      description: '50% of elemental defense is converted to defense',
      effects: [{ kind: 'conversion', from: 'elemental_defense', to: 'defense', pct: 50 }],
    },
  },
  set_earth_2: {
    twoPiece: {
      description: '20% more defense',
      effects: [{ kind: 'stat', stat: 'defense', mod: MOD.MORE, value: 1.20 }],
    },
    fourPiece: {
      description: '20% additional damage reduction',
      effects: [{ kind: 'stat', stat: 'incoming_damage_reduction', mod: MOD.FLAT, value: 0.20 }],
    },
  },
  set_earth_3: {
    twoPiece: {
      description: '20% more health',
      effects: [{ kind: 'stat', stat: 'health', mod: MOD.MORE, value: 1.20 }],
    },
    fourPiece: {
      description: 'Heal 30% of mitigated damage on every enemy hit',
      effects: [{ kind: 'flag', flag: 'defenseModsBleedToHealthPct', value: 0.30 }],
    },
  },

  // ── METAL ───────────────────────────────────────────────────────────────────
  set_metal_1: {
    twoPiece: {
      description: '10% exploit chance',
      effects: [{ kind: 'stat', stat: 'exploit_chance', mod: MOD.FLAT, value: 10 }],
    },
    fourPiece: {
      description: '100% increased exploit damage',
      effects: [{ kind: 'stat', stat: 'exploit_attack_mult', mod: MOD.INCREASED, value: 1.00 }],
    },
  },
  set_metal_2: {
    twoPiece: {
      description: 'Expose Techniques have 20% increased effect',
      // Routed through the existing buff_effect stat which Expose already reads.
      effects: [{ kind: 'stat', stat: 'buff_effect', mod: MOD.INCREASED, value: 0.20 }],
    },
    fourPiece: {
      description: 'Expose techniques apply buffs to attack secret techniques as well',
      effects: [{ kind: 'flag', flag: 'exposeBuffsApplyToAttack', value: true }],
    },
  },
  set_metal_3: {
    twoPiece: {
      description: 'Exploit hits ignore 10% of enemy defenses',
      effects: [{ kind: 'flag', flag: 'exploitDefPenPct', value: 0.10 }],
    },
    fourPiece: {
      description: 'Attacks have 30% chance to bypass all defenses',
      effects: [{ kind: 'flag', flag: 'attackBypassDefenseChance', value: 30 }],
    },
  },

  // ── WOOD ────────────────────────────────────────────────────────────────────
  set_wood_1: {
    twoPiece: {
      description: '5% dodge chance',
      effects: [{ kind: 'stat', stat: 'dodge_chance', mod: MOD.FLAT, value: 5 }],
    },
    fourPiece: {
      description: 'Heal 10% HP on successful dodge',
      effects: [{
        kind: 'trigger', event: 'on_dodge_success',
        action: { type: 'heal_pct', value: 0.10 },
      }],
    },
  },
  set_wood_2: {
    twoPiece: {
      description: '5% dodge chance',
      effects: [{ kind: 'stat', stat: 'dodge_chance', mod: MOD.FLAT, value: 5 }],
    },
    fourPiece: {
      description: 'Dodging makes the next attack or secret technique an exploit hit',
      effects: [{ kind: 'flag', flag: 'nextHitExploitOnDodge', value: true }],
    },
  },
  set_wood_3: {
    twoPiece: {
      description: 'Defense and elemental defense are increased by dodge chance',
      effects: [{ kind: 'flag', flag: 'defenseScalesWithDodgeChance', value: true }],
    },
    fourPiece: {
      description: 'Double dodge chance. Take 40% of hit damage on successful dodge',
      effects: [
        { kind: 'stat', stat: 'dodge_chance', mod: MOD.MORE, value: 2.00 },
        { kind: 'flag', flag: 'dodgeTakesPctDamage', value: 0.40 },
      ],
    },
  },
};

// ─── Catalogue construction ─────────────────────────────────────────────────

function buildCatalogue() {
  const out = {};
  for (const el of ELEMENTS) {
    for (let i = 0; i < 3; i++) {
      const id = `set_${el}_${i + 1}`;
      const bonus = SET_BONUSES[id];
      if (!bonus) continue;
      out[id] = {
        id,
        element: el,
        name:      SET_NAMES[el][i],
        twoPiece:  bonus.twoPiece,
        fourPiece: bonus.fourPiece,
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
 * Walk a single bonus's effects list and accumulate into the result bundle.
 * Mirrors the law-engine effect dispatch. `stat` effects with conditions
 * are pre-filtered against `ctx` (so e.g. water-set "60% healing if below
 * 50% HP" only contributes when the player is below the threshold).
 */
function applyBonusEffects(effects, ctx, result) {
  for (const eff of effects ?? []) {
    if (eff.kind === 'stat') {
      if (eff.condition && !evaluateBonusCondition(eff.condition, ctx)) continue;
      (result.statMods[eff.stat] ??= []).push({ type: eff.mod, value: eff.value });
    } else if (eff.kind === 'flag') {
      // Numeric flags accumulate (sum); booleans short-circuit to true.
      if (eff.value === true) {
        result.flags[eff.flag] = true;
      } else if (typeof eff.value === 'number') {
        result.flags[eff.flag] = (result.flags[eff.flag] ?? 0) + eff.value;
      } else {
        result.flags[eff.flag] = eff.value;
      }
    } else if (eff.kind === 'trigger') {
      result.triggers.push({ event: eff.event, action: eff.action });
    } else if (eff.kind === 'cd_mult') {
      const t = eff.techType;
      if (!t) continue;
      result.cdTypeMults[t] = (result.cdTypeMults[t] ?? 1) * (eff.mult ?? 1);
    } else if (eff.kind === 'conversion') {
      result.conversions.push({ from: eff.from, to: eff.to, pct: (eff.pct ?? 0) / 100 });
    }
  }
}

/** Lightweight condition evaluator for set-bonus stat effects. */
function evaluateBonusCondition(cond, ctx) {
  if (!cond || !ctx) return true;
  switch (cond.type) {
    case 'hp_below_pct': return ctx.hpPct !== undefined && ctx.hpPct < cond.value / 100;
    case 'hp_above_pct': return ctx.hpPct !== undefined && ctx.hpPct > cond.value / 100;
    default: return true;
  }
}

/**
 * Aggregate active set-bonus effects from the equipped loadout.
 * Returns a bundle of:
 *   - statMods    : { stat: [{ type, value }] } — folded into computeAllStats
 *   - flags       : { flagName: value }         — combat reads as setFlags
 *   - triggers    : [{ event, action }]         — combat reads as setTriggers
 *   - cdTypeMults : { Heal: 2.0, ... }          — combat applies in startFight
 *   - conversions : [{ from, to, pct }]
 *
 * @param {object|array} equipped  slot→uid map (or array of uids)
 * @param {object[]}     owned     all artefact instances
 * @param {object}       ctx       optional context for conditional effects
 *                                 (currently { hpPct } supported)
 */
export function getSetBonusModifiers(equipped, owned, ctx = {}) {
  const counts = countEquippedSets(equipped, owned);
  const result = { statMods: {}, flags: {}, triggers: [], cdTypeMults: {}, conversions: [] };
  for (const [sid, n] of Object.entries(counts)) {
    const set = ARTEFACT_SETS[sid];
    if (!set) continue;
    if (n >= 2 && set.twoPiece?.effects)  applyBonusEffects(set.twoPiece.effects,  ctx, result);
    if (n >= 4 && set.fourPiece?.effects) applyBonusEffects(set.fourPiece.effects, ctx, result);
  }
  return result;
}

/**
 * Count equipped pieces per setId. Dual-set Transcendent artefacts
 * contribute to *every* setId they carry. The optional `lawSetCountBonus`
 * map (sourced from law-flag `setCountBonus` entries) inflates per-setId
 * counts so a 1-piece player with the matching law triggers the 2-piece.
 *
 * @param {object} equipped         { slot: uid, ... } mapping (or array)
 * @param {object[]} owned          list of artefact instances
 * @param {object} [lawSetCountBonus] { [setId]: amount } — added post-tally
 */
export function countEquippedSets(equipped, owned, lawSetCountBonus = null) {
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
  // Apply law-driven set-counter inflation (e.g. "<Ember Legacy> counts as +1").
  if (lawSetCountBonus) {
    for (const [setId, amount] of Object.entries(lawSetCountBonus)) {
      counts[setId] = (counts[setId] ?? 0) + (amount ?? 0);
    }
  }
  return counts;
}
