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
const SAINT_INDEX  = 24;  // realm index at which Soul unlocks

// Baseline primary stats the player starts with (before any modifier sources).
// Keeps level-1 combat survivable: HP 120, basic atk 10, def 10.
// Tune here to rebalance the starting power level.
const BASE_ESSENCE = 20;
const BASE_BODY    = 20;

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
 * Primary stats (Essence, Soul, Body) start at 0 and are built up entirely
 * through modifier sources — pills, artefacts, Law passives, reincarnation.
 * They are NOT derived from Qi; Qi is a separate resource used exclusively
 * for realm breakthroughs. (See obsidian/Primary Stats.md.)
 *
 * @param {number} qi          — current raw qi (unused for stat derivation; retained for signature stability)
 * @param {object} law         — active law object (used for cultivationSpeedMult only)
 * @param {number} realmIndex  — current realm index
 * @param {object} modifiers   — { [statId]: Modifier[] }
 *                               Empty until items/laws grant modifiers.
 * @returns {{ meta, primary, combat, activity }}
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
  // Sugar: `all_primary_stats` flows into each of essence/body/soul. Done
  // here (not at the modifier merge layer) so artefact / pill / unique
  // sources all benefit equally without needing to know about the alias.
  const allPrimary = modifiers.all_primary_stats ?? [];
  const mods = (id) => {
    if (id === 'essence' || id === 'body' || id === 'soul') {
      return [...(modifiers[id] ?? []), ...allPrimary];
    }
    return modifiers[id] ?? [];
  };
  const soulUnlocked = realmIndex >= SAINT_INDEX;

  // ── Primary ────────────────────────────────────────────────────────────────
  // Starts at a small non-zero baseline (BASE_ESSENCE / BASE_BODY) so combat
  // is survivable from turn 0. Soul stays locked at 0 until Saint realm.
  // All further growth comes from modifier stacks (pills, artefacts, etc.).
  const essence = Math.floor(computeStat(BASE_ESSENCE, mods('essence')));
  const soul    = soulUnlocked
    ? Math.floor(computeStat(0, mods('soul')))
    : 0;
  const body    = Math.floor(computeStat(BASE_BODY, mods('body')));

  // ── Combat ─────────────────────────────────────────────────────────────────
  const health      = Math.max(100, Math.floor(computeStat((essence + body) * 12 + soul * 4, mods('health'))));
  const physDmg     = Math.floor(computeStat(0,             mods('physical_damage')));
  const elemDmg     = Math.floor(computeStat(0,             mods('elemental_damage')));
  const psychDmg    = Math.floor(computeStat(0,             mods('psychic_damage')));
  const defense     = Math.floor(computeStat(body, mods('defense')));
  const elemDef     = Math.floor(computeStat(essence,        mods('elemental_defense')));
  const soulTough   = Math.floor(computeStat(soul,           mods('soul_toughness')));
  const exploitChance  = Math.round(computeStat(0,   mods('exploit_chance')));   // 0–100
  const exploitMult    = Math.round(computeStat(150, mods('exploit_attack_mult'))); // %

  // ── Activity ───────────────────────────────────────────────────────────────
  const qiSpeed      = QI_BASE_RATE * (law?.cultivationSpeedMult ?? 1); // qi/sec base
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
