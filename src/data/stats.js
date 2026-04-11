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

const QI_BASE_RATE = 5;   // qi/sec — must match useCultivation BASE_RATE
const SAINT_INDEX  = 24;  // realm index at which Soul unlocks

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
 * @param {number} qi          — current raw qi (floored)
 * @param {object} law         — active law object
 * @param {number} realmIndex  — current realm index
 * @param {object} modifiers   — { [statId]: Modifier[] }
 *                               Empty until items/laws grant modifiers.
 * @returns {{ meta, primary, combat, activity }}
 */
export function computeAllStats(qi, law, realmIndex, modifiers = {}) {
  const mods         = (id) => modifiers[id] ?? [];
  const soulUnlocked = realmIndex >= SAINT_INDEX;

  // ── Primary ────────────────────────────────────────────────────────────────
  const essence = Math.floor(computeStat(qi * law.essenceMult, mods('essence')));
  const soul    = soulUnlocked
    ? Math.floor(computeStat(qi * law.soulMult, mods('soul')))
    : 0;
  const body    = Math.floor(computeStat(qi * law.bodyMult, mods('body')));

  // ── Combat ─────────────────────────────────────────────────────────────────
  const health      = Math.max(100, Math.floor(computeStat((essence + body) * 12 + soul * 4, mods('health'))));
  const physDmg     = Math.floor(computeStat(0,             mods('physical_damage')));
  const elemDmg     = Math.floor(computeStat(0,             mods('elemental_damage')));
  const psychDmg    = Math.floor(computeStat(0,             mods('psychic_damage')));
  const defense     = Math.floor(computeStat(essence + body, mods('defense')));
  const elemDef     = Math.floor(computeStat(essence,        mods('elemental_defense')));
  const soulTough   = Math.floor(computeStat(soul,           mods('soul_toughness')));
  const exploitChance  = Math.round(computeStat(0,   mods('exploit_chance')));   // 0–100
  const exploitMult    = Math.round(computeStat(150, mods('exploit_attack_mult'))); // %

  // ── Activity ───────────────────────────────────────────────────────────────
  const qiSpeed      = QI_BASE_RATE * (law.cultivationSpeedMult ?? 1); // qi/sec base
  const focusMult    = Math.round(computeStat(300, mods('qi_focus_mult')));      // %
  const harvestSpeed = soulUnlocked
    ? Math.max(1, Math.floor(computeStat(Math.floor(soul * 0.1), mods('harvest_speed'))))
    : 0;
  const harvestLuck  = Math.floor(computeStat(0, mods('harvest_luck')));
  const miningSpeed  = Math.max(1, Math.floor(computeStat(Math.floor(body * 0.1), mods('mining_speed'))));
  const miningLuck   = Math.floor(computeStat(0, mods('mining_luck')));

  return {
    meta:     { soulUnlocked },
    primary:  { essence, soul, body },
    combat:   { health, physDmg, elemDmg, psychDmg, defense, elemDef, soulTough, exploitChance, exploitMult },
    activity: { qiSpeed, focusMult, harvestSpeed, harvestLuck, miningSpeed, miningLuck },
  };
}
