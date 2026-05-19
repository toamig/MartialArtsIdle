/**
 * Map a cultivation upgrade to its icon path.
 *
 * Hybrid strategy:
 *   - producer_double  → reuse the producer's own sprite (bronze for tier I,
 *                        silver for tier II). No new art needed.
 *   - mechanic_tier    → per-mechanic icon (all 4 tiers of one mechanic share
 *                        the same icon; the Roman numeral in the name carries
 *                        the tier signal).
 *   - everything else  → one icon per category.
 *
 * Missing icons fall back to `ui/upgrade_default.png` (a transparent
 * placeholder), so the layout never breaks while art is still being
 * generated.
 */

const BASE = import.meta.env.BASE_URL ?? '/';

const CATEGORY_ICON = {
  crystal_tap: 'ui/upgrade_crystal_tap.png',
  focus_mult:  'ui/upgrade_focus.png',
};

export function upgradeIconSrc(upgrade) {
  if (upgrade.category === 'producer_double') {
    // Producer ids already carry the `p_` prefix (e.g. `p_disciple`), matching
    // the sprite filename convention `p_<id>_<tier>.png` in public/sprites/producers/.
    const producerId = upgrade.effect.producerId;
    const tier = upgrade.id.endsWith('_double_2') ? 'silver' : 'bronze';
    return `${BASE}sprites/producers/${producerId}_${tier}.png`;
  }
  if (upgrade.category === 'mechanic_tier') {
    const mechanicId = upgrade.id.replace(/^u_/, '').replace(/_t\d+$/, '');
    return `${BASE}ui/upgrade_${mechanicId}.png`;
  }
  return `${BASE}${CATEGORY_ICON[upgrade.category] ?? 'ui/upgrade_default.png'}`;
}
