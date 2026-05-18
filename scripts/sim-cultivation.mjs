/**
 * sim-cultivation.mjs — single-life pacing simulator.
 *
 * Walks a fresh save through realm 0 → realm 50 (Open Heaven L6) using a
 * greedy "best qi/s per qi spent" buying strategy at every tick. Reports
 * wall-clock time to reach each milestone realm.
 *
 * Models:
 *   - All 10 producers (cost/output/realm-unlock, 1.15× geometric cost)
 *   - Crystal level-up via qi spend (Round 3 — qi-fed)
 *   - 48 shop upgrades (producer doubles, crystal-tap floor, focus mult,
 *     gate reduction, sparks reroll, mechanic_tier) — buys when affordable
 *     if the cost/benefit ratio beats the marginal producer purchase
 *   - Major-realm qi/s gate (0.25% × 0.5^ordinal)
 *
 * Does NOT model:
 *   - Sparks (manual pick-2 RNG)
 *   - Eternal Tree (fresh-life sim — no investments)
 *   - Offline gains (sim is 24/7 online)
 *   - Boost button held intermittently
 *
 * To compensate for the un-modelled multipliers, a single `ACTIVE_MULTIPLIER`
 * (default 2.0×) approximates a typical engaged player's law + boost + sparks
 * contribution. Tune downward for "casual" pacing, upward for "tryhard".
 *
 * Run: `node scripts/sim-cultivation.mjs`
 */

// ── Data: mirror src/data/realms.js (cost = qi to leave the current realm) ──
// REBALANCED 2026-05-17: +12% per realm past Tempered Body. Sim must match
// the new values committed in src/data/realms.js.
const REALMS = [
  // Tempered Body L1-10 (indices 0-9) — unchanged
  50, 100, 175, 300, 500, 850, 1_400, 2_400, 4_000, 6_500,
  // Qi Transformation Early/Middle/Late/Peak (10-13)
  11_000, 22_000, 41_000, 74_000,
  // True Element Early/Middle/Late/Peak (14-17)
  120_000, 225_000, 415_000, 745_000,
  // Separation & Reunion 1st/2nd/3rd (18-20)
  1_300_000, 2_200_000, 3_950_000,
  // Immortal Ascension 1st/2nd/3rd (21-23)
  6_830_000, 12_030_000, 21_440_000,
  // Saint Early/Middle/Late (24-26)
  36_400_000, 64_240_000, 106_400_000,
  // Saint King 1st/2nd/3rd (27-29)
  183_280_000, 311_600_000, 544_000_000,
  // Origin Returning 1st/2nd/3rd (30-32)
  915_200_000, 1_565_200_000, 2_632_000_000,
  // Origin King 1st/2nd/3rd (33-35)
  4_462_000_000, 7_600_000_000, 13_184_000_000,
  // Void King 1st/2nd/3rd (36-38)
  22_048_000_000, 37_060_000_000, 62_720_000_000,
  // Dao Source 1st/2nd/3rd (39-41)
  105_800_000_000, 179_360_000_000, 300_080_000_000,
  // Emperor Realm 1st/2nd/3rd (42-44)
  496_000_000_000, 863_600_000_000, 1_456_000_000_000,
  // Open Heaven L1-L6 (45-50)
  2_447_200_000_000, 4_080_000_000_000, 6_672_000_000_000,
  11_360_000_000_000, 19_140_000_000_000, 32_560_000_000_000,
];

// Major-realm transitions — when the realm NAME changes, not just the stage.
// Hardcoded by index from src/data/realms.js boundaries.
const MAJOR_TRANSITIONS = new Set([
  // Last index in each realm (the breakthrough FROM that index crosses into a new name)
   9, // Tempered Body L10 → Qi Transformation Early
  13, // Qi Transformation Peak → True Element Early
  17, // True Element Peak → Separation & Reunion 1st
  20, // Separation & Reunion 3rd → Immortal Ascension 1st
  23, // Immortal Ascension 3rd → Saint Early
  26, // Saint Late → Saint King 1st
  29, // Saint King 3rd → Origin Returning 1st
  32, // Origin Returning 3rd → Origin King 1st
  35, // Origin King 3rd → Void King 1st
  38, // Void King 3rd → Dao Source 1st
  41, // Dao Source 3rd → Emperor Realm 1st
  44, // Emperor Realm 3rd → Open Heaven L1
]);

const GATE_BASE_PCT = 0.0025;
const GATE_DECAY    = 0.5;

function majorOrdinal(fromIndex) {
  if (!MAJOR_TRANSITIONS.has(fromIndex)) return -1;
  let ord = 0;
  for (const i of MAJOR_TRANSITIONS) if (i < fromIndex) ord++;
  return ord;
}

function requiredRate(fromIndex) {
  const ord = majorOrdinal(fromIndex);
  if (ord < 0) return 0;
  const nextCost = REALMS[fromIndex + 1] ?? 0;
  return nextCost * GATE_BASE_PCT * Math.pow(GATE_DECAY, ord);
}

// ── Data: mirror src/data/producers.js ───────────────────────────────────────
const PRODUCERS = [
  { id: 'p_disciple',          startCost: 15,            startQiPerSec: 0.1,       unlock: 0 },
  { id: 'p_herb_garden',       startCost: 100,           startQiPerSec: 1,         unlock: 4 },
  { id: 'p_meridian_furnace',  startCost: 1_100,         startQiPerSec: 8,         unlock: 9 },
  { id: 'p_treasure',          startCost: 12_000,        startQiPerSec: 47,        unlock: 13 },
  { id: 'p_beast_pact',        startCost: 130_000,       startQiPerSec: 260,       unlock: 17 },
  { id: 'p_pillar',            startCost: 1_400_000,     startQiPerSec: 1_400,     unlock: 20 },
  { id: 'p_sect_followers',    startCost: 20_000_000,    startQiPerSec: 7_800,     unlock: 23 },
  { id: 'p_void',              startCost: 330_000_000,   startQiPerSec: 44_000,    unlock: 29 },
  { id: 'p_dragon',            startCost: 5_100_000_000, startQiPerSec: 260_000,   unlock: 35 },
  { id: 'p_phoenix',           startCost: 75_000_000_000,startQiPerSec: 1_600_000, unlock: 44 },
];
const COST_SCALING = 1.15;

// ── Data: mirror src/data/upgrades.js ────────────────────────────────────────
// Only the upgrades that actually affect the sim's rate-curve are tracked.
// Crystal-tap / sparks-reroll / mechanic-tier upgrades are skipped (out of
// scope for raw qi/s sim).
const PRODUCER_DOUBLE_T1_MULT_COST = 250;  // T1 cost = startCost × 250
const PRODUCER_DOUBLE_T2_MULT_COST = 5;    // T2 cost = T1 × 5
const PRODUCER_DOUBLE_T1_OWNED_REQ = 10;
const PRODUCER_DOUBLE_T2_OWNED_REQ = 25;

const FOCUS_UPGRADES = [
  // Modeled as +X% added to ACTIVE_MULTIPLIER when bought (rough approx).
  { id: 'u_focus_1', cost:           5_000, realm:  9, add: 0.10 }, // 50% focus mult → ~+10% effective rate
  { id: 'u_focus_2', cost:         100_000, realm: 17, add: 0.10 },
  { id: 'u_focus_3', cost:       2_000_000, realm: 29, add: 0.10 },
  { id: 'u_focus_4', cost: 100_000_000_000, realm: 44, add: 0.20 },
];

const GATE_UPGRADES = [
  { id: 'u_gate_1', cost:        50_000, realm: 13, mult: 0.70 },
  { id: 'u_gate_2', cost: 100_000_000, realm: 29, mult: 0.70 },
];

// ── Sim tuning ───────────────────────────────────────────────────────────────
const ACTIVE_MULTIPLIER_BASE = 2.0;  // approximates law (×1.5) × boost average (×~1.3) × sparks (×~1.1)
const TICK_SEC = 1;
const MAX_TICKS = 60 * 60 * 24 * 365; // 1 year safety cap (seconds)

// Crystal cost curve. Original: BASE=25, EXP=1.30.
// Rebalance: exp 2.50 — cost grows fast enough that marginal mult gain
// becomes uneconomical past ~level 500-1000, naturally soft-capping.
const CRYSTAL_BASE = 25;
const CRYSTAL_EXP  = 3.00;
// Crystal MULTIPLIER per level (2026-05-17 rebalance). Total = 1 + lvl × this.
const CRYSTAL_MULT_PER_LEVEL = 0.003;

// Realm-cost multiplier curve. Multiplies the original REALMS array by a
// factor that ramps with realm index — early realms stay brisk, late realms
// stretch out. Identity (all 1.0) = current shipped balance.
// The +12% ramp is BAKED INTO src/data/realms.js. Multiplier sits at 1.0 for
// verification. Re-enable to dry-run further tuning without touching data.
const REALM_COST_MULT = (idx) => 1.0;
const REALMS_TUNED = REALMS.map((c, i) => Math.ceil(c * REALM_COST_MULT(i)));

// ── Simulator ────────────────────────────────────────────────────────────────
function simulate({
  activeMultBase = ACTIVE_MULTIPLIER_BASE,
  realmCosts     = REALMS,
  producers      = PRODUCERS,
  costScaling    = COST_SCALING,
  verbose        = false,
  logMilestones  = true,
} = {}) {
  // Mutable state
  const owned     = producers.map(() => 0);
  const ownedDouble = producers.map(() => 0); // 0 = none, 1 = T1, 2 = T1+T2 (×4)
  const focusBought = new Set();
  const gateBought  = new Set();
  let realmIndex   = 0;
  let qiBalance    = 0;
  let qiEarnedTotal= 0;
  let qiEarnedThis = 0;
  let crystalLevel = 0;
  let crystalRqi   = 0;
  let activeMult   = activeMultBase;
  let gateMult     = 1.0;
  let ticks        = 0;

  const realmReachedAt = []; // index → seconds when reached

  // Helpers
  function productOutput(i) {
    return owned[i] * producers[i].startQiPerSec * (1 + ownedDouble[i] * 1);
    // Each tier doubles. Tier 0 = ×1, tier 1 = ×2, tier 2 = ×4. (×1 + n×1) gives 1,2,3 — wrong.
    // Fix below.
  }
  function producerMult(i) {
    // owned doubles: 0 → ×1, 1 → ×2, 2 → ×4.
    return Math.pow(2, ownedDouble[i]);
  }
  function totalProducerRate() {
    let r = 0;
    for (let i = 0; i < producers.length; i++) {
      if (owned[i] > 0) r += owned[i] * producers[i].startQiPerSec * producerMult(i);
    }
    return r;
  }
  function crystalMult() {
    // 2026-05-17 rebalance — multiplier model. Was flat n*(n+3)/2.
    return 1 + crystalLevel * CRYSTAL_MULT_PER_LEVEL;
  }
  function currentRate() {
    const flat = 1 + totalProducerRate(); // BASE_RATE=1 + producers (crystal is mult, not flat)
    return flat * crystalMult() * activeMult;
  }
  function producerCost(i, n = 1) {
    const o = owned[i];
    const s = costScaling;
    return Math.ceil(
      producers[i].startCost * Math.pow(s, o) * (Math.pow(s, n) - 1) / (s - 1),
    );
  }

  // Crystal cost formula — mirror getRequiredRefinedQi
  function crystalLevelCost(toLevel) {
    if (toLevel < 1) return 0;
    const raw = CRYSTAL_BASE * Math.pow(toLevel, CRYSTAL_EXP);
    const step = Math.pow(10, Math.max(1, Math.floor(Math.log10(raw)) - 1));
    return Math.round(raw / step) * step;
  }

  // Decision: each tick, find the BEST single purchase by qi/s/qi ratio.
  // If nothing affordable, no buy. Returns true on buy, false on skip.
  function tryBuy() {
    let bestRatio = 0;
    let bestAction = null; // { type, ...args, cost, gain }

    // Producer single-buys
    for (let i = 0; i < producers.length; i++) {
      if (realmIndex < producers[i].unlock) continue;
      const cost = producerCost(i, 1);
      if (cost > qiBalance) continue;
      const gain = producers[i].startQiPerSec * producerMult(i) * activeMult;
      const ratio = gain / cost;
      if (ratio > bestRatio) { bestRatio = ratio; bestAction = { type: 'producer', i, cost, gain }; }
    }

    // Crystal level — multiplier model. Gain = (base + producers) × Δmult × activeMult.
    {
      const cost = crystalLevelCost(crystalLevel + 1) - crystalRqi;
      if (cost > 0 && cost <= qiBalance) {
        const flatBase = 1 + totalProducerRate();
        const gain = flatBase * CRYSTAL_MULT_PER_LEVEL * activeMult;
        const ratio = gain / cost;
        if (ratio > bestRatio) { bestRatio = ratio; bestAction = { type: 'crystal', cost, gain }; }
      }
    }

    // Producer-double upgrades (rough, no name list — just by index/tier)
    for (let i = 0; i < producers.length; i++) {
      const cur = ownedDouble[i];
      if (cur >= 2) continue;
      const ownedReq = cur === 0 ? PRODUCER_DOUBLE_T1_OWNED_REQ : PRODUCER_DOUBLE_T2_OWNED_REQ;
      if (owned[i] < ownedReq) continue;
      const t1Cost = Math.ceil(producers[i].startCost * PRODUCER_DOUBLE_T1_MULT_COST);
      const cost = cur === 0 ? t1Cost : Math.ceil(t1Cost * PRODUCER_DOUBLE_T2_MULT_COST);
      if (cost > qiBalance) continue;
      // Gain: current producer output × current multiplier doubled.
      const currentOutput = owned[i] * producers[i].startQiPerSec * producerMult(i);
      const gain = currentOutput * activeMult; // doubles current, so the *gain* equals current
      const ratio = gain / cost;
      if (ratio > bestRatio) { bestRatio = ratio; bestAction = { type: 'producer_double', i, cost, gain }; }
    }

    // Focus upgrades (apply once)
    for (const u of FOCUS_UPGRADES) {
      if (focusBought.has(u.id)) continue;
      if (realmIndex < u.realm) continue;
      if (u.cost > qiBalance) continue;
      const currentRateNow = currentRate();
      const gain = currentRateNow * u.add;
      const ratio = gain / u.cost;
      if (ratio > bestRatio) { bestRatio = ratio; bestAction = { type: 'focus', u, cost: u.cost, gain }; }
    }

    // Gate-reduction upgrades — model as direct cost reduction; only bought
    // when realm is close to a gate.
    for (const u of GATE_UPGRADES) {
      if (gateBought.has(u.id)) continue;
      if (realmIndex < u.realm) continue;
      if (u.cost > qiBalance) continue;
      // No direct qi/s gain. Buy when we hit a gate wall.
      // Skip in greedy for simplicity; will inline-buy at gate.
    }

    if (!bestAction) return false;

    qiBalance -= bestAction.cost;
    if (bestAction.type === 'producer') {
      owned[bestAction.i]++;
    } else if (bestAction.type === 'crystal') {
      crystalRqi += bestAction.cost; // 1:1 cost→rqi
      while (crystalRqi >= crystalLevelCost(crystalLevel + 1)) {
        crystalRqi -= crystalLevelCost(crystalLevel + 1);
        crystalLevel++;
      }
    } else if (bestAction.type === 'producer_double') {
      ownedDouble[bestAction.i]++;
    } else if (bestAction.type === 'focus') {
      focusBought.add(bestAction.u.id);
      activeMult += bestAction.u.add;
    }
    return true;
  }

  // At a major-transition gate, if rate insufficient, optionally buy gate-reduction.
  function tryGateBuy() {
    if (!MAJOR_TRANSITIONS.has(realmIndex)) return false;
    const need = requiredRate(realmIndex) * gateMult;
    if (currentRate() >= need) return false;
    for (const u of GATE_UPGRADES) {
      if (gateBought.has(u.id)) continue;
      if (realmIndex < u.realm) continue;
      if (u.cost > qiBalance) continue;
      qiBalance -= u.cost;
      gateBought.add(u.id);
      gateMult *= u.mult;
      return true;
    }
    return false;
  }

  // Main tick loop
  while (ticks < MAX_TICKS && realmIndex < realmCosts.length - 1) {
    const rate = currentRate();
    const dq = rate * TICK_SEC;
    qiBalance     += dq;
    qiEarnedThis  += dq;
    qiEarnedTotal += dq;

    // Greedy buy — keep buying until nothing affordable this tick
    while (tryBuy()) { /* loop */ }

    // Breakthrough check
    const cost = realmCosts[realmIndex];
    if (qiEarnedThis >= cost) {
      if (MAJOR_TRANSITIONS.has(realmIndex)) {
        const need = requiredRate(realmIndex) * gateMult;
        if (currentRate() < need) {
          // Hold at cost while gating. Try buy a gate-reduction. Else just wait.
          tryGateBuy();
          // If still gated after buy, skip realm advancement.
          if (currentRate() < requiredRate(realmIndex) * gateMult) {
            qiEarnedThis = cost; // cap the meter at 100%
            ticks += TICK_SEC;
            continue;
          }
        }
      }
      // Advance realm
      qiEarnedThis = 0;
      realmIndex++;
      realmReachedAt[realmIndex] = ticks;
      if (logMilestones && verbose) {
        console.log(`  realm ${String(realmIndex).padStart(2)} reached at ${fmtTime(ticks)} | qi/s=${rate.toFixed(0)} | totalQi=${qiEarnedTotal.toExponential(2)}`);
      }
    }

    ticks += TICK_SEC;
  }

  return {
    ticks,
    realmIndex,
    realmReachedAt,
    qiEarnedTotal,
    finalRate: currentRate(),
    ownedProducers: owned,
    ownedDoubles:   ownedDouble,
    crystalLevel,
    focusBought:    [...focusBought],
    gateBought:     [...gateBought],
    activeMult,
  };
}

function fmtTime(seconds) {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(2)}h`;
  return `${(seconds / 86400).toFixed(2)}d`;
}

function fmtQi(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n >= 1e15) return (n / 1e15).toFixed(2) + 'Qa';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return n.toFixed(0);
}

// ── Run ──────────────────────────────────────────────────────────────────────
console.log('=== Cultivation pacing sim ===');
console.log(`activeMult = ${ACTIVE_MULTIPLIER_BASE}× | crystalExp=${CRYSTAL_EXP}`);
console.log('');

const r = simulate({ verbose: false, realmCosts: REALMS_TUNED });

const MILESTONES = {
  '  0  Tempered Body L1':    0,
  '  9  Tempered Body L10':   9,
  ' 10  Qi Transform Early': 10,
  ' 13  Qi Transform Peak':  13,
  ' 17  True Element Peak':  17,
  ' 20  Separation 3rd':     20,
  ' 21  Immortal Ascend 1st':21, // Reincarnation unlock target per memory
  ' 24  Saint Early':        24,
  ' 27  Saint King 1st':     27,
  ' 30  Origin Returning':   30,
  ' 36  Void King':          36,
  ' 45  Open Heaven L1':     45,
  ' 50  Open Heaven L6':     50,
};

console.log('Realm                    Time to reach');
console.log('───────────────────────  ──────────────');
for (const [label, idx] of Object.entries(MILESTONES)) {
  const t = r.realmReachedAt[idx];
  if (t == null && idx <= r.realmIndex) {
    console.log(`${label.padEnd(24)}  (at start)`);
  } else if (t == null) {
    console.log(`${label.padEnd(24)}  not reached`);
  } else {
    console.log(`${label.padEnd(24)}  ${fmtTime(t)}`);
  }
}

console.log('');
console.log(`Total sim time:    ${fmtTime(r.ticks)}`);
console.log(`Final realm:       ${r.realmIndex} / 50`);
console.log(`Final rate:        ${r.finalRate.toExponential(2)} qi/s`);
console.log(`Total qi earned:   ${fmtQi(r.qiEarnedTotal)}`);
console.log(`Crystal level:     ${r.crystalLevel}`);
console.log(`activeMult final:  ${r.activeMult.toFixed(2)}×`);
console.log(`Producers owned:   ${r.ownedProducers.map((n, i) => `${PRODUCERS[i].id.slice(2)}=${n}/${'  '+r.ownedDoubles[i]}d`).join(', ')}`);
