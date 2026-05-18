/**
 * Cornerstone producers — the Cookie-Clicker-style stackable buildings that
 * convert qi into more qi. Each producer's owned count multiplies a flat
 * qi/sec contribution; the cost of the next purchase scales by `costScaling`
 * to the power of currently-owned units.
 *
 * Shape rationale: each tier is ~10× the previous in both cost and output,
 * giving identical payback time across tiers (no producer becomes obsolete).
 * 1.15× scaling per owned unit gives roughly:
 *   - 10 owned ≈ 4× cumulative cost / 10× cumulative output (sweet spot)
 *   - 25 owned ≈ 32× cumulative cost / 25× cumulative output (saturation)
 *
 * All numbers are STARTING VALUES — validate via scripts/sim-cultivation.js
 * (TODO Phase F) before locking in. Tweak `startCost` / `startQiPerSec` only;
 * `costScaling` must stay at 1.15 to preserve the curve shape used by the
 * upgrades plan.
 *
 * Unlock conditions reference realm INDEX (0-based) in `data/realms.js`.
 *
 * ── Ordering rationale ─────────────────────────────────────────────────────
 * Array order = tier rank = cost slot. Visual weight escalates with tier so
 * the player understands at a glance why each next producer is stronger.
 * Each `desc` explicitly explains why this source of qi outclasses the prior.
 *
 * ── Sprite tiers (Cookie-Clicker-style lanes) ──────────────────────────────
 * Each producer carries a `sprites` array of 4 strings — placeholder emojis
 * for now; you'll replace these with PNG paths once you generate sprite art.
 * Index follows SPRITE_TIERS below: 0=Bronze (1-9 owned), 1=Silver (10-24),
 * 2=Gold (25-99), 3=Mythic (100+). When the player crosses a threshold, all
 * lane sprites swap to the new variant simultaneously. CSS adds tier glow.
 */

/** Ownership thresholds → sprite-tier index + tier name + UI accent. */
export const SPRITE_TIERS = [
  { idx: 0, name: 'bronze', label: 'Bronze',   minOwned: 1   },
  { idx: 1, name: 'silver', label: 'Silver',   minOwned: 10  },
  { idx: 2, name: 'gold',   label: 'Gold',     minOwned: 25  },
  { idx: 3, name: 'mythic', label: 'Mythic',   minOwned: 100 },
];

/** Resolves an owned count to its tier descriptor, or null if 0/locked. */
export function getSpriteTier(owned) {
  if (!owned || owned < 1) return null;
  let resolved = SPRITE_TIERS[0];
  for (const t of SPRITE_TIERS) {
    if (owned >= t.minOwned) resolved = t;
    else break;
  }
  return resolved;
}

const PRODUCERS = [
  {
    id:            'p_disciple',
    name:          'Body Tempering Disciple',
    desc:          'An apprentice kneels in your courtyard, breath even, palms warm. The qi they draw from the air is one thin thread. Every thread strengthens the loom.',
    startCost:     15,
    startQiPerSec: 0.1,
    costScaling:   1.15,
    unlock:        { type: 'always' },
    sprites:       [
      '/sprites/producers/p_disciple_bronze.png',
      '/sprites/producers/p_disciple_silver.png',
      '/sprites/producers/p_disciple_gold.png',
      '/sprites/producers/p_disciple_mythic.png',
    ],
  },
  {
    id:            'p_herb_garden',
    name:          'Spirit Herb Garden',
    desc:          'Jade leaves uncurl in the dawn and quietly drink the heavens dry. What the spirit herbs cannot use, they offer up to you.',
    startCost:     100,
    startQiPerSec: 1,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 4 },
    sprites:       [
      '/sprites/producers/p_herb_garden_bronze.png',
      '/sprites/producers/p_herb_garden_silver.png',
      '/sprites/producers/p_herb_garden_gold.png',
      '/sprites/producers/p_herb_garden_mythic.png',
    ],
  },
  {
    id:            'p_meridian_furnace',
    name:          'Meridian Furnace',
    desc:          'Bronze legs, sealed lid, a fire that never gutters. Raw qi enters muddy and bitter; what reaches your meridians is denser than gold.',
    startCost:     1100,
    startQiPerSec: 8,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 9 },
    sprites:       [
      '/sprites/producers/p_meridian_furnace_bronze.png',
      '/sprites/producers/p_meridian_furnace_silver.png',
      '/sprites/producers/p_meridian_furnace_gold.png',
      '/sprites/producers/p_meridian_furnace_mythic.png',
    ],
  },
  {
    id:            'p_treasure',
    name:          'Ancestral Treasure',
    desc:          'A jade pendant your ancestors carried for a hundred lifetimes. Every breath they took left a trace, and every trace bleeds back into you now, patient as a tide.',
    startCost:     12000,
    startQiPerSec: 47,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 13 },
    sprites:       [
      '/sprites/producers/p_treasure_bronze.png',
      '/sprites/producers/p_treasure_silver.png',
      '/sprites/producers/p_treasure_gold.png',
      '/sprites/producers/p_treasure_mythic.png',
    ],
  },
  {
    id:            'p_beast_pact',
    name:          'Spirit Beast Pact',
    desc:          'You whistle once and they return from places no mortal could walk. Tigers with qi-storms tangled in their fur. Foxes with starlight on their tongues. They bring the harvest to your door.',
    startCost:     130000,
    startQiPerSec: 260,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 17 },
    sprites:       [
      '/sprites/producers/p_beast_pact_bronze.png',
      '/sprites/producers/p_beast_pact_silver.png',
      '/sprites/producers/p_beast_pact_gold.png',
      '/sprites/producers/p_beast_pact_mythic.png',
    ],
  },
  {
    id:            'p_pillar',
    name:          'Heavenly Pillar',
    desc:          'Carved before your grandfather\'s grandfather, the pillar climbs until the clouds forget it began as stone. Through its length, the heavens themselves bleed down into your dantian.',
    startCost:     1400000,
    startQiPerSec: 1400,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 20 },
    sprites:       [
      '/sprites/producers/p_pillar_bronze.png',
      '/sprites/producers/p_pillar_silver.png',
      '/sprites/producers/p_pillar_gold.png',
      '/sprites/producers/p_pillar_mythic.png',
    ],
  },
  {
    id:            'p_sect_followers',
    name:          'Mortal Sect Followers',
    desc:          'Ten thousand disciples wake at dawn and bow toward the hall that bears your sigil. A grain of rice from each becomes a mountain. A breath of qi from each becomes a river.',
    startCost:     20000000,
    startQiPerSec: 7800,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 23 },
    sprites:       [
      '/sprites/producers/p_sect_followers_bronze.png',
      '/sprites/producers/p_sect_followers_silver.png',
      '/sprites/producers/p_sect_followers_gold.png',
      '/sprites/producers/p_sect_followers_mythic.png',
    ],
  },
  {
    id:            'p_void',
    name:          'Void Conduit',
    desc:          'A wound in reality, never closing, never bleeding less. Through it, qi from a world that is not yours pours into a world that is. Another universe is a generous tithe.',
    startCost:     330000000,
    startQiPerSec: 44000,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 29 },
    sprites:       [
      '/sprites/producers/p_void_bronze.png',
      '/sprites/producers/p_void_silver.png',
      '/sprites/producers/p_void_gold.png',
      '/sprites/producers/p_void_mythic.png',
    ],
  },
  {
    id:            'p_dragon',
    name:          'Slumbering Spirit Dragon',
    desc:          'It dreams in your dantian, and one of its dreams is you. The pearl it coils around is older than mountains. Each slow exhalation gilds your meridians with cultivation you never had to earn.',
    startCost:     5100000000,
    startQiPerSec: 260000,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 35 },
    sprites:       [
      '/sprites/producers/p_dragon_bronze.png',
      '/sprites/producers/p_dragon_silver.png',
      '/sprites/producers/p_dragon_gold.png',
      '/sprites/producers/p_dragon_mythic.png',
    ],
  },
  {
    id:            'p_phoenix',
    name:          'Sovereign Phoenix',
    desc:          'The Fenghuang descends only when the cosmos itself agrees. It folds its rainbow wings around your soul. Every feather is a river. Every cry, a sutra older than heaven.',
    startCost:     75000000000,
    startQiPerSec: 1600000,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 44 },
    sprites:       [
      '/sprites/producers/p_phoenix_bronze.png',
      '/sprites/producers/p_phoenix_silver.png',
      '/sprites/producers/p_phoenix_gold.png',
      '/sprites/producers/p_phoenix_mythic.png',
    ],
  },
];

export const PRODUCERS_BY_ID = Object.fromEntries(PRODUCERS.map(p => [p.id, p]));

export default PRODUCERS;
