/**
 * Stat computation engine.
 *
 * Every stat follows a five-layer stacking model:
 *
 *   Final = ((base × (1 + Σ increased_base) + Σ base_flat) + Σ flat)
 *           × (1 + Σ increased) × Π more
 *
 * Unique modifiers (U1–U10) have their own rules and are handled separately
 * in the systems that use them.
 */

export const MOD = {
  INCREASED_BASE: 'increased_base', // % of base value added to base
  BASE_FLAT:      'base_flat',      // flat addition to base
  FLAT:           'flat',           // flat addition after base stage
  INCREASED:      'increased',      // additive %; all sources sum then apply once
  MORE:           'more',           // multiplicative; each source stacks independently
};

const QI_BASE_RATE = 1;   // qi/sec — must match useCultivation BASE_RATE

// Primary-stat layer (Essence / Soul / Body) removed in stage 15 of the
// Damage & Element Overhaul. Placeholder formulas below key off realmIndex
// alone — see obsidian/Primary Stats.md#Placeholder formulas.

/**
 * Apply the stacking formula to a base value.
 * @param {number}    base
 * @param {Array}     modifiers  — [{ type: MOD.*, value: number }, ...]
 */
export function computeStat(base, modifiers = []) {
  let incrBase = 0, baseFlat = 0, flat = 0, incr = 0, more = 1;
  for (const m of modifiers) {
    switch (m.type) {
      case MOD.INCREASED_BASE: incrBase += m.value; break;
      case MOD.BASE_FLAT:      baseFlat += m.value; break;
      case MOD.FLAT:           flat     += m.value; break;
      case MOD.INCREASED:      incr     += m.value; break;
      case MOD.MORE:           more     *= m.value; break;
    }
  }
  return ((base * (1 + incrBase) + baseFlat) + flat) * (1 + incr) * more;
}

/**
 * Derive every stat from the current game snapshot.
 *
 * Primary stats (Essence, Soul, Body) are gone — every derived stat now
 * keys off realmIndex + explicit modifier stacks. See obsidian/Primary
 * Stats.md for the deprecation note.
 *
 * @param {number} qi          — current raw qi (unused for stat derivation; retained for signature stability)
 * @param {object} law         — active law object (used for cultivationSpeedMult only)
 * @param {number} realmIndex  — current realm index
 * @param {object} modifiers   — { [statId]: Modifier[] }
 * @returns {{ meta, combat, activity }}
 */
/** Merge multiple modifier bundles into a single one. */
export function mergeModifiers(...bundles) {
  const merged = {};
  for (const bundle of bundles) {
    if (!bundle) continue;
    for (const [stat, mods] of Object.entries(bundle)) {
      if (!merged[stat]) merged[stat] = [];
      merged[stat].push(...mods);
    }
  }
  return merged;
}

export function computeAllStats(qi, law, realmIndex, modifiers = {}) {
  const mods = (id) => modifiers[id] ?? [];

  const r = Math.max(0, realmIndex ?? 0);

  // ── Combat ─────────────────────────────────────────────────────────────────
  // Placeholder formulas — see obsidian/Primary Stats.md.
  const health        = Math.max(100, Math.floor(computeStat(Math.max(100, r * 200), mods('health'))));
  // Base damage floors (added 2026-04-27): give the player a non-zero baseline
  // before any artefact / law / set contribution so unequipped builds still
  // deal something. Modifier sources still stack normally on top.
  const physDmg       = Math.floor(computeStat(20, mods('physical_damage')));
  const elemDmg       = Math.floor(computeStat(20, mods('elemental_damage')));
  const defense       = Math.floor(computeStat(r * 5,  mods('defense')));
  const elemDef       = Math.floor(computeStat(r * 5,  mods('elemental_defense')));
  const exploitChance = Math.round(computeStat(5,   mods('exploit_chance')));
  const exploitMult   = Math.round(computeStat(150, mods('exploit_attack_mult')));
  // Expose-pipeline stats (added 2026-04-26 secret-tech overhaul).
  // defPen — % of enemy DEF / ELEM_DEF ignored before the PoE-armour mitigation
  //   curve. Stored as 0–1 fraction.
  // incomingDamageReduction — multiplied against incoming enemy hits BEFORE
  //   the armour mitigation step. Stored as 0–1 fraction. Cap at 0.9 to
  //   avoid full negation.
  const defPen                  = Math.max(0, Math.min(1, computeStat(0, mods('defense_penetration'))));
  const incomingDamageReduction = Math.max(0, Math.min(0.9, computeStat(0, mods('incoming_damage_reduction'))));

  // ── Activity ───────────────────────────────────────────────────────────────
  const qiSpeed      = QI_BASE_RATE * (law?.cultivationSpeedMult ?? 1);
  const focusMult    = Math.round(computeStat(300, mods('qi_focus_mult')));
  const harvestSpeed = Math.max(1, Math.floor(computeStat(1, mods('harvest_speed'))));
  const harvestLuck  = Math.floor(computeStat(0, mods('harvest_luck')));
  const miningSpeed  = Math.max(1, Math.floor(computeStat(1, mods('mining_speed'))));
  const miningLuck   = Math.floor(computeStat(0, mods('mining_luck')));

  return {
    meta:     { soulUnlocked: true },  // kept true so legacy UI guards pass
    combat:   { health, physDmg, elemDmg, defense, elemDef, exploitChance, exploitMult, defPen, incomingDamageReduction },
    activity: { qiSpeed, focusMult, harvestSpeed, harvestLuck, miningSpeed, miningLuck },
  };
}
