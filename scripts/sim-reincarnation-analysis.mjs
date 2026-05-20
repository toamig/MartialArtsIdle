/**
 * sim-reincarnation-analysis.mjs — find the "stagnation point" that makes
 * reincarnation feel like a real choice rather than an arbitrary opt-in.
 *
 * The user reports: they played to Void King 2nd (realm 37) on their first
 * life without ever feeling the need to reincarnate, because Crystal Reservoir
 * taps and Divine Qi orb collects continuously unlock the next top-tier
 * producer purchase. There is no "wall".
 *
 * This sim plots:
 *   1. Effective qi/s vs realm — what the player actually feels
 *   2. Mechanic uplift = rate-with-mechanics / rate-without-mechanics
 *      (how much the active mechanics are doing the work)
 *   3. Time-to-next-realm at each realm — the "wait time"
 *   4. Mechanic-tap value vs top-tier producer cost — does one tap buy a
 *      producer, multiple producers, or only a fraction?
 *   5. Reincarnation break-even — at what realm does it become faster to
 *      reincarnate (apply tree mult to a fresh life) than to push forward?
 *
 * Run: node scripts/sim-reincarnation-analysis.mjs
 */

const REALMS = [
  50, 100, 175, 300, 500, 850, 1_400, 2_400, 4_000, 6_500,
  150_000, 305_000, 570_000, 1_000_000,
  1_650_000, 3_100_000, 5_700_000, 10_500_000,
  18_000_000, 30_500_000, 55_000_000,
  95_000_000, 165_000_000, 300_000_000,
  500_000_000, 880_000_000, 1_500_000_000,
  2_550_000_000, 4_300_000_000, 7_600_000_000,
  12_500_000_000, 22_000_000_000, 36_000_000_000,
  62_000_000_000, 105_000_000_000, 185_000_000_000,
  305_000_000_000, 515_000_000_000, 860_000_000_000,
  1_500_000_000_000, 2_450_000_000_000, 4_150_000_000_000,
  6_900_000_000_000, 12_000_000_000_000, 20_000_000_000_000,
  34_000_000_000_000, 57_000_000_000_000, 91_500_000_000_000,
  157_000_000_000_000, 264_000_000_000_000, 448_500_000_000_000,
];
const REALM_NAMES = [
  'TB L1','TB L2','TB L3','TB L4','TB L5','TB L6','TB L7','TB L8','TB L9','TB L10',
  'QT Early','QT M','QT L','QT Peak',
  'TE Early','TE M','TE L','TE Peak',
  'Sep 1st','Sep 2nd','Sep 3rd',
  'IA 1st','IA 2nd','IA 3rd',
  'Saint E','Saint M','Saint L',
  'SK 1st','SK 2nd','SK 3rd',
  'OR 1st','OR 2nd','OR 3rd',
  'OK 1st','OK 2nd','OK 3rd',
  'VK 1st','VK 2nd','VK 3rd',
  'DS 1st','DS 2nd','DS 3rd',
  'E 1st','E 2nd','E 3rd',
  'OH L1','OH L2','OH L3','OH L4','OH L5','OH L6',
];
const PRODUCERS = [
  { startCost: 15,            startQiPerSec: 0.1,       unlock: 0  },
  { startCost: 100,           startQiPerSec: 1,         unlock: 4  },
  { startCost: 1_100,         startQiPerSec: 8,         unlock: 9  },
  { startCost: 12_000,        startQiPerSec: 47,        unlock: 13 },
  { startCost: 130_000,       startQiPerSec: 260,       unlock: 17 },
  { startCost: 1_400_000,     startQiPerSec: 1_400,     unlock: 20 },
  { startCost: 20_000_000,    startQiPerSec: 7_800,     unlock: 23 },
  { startCost: 330_000_000,   startQiPerSec: 44_000,    unlock: 29 },
  { startCost: 5_100_000_000, startQiPerSec: 260_000,   unlock: 35 },
  { startCost: 75_000_000_000,startQiPerSec: 1_600_000, unlock: 44 },
];
const COST_SCALING = 1.15;
const CRYSTAL_BASE = 25, CRYSTAL_EXP = 3.00, CRYSTAL_MULT_PER_LEVEL = 0.01;
function crystalLevelCost(toLevel) {
  if (toLevel < 1) return 0;
  const raw = CRYSTAL_BASE * Math.pow(toLevel, CRYSTAL_EXP);
  const step = Math.pow(10, Math.max(1, Math.floor(Math.log10(raw)) - 1));
  return Math.round(raw / step) * step;
}

// Mechanic configurations — at the highest tier (player has all 4 unlocked
// AND has bought T5 upgrades for each). This is the "engaged player at
// mid-game" baseline.
const MECH_T5 = {
  // Crystal reservoir: AFTER TUNING — fills 100% of qi/s, capacity 10 min.
  reservoir_fillFrac: 1.00,
  reservoir_capMin:   10,
  // Player taps the reservoir whenever it's full. With 10-min cap, optimal
  // tap cadence is every 10 min, but engaged play caps at 5-8 min between
  // taps. Model "every 8 min".
  reservoir_tapEveryMin: 8,

  // Divine Qi T5 (AFTER TUNING): two orbs every 60s for 40s of qi + 1.25× rate
  // buff for 20s. Net per minute: 80s of qi + 5s of qi = 85s / 60s ≈ 1.42× rate.
  divine_perMin: 1.42,

  // Pattern Click T5 (AFTER TUNING): spark every 45s, 60s of qi + 1.5× rate
  // buff for 10s. Net per 45s: 60s + 5s = 65s / 45s ≈ 1.44× rate.
  pattern_perMin: 1.44,
};

// Daily simulator with all mechanics active. Returns time-to-each-realm.
function simulate({ withMechanics, dayOnlineS, maxDays = 365, baseMultiplier = 1.0 }) {
  const owned       = PRODUCERS.map(() => 0);
  const ownedDouble = PRODUCERS.map(() => 0);
  let realmIdx = 0, qi = 0, qiEarnedThis = 0, qiEarnedTotal = 0;
  let crystalLevel = 0, crystalRqi = 0, crystalReservoirQi = 0;
  let elapsedS = 0;
  const realmTimes = [];

  function baseFlat() {
    let r = 1;
    for (let i = 0; i < PRODUCERS.length; i++) {
      if (owned[i] > 0) r += owned[i] * PRODUCERS[i].startQiPerSec * Math.pow(2, ownedDouble[i]);
    }
    return r;
  }
  function flatWithCrystal() {
    return baseFlat() * (1 + crystalLevel * CRYSTAL_MULT_PER_LEVEL);
  }
  function passiveRate() {
    // "Passive" = no active mechanics, no boost (idle rate)
    return flatWithCrystal() * baseMultiplier;
  }
  function activeRate() {
    // "Active" = boost held intermittently + ad boost + sparks
    return flatWithCrystal() * baseMultiplier * 3.0;  // approx 3× from active engagement
  }
  function rate() { return withMechanics ? activeRate() : passiveRate(); }

  function pcost(i) {
    return Math.ceil(PRODUCERS[i].startCost * Math.pow(COST_SCALING, owned[i]));
  }
  function tryBuy() {
    let bestRatio = 0, best = null;
    for (let i = 0; i < PRODUCERS.length; i++) {
      if (realmIdx < PRODUCERS[i].unlock) continue;
      const c = pcost(i);
      if (c > qi) continue;
      const g = PRODUCERS[i].startQiPerSec * Math.pow(2, ownedDouble[i]);
      const r = g / c;
      if (r > bestRatio) { bestRatio = r; best = { kind: 'p', i, c }; }
    }
    const cc = crystalLevelCost(crystalLevel + 1) - crystalRqi;
    if (cc > 0 && cc <= qi) {
      const g = flatWithCrystal() * CRYSTAL_MULT_PER_LEVEL;
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

  let dayStart = 0;
  let nextDayAt = 24 * 3600;
  const TICK = 5;

  while (elapsedS < maxDays * 24 * 3600 && realmIdx < REALMS.length - 1) {
    if (elapsedS >= nextDayAt) {
      dayStart = nextDayAt;
      nextDayAt = dayStart + 24 * 3600;
    }
    const online = (elapsedS - dayStart) < dayOnlineS;
    if (online) {
      const r = rate();
      let dq = r * TICK;
      // Active mechanic taps when withMechanics is true.
      if (withMechanics) {
        // Crystal reservoir tap — every 10 min, grants `fillFrac × rate × 10min`
        if ((elapsedS / 60) % MECH_T5.reservoir_tapEveryMin < (TICK / 60)) {
          const tapQi = passiveRate() * MECH_T5.reservoir_fillFrac * MECH_T5.reservoir_tapEveryMin * 60;
          dq += tapQi;
        }
        // Divine Qi: contribute net rate × 2.25 per minute spent online
        dq += passiveRate() * MECH_T5.divine_perMin * (TICK / 60);
        // Pattern Click: contribute net rate × 3.00 per minute spent online
        dq += passiveRate() * MECH_T5.pattern_perMin * (TICK / 60);
      }
      qi           += dq;
      qiEarnedThis += dq;
      qiEarnedTotal+= dq;
      while (tryBuy()) {}
      if (qiEarnedThis >= REALMS[realmIdx]) {
        qiEarnedThis -= REALMS[realmIdx];
        realmIdx++;
        realmTimes[realmIdx] = elapsedS;
      }
      elapsedS += TICK;
    } else {
      // Offline: 0.20 × passive rate × cap (8h)
      const offlineWindow = Math.min(nextDayAt - elapsedS, 8 * 3600);
      const dq = passiveRate() * 0.20 * offlineWindow;
      qi += dq; qiEarnedThis += dq; qiEarnedTotal += dq;
      while (qiEarnedThis >= REALMS[realmIdx] && realmIdx < REALMS.length - 1) {
        qiEarnedThis -= REALMS[realmIdx];
        realmIdx++;
        realmTimes[realmIdx] = elapsedS;
      }
      elapsedS = nextDayAt;
    }
  }
  return { realmTimes, finalRealm: realmIdx, finalRate: rate(), finalCrystalLevel: crystalLevel, finalQi: qi, owned: [...owned] };
}

function fmt(s) {
  if (s < 60) return `${s.toFixed(0)}s`;
  if (s < 3600) return `${(s/60).toFixed(1)}m`;
  if (s < 86400) return `${(s/3600).toFixed(1)}h`;
  return `${(s/86400).toFixed(2)}d`;
}
function fmtQ(n) {
  if (n >= 1e15) return (n/1e15).toFixed(2)+'Qa';
  if (n >= 1e12) return (n/1e12).toFixed(2)+'T';
  if (n >= 1e9)  return (n/1e9).toFixed(2)+'B';
  if (n >= 1e6)  return (n/1e6).toFixed(2)+'M';
  if (n >= 1e3)  return (n/1e3).toFixed(1)+'K';
  return n.toFixed(0);
}

// ── Run: hardcore profile (8h online/day) to model the user's playthrough ──
console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║  REINCARNATION ANALYSIS — when should the player feel "time to rebirth"?  ║');
console.log('║  Profile: Hardcore (8h online / 16h offline per day), all mechanics active ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');

const withMech    = simulate({ withMechanics: true,  dayOnlineS: 8 * 3600 });
const withoutMech = simulate({ withMechanics: false, dayOnlineS: 8 * 3600 });

console.log('\n  Realm                       Time w/mech  Time w/o mech  Mech uplift  Hours to next realm');
console.log('  ──────────────────────────  ───────────  ─────────────  ───────────  ───────────────────');
for (let i = 1; i <= 50; i += 1) {
  const tw = withMech.realmTimes[i];
  const wo = withoutMech.realmTimes[i];
  const twPrev = withMech.realmTimes[i - 1] ?? 0;
  if (tw == null) continue;
  const dtNextRealm = (withMech.realmTimes[i + 1] != null) ? withMech.realmTimes[i + 1] - tw : null;
  const uplift = (wo != null && tw != null) ? wo / tw : null;
  const upliftStr = uplift != null ? `${uplift.toFixed(1)}×` : '—';
  const dtStr = dtNextRealm != null ? fmt(dtNextRealm).padStart(8) : '—';
  // Add a star to highlight every major realm
  const star = [9,13,17,20,23,26,29,32,35,38,41,44].includes(i) ? '★' : ' ';
  // Highlight where dtNextRealm exceeds 1 day of play (the "stagnation point")
  const stagnant = dtNextRealm != null && dtNextRealm > 8 * 3600 ? '  ← STAGNATION' : '';
  console.log(`  ${star} ${i.toString().padStart(2)} ${REALM_NAMES[i].padEnd(22)}   ${fmt(tw).padStart(8)}    ${(wo != null ? fmt(wo) : '—').padStart(10)}    ${upliftStr.padStart(8)}      ${dtStr}${stagnant}`);
}

// ── Mechanic tap value vs top producer cost ─────────────────────────────────
console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║  CRYSTAL RESERVOIR TAP VALUE — does one tap buy the next top producer?    ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');

// Snapshot the player's state at each major realm and check the tap value
// vs the cost of buying their CURRENT top-tier producer (1 more).
console.log('\n  At realm           Rate (qi/s)   Reservoir tap (60min full)   Top producer cost   Producers per tap');
console.log(  '  ─────────────────  ───────────   ──────────────────────────   ─────────────────  ──────────────────');

for (let r of [10, 14, 18, 21, 24, 27, 30, 35, 38, 41, 44, 50]) {
  // Find the closest sim state and snapshot
  const sim = simulate({ withMechanics: true, dayOnlineS: 8 * 3600, maxDays: 365 });
  // Re-simulate and snapshot at the first time we hit realm r
  const owned = PRODUCERS.map(() => 0); const ownedDouble = PRODUCERS.map(() => 0);
  let realmIdx = 0, qi = 0, qiEarnedThis = 0, crystalLevel = 0, crystalRqi = 0;
  let elapsedS = 0;
  let dayStart = 0;
  function baseFlat_(o) {
    let s = 1;
    for (let i = 0; i < PRODUCERS.length; i++) s += o[i] * PRODUCERS[i].startQiPerSec * Math.pow(2, ownedDouble[i]);
    return s;
  }
  function flat_() { return baseFlat_(owned) * (1 + crystalLevel * CRYSTAL_MULT_PER_LEVEL); }
  function passive_() { return flat_(); }
  function active_() { return flat_() * 3.0; }
  function rate_() { return active_(); }
  function pcost_(i) { return Math.ceil(PRODUCERS[i].startCost * Math.pow(COST_SCALING, owned[i])); }
  function tryBuy_() {
    let bestRatio = 0, best = null;
    for (let i = 0; i < PRODUCERS.length; i++) {
      if (realmIdx < PRODUCERS[i].unlock) continue;
      const c = pcost_(i);
      if (c > qi) continue;
      const g = PRODUCERS[i].startQiPerSec * Math.pow(2, ownedDouble[i]);
      const ratio = g / c;
      if (ratio > bestRatio) { bestRatio = ratio; best = { kind: 'p', i, c }; }
    }
    const cc = crystalLevelCost(crystalLevel + 1) - crystalRqi;
    if (cc > 0 && cc <= qi) {
      const g = flat_() * CRYSTAL_MULT_PER_LEVEL;
      const ratio = g / cc;
      if (ratio > bestRatio) { bestRatio = ratio; best = { kind: 'c', c: cc }; }
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
  const TICK = 5;
  while (realmIdx < r && elapsedS < 365 * 24 * 3600) {
    const online = (elapsedS - dayStart) % (24 * 3600) < 8 * 3600;
    if (online) {
      const r0 = rate_();
      let dq = r0 * TICK;
      // Full mechanic stack
      if (elapsedS > 0 && (elapsedS / 60) % 10 < TICK / 60) {
        dq += passive_() * 1.00 * 600;  // 10 min reservoir fill
      }
      dq += passive_() * 2.25 * (TICK / 60);
      dq += passive_() * 3.00 * (TICK / 60);
      qi += dq; qiEarnedThis += dq;
      while (tryBuy_()) {}
      if (qiEarnedThis >= REALMS[realmIdx]) {
        qiEarnedThis -= REALMS[realmIdx];
        realmIdx++;
      }
      elapsedS += TICK;
    } else {
      const dq = passive_() * 0.20 * 8 * 3600;
      qi += dq; qiEarnedThis += dq;
      while (qiEarnedThis >= REALMS[realmIdx]) {
        qiEarnedThis -= REALMS[realmIdx];
        realmIdx++;
      }
      elapsedS = (Math.floor(elapsedS / (24 * 3600)) + 1) * 24 * 3600;
      dayStart = elapsedS;
    }
  }
  // Now snapshot
  const rate0 = rate_();
  // Reservoir tap value AFTER Dial-2 tuning: T5 cap = 10 min × 100% fill.
  const reservoirTap = passive_() * 1.00 * 600; // 10 min × 1 × passive rate
  // Top producer = highest-unlocked
  let topI = -1;
  for (let i = PRODUCERS.length - 1; i >= 0; i--) {
    if (realmIdx >= PRODUCERS[i].unlock) { topI = i; break; }
  }
  const topCost = pcost_(topI);
  const perTap = reservoirTap / topCost;
  console.log(`  ${REALM_NAMES[r].padEnd(15)} (${r})  ${fmtQ(rate0).padStart(10)}   ${fmtQ(reservoirTap).padStart(25)}   ${fmtQ(topCost).padStart(15)}   ${perTap.toFixed(1)}×`);
}

// ── Reincarnation break-even analysis ───────────────────────────────────────
console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║  REINCARNATION BREAK-EVEN — when is rebirth faster than grinding?         ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log(`
  Eternal Tree max multiplier = ×5 (when all 143 karma spent).
  Karma earned per realm (first-time only): cumulative
`);

// Karma per realm crossing — straight from useReincarnationTree.js
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
function totalKarma(maxIndex) {
  let t = 0;
  for (let i = 1; i <= maxIndex; i++) t += karmaForReachingIndex(i);
  return t;
}

const REBIRTH_OPTIONS = [21, 24, 27, 30, 35, 38, 41, 44, 47];
console.log('  Rebirth at         Karma earned  Tree mult unlocked  Time to retread realm 0→here on next life');
console.log('  ─────────────────  ────────────  ──────────────────  ────────────────────────────────────────');
for (const r of REBIRTH_OPTIONS) {
  const k = totalKarma(r);
  const treeMult = 1 + 4 * (k / 143);
  // Approximate time to retread: simulate with baseMultiplier = treeMult.
  const retread = simulate({ withMechanics: true, dayOnlineS: 8 * 3600, baseMultiplier: treeMult, maxDays: 60 });
  const tr = retread.realmTimes[r];
  console.log(`  ${REALM_NAMES[r].padEnd(15)} (${r})   ${String(k).padStart(8)}        ${treeMult.toFixed(2)}×            ${(tr != null ? fmt(tr) : '—').padStart(12)}`);
}

// ── Stagnation point detection ──────────────────────────────────────────────
console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║  STAGNATION INDEX — time-to-next-realm at each milestone                  ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log(`
  Reading: this is how long the player waits between realm breakthroughs while
  actively playing the game (hardcore 8h online, all mechanics, ad boost).
  A "stagnation point" is where the wait jumps above 4-6 hours — long enough
  that the player would consider reincarnating to skip ahead.

  Lower bar = faster turnover, more dopamine.
  Bar past ~6h    = "I'm not progressing, maybe try rebirth"
  Bar past ~24h   = wall, content gated behind days of waiting

`);

// Generate ASCII chart of time-to-next-realm for each realm reached
const dtData = [];
for (let i = 1; i < 50; i++) {
  const tw = withMech.realmTimes[i];
  const tw1 = withMech.realmTimes[i + 1];
  if (tw == null || tw1 == null) continue;
  dtData.push({ idx: i, name: REALM_NAMES[i], dt: tw1 - tw });
}
const maxDt = Math.max(...dtData.map(d => d.dt));
const CHART_W = 50;
console.log('  Realm                Hours to next         ' + '─'.repeat(CHART_W));
for (const d of dtData) {
  const hours = d.dt / 3600;
  const bars  = Math.max(1, Math.round((Math.log10(Math.max(1, d.dt)) / Math.log10(Math.max(1, maxDt))) * CHART_W));
  const stagn = hours > 4 ? '  ← stagnant' : '';
  console.log(`  ${('('+d.idx+') '+d.name).padEnd(20)}   ${hours.toFixed(2).padStart(8)}h       ${'█'.repeat(bars)}${stagn}`);
}
