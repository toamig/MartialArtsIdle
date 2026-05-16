/**
 * Round 3 — Crystal Discovery.
 *
 * Each crystal visual tier (2..10) can grant a mechanic-tier T1 spark when
 * the crystal evolves into it. `useQiCrystal` returns `{previousTier, newTier}`
 * on every level-up loop; HomeScreen.handleCrystalEvolve walks every tier
 * crossed and calls `qiSparks.grant(sparkId)` for each entry below.
 *
 * Discovery order (interaction cost climbs with tier):
 *   T2 → Crystal Reservoir   (tap the crystal — natural extension of the existing tap loop)
 *   T3 → Consecutive Focus   (hold-to-cultivate gains a stepped ladder — no new screen surface)
 *   T4 → Divine Qi           (first active distraction — orb taps in the scene)
 *   T5 → Pattern Click       (most attention-heavy — dot sequencing mini-game)
 *   T6+ → reserved for v2 mechanics; absence here means no grant on those evolutions.
 *
 * `qiSparks.grant` is idempotent for mechanics — running this on every tier
 * evolution is safe; mechanics already owned at an equal-or-higher tier are
 * skipped.
 */
export const CRYSTAL_TIER_GRANTS = {
  2: 'crystal_click_t1',
  3: 'consecutive_focus_t1',
  4: 'divine_qi_t1',
  5: 'pattern_click_t1',
};

/**
 * Walk every tier crossed in a single evolution event and return the ordered
 * list of spark ids to grant. Empty if no thresholds were crossed.
 *
 * Example: previousTier=1, newTier=4 → ['crystal_click_t1','consecutive_focus_t1','divine_qi_t1'].
 */
export function sparksToGrantOnEvolution(previousTier, newTier) {
  const out = [];
  for (let t = Math.max(2, (previousTier ?? 0) + 1); t <= (newTier ?? 0); t++) {
    const sparkId = CRYSTAL_TIER_GRANTS[t];
    if (sparkId) out.push(sparkId);
  }
  return out;
}
