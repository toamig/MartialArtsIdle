/**
 * sim-tuning-proposal.mjs — A/B comparison of current vs tuned values.
 *
 * Tests whether the proposed v1 tuning hits the "early-game density" target
 * (first mechanic ≤5 min, first major breakthrough ≤8 min, offl/onl ≤1.5×)
 * WITHOUT trashing the mid-game pacing (Saint Early ≈ end of day 1, OH L6
 * ≈ 2-4 weeks for casual).
 *
 * Run: node scripts/sim-tuning-proposal.mjs
 */

// ── CURRENT (live) values ───────────────────────────────────────────────────
const CURRENT = {
  REALMS: [
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
  ],
  PRODUCERS: [
    { id: 'p_disciple',          startCost: 15,            startQiPerSec: 0.1,       unlock: 0  },
    { id: 'p_herb_garden',       startCost: 100,           startQiPerSec: 1,         unlock: 4  },
    { id: 'p_meridian_furnace',  startCost: 1_100,         startQiPerSec: 8,         unlock: 9  },
    { id: 'p_treasure',          startCost: 12_000,        startQiPerSec: 47,        unlock: 13 },
    { id: 'p_beast_pact',        startCost: 130_000,       startQiPerSec: 260,       unlock: 17 },
    { id: 'p_pillar',            startCost: 1_400_000,     startQiPerSec: 1_400,     unlock: 20 },
    { id: 'p_sect_followers',    startCost: 20_000_000,    startQiPerSec: 7_800,     unlock: 23 },
    { id: 'p_void',              startCost: 330_000_000,   startQiPerSec: 44_000,    unlock: 29 },
    { id: 'p_dragon',            startCost: 5_100_000_000, startQiPerSec: 260_000,   unlock: 35 },
    { id: 'p_phoenix',           startCost: 75_000_000_000,startQiPerSec: 1_600_000, unlock: 44 },
  ],
  CRYSTAL_BASE: 25,
  CRYSTAL_EXP:  3.00,
  CRYSTAL_MULT_PER_LEVEL: 0.01,
  CRYSTAL_TIER_LEVELS: { 1:1, 2:10, 3:25, 4:50, 5:100, 6:200, 7:350, 8:500, 9:750, 10:1000 },
  OFFLINE_BASE_RATE_MULT: 0.20,
  OFFLINE_BASE_CAP_S: 8 * 3600,
  BASE_RATE: 1,
};

// ── PROPOSED v1 tuning ──────────────────────────────────────────────────────
// Goals (numbers policy — these are STARTING VALUES, see test plan below):
//   1. First mechanic unlock ≤ 5 min   (was 28 min)
//   2. First major breakthrough ≤ 8 min (was 26 min)
//   3. Layer breakthrough cadence in TB: every 30-90s (was 30s-4min spread)
//   4. Offline:Online ratio ≤ 1.5× in first 3 days (was 4× day 1)
//   5. Saint Early at ≈ end of day 1 (was day 2 casual / 4h hardcore)
//   6. OH L6 still 2-4 weeks for casual (current 18d casual — keep)
const PROPOSED = {
  REALMS: [
    // Tempered Body: compress costs to ~half so layers come quickly
    // Current: 50, 100, 175, 300, 500, 850, 1400, 2400, 4000, 6500 (130× spread)
    // New:     30,  60,  100, 160, 240, 380, 580,  860,  1300, 2000 (67× spread)
    30, 60, 100, 160, 240, 380, 580, 860, 1300, 2000,
    // First major realm (Qi Transform) — large reduction so it lands in ~6-8 min
    40_000, 85_000, 170_000, 320_000,
    // True Element — proportional reduction (currently 1.65M..10.5M is 11× the QT block)
    520_000, 1_000_000, 1_900_000, 3_400_000,
    // Separation & Reunion — also reduced. Old: 18M..55M; new: 6M..19M (proportional)
    6_000_000, 10_500_000, 19_000_000,
    // Immortal Ascension. Old: 95M..300M; new: 33M..104M
    33_000_000, 58_000_000, 104_000_000,
    // Saint. Old: 500M..1.5B; new: 173M..520M
    173_000_000, 305_000_000, 520_000_000,
    // Saint King. Old: 2.55B..7.6B; new: 885M..2.6B
    885_000_000, 1_500_000_000, 2_600_000_000,
    // Origin Returning. Old: 12.5B..36B; new: 4.3B..12.5B
    4_300_000_000, 7_600_000_000, 12_500_000_000,
    // Origin King. Old: 62B..185B; new: 21B..64B
    21_500_000_000, 36_500_000_000, 64_000_000_000,
    // Void King. Old: 305B..860B; new: 105B..300B
    105_000_000_000, 178_000_000_000, 300_000_000_000,
    // Dao Source. Old: 1.5T..4.15T; new: 520B..1.4T
    520_000_000_000, 850_000_000_000, 1_400_000_000_000,
    // Emperor Realm. Old: 6.9T..20T; new: 2.4T..7T
    2_400_000_000_000, 4_150_000_000_000, 7_000_000_000_000,
    // Open Heaven L1-L6. Old: 34T..448.5T; new: 12T..157T (Saturday final still feels heavy)
    11_700_000_000_000, 19_700_000_000_000, 31_600_000_000_000,
    54_300_000_000_000, 91_300_000_000_000, 157_000_000_000_000,
  ],
  PRODUCERS: [
    // p_disciple: lower start cost so first buy hits in ~10s, double output so it FEELS
    { id: 'p_disciple',          startCost: 10,            startQiPerSec: 0.2,       unlock: 0  },
    // p_herb_garden: lower cost so second producer arrives within first 90s, slight bump output
    { id: 'p_herb_garden',       startCost: 80,            startQiPerSec: 1.5,       unlock: 4  },
    // p_meridian_furnace: minor cost cut to keep TB→QT transition lively
    { id: 'p_meridian_furnace',  startCost: 900,           startQiPerSec: 10,        unlock: 9  },
    // Remaining producers: pass-through (mid-game tuning untouched).
    { id: 'p_treasure',          startCost: 12_000,        startQiPerSec: 47,        unlock: 13 },
    { id: 'p_beast_pact',        startCost: 130_000,       startQiPerSec: 260,       unlock: 17 },
    { id: 'p_pillar',            startCost: 1_400_000,     startQiPerSec: 1_400,     unlock: 20 },
    { id: 'p_sect_followers',    startCost: 20_000_000,    startQiPerSec: 7_800,     unlock: 23 },
    { id: 'p_void',              startCost: 330_000_000,   startQiPerSec: 44_000,    unlock: 29 },
    { id: 'p_dragon',            startCost: 5_100_000_000, startQiPerSec: 260_000,   unlock: 35 },
    { id: 'p_phoenix',           startCost: 75_000_000_000,startQiPerSec: 1_600_000, unlock: 44 },
  ],
  // Crystal: shallower curve early levels so first mechanic comes ASAP.
  // Old: cost = 25 × L^3.0 → L10 = 25,000. L5 = 3,125.
  // New: cost = 15 × L^2.5 → L10 = 4,743. L5 = 838.
  // Combined with moving first mechanic to crystal LEVEL 5 (was level 10) — see below.
  CRYSTAL_BASE: 15,
  CRYSTAL_EXP:  2.50,
  CRYSTAL_MULT_PER_LEVEL: 0.01,
  // First three mechanics arrive earlier:
  CRYSTAL_TIER_LEVELS: { 1:1, 2:5, 3:15, 4:35, 5:75, 6:150, 7:300, 8:500, 9:750, 10:1000 },
  // Offline base rate cut so the "logging off > playing" gap closes.
  // Current 20% means a 1h online session is worth less than 5h of offline.
  // Reduce to 12.5%, so 8h offline ≈ 1h online. Hardcore offline players still get 8h+
  // bonus from upgrades.
  OFFLINE_BASE_RATE_MULT: 0.125,
  // Slight cap reduction (8h → 6h base) — offline cap upgrades still ramp it to 22h total.
  OFFLINE_BASE_CAP_S: 6 * 3600,
  BASE_RATE: 1,
};

// ── Sim machinery (shared) ──────────────────────────────────────────────────
const COST_SCALING = 1.15;
function crystalLevelCost(toLevel, cfg) {
  if (toLevel < 1) return 0;
  const raw = cfg.CRYSTAL_BASE * Math.pow(toLevel, cfg.CRYSTAL_EXP);
  const step = Math.pow(10, Math.max(1, Math.floor(Math.log10(raw)) - 1));
  return Math.round(raw / step) * step;
}
const MAJOR_TRANSITIONS = new Set([9, 13, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44]);
const SPARK_RATE = { Crystal: 0.10, Consec: 0.12, Divine: 0.15, Pattern: 0.20 };
const FOCUS_DUTY = 0.20;

function rate(s, cfg) {
  let r = cfg.BASE_RATE;
  for (let i = 0; i < cfg.PRODUCERS.length; i++) {
    if (s.owned[i] > 0) r += s.owned[i] * cfg.PRODUCERS[i].startQiPerSec * Math.pow(2, s.ownedDouble[i]);
  }
  r *= (1 + s.crystalLevel * cfg.CRYSTAL_MULT_PER_LEVEL);
  // Sparks
  let sm = 1;
  if (s.mech.has('Crystal'))  sm *= 1 + SPARK_RATE.Crystal;
  if (s.mech.has('Divine'))   sm *= 1 + SPARK_RATE.Divine;
  if (s.mech.has('Pattern'))  sm *= 1 + SPARK_RATE.Pattern;
  r *= sm;
  // Focus (time-averaged ~+30% effective when ConsecutiveFocus is unlocked too)
  let focusPct = 3.00;
  if (s.mech.has('Consec')) focusPct *= 1 + SPARK_RATE.Consec;
  const focusWeighted = FOCUS_DUTY * focusPct + (1 - FOCUS_DUTY) * 1;
  r *= focusWeighted;
  // Ad boost (always on while online with cooldown — effective 50% of the time)
  r *= 1.50;
  return r;
}
function pcost(s, i, cfg) {
  return Math.ceil(cfg.PRODUCERS[i].startCost * Math.pow(COST_SCALING, s.owned[i]));
}
function newState() {
  return {
    owned: Array(10).fill(0), ownedDouble: Array(10).fill(0),
    realmIndex: 0, qi: 0, qiEarnedRealm: 0, qiTotal: 0,
    crystalLevel: 0, crystalRqi: 0,
    mech: new Set(),  // 'Crystal','Consec','Divine','Pattern'
    elapsedS: 0, onlineQiTotal: 0, offlineQiTotal: 0,
  };
}
function tryBuy(s, cfg) {
  let bestRatio = 0, best = null;
  for (let i = 0; i < cfg.PRODUCERS.length; i++) {
    if (s.realmIndex < cfg.PRODUCERS[i].unlock) continue;
    const c = pcost(s, i, cfg);
    if (c > s.qi) continue;
    const g = cfg.PRODUCERS[i].startQiPerSec * Math.pow(2, s.ownedDouble[i]);
    const r = g / c;
    if (r > bestRatio) { bestRatio = r; best = { kind: 'p', i, c }; }
  }
  const cc = crystalLevelCost(s.crystalLevel + 1, cfg) - s.crystalRqi;
  if (cc > 0 && cc <= s.qi) {
    const flat = rate(s, cfg);
    const g = flat * cfg.CRYSTAL_MULT_PER_LEVEL;
    const r = g / cc;
    if (r > bestRatio) { bestRatio = r; best = { kind: 'c', c: cc }; }
  }
  if (!best) return false;
  s.qi -= best.c;
  if (best.kind === 'p') s.owned[best.i]++;
  else {
    s.crystalRqi += best.c;
    while (s.crystalRqi >= crystalLevelCost(s.crystalLevel + 1, cfg)) {
      s.crystalRqi -= crystalLevelCost(s.crystalLevel + 1, cfg);
      s.crystalLevel++;
      // Mechanic unlocks
      const TIER = cfg.CRYSTAL_TIER_LEVELS;
      if (s.crystalLevel >= TIER[2] && !s.mech.has('Crystal'))  s.mech.add('Crystal');
      if (s.crystalLevel >= TIER[3] && !s.mech.has('Consec'))   s.mech.add('Consec');
      if (s.crystalLevel >= TIER[4] && !s.mech.has('Divine'))   s.mech.add('Divine');
      if (s.crystalLevel >= TIER[5] && !s.mech.has('Pattern'))  s.mech.add('Pattern');
    }
  }
  return true;
}

function simulate(cfg, dayOnlineS, maxDays) {
  const s = newState();
  const milestones = [];
  const dayLog = [];
  let dayStart = 0, nextDay = 24 * 3600;
  const TICK = 5;
  let dayOnlineQi = 0, dayOfflineQi = 0;
  const seenMech = new Set();

  while (s.elapsedS < maxDays * 24 * 3600 && s.realmIndex < cfg.REALMS.length - 1) {
    if (s.elapsedS >= nextDay) {
      dayLog.push({ day: Math.round(nextDay / (24 * 3600)), rate: rate(s, cfg), realm: s.realmIndex, crystalLevel: s.crystalLevel, dayOnlineQi, dayOfflineQi });
      dayOnlineQi = 0; dayOfflineQi = 0;
      dayStart = nextDay; nextDay = dayStart + 24 * 3600;
    }
    const dayElapsed = s.elapsedS - dayStart;
    const online = dayElapsed < dayOnlineS;
    if (online) {
      const r = rate(s, cfg);
      const dq = r * TICK;
      s.qi += dq; s.qiEarnedRealm += dq; s.qiTotal += dq;
      s.onlineQiTotal += dq; dayOnlineQi += dq;
      while (tryBuy(s, cfg)) {}
      for (const m of s.mech) if (!seenMech.has(m)) {
        seenMech.add(m);
        milestones.push({ kind: 'mech', name: m, t: s.elapsedS });
      }
      if (s.qiEarnedRealm >= cfg.REALMS[s.realmIndex]) {
        s.qiEarnedRealm -= cfg.REALMS[s.realmIndex];
        s.realmIndex++;
        milestones.push({ kind: 'realm', idx: s.realmIndex, t: s.elapsedS });
      }
      s.elapsedS += TICK;
    } else {
      const offlineWindow = Math.min(nextDay - s.elapsedS, cfg.OFFLINE_BASE_CAP_S);
      // Offline rate uses producer flat × crystal mult × offline mult — no ad/spark/focus
      let r = cfg.BASE_RATE;
      for (let i = 0; i < cfg.PRODUCERS.length; i++) r += s.owned[i] * cfg.PRODUCERS[i].startQiPerSec * Math.pow(2, s.ownedDouble[i]);
      r *= 1 + s.crystalLevel * cfg.CRYSTAL_MULT_PER_LEVEL;
      r *= cfg.OFFLINE_BASE_RATE_MULT;
      const dq = r * offlineWindow;
      s.qi += dq; s.qiEarnedRealm += dq; s.qiTotal += dq;
      s.offlineQiTotal += dq; dayOfflineQi += dq;
      while (s.qiEarnedRealm >= cfg.REALMS[s.realmIndex] && s.realmIndex < cfg.REALMS.length - 1) {
        s.qiEarnedRealm -= cfg.REALMS[s.realmIndex];
        s.realmIndex++;
        milestones.push({ kind: 'realm', idx: s.realmIndex, t: s.elapsedS });
      }
      s.elapsedS = nextDay;
    }
  }
  return { s, milestones, dayLog };
}

function fmt(s) {
  if (s < 60) return `${s.toFixed(0)}s`;
  if (s < 3600) return `${(s/60).toFixed(1)}m`;
  if (s < 86400) return `${(s/3600).toFixed(1)}h`;
  return `${(s/86400).toFixed(2)}d`;
}
function fmtQ(n) {
  if (n >= 1e12) return (n/1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n/1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n/1e6).toFixed(1)  + 'M';
  if (n >= 1e3)  return (n/1e3).toFixed(1)  + 'K';
  return n.toFixed(0);
}

// ── Run A/B for casual + hardcore profiles ──────────────────────────────────
const PROFILES = [
  { name: 'Casual   (1h online / 23h offline per day)', dayOnlineS: 1 * 3600, maxDays: 35 },
  { name: 'Hardcore (8h online / 16h offline per day)', dayOnlineS: 8 * 3600, maxDays: 25 },
];

const TARGETS = [
  { key: 'mech-Crystal',  label: '★ FIRST MECHANIC (Crystal Reservoir)',  match: m => m.kind === 'mech'  && m.name === 'Crystal' },
  { key: 'realm-10',      label: '★ FIRST MAJOR BK (Qi Transform Early)', match: m => m.kind === 'realm' && m.idx === 10 },
  { key: 'mech-Consec',   label: 'Second mechanic (Consecutive Focus)',    match: m => m.kind === 'mech'  && m.name === 'Consec' },
  { key: 'mech-Divine',   label: 'Third mechanic (Divine Qi)',             match: m => m.kind === 'mech'  && m.name === 'Divine' },
  { key: 'mech-Pattern',  label: 'Fourth mechanic (Tracing Meridians)',    match: m => m.kind === 'mech'  && m.name === 'Pattern' },
  { key: 'realm-13',      label: 'Qi Transform Peak',                      match: m => m.kind === 'realm' && m.idx === 13 },
  { key: 'realm-17',      label: 'True Element Peak',                      match: m => m.kind === 'realm' && m.idx === 17 },
  { key: 'realm-24',      label: 'Saint Early',                            match: m => m.kind === 'realm' && m.idx === 24 },
  { key: 'realm-30',      label: 'Origin Returning 1st',                   match: m => m.kind === 'realm' && m.idx === 30 },
  { key: 'realm-45',      label: 'Open Heaven L1',                         match: m => m.kind === 'realm' && m.idx === 45 },
  { key: 'realm-50',      label: 'Open Heaven L6 (final)',                 match: m => m.kind === 'realm' && m.idx === 50 },
];

for (const p of PROFILES) {
  const cur = simulate(CURRENT,  p.dayOnlineS, p.maxDays);
  const tun = simulate(PROPOSED, p.dayOnlineS, p.maxDays);

  console.log(`\n╔════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║ A/B — ${p.name.padEnd(67)} ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════════════╝\n`);

  console.log('  Milestone                                       CURRENT       TUNED v1     Δ');
  console.log('  ──────────────────────────────────────────────  ───────────  ───────────  ────────');
  for (const target of TARGETS) {
    const c = cur.milestones.find(target.match);
    const t = tun.milestones.find(target.match);
    const cStr = c ? fmt(c.t) : '—';
    const tStr = t ? fmt(t.t) : '—';
    let delta = '';
    if (c && t) {
      const ratio = t.t / c.t;
      if (ratio < 0.9) delta = `${((1-ratio)*100).toFixed(0)}% faster`;
      else if (ratio > 1.1) delta = `${((ratio-1)*100).toFixed(0)}% slower`;
      else delta = '~same';
    }
    console.log(`  ${target.label.padEnd(46)}  ${cStr.padStart(10)}  ${tStr.padStart(11)}  ${delta}`);
  }

  // Day 1-3 ratio comparison
  console.log('\n  Online vs Offline qi per day:');
  console.log('  Day    CURRENT online   CURRENT offline   Ratio    TUNED online   TUNED offline   Ratio');
  console.log('  ───    ──────────────   ───────────────   ──────   ────────────   ─────────────   ──────');
  for (let d = 0; d < Math.min(5, cur.dayLog.length, tun.dayLog.length); d++) {
    const cd = cur.dayLog[d], td = tun.dayLog[d];
    const cr = cd.dayOfflineQi / Math.max(1, cd.dayOnlineQi);
    const tr = td.dayOfflineQi / Math.max(1, td.dayOnlineQi);
    console.log(`   ${String(cd.day).padStart(2)}     ${fmtQ(cd.dayOnlineQi).padStart(12)}    ${fmtQ(cd.dayOfflineQi).padStart(14)}    ${cr.toFixed(2)}×    ${fmtQ(td.dayOnlineQi).padStart(11)}    ${fmtQ(td.dayOfflineQi).padStart(12)}    ${tr.toFixed(2)}×`);
  }
}

// ── First-30-minute event timeline, tuned ───────────────────────────────────
function simEarlyTuned(cfg, durSec = 30 * 60) {
  const s = newState();
  const events = [];
  for (let t = 0; t <= durSec; t += 1) {
    const r = rate(s, cfg);
    s.qi += r; s.qiEarnedRealm += r;
    while (tryBuy(s, cfg)) {}
    for (const m of s.mech) {
      const tag = { Crystal:'Crystal Reservoir', Consec:'Consecutive Focus', Divine:'Divine Qi', Pattern:'Tracing Meridians' }[m];
      if (!events.find(e => e.label === `★ ${tag} UNLOCKED`)) {
        events.push({ t, label: `★ ${tag} UNLOCKED` });
      }
    }
    while (s.realmIndex < cfg.REALMS.length - 1 && s.qiEarnedRealm >= cfg.REALMS[s.realmIndex]) {
      s.qiEarnedRealm -= cfg.REALMS[s.realmIndex];
      s.realmIndex++;
      events.push({ t, label: `→ realm ${s.realmIndex} ${s.realmIndex === 10 ? '★★ FIRST MAJOR BREAKTHROUGH' : ''}` });
    }
    if (s.crystalLevel > (events.lastCrystalLevel || 0)) {
      events.lastCrystalLevel = s.crystalLevel;
    }
  }
  return { events, finalRate: rate(s, cfg), finalCrystalLevel: s.crystalLevel };
}

console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║  EARLY-GAME TIMELINE (first 15 min)                                    ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

console.log('  CURRENT timeline:');
const earlyCur = simEarlyTuned(CURRENT, 15 * 60);
for (const e of earlyCur.events) console.log(`    ${(e.t/60).toFixed(1).padStart(4)}m   ${e.label}`);
console.log(`  Events in first 15 min: ${earlyCur.events.length}\n`);

console.log('  TUNED v1 timeline:');
const earlyTun = simEarlyTuned(PROPOSED, 15 * 60);
for (const e of earlyTun.events) console.log(`    ${(e.t/60).toFixed(1).padStart(4)}m   ${e.label}`);
console.log(`  Events in first 15 min: ${earlyTun.events.length}`);

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║  TUNED v1 — what changes?                                              ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');
console.log('  ⚙ Realm costs (TB layers): halved across the board');
console.log('      L1 50→30, L2 100→60, L3 175→100, ... L10 6,500→2,000');
console.log('  ⚙ First major breakthrough cost (QT Early): 150,000 → 40,000  (3.75× cheaper)');
console.log('  ⚙ Crystal cost curve: 25 × L^3.0 → 15 × L^2.5');
console.log('      L5  cost: 3,125 → 838   (3.7× cheaper)');
console.log('      L10 cost: 25,000 → 4,743 (5.3× cheaper)');
console.log('  ⚙ Crystal tier → mechanic unlock thresholds:');
console.log('      T2 (1st mechanic):  level 10 → level 5');
console.log('      T3 (2nd mechanic):  level 25 → level 15');
console.log('      T4 (3rd mechanic):  level 50 → level 35');
console.log('      T5 (4th mechanic):  level 100 → level 75');
console.log('  ⚙ p_disciple:  cost 15→10, qi/s 0.1→0.2 (first buy in ~10s, more impact)');
console.log('  ⚙ p_herb_garden: cost 100→80, qi/s 1→1.5');
console.log('  ⚙ p_meridian_furnace: cost 1100→900, qi/s 8→10');
console.log('  ⚙ Offline rate: 20% → 12.5%  (offline still good, but ≤ 1h online session)');
console.log('  ⚙ Offline cap: 8h → 6h base (upgrades still ramp it to 22h max)');
console.log('  ⚙ Mid-game realm costs (QT Peak → Saint): scaled proportionally so mid-game pacing');
console.log('      stays roughly the same calendar-time — what changes is the EARLY ramp.\n');
