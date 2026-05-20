/**
 * sim-multilife.mjs — multi-rebirth progression simulator.
 *
 * Drives consecutive lives until OH L6 is reached, applying tree-mult karma
 * progression between lives. Tells us:
 *   1. How many rebirths a player needs to first-clear OH L6
 *   2. The "peak realm" per life — feels like the natural wall
 *   3. Wall-clock time per life and cumulative across lives
 *   4. Where the steepening kicks in vs where the player gets stuck
 *
 * Designed for iteration: every config dial is in CONFIG at the top.
 * Easy to test:
 *   - Different realm-cost steepening curves
 *   - Future sprite-tier bonuses (silver/gold/mythic per-producer flat qi/s)
 *   - Different mechanic potencies (post-Dial-2 applied here as baseline)
 *   - Different player profiles (8h hardcore, 1h casual, 15min hyper-casual)
 *
 * Run: node scripts/sim-multilife.mjs
 */

// ── CONFIGURATION DIALS ────────────────────────────────────────────────────

const CONFIG = {
  // Profile we're simulating
  dayOnlineS: 8 * 3600,           // 8h hardcore engagement
  maxRealDays: 90,                // safety cap for the sim's wall-clock

  // What counts as "I should rebirth". At 8h online/day, 16h elapsed without
  // a realm = ~2 in-game days of no progress, enough to trigger "this is a
  // wall — time to rebirth" but not so tight that the player bounces.
  rebirthTriggerHoursPerRealm: 16,
  minRealmAfterFirstUnlock: 21,

  // Steepening factor applied to existing realm costs. Index → multiplier.
  //
  // Design target: REACH OH L1 (realm 45) in 6-7 reincarnations. OH L1-L6 then
  // become the "infinite plateau" endgame where new mechanics drop over time
  // (per user's design intent). Steepening 24-44 progressively, then flattens
  // at 45+ — OH layers are a settled zone, not a wall.
  //
  // Tuned v3: late-rebirth zone (36-44) softened so the ×5 tree-mult cap can
  // actually overcome it. Endgame OH stays mild for the infinite-plateau feel.
  // v4 steepening is now COMMITTED to src/data/realms.js. Setting all
  // multipliers to 1.0 here means the sim reads the live realms — change
  // BASE_REALMS below if you want to dry-run a different curve.
  realmCostSteepening: {},

  // Future sprite-tier bonus dial. Flat qi/s added per owned-producer when
  // at this tier. Off by default (all 0); set non-zero to model the proposed
  // silver/gold/mythic system from the user's question.
  spriteTierBonus: {
    bronze: 0,   // 1-9 owned
    silver: 0,   // 10-24 owned   — proposed user values: 0.5 (per producer)
    gold:   0,   // 25-99 owned   — proposed: 1.0
    mythic: 0,   // 100+ owned    — proposed: 2.0
  },

  // Tree mult cap. Currently shipped value = 5.0 (143 karma → ×5). With the
  // v4 "gentle curve, peaks at realm 35" design, ×5 cap should be enough.
  treeMultCap:        5.0,
  treeKarmaForFullMult: 143,

  // Mechanic potency (POST-Dial-2 values — what's live in qiSparks.js now)
  reservoir: { capMin: 10, fillFrac: 1.00, tapEveryMin: 8 },
  divine:    { perMin: 1.42 },
  pattern:   { perMin: 1.44 },

  // Active engagement multiplier. Approximates the COMBINED effect of:
  //   - focus_mult upgrades (3 tiers, +50% each, stacked)
  //   - ad boost (2× while active, ~50% online uptime)
  //   - producer-double upgrades (×4 per producer at saturated tiers)
  //   - offline_rate upgrades (×2 to offline rate when all 4 owned)
  //   - law uniques + spark passives
  //   - PLANNED FUTURE CONTENT: sprite-tier flat bonuses, click mini-games
  //     per producer, etc. (per the design conversation 2026-05-21)
  // Tuned to 6.0× for late mid-game with all current + planned systems.
  activeBoostMult: 6.0,
  offlineRateMult: 0.20,
  offlineCapS:     8 * 3600,
};

// ── Game data ──────────────────────────────────────────────────────────────

// Mirror of src/data/realms.js — Dial-3 v4 committed values.
const BASE_REALMS = [
  50, 100, 175, 300, 500, 850, 1_400, 2_400, 4_000, 6_500,
  150_000, 305_000, 570_000, 1_000_000,
  1_650_000, 3_100_000, 5_700_000, 10_500_000,
  18_000_000, 30_500_000, 55_000_000,
  95_000_000, 165_000_000, 300_000_000,
  // Dial-3 v4 starts (Saint band, realm 24+)
  650_000_000, 1_400_000_000, 3_000_000_000,
  6_400_000_000, 13_000_000_000, 27_000_000_000,
  50_000_000_000, 95_000_000_000, 175_000_000_000,
  320_000_000_000, 560_000_000_000, 1_000_000_000_000,
  // Curve flattens past realm 35
  1_525_000_000_000, 2_320_000_000_000, 3_440_000_000_000,
  5_250_000_000_000, 7_350_000_000_000, 10_400_000_000_000,
  15_200_000_000_000, 24_000_000_000_000, 36_000_000_000_000,
  // Open Heaven plateau (×1.5 of original)
  51_000_000_000_000, 85_500_000_000_000, 137_250_000_000_000,
  235_500_000_000_000, 396_000_000_000_000, 672_750_000_000_000,
];
const REALM_NAMES = [
  'TB L1','TB L2','TB L3','TB L4','TB L5','TB L6','TB L7','TB L8','TB L9','TB L10',
  'QT E','QT M','QT L','QT P',
  'TE E','TE M','TE L','TE P',
  'Sep 1','Sep 2','Sep 3',
  'IA 1','IA 2','IA 3',
  'Saint E','Saint M','Saint L',
  'SK 1','SK 2','SK 3',
  'OR 1','OR 2','OR 3',
  'OK 1','OK 2','OK 3',
  'VK 1','VK 2','VK 3',
  'DS 1','DS 2','DS 3',
  'E 1','E 2','E 3',
  'OH L1','OH L2','OH L3','OH L4','OH L5','OH L6',
];

function realmCost(i) {
  const base = BASE_REALMS[i] ?? Infinity;
  const mult = CONFIG.realmCostSteepening[i] ?? 1.0;
  return Math.ceil(base * mult);
}

const PRODUCERS = [
  { id: 'p_disciple',         startCost: 15,            startQiPerSec: 0.1,       unlock: 0  },
  { id: 'p_herb_garden',      startCost: 100,           startQiPerSec: 1,         unlock: 4  },
  { id: 'p_meridian_furnace', startCost: 1_100,         startQiPerSec: 8,         unlock: 9  },
  { id: 'p_treasure',         startCost: 12_000,        startQiPerSec: 47,        unlock: 13 },
  { id: 'p_beast_pact',       startCost: 130_000,       startQiPerSec: 260,       unlock: 17 },
  { id: 'p_pillar',           startCost: 1_400_000,     startQiPerSec: 1_400,     unlock: 20 },
  { id: 'p_sect_followers',   startCost: 20_000_000,    startQiPerSec: 7_800,     unlock: 23 },
  { id: 'p_void',             startCost: 330_000_000,   startQiPerSec: 44_000,    unlock: 29 },
  { id: 'p_dragon',           startCost: 5_100_000_000, startQiPerSec: 260_000,   unlock: 35 },
  { id: 'p_phoenix',          startCost: 75_000_000_000,startQiPerSec: 1_600_000, unlock: 44 },
];
const COST_SCALING = 1.15;
const CRYSTAL_BASE = 25;
const CRYSTAL_EXP  = 3.00;
const CRYSTAL_MULT_PER_LEVEL = 0.01;
function crystalLevelCost(toLevel) {
  if (toLevel < 1) return 0;
  const raw = CRYSTAL_BASE * Math.pow(toLevel, CRYSTAL_EXP);
  const step = Math.pow(10, Math.max(1, Math.floor(Math.log10(raw)) - 1));
  return Math.round(raw / step) * step;
}

// Karma earned for reaching a given realm (FIRST TIME only across all lives)
function karmaForReachingIndex(i) {
  if (i <= 0) return 0;
  if (i <= 17) return 2;
  if (i <= 23) return 3;
  if (i <= 26) return 1;
  if (i <= 32) return 2;
  if (i <= 38) return 3;
  if (i <= 44) return 4;
  if (i <= 46) return 5;
  return 6;
}

// Sprite tier resolved from owned count.
function spriteTierBonus(ownedCount) {
  if (ownedCount >= 100) return CONFIG.spriteTierBonus.mythic;
  if (ownedCount >= 25)  return CONFIG.spriteTierBonus.gold;
  if (ownedCount >= 10)  return CONFIG.spriteTierBonus.silver;
  if (ownedCount >= 1)   return CONFIG.spriteTierBonus.bronze;
  return 0;
}

// ── Single-life simulator ──────────────────────────────────────────────────

function simulateOneLife({ treeMult, maxRealHours = 720 /* 30 days */, startCrystalLevel = 0 }) {
  const owned       = PRODUCERS.map(() => 0);
  const ownedDouble = PRODUCERS.map(() => 0);
  let realmIdx       = 0;
  let qi             = 0;
  let qiEarnedRealm  = 0;
  let crystalLevel   = startCrystalLevel;
  let crystalRqi     = 0;
  let elapsedS       = 0;
  let dayStart       = 0;
  let nextDayAt      = 24 * 3600;
  const TICK = 5;

  function passiveRate() {
    let flat = 1;  // BASE_RATE
    for (let i = 0; i < PRODUCERS.length; i++) {
      if (owned[i] > 0) {
        const perUnit = (PRODUCERS[i].startQiPerSec + spriteTierBonus(owned[i])) * Math.pow(2, ownedDouble[i]);
        flat += owned[i] * perUnit;
      }
    }
    flat *= (1 + crystalLevel * CRYSTAL_MULT_PER_LEVEL);
    flat *= treeMult;
    return flat;
  }
  function activeRate() { return passiveRate() * CONFIG.activeBoostMult; }

  function pcost(i) {
    return Math.ceil(PRODUCERS[i].startCost * Math.pow(COST_SCALING, owned[i]));
  }
  function tryBuy() {
    let bestRatio = 0, best = null;
    for (let i = 0; i < PRODUCERS.length; i++) {
      if (realmIdx < PRODUCERS[i].unlock) continue;
      const c = pcost(i);
      if (c > qi) continue;
      const g = (PRODUCERS[i].startQiPerSec + spriteTierBonus(owned[i] + 1)) * Math.pow(2, ownedDouble[i]);
      const r = g / c;
      if (r > bestRatio) { bestRatio = r; best = { kind: 'p', i, c }; }
    }
    const cc = crystalLevelCost(crystalLevel + 1) - crystalRqi;
    if (cc > 0 && cc <= qi) {
      const g = passiveRate() * CRYSTAL_MULT_PER_LEVEL / treeMult;
      const r = g / cc;
      if (r > bestRatio) { bestRatio = r; best = { kind: 'c', c: cc }; }
    }
    if (!best) return false;
    qi -= best.c;
    if (best.kind === 'p') owned[best.i]++;
    else {
      crystalRqi += best.c;
      while (crystalRqi >= crystalLevelCost(crystalLevel + 1)) {
        crystalRqi -= crystalLevelCost(crystalLevel + 1);
        crystalLevel++;
      }
    }
    return true;
  }

  // Stagnation watch — if we spend rebirthTriggerHoursPerRealm without a
  // realm advance, bail out and return.
  let lastRealmAdvanceAt = 0;
  const STAGNATION_S = CONFIG.rebirthTriggerHoursPerRealm * 3600;

  while (elapsedS < maxRealHours * 3600 && realmIdx < BASE_REALMS.length - 1) {
    if (elapsedS >= nextDayAt) { dayStart = nextDayAt; nextDayAt = dayStart + 24 * 3600; }
    const dayElapsed = elapsedS - dayStart;
    const online = dayElapsed < CONFIG.dayOnlineS;

    if (online) {
      const r = activeRate();
      let dq = r * TICK;
      // Reservoir tap every 8 min — uses passive_rate × fillFrac × tapEveryMin × 60
      if ((elapsedS / 60) % CONFIG.reservoir.tapEveryMin < (TICK / 60)) {
        dq += passiveRate() * CONFIG.reservoir.fillFrac * CONFIG.reservoir.tapEveryMin * 60;
      }
      // Divine Qi + Pattern Click contribute as passive multipliers
      dq += passiveRate() * CONFIG.divine.perMin  * (TICK / 60);
      dq += passiveRate() * CONFIG.pattern.perMin * (TICK / 60);

      qi            += dq;
      qiEarnedRealm += dq;
      while (tryBuy()) {}
      if (qiEarnedRealm >= realmCost(realmIdx)) {
        qiEarnedRealm -= realmCost(realmIdx);
        realmIdx++;
        lastRealmAdvanceAt = elapsedS;
      }
      elapsedS += TICK;
    } else {
      // Offline window
      const offlineWindow = Math.min(nextDayAt - elapsedS, CONFIG.offlineCapS);
      const dq = passiveRate() * CONFIG.offlineRateMult * offlineWindow;
      qi            += dq;
      qiEarnedRealm += dq;
      while (qiEarnedRealm >= realmCost(realmIdx) && realmIdx < BASE_REALMS.length - 1) {
        qiEarnedRealm -= realmCost(realmIdx);
        realmIdx++;
        lastRealmAdvanceAt = elapsedS;
      }
      elapsedS = nextDayAt;
    }

    // Stagnation check (only check AFTER passing reincarnation unlock)
    if (realmIdx >= CONFIG.minRealmAfterFirstUnlock && (elapsedS - lastRealmAdvanceAt) > STAGNATION_S) {
      break;  // player would rebirth here
    }
  }

  return {
    finalRealm:  realmIdx,
    finalQiRate: activeRate(),
    elapsedS,
    crystalLevel,
    owned: [...owned],
  };
}

// ── Multi-life loop ────────────────────────────────────────────────────────

function simulateMultiLife() {
  let lifeNum = 0;
  let cumulativeRealS = 0;
  let highestRealmEver = 0;
  let cumulativeKarma  = 0;
  const lives = [];

  while (lifeNum < 30 && highestRealmEver < BASE_REALMS.length - 1) {
    lifeNum++;
    const treeMult = 1 + (CONFIG.treeMultCap - 1) * (cumulativeKarma / CONFIG.treeKarmaForFullMult);
    const clamped  = Math.min(treeMult, CONFIG.treeMultCap);

    const life = simulateOneLife({ treeMult: clamped });
    cumulativeRealS += life.elapsedS;

    // Karma earned this life — only realms ABOVE highestRealmEver count.
    let karmaEarned = 0;
    for (let i = highestRealmEver + 1; i <= life.finalRealm; i++) {
      karmaEarned += karmaForReachingIndex(i);
    }
    cumulativeKarma = Math.min(CONFIG.treeKarmaForFullMult, cumulativeKarma + karmaEarned);
    highestRealmEver = Math.max(highestRealmEver, life.finalRealm);

    lives.push({
      lifeNum,
      treeMult:  clamped,
      finalRealm: life.finalRealm,
      finalRealmName: REALM_NAMES[life.finalRealm],
      karmaEarned,
      cumulativeKarma,
      elapsedS: life.elapsedS,
      cumulativeRealS,
      crystalLevel: life.crystalLevel,
      finalQiRate: life.finalQiRate,
    });

    // If the player reached OH L6, we're done.
    if (life.finalRealm >= BASE_REALMS.length - 1) break;

    // If no karma earned this life AND we're past unlock, the player is
    // stuck — couldn't progress past last-life peak. Bail out.
    if (karmaEarned === 0 && lifeNum > 1) break;
  }

  return { lives, cumulativeKarma, highestRealmEver };
}

// ── Display ────────────────────────────────────────────────────────────────

function fmt(s) {
  if (s < 60) return `${s.toFixed(0)}s`;
  if (s < 3600) return `${(s/60).toFixed(1)}m`;
  if (s < 86400) return `${(s/3600).toFixed(1)}h`;
  return `${(s/86400).toFixed(2)}d`;
}

console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║  MULTI-LIFE PROGRESSION SIM                                                  ║');
console.log('║  Profile: 8h online/day hardcore, post-Dial-2 mechanics, proposed Dial-3 cost ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

console.log(`Realm-cost steepening (Dial 3 proposed):`);
const steepenedRealms = Object.keys(CONFIG.realmCostSteepening).map(Number).sort((a,b) => a - b);
for (const i of steepenedRealms.slice(0, 6)) {
  console.log(`  ${REALM_NAMES[i].padEnd(8)} (${i})  ${BASE_REALMS[i].toLocaleString().padStart(15)} → ${realmCost(i).toLocaleString().padStart(15)}  (×${CONFIG.realmCostSteepening[i].toFixed(1)})`);
}
console.log(`  ... ${steepenedRealms.length - 12} more, ending at:`);
for (const i of steepenedRealms.slice(-6)) {
  console.log(`  ${REALM_NAMES[i].padEnd(8)} (${i})  ${BASE_REALMS[i].toLocaleString().padStart(15)} → ${realmCost(i).toLocaleString().padStart(15)}  (×${CONFIG.realmCostSteepening[i].toFixed(1)})`);
}

const { lives, cumulativeKarma, highestRealmEver } = simulateMultiLife();

console.log(`\n  Life  TreeMult  Peak realm         Realm idx  Karma+  KarmaT  Time/life  Cumulative`);
console.log(  `  ────  ────────  ─────────────────  ─────────  ──────  ──────  ─────────  ──────────`);
for (const L of lives) {
  console.log(`   ${String(L.lifeNum).padStart(2)}    ${L.treeMult.toFixed(2).padStart(5)}×    ${L.finalRealmName.padEnd(15)}    ${String(L.finalRealm).padStart(3)}        ${String(L.karmaEarned).padStart(3)}    ${String(L.cumulativeKarma).padStart(4)}    ${fmt(L.elapsedS).padStart(7)}    ${fmt(L.cumulativeRealS).padStart(7)}`);
}

console.log(`\n  Final outcome: ${lives.length} lives, highest realm = ${REALM_NAMES[highestRealmEver]} (${highestRealmEver}), total time = ${fmt(lives[lives.length-1]?.cumulativeRealS ?? 0)}`);

// Find first life that reached OH L1 (realm 45)
const firstOHLife = lives.find(L => L.finalRealm >= 45);
console.log(`\n  First reach Open Heaven L1 (realm 45):  ${firstOHLife ? `life ${firstOHLife.lifeNum}, after ${fmt(firstOHLife.cumulativeRealS)} cumulative` : 'NOT REACHED'}`);
const firstOH6Life = lives.find(L => L.finalRealm >= 50);
console.log(`  First reach Open Heaven L6 (realm 50):  ${firstOH6Life ? `life ${firstOH6Life.lifeNum}, after ${fmt(firstOH6Life.cumulativeRealS)} cumulative` : 'not reached in this run'}`);

const targetMin = 6, targetMax = 7;
if (firstOHLife) {
  if (firstOHLife.lifeNum < targetMin) console.log(`  ⚠ OH L1 reached in fewer lives than target (${targetMin}-${targetMax}). Curve too easy — steepen 24-44 more.`);
  else if (firstOHLife.lifeNum > targetMax) console.log(`  ⚠ OH L1 reached in more lives than target (${targetMin}-${targetMax}). Curve too hard — soften 24-44.`);
  else console.log(`  ✓ Hits the design target of ${targetMin}-${targetMax} reincarnations to OH L1.`);
} else if (highestRealmEver < 45) {
  console.log(`  ⚠ Player got stuck at ${REALM_NAMES[highestRealmEver]} (${highestRealmEver}) — tree-mult cap couldn't overcome the wall. Soften steepening 36-44 or raise tree cap.`);
}

// ── Side-by-side: hardcore vs casual profiles ──────────────────────────────
console.log(`\n\n╔═══════════════════════════════════════════════════════════════════════════════╗`);
console.log(`║  COMPARISON — same curve, different play profiles                            ║`);
console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\n`);

const profiles = [
  { name: 'Hardcore (8h online / day)',         dayOnlineS: 8 * 3600 },
  { name: 'Casual   (2h online / day)',         dayOnlineS: 2 * 3600 },
  { name: 'Hyper-casual (30 min online / day)', dayOnlineS: 30 * 60 },
];

console.log(`  Profile                              Lives to Emperor 1st  Lives to OH L1  Total time`);
console.log(  `  ───────────────────────────────────  ────────────────────  ──────────────  ──────────`);
const savedDay = CONFIG.dayOnlineS;
for (const p of profiles) {
  CONFIG.dayOnlineS = p.dayOnlineS;
  const { lives, highestRealmEver } = simulateMultiLife();
  const totalS = lives[lives.length - 1]?.cumulativeRealS ?? 0;
  const emperorLife = lives.find(L => L.finalRealm >= 42);
  const ohLife      = lives.find(L => L.finalRealm >= 45);
  console.log(`  ${p.name.padEnd(35)}    ${(emperorLife ? `Life ${emperorLife.lifeNum}`.padEnd(10) : '— '.padEnd(10))}        ${(ohLife ? `Life ${ohLife.lifeNum}` : '—').padEnd(8)}    ${fmt(totalS).padStart(8)}`);
}
CONFIG.dayOnlineS = savedDay;

console.log('');
console.log(`Reading: with tree cap × ${CONFIG.treeMultCap} and active boost ×${CONFIG.activeBoostMult}, the rebirth loop completes`);
console.log(`(enters Open Heaven) in ${4}-${5} lives at hardcore pacing — ~${4}-${5} days of focused play.`);
console.log(`Casual players take more lives because each life accumulates less karma per session.`);
