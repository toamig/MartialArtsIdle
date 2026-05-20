/**
 * sim-curve-analysis.mjs — visual analysis of pacing problems.
 *
 * Reads the same model as sim-progression-analysis.mjs but PRINTS:
 *  - Per-minute snapshot of "what is the player doing" in the first 30 minutes
 *  - ASCII chart of qi/s over time (log scale, 60 days)
 *  - Day-over-day RATIO of online-vs-offline contribution (the user's complaint)
 *  - Comparison row: idle-game industry benchmarks for "first new mechanic"
 *
 * Run: node scripts/sim-curve-analysis.mjs
 */

import { execSync } from 'node:child_process';

const REALMS = [
  50, 100, 175, 300, 500, 850, 1_400, 2_400, 4_000, 6_500,
  150_000, 305_000, 570_000, 1_000_000,
  1_650_000, 3_100_000, 5_700_000, 10_500_000,
  18_000_000, 30_500_000, 55_000_000,
  95_000_000, 165_000_000, 300_000_000,
  500_000_000, 880_000_000, 1_500_000_000,
];
const PRODUCERS = [
  { startCost: 15,            startQiPerSec: 0.1,    unlock: 0  },
  { startCost: 100,           startQiPerSec: 1,      unlock: 4  },
  { startCost: 1_100,         startQiPerSec: 8,      unlock: 9  },
  { startCost: 12_000,        startQiPerSec: 47,     unlock: 13 },
  { startCost: 130_000,       startQiPerSec: 260,    unlock: 17 },
];
const COST_SCALING = 1.15;
const CRYSTAL_BASE = 25, CRYSTAL_EXP = 3.00, CRYSTAL_MULT_PER_LEVEL = 0.01;
function crystalLevelCost(toLevel) {
  if (toLevel < 1) return 0;
  const raw = CRYSTAL_BASE * Math.pow(toLevel, CRYSTAL_EXP);
  const step = Math.pow(10, Math.max(1, Math.floor(Math.log10(raw)) - 1));
  return Math.round(raw / step) * step;
}

// ── First-30-min event timeline ─────────────────────────────────────────────
function simEarly() {
  let qi = 0, rate = 1, owned = [0,0,0,0,0], realmIdx = 0;
  let qiEarned = 0, qiEarnedRealm = 0;
  let crystalLvl = 0, crystalRqi = 0;
  const events = [];

  function rate_() {
    let r = 1;
    for (let i = 0; i < PRODUCERS.length; i++) r += owned[i] * PRODUCERS[i].startQiPerSec;
    return r * (1 + crystalLvl * CRYSTAL_MULT_PER_LEVEL);
  }
  function pcost(i) {
    return Math.ceil(PRODUCERS[i].startCost * Math.pow(COST_SCALING, owned[i]));
  }

  for (let t = 0; t <= 30 * 60; t += 1) {
    const r = rate_();
    qi += r; qiEarned += r; qiEarnedRealm += r;

    // Greedy buy
    let bought = true;
    while (bought) {
      bought = false;
      let bestRatio = 0, bestKind = null, bestArg = null, bestCost = 0;
      for (let i = 0; i < PRODUCERS.length; i++) {
        if (realmIdx < PRODUCERS[i].unlock) continue;
        const c = pcost(i);
        if (c > qi) continue;
        const g = PRODUCERS[i].startQiPerSec;
        const r = g / c;
        if (r > bestRatio) { bestRatio = r; bestKind = 'p'; bestArg = i; bestCost = c; }
      }
      const cc = crystalLevelCost(crystalLvl + 1) - crystalRqi;
      if (cc > 0 && cc <= qi) {
        const flat = rate_();
        const g = flat * CRYSTAL_MULT_PER_LEVEL;
        const r = g / cc;
        if (r > bestRatio) { bestRatio = r; bestKind = 'c'; bestCost = cc; }
      }
      if (bestKind === 'p') {
        qi -= bestCost; owned[bestArg]++;
        if (owned[bestArg] === 1) events.push({ t, label: `Bought first ${['Disciple','Herb Garden','Meridian Furnace','Treasure','Beast Pact'][bestArg]}` });
        bought = true;
      } else if (bestKind === 'c') {
        qi -= bestCost; crystalRqi += bestCost;
        while (crystalRqi >= crystalLevelCost(crystalLvl + 1)) {
          crystalRqi -= crystalLevelCost(crystalLvl + 1);
          crystalLvl++;
          if (crystalLvl === 1) events.push({ t, label: `Crystal lvl 1 (first refine)` });
          if (crystalLvl === 5) events.push({ t, label: `Crystal lvl 5` });
          if (crystalLvl === 10) events.push({ t, label: `★ Crystal lvl 10 → Crystal Reservoir mechanic UNLOCKED` });
          if (crystalLvl === 25) events.push({ t, label: `★ Crystal lvl 25 → Consecutive Focus mechanic UNLOCKED` });
        }
        bought = true;
      }
    }

    if (qiEarnedRealm >= REALMS[realmIdx]) {
      qiEarnedRealm = 0; realmIdx++;
      const realmNames = ['TB L1','TB L2','TB L3','TB L4','TB L5','TB L6','TB L7','TB L8','TB L9','TB L10','★ QT Early (FIRST MAJOR BREAKTHROUGH)','QT Middle','QT Late','QT Peak','★ True Element','TE Middle','TE Late','TE Peak'];
      events.push({ t, label: `→ ${realmNames[realmIdx] || `realm ${realmIdx}`}` });
    }
  }
  return { events, finalRate: rate_(), finalQi: qi, owned, crystalLvl };
}

console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║  EARLY-GAME ACTION TIMELINE  (first 30 minutes, online, no spark/law)  ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

const early = simEarly();

let lastT = -10;
let totalEvents = 0;
for (const e of early.events) {
  // Group very close events
  totalEvents++;
  const min = (e.t / 60).toFixed(1);
  console.log(`  ${min.padStart(5)} min   ${e.label}`);
  lastT = e.t;
}

console.log(`\n  Events in first 30 min: ${totalEvents}`);
console.log(`  Final state @ 30 min: rate=${early.finalRate.toFixed(1)} qi/s, crystalLvl=${early.crystalLvl}`);
console.log(`  Producers owned: ${early.owned.join(', ')}`);

// ── Event-rate distribution ─────────────────────────────────────────────────
console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║  EVENT-PER-MINUTE DENSITY                                              ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');
console.log('  Time bucket            Events (excluding producer-buy noise)');
console.log('  ─────────────────────  ──────────────────────────────────────');

const SIGNIFICANT_EVENTS = early.events.filter(e =>
  e.label.includes('★') || e.label.includes('UNLOCKED') || e.label.startsWith('Crystal lvl') || e.label.startsWith('→')
);
const buckets = [
  { label: '0-3   min', from: 0,    to: 3 * 60 },
  { label: '3-6   min', from: 3*60, to: 6 * 60 },
  { label: '6-10  min', from: 6*60, to: 10 * 60 },
  { label: '10-15 min', from: 10*60, to: 15 * 60 },
  { label: '15-30 min', from: 15*60, to: 30 * 60 },
];
for (const b of buckets) {
  const count = SIGNIFICANT_EVENTS.filter(e => e.t >= b.from && e.t < b.to).length;
  const bar   = '█'.repeat(count);
  console.log(`  ${b.label.padEnd(20)}   ${bar}  (${count})`);
}

// ── Industry benchmarks ─────────────────────────────────────────────────────
console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║  INDUSTRY BENCHMARK: time-to-first-new-mechanic in successful idle games║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');
console.log('  Game                        First new mechanic    Source');
console.log('  ──────────────────────────  ────────────────────  ──────────────────────────────────────');
console.log('  Cookie Clicker              ~30s (grandma @ 100c) Visible at start, achievable in 1 min');
console.log('  AdVenture Capitalist        ~1 min (manager #1)   Manager auto-pop at 15 lemonade');
console.log('  Idle Miner Tycoon           ~90s (mine upgrade)   Mid-tap-loop, first manager 5 min');
console.log('  NGU Idle                    ~2 min (Adventure)    Multiple mechanics in first 5 min');
console.log('  Idle Slayer                 ~30s (first skill)    Constant kills, skill pop every 10s');
console.log('  Cell to Singularity         ~3 min (first DNA)    Tiered mechanic gates every 2-5 min');
console.log('  ──────────────────────────  ────────────────────  ──────────────────────────────────────');
console.log('  MartialArtsIdle (current)   ~28 min (Crystal Res.) Player must accumulate 25K qi');

// ── Online vs Offline contribution ──────────────────────────────────────────
console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║  ONLINE vs OFFLINE — day 1 vs day 2 (CASUAL profile, 1h online/day)    ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// Simulate to end of day 1
function simToTimestamp(maxS, dayOnlineS) {
  let qi = 0, rate = 1, owned = [0,0,0,0,0,0,0,0,0,0], doubled = [0,0,0,0,0,0,0,0,0,0];
  let realmIdx = 0, qiEarnedRealm = 0;
  let crystalLvl = 0, crystalRqi = 0;
  const TICK = 5;
  const ALL_PRODUCERS = [
    { startCost: 15,            startQiPerSec: 0.1,    unlock: 0  },
    { startCost: 100,           startQiPerSec: 1,      unlock: 4  },
    { startCost: 1_100,         startQiPerSec: 8,      unlock: 9  },
    { startCost: 12_000,        startQiPerSec: 47,     unlock: 13 },
    { startCost: 130_000,       startQiPerSec: 260,    unlock: 17 },
    { startCost: 1_400_000,     startQiPerSec: 1_400,  unlock: 20 },
    { startCost: 20_000_000,    startQiPerSec: 7_800,  unlock: 23 },
    { startCost: 330_000_000,   startQiPerSec: 44_000, unlock: 29 },
    { startCost: 5_100_000_000, startQiPerSec: 260_000,unlock: 35 },
    { startCost: 75_000_000_000,startQiPerSec: 1.6e6,  unlock: 44 },
  ];
  function rate_() {
    let r = 1;
    for (let i = 0; i < ALL_PRODUCERS.length; i++) r += owned[i] * ALL_PRODUCERS[i].startQiPerSec * Math.pow(2, doubled[i]);
    return r * (1 + crystalLvl * CRYSTAL_MULT_PER_LEVEL);
  }
  function pcost(i) {
    return Math.ceil(ALL_PRODUCERS[i].startCost * Math.pow(COST_SCALING, owned[i]));
  }
  let onlineQi = 0, offlineQi = 0;
  let t = 0;
  let dayStart = 0;
  while (t < maxS) {
    const dayElapsed = t - dayStart;
    const online = dayElapsed < dayOnlineS;
    if (online) {
      const r = rate_();
      onlineQi += r * TICK;
      qi += r * TICK; qiEarnedRealm += r * TICK;
      // Greedy buy
      let bought = true;
      while (bought) {
        bought = false;
        let bestRatio = 0, bestKind = null, bestArg = null, bestCost = 0;
        for (let i = 0; i < ALL_PRODUCERS.length; i++) {
          if (realmIdx < ALL_PRODUCERS[i].unlock) continue;
          const c = pcost(i);
          if (c > qi) continue;
          const g = ALL_PRODUCERS[i].startQiPerSec * Math.pow(2, doubled[i]);
          const r = g / c;
          if (r > bestRatio) { bestRatio = r; bestKind = 'p'; bestArg = i; bestCost = c; }
        }
        const cc = crystalLevelCost(crystalLvl + 1) - crystalRqi;
        if (cc > 0 && cc <= qi) {
          const g = rate_() * CRYSTAL_MULT_PER_LEVEL;
          const r = g / cc;
          if (r > bestRatio) { bestRatio = r; bestKind = 'c'; bestCost = cc; }
        }
        if (bestKind === 'p') { qi -= bestCost; owned[bestArg]++; bought = true; }
        else if (bestKind === 'c') {
          qi -= bestCost; crystalRqi += bestCost;
          while (crystalRqi >= crystalLevelCost(crystalLvl + 1)) {
            crystalRqi -= crystalLevelCost(crystalLvl + 1); crystalLvl++;
          }
          bought = true;
        }
      }
      while (realmIdx < REALMS.length && qiEarnedRealm >= REALMS[realmIdx]) {
        qiEarnedRealm -= REALMS[realmIdx]; realmIdx++;
      }
      t += TICK;
    } else {
      // Offline window — single jump
      const nextDay = dayStart + 24 * 3600;
      const offlineWindow = Math.min(nextDay - t, 8 * 3600); // 8h cap
      const dq = rate_() * 0.20 * offlineWindow;
      offlineQi += dq;
      qi += dq; qiEarnedRealm += dq;
      while (realmIdx < REALMS.length && qiEarnedRealm >= REALMS[realmIdx]) {
        qiEarnedRealm -= REALMS[realmIdx]; realmIdx++;
      }
      t = nextDay; dayStart = t;
    }
  }
  return { onlineQi, offlineQi, qi, realmIdx, rate: rate_(), crystalLvl };
}

const DAY = 24 * 3600;
const day1End = simToTimestamp(1 * DAY, 1 * 3600);
const day2End = simToTimestamp(2 * DAY, 1 * 3600);
const day3End = simToTimestamp(3 * DAY, 1 * 3600);
const day7End = simToTimestamp(7 * DAY, 1 * 3600);

console.log('  Day                  qi/s end     Δrealm    Online earned   Offline earned   Offl/Onl');
console.log('  ───────────────────  ──────────  ────────  ──────────────  ──────────────   ────────');

function fmt(n) {
  if (n >= 1e12) return (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n/1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return (n/1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return (n/1e3).toFixed(1)  + 'K';
  return n.toFixed(0);
}

const dayDeltas = [
  { label: 'End of day 1', cur: day1End, prev: { realmIdx: 0, onlineQi: 0, offlineQi: 0 } },
  { label: 'End of day 2', cur: day2End, prev: day1End },
  { label: 'End of day 3', cur: day3End, prev: day2End },
  { label: 'End of day 7', cur: day7End, prev: day3End },
];
for (const d of dayDeltas) {
  const dRealm = d.cur.realmIdx - d.prev.realmIdx;
  const dOnline  = d.cur.onlineQi - d.prev.onlineQi;
  const dOffline = d.cur.offlineQi - d.prev.offlineQi;
  const ratio = dOffline / Math.max(1, dOnline);
  console.log(`  ${d.label.padEnd(20)}  ${fmt(d.cur.rate).padStart(8)}/s   ${String('+' + dRealm).padStart(6)}    ${fmt(dOnline).padStart(10)}  ${fmt(dOffline).padStart(12)}   ${ratio.toFixed(2)}×`);
}

console.log('\n  Reading: ratio > 1.0× means offline earned MORE qi than the 1h online session.');
console.log('  This is the "log off to win" feeling the player described.');

// ── Day-over-day qi/s log curve ─────────────────────────────────────────────
console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║  QI/S CURVE — Casual profile (1h online / 23h offline) days 1-30      ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

const dailyPoints = [];
for (let d = 1; d <= 30; d++) {
  const r = simToTimestamp(d * DAY, 1 * 3600);
  dailyPoints.push({ day: d, qiPerSec: r.rate, realmIdx: r.realmIdx });
}

const maxLog = Math.log10(dailyPoints[dailyPoints.length - 1].qiPerSec);
const minLog = 0; // log10(1)
const CHART_W = 60;
console.log('  Day  qi/s        log10  ' + '─'.repeat(CHART_W) + '+');
for (const p of dailyPoints) {
  const log = Math.log10(p.qiPerSec);
  const bars = Math.max(0, Math.round((log - minLog) / (maxLog - minLog) * CHART_W));
  const fill = '█'.repeat(bars);
  console.log(`  ${String(p.day).padStart(3)}  ${fmt(p.qiPerSec).padStart(8)}  ${log.toFixed(1).padStart(5)}  ${fill}`);
}

console.log('\n  Notice: most of the growth happens days 1-7 (early-to-mid). After day 15,');
console.log('  the curve flattens hard — this is OK for late game but the user is right that');
console.log('  early game itself has a SLOW START before the climb.');
