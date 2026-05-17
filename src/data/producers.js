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
    desc:          'A novice apprentice tempering their body to channel ambient qi to you.',
    startCost:     15,
    startQiPerSec: 0.1,
    costScaling:   1.15,
    unlock:        { type: 'always' },
    // [Bronze, Silver, Gold, Mythic] — same role, escalating presence.
    sprites:       ['🧎', '🥋', '⚔️', '✨'],
  },
  {
    id:            'p_herb_garden',
    name:          'Spirit Herb Garden',
    desc:          'Spirit herbs absorb heavenly qi as they grow; the surplus flows to your dantian.',
    startCost:     100,
    startQiPerSec: 1,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 4 },
    sprites:       ['🌱', '🌿', '🌳', '🎋'],
  },
  {
    id:            'p_meridian_furnace',
    name:          'Meridian Furnace',
    desc:          'A sealed pillar of refining fire that condenses raw qi into purer form.',
    startCost:     1100,
    startQiPerSec: 8,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 9 },
    sprites:       ['🪨', '🔥', '🏭', '💥'],
  },
  {
    id:            'p_sect_followers',
    name:          'Mortal Sect Followers',
    desc:          'Disciples cultivating in your name. A small tithe of their progress reaches you.',
    startCost:     12000,
    startQiPerSec: 47,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 13 },
    sprites:       ['👤', '👥', '🏛️', '👑'],
  },
  {
    id:            'p_beast_pact',
    name:          'Spirit Beast Pact',
    desc:          'Bound spirit beasts hunt rogue qi across the wilds and route it to you.',
    startCost:     130000,
    startQiPerSec: 260,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 17 },
    sprites:       ['🐾', '🐅', '🐲', '🐉'],
  },
  {
    id:            'p_treasure',
    name:          'Ancestral Treasure',
    desc:          'A relic of your bloodline — its slumbering essence radiates qi into your meridians.',
    startCost:     1400000,
    startQiPerSec: 1400,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 20 },
    sprites:       ['🏺', '⛩️', '💎', '🔱'],
  },
  {
    id:            'p_lunar',
    name:          'Lunar Channeling Pavilion',
    desc:          'A moonlight-drinking pavilion that channels celestial qi through your formation.',
    startCost:     20000000,
    startQiPerSec: 7800,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 23 },
    sprites:       ['🌙', '🏯', '🌕', '☯️'],
  },
  {
    id:            'p_pillar',
    name:          'Heavenly Pillar',
    desc:          'An anchor of the Dao — the qi of the heavens pours down through its length.',
    startCost:     330000000,
    startQiPerSec: 44000,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 29 },
    sprites:       ['🗿', '🏛️', '🗽', '⚡'],
  },
  {
    id:            'p_void',
    name:          'Void Conduit',
    desc:          'A bored hole through reality. The void on the other side bleeds qi without end.',
    startCost:     5100000000,
    startQiPerSec: 260000,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 35 },
    sprites:       ['🌑', '🌀', '🌌', '⭐'],
  },
  {
    id:            'p_dao_tree',
    name:          'Dao Tree',
    desc:          'A tree rooted in primordial law. Every leaf is a sutra; every breath is qi.',
    startCost:     75000000000,
    startQiPerSec: 1600000,
    costScaling:   1.15,
    unlock:        { type: 'realm', minRealmIndex: 44 },
    sprites:       ['🌿', '🌳', '🌲', '🌟'],
  },
];

export const PRODUCERS_BY_ID = Object.fromEntries(PRODUCERS.map(p => [p.id, p]));

export default PRODUCERS;
