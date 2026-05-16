/**
 * Build-time feature flags. Flip these in source and rebuild to enable or
 * disable a major surface. Consumed by `featureGates.js` (case 'flag') and by
 * `App.jsx` (null-guards screen routes + suppresses law selection modal).
 *
 * Combat ships in a future update. Until it does, every system entangled with
 * combat (gear builder, artefacts, materials, enemies, gathering, mining,
 * alchemy, law selection cards) stays HIDDEN but COMPILABLE. Save keys on
 * disk are preserved — when these flags flip true in v2 and the player
 * relaunches, their inventory / laws / etc. reappear without migration.
 *
 * One central object — do NOT introduce per-feature ad-hoc flags elsewhere.
 */
export const FEATURES = Object.freeze({
  // Hides every combat-adjacent tab and screen:
  //   worlds, character, collection, production, combat-arena, gathering, mining, alchemy.
  combat: false,

  // Hides pill drawer, materials/artefacts/gear UI. Currently coupled to
  // `combat`; split into its own flag in case we want one without the other.
  inventory: false,

  // Hides law selection cards on major realm transitions. The underlying
  // `useLawOffers` hook keeps queueing pending offers in localStorage so that
  // when this flips true in v2 the player picks up where they left off.
  laws: false,
});

/** Convenience predicate — for call sites that prefer a function over `FEATURES.foo`. */
export function featureEnabled(flag) {
  return !!FEATURES[flag];
}
