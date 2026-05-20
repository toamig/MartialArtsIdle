/**
 * sim-progression-analysis.mjs — analytic pacing simulator for player feel.
 *
 * Mirrors sim-cultivation.mjs's economy model, but:
 *  - Models REALISTIC active multiplier (1.0 baseline, ramping with sparks
 *    earned, law offers picked up at majors, and the ad-boost rewarded video).
 *  - Tracks ALL milestones the player feels: first major breakthrough, every
 *    crystal mechanic unlock, every spark unlock, every realm name change.
 *  - Tests three player profiles:
 *      - "Hyper-casual"  — 15 min online + 23 h 45 min offline per 24 h
 *      - "Casual"        — 1 h   online + 23 h          offline per 24 h
 *      - "Hardcore"      — 8 h   online + 16 h          offline per 24 h
 *  - Folds in offline cap (8 h base) and offline rate (20% base).
 *  - Folds in ad-boost rewarded video (2× for 30 min, 30 min cooldown — assume
 *    the player redeems it every cycle while online).
 *  - Reports a per-day qi-earned curve so we can SEE the flat early game vs
 *    the mid-game spike the user described.
 *
 * Run: node scripts/sim-progression-analysis.mjs
 */

// ── Data (in sync with src/data/) ────────────────────────────────────────────
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

// Major-realm transitions — name changes. Major breakthroughs are now player-
// gated; sim auto-confirms when player is "online" within the day.
const MAJOR_TRANSITIONS = new Set([9, 13, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44]);
const REALM_NAMES = [
  'Tempered Body L1','TB L2','TB L3','TB L4','TB L5','TB L6','TB L7','TB L8','TB L9','TB L10',
  'Qi Transform E','QT M','QT L','QT Peak',
  'True Element E','TE M','TE L','TE Peak',
  'Separation 1st','S 2nd','S 3rd',
  'Immortal Asc 1st','IA 2nd','IA 3rd',
  'Saint E','S M','S L',
  'Saint King 1st','SK 2nd','SK 3rd',
  'Origin Return 1st','OR 2nd','OR 3rd',
  'Origin King 1st','OK 2nd','OK 3rd',
  'Void King 1st','VK 2nd','VK 3rd',
  'Dao Source 1st','DS 2nd','DS 3rd',
  'Emperor 1st','E 2nd','E 3rd',
  'Open Heaven L1','OH L2','OH L3','OH L4','OH L5','OH L6',
];

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

const PRODUCERS = [
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
];
const COST_SCALING = 1.15;

const PRODUCER_DOUBLE_T1_MULT_COST = 250;
const PRODUCER_DOUBLE_T2_MULT_COST = 5;
const PRODUCER_DOUBLE_T1_OWNED_REQ = 10;
const PRODUCER_DOUBLE_T2_OWNED_REQ = 25;

const FOCUS_UPGRADES = [
  { id: 'u_focus_1', cost:           5_000, realm:  9, addPct: 0.50 },
  { id: 'u_focus_2', cost:         100_000, realm: 17, addPct: 0.50 },
  { id: 'u_focus_3', cost:       2_000_000, realm: 29, addPct: 0.50 },
  { id: 'u_focus_4', cost: 100_000_000_000, realm: 44, addPct: 1.00 },
];

// Crystal — Round 3, qi-fed. Base cost 25, exp 3.0. Mult per level 0.01.
const CRYSTAL_BASE = 25;
const CRYSTAL_EXP  = 3.00;
const CRYSTAL_MULT_PER_LEVEL = 0.01;
function crystalLevelCost(toLevel) {
  if (toLevel < 1) return 0;
  const raw = CRYSTAL_BASE * Math.pow(toLevel, CRYSTAL_EXP);
  const step = Math.pow(10, Math.max(1, Math.floor(Math.log10(raw)) - 1));
  return Math.round(raw / step) * step;
}

// Crystal visual tier → first level. Levels listed in `gd.crystalEvolve`.
const CRYSTAL_TIER_LEVELS = { 1:1, 2:10, 3:25, 4:50, 5:100, 6:200, 7:350, 8:500, 9:750, 10:1000 };
// Mechanic unlocks per crystal tier (from crystalMechanicGrants.js).
const CRYSTAL_TIER_MECHANIC = {
  2: 'Crystal Reservoir',
  3: 'Consecutive Focus',
  4: 'Divine Qi',
  5: 'Tracing Meridians',
};

// Spark contribution model (rough). Each mechanic, when granted at T1, gives the
// player a small persistent rate boost. Tier-ups via shop upgrades stack further.
// Model only the qi/s contribution; UI feel is separate.
const SPARK_RATE_BONUS = {
  'Crystal Reservoir': 0.10,   // taps fill reservoir, plus +10% effective qi/s when tapping regularly
  'Consecutive Focus': 0.12,   // +12% on top of focus mult when held > 4s
  'Divine Qi':         0.15,   // orb taps every 2.5 min → ~+15% sustained
  'Tracing Meridians': 0.20,   // mini-game on full clear gives 40s qi pulses
};

// Ad boost. Rewarded ad gives 2× rate for 30 min, with 30 min cooldown
// (effectively half the online time at 2×, so effective +50% sustained during
// the online window when the player redeems consistently).
const AD_BOOST_MULT          = 2.0;
const AD_BOOST_DURATION_S    = 30 * 60;
const AD_BOOST_COOLDOWN_S    = 30 * 60;

// Offline cultivation. Base 0.20× rate, 8h cap. Both grow via shop upgrades but
// in the early game neither is bought yet.
const OFFLINE_BASE_RATE_MULT = 0.20;
const OFFLINE_BASE_CAP_S     = 8 * 3600;

const OFFLINE_RATE_UPGRADES = [
  { realm:  9, cost:        50_000, add: 0.05 },
  { realm: 17, cost:    50_000_000, add: 0.05 },
  { realm: 27, cost: 5_000_000_000, add: 0.05 },
  { realm: 38, cost: 500_000_000_000, add: 0.05 },
];
const OFFLINE_CAP_UPGRADES = [
  { realm: 13, cost:        250_000, addS: 4 * 3600 },
  { realm: 20, cost:    250_000_000, addS: 4 * 3600 },
  { realm: 30, cost:  50_000_000_000, addS: 4 * 3600 },
  { realm: 41, cost: 5_000_000_000_000, addS: 4 * 3600 },
];

// ── Sim state + helpers ─────────────────────────────────────────────────────
function makeState() {
  return {
    owned: PRODUCERS.map(() => 0),
    ownedDouble: PRODUCERS.map(() => 0),
    focusBought: new Set(),
    offlineRateBought: new Set(),
    offlineCapBought: new Set(),
    realmIndex: 0,
    qi: 0,
    qiEarnedThisRealm: 0,
    qiEarnedTotal: 0,
    crystalLevel: 0,
    crystalRqi: 0,
    crystalTier: 1,
    mechanicsUnlocked: new Set(),
    // Boost / focus
    focusMultPct: 3.00,           // 1× base + 200% when holding (focus button: 3.0× total)
    // Active engagement model:
    //  - "online" means real-time tick, with boost held SOMETIMES (~20% duty),
    //    and ad-boost redeemed every 30 min cooldown.
    //  - "offline" means OFFLINE_RATE × min(elapsed, cap).
    online: true,
    elapsedS: 0,
    adBoostEndsAt: 0,
    adBoostCdEndsAt: 0,
  };
}

function productOutput(s, i) {
  return s.owned[i] * PRODUCERS[i].startQiPerSec * Math.pow(2, s.ownedDouble[i]);
}
function totalProducerRate(s) {
  let r = 0;
  for (let i = 0; i < PRODUCERS.length; i++) {
    if (s.owned[i] > 0) r += productOutput(s, i);
  }
  return r;
}
function crystalMult(s) {
  return 1 + s.crystalLevel * CRYSTAL_MULT_PER_LEVEL;
}
function focusMult(s, boostHeld) {
  if (!boostHeld) return 1;
  // 1× base + (focusMultPct-1) when holding. Spark Consecutive Focus stacks.
  let pct = s.focusMultPct;
  if (s.mechanicsUnlocked.has('Consecutive Focus')) {
    pct *= 1 + SPARK_RATE_BONUS['Consecutive Focus'];
  }
  return pct;
}
function sparkRateBonusMult(s) {
  // Each granted mechanic except Consecutive Focus contributes a sustained
  // multiplicative bonus (Consecutive Focus is folded into focusMult).
  let m = 1;
  if (s.mechanicsUnlocked.has('Crystal Reservoir'))    m *= 1 + SPARK_RATE_BONUS['Crystal Reservoir'];
  if (s.mechanicsUnlocked.has('Divine Qi'))            m *= 1 + SPARK_RATE_BONUS['Divine Qi'];
  if (s.mechanicsUnlocked.has('Tracing Meridians'))    m *= 1 + SPARK_RATE_BONUS['Tracing Meridians'];
  return m;
}
function adBoostMult(s) {
  return s.elapsedS < s.adBoostEndsAt ? AD_BOOST_MULT : 1;
}

// Online rate at the current state. boostHeldDuty is fraction (0..1) of time
// the player holds the focus button (0.20 ≈ casual hold).
function onlineRate(s, boostHeldDuty = 0.20) {
  const flat = 1 + totalProducerRate(s);
  const c    = crystalMult(s);
  const ad   = adBoostMult(s);
  const sparks = sparkRateBonusMult(s);
  // Boost contribution: time-weighted average of focusMult (when holding) vs 1
  const fmHeld = focusMult(s, true);
  const focusWeighted = boostHeldDuty * fmHeld + (1 - boostHeldDuty) * 1;
  return flat * c * ad * sparks * focusWeighted;
}

// Offline rate = baseRate * sum(unlocked offline_rate_add) × no focus, no ad,
// no sparks (game isn't running). Crystal mult DOES apply per the live code.
function offlineRate(s) {
  let mult = OFFLINE_BASE_RATE_MULT;
  for (const u of OFFLINE_RATE_UPGRADES) if (s.offlineRateBought.has(u)) mult += u.add;
  const flat = 1 + totalProducerRate(s);
  const c    = crystalMult(s);
  return flat * c * mult;
}
function offlineCapS(s) {
  let cap = OFFLINE_BASE_CAP_S;
  for (const u of OFFLINE_CAP_UPGRADES) if (s.offlineCapBought.has(u)) cap += u.addS;
  return cap;
}

function producerCost(s, i, n = 1) {
  const o = s.owned[i];
  const sc = COST_SCALING;
  return Math.ceil(PRODUCERS[i].startCost * Math.pow(sc, o) * (Math.pow(sc, n) - 1) / (sc - 1));
}

function recordSpark(s, label) {
  s.mechanicsUnlocked.add(label);
}

// Best-greedy buyer. boostHeldDuty fed in to weight the gain estimate.
function tryBuy(s, boostHeldDuty) {
  let bestRatio = 0;
  let bestAction = null;

  for (let i = 0; i < PRODUCERS.length; i++) {
    if (s.realmIndex < PRODUCERS[i].unlock) continue;
    const cost = producerCost(s, i, 1);
    if (cost > s.qi) continue;
    const gain = PRODUCERS[i].startQiPerSec * Math.pow(2, s.ownedDouble[i]);
    const ratio = gain / cost;
    if (ratio > bestRatio) { bestRatio = ratio; bestAction = { type: 'producer', i, cost }; }
  }
  // Crystal
  {
    const cost = crystalLevelCost(s.crystalLevel + 1) - s.crystalRqi;
    if (cost > 0 && cost <= s.qi) {
      const flatBase = 1 + totalProducerRate(s);
      const gain = flatBase * CRYSTAL_MULT_PER_LEVEL;
      const ratio = gain / cost;
      if (ratio > bestRatio) { bestRatio = ratio; bestAction = { type: 'crystal', cost }; }
    }
  }
  // Producer doubles
  for (let i = 0; i < PRODUCERS.length; i++) {
    const cur = s.ownedDouble[i];
    if (cur >= 2) continue;
    const ownedReq = cur === 0 ? PRODUCER_DOUBLE_T1_OWNED_REQ : PRODUCER_DOUBLE_T2_OWNED_REQ;
    if (s.owned[i] < ownedReq) continue;
    const t1Cost = Math.ceil(PRODUCERS[i].startCost * PRODUCER_DOUBLE_T1_MULT_COST);
    const cost = cur === 0 ? t1Cost : Math.ceil(t1Cost * PRODUCER_DOUBLE_T2_MULT_COST);
    if (cost > s.qi) continue;
    const currentOutput = productOutput(s, i);
    const gain = currentOutput; // doubling adds current
    const ratio = gain / cost;
    if (ratio > bestRatio) { bestRatio = ratio; bestAction = { type: 'producer_double', i, cost }; }
  }
  // Focus upgrades
  for (const u of FOCUS_UPGRADES) {
    if (s.focusBought.has(u.id)) continue;
    if (s.realmIndex < u.realm) continue;
    if (u.cost > s.qi) continue;
    // Approximate gain: rate × boostHeldDuty × addPct
    const cur = onlineRate(s, boostHeldDuty);
    const gain = cur * boostHeldDuty * u.addPct;
    const ratio = gain / u.cost;
    if (ratio > bestRatio) { bestRatio = ratio; bestAction = { type: 'focus', u, cost: u.cost }; }
  }
  // Offline rate / cap upgrades — purely offline benefit. Buy when affordable
  // and we're not currently online (i.e. price into the offline-time profile).
  // We approximate "always good" if cost < 10% of qi balance.
  for (const u of OFFLINE_RATE_UPGRADES) {
    if (s.offlineRateBought.has(u)) continue;
    if (s.realmIndex < u.realm) continue;
    if (u.cost > s.qi) continue;
    // Estimate: 8h offline at base rate ≈ 8h × baseRate. Add gives 5% to that.
    const offlineBenefit = offlineRate(s) * (u.add / OFFLINE_BASE_RATE_MULT) * 8 * 3600;
    const ratio = offlineBenefit / u.cost;
    if (ratio > bestRatio * 0.5) {  // weighted half — offline is delayed
      bestRatio = ratio; bestAction = { type: 'offline_rate', u, cost: u.cost };
    }
  }
  for (const u of OFFLINE_CAP_UPGRADES) {
    if (s.offlineCapBought.has(u)) continue;
    if (s.realmIndex < u.realm) continue;
    if (u.cost > s.qi) continue;
    const offlineBenefit = offlineRate(s) * u.addS;  // approx
    const ratio = offlineBenefit / u.cost;
    if (ratio > bestRatio * 0.5) {
      bestRatio = ratio; bestAction = { type: 'offline_cap', u, cost: u.cost };
    }
  }

  if (!bestAction) return false;

  s.qi -= bestAction.cost;
  if (bestAction.type === 'producer') s.owned[bestAction.i]++;
  else if (bestAction.type === 'producer_double') s.ownedDouble[bestAction.i]++;
  else if (bestAction.type === 'crystal') {
    s.crystalRqi += bestAction.cost;
    while (s.crystalRqi >= crystalLevelCost(s.crystalLevel + 1)) {
      s.crystalRqi -= crystalLevelCost(s.crystalLevel + 1);
      s.crystalLevel++;
      // Tier crossing → mechanic grant
      for (const [tier, mech] of Object.entries(CRYSTAL_TIER_MECHANIC)) {
        const lvl = CRYSTAL_TIER_LEVELS[tier];
        if (s.crystalLevel >= lvl && !s.mechanicsUnlocked.has(mech)) {
          recordSpark(s, mech);
        }
      }
    }
  }
  else if (bestAction.type === 'focus') { s.focusBought.add(bestAction.u.id); s.focusMultPct += bestAction.u.addPct; }
  else if (bestAction.type === 'offline_rate') s.offlineRateBought.add(bestAction.u);
  else if (bestAction.type === 'offline_cap')  s.offlineCapBought.add(bestAction.u);
  return true;
}

// Run the sim for `secondsTotal` of WALL-CLOCK time with `dayOnlineS` seconds
// online per 24h day, rest offline. Records milestones in `out.milestones` and
// a daily snapshot of (qi/s, realm, mechanics, qiEarned) in `out.daily`.
function simulate({ dayOnlineS, maxDays, boostHeldDuty = 0.20 }) {
  const s = makeState();
  const milestones = [];
  const daily      = [];
  const TICK = 5;  // 5-second ticks for online (smaller = more accurate, more compute)
  const MAX = maxDays * 24 * 3600;

  let dayIdx = 0;
  let dayStart = 0;
  let onlineWindowEnd = dayOnlineS;
  let onlineCycleEnd = dayOnlineS;
  let nextDayStart = 24 * 3600;

  function markRealm(idx) {
    milestones.push({ kind: 'realm', idx, name: REALM_NAMES[idx], t: s.elapsedS });
  }
  function markMechanic(name) {
    milestones.push({ kind: 'mechanic', name, t: s.elapsedS });
  }

  let mechanicsSeen = new Set();

  while (s.elapsedS < MAX && s.realmIndex < REALMS.length - 1) {
    // Day boundary?
    if (s.elapsedS >= nextDayStart) {
      // Snapshot end of day.
      daily.push({
        day: dayIdx + 1,
        elapsedS: s.elapsedS,
        realm: s.realmIndex,
        realmName: REALM_NAMES[s.realmIndex],
        qi: s.qi,
        qiPerSec: onlineRate(s, boostHeldDuty),
        crystalLevel: s.crystalLevel,
        mechanics: [...s.mechanicsUnlocked],
        producers: s.owned.slice(),
      });
      dayIdx++;
      dayStart        = s.elapsedS;
      onlineWindowEnd = dayStart + dayOnlineS;
      nextDayStart    = dayStart + 24 * 3600;
    }

    const inOnlineWindow = s.elapsedS < onlineWindowEnd;
    if (inOnlineWindow) {
      // Online tick: real-time accrual.
      // Ad boost: redeem whenever cooldown ends and boost not active.
      if (s.elapsedS >= s.adBoostCdEndsAt && s.elapsedS >= s.adBoostEndsAt) {
        s.adBoostEndsAt   = s.elapsedS + AD_BOOST_DURATION_S;
        s.adBoostCdEndsAt = s.elapsedS + AD_BOOST_COOLDOWN_S;
      }
      const rate = onlineRate(s, boostHeldDuty);
      const dq = rate * TICK;
      s.qi += dq;
      s.qiEarnedThisRealm += dq;
      s.qiEarnedTotal += dq;

      while (tryBuy(s, boostHeldDuty)) { /* greedy */ }

      // Crystal milestones — auto-detected during tryBuy
      for (const m of s.mechanicsUnlocked) {
        if (!mechanicsSeen.has(m)) { mechanicsSeen.add(m); markMechanic(m); }
      }

      // Breakthrough check
      const cost = REALMS[s.realmIndex];
      if (s.qiEarnedThisRealm >= cost) {
        // Major gate?
        if (MAJOR_TRANSITIONS.has(s.realmIndex)) {
          const need = requiredRate(s.realmIndex);
          if (onlineRate(s, boostHeldDuty) < need) {
            // Stall — cap meter; wait until rate climbs (will happen as more producers buy in)
            s.qiEarnedThisRealm = cost;
            s.elapsedS += TICK;
            continue;
          }
        }
        s.qiEarnedThisRealm = 0;
        s.realmIndex++;
        markRealm(s.realmIndex);
      }
      s.elapsedS += TICK;
    } else {
      // Offline window. Apply offline gain in a single jump up to cap.
      const offlineRemaining = nextDayStart - s.elapsedS;
      const offlineSec = Math.min(offlineRemaining, offlineCapS(s));
      const offlineQi  = offlineRate(s) * offlineSec;
      s.qi += offlineQi;
      s.qiEarnedThisRealm += offlineQi;
      s.qiEarnedTotal += offlineQi;
      // Jump forward to end of day (offline accrual happens but no buying
      // during sleep — buys when player logs in next day).
      s.elapsedS = nextDayStart;

      // Process potential breakthrough (auto-confirm on re-login)
      while (s.qiEarnedThisRealm >= REALMS[s.realmIndex] && s.realmIndex < REALMS.length - 1) {
        if (MAJOR_TRANSITIONS.has(s.realmIndex) && onlineRate(s, boostHeldDuty) < requiredRate(s.realmIndex)) break;
        s.qiEarnedThisRealm -= REALMS[s.realmIndex];
        s.realmIndex++;
        markRealm(s.realmIndex);
      }
    }
  }

  return { s, milestones, daily };
}

// ── Pretty-print helpers ────────────────────────────────────────────────────
function fmtTime(seconds) {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
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

// ── Run three profiles ──────────────────────────────────────────────────────
const PROFILES = [
  { name: 'Hyper-casual (15m online / 23h45m offline per day)', dayOnlineS: 15 * 60,         maxDays: 60 },
  { name: 'Casual       (1h online / 23h offline per day)',       dayOnlineS: 1 * 3600,        maxDays: 60 },
  { name: 'Hardcore     (8h online / 16h offline per day)',       dayOnlineS: 8 * 3600,        maxDays: 30 },
];

const KEY_MILESTONES = [
  { kind: 'realm',    label: 'TB L10 (last layer of Tempered Body)',          match: m => m.kind === 'realm' && m.idx === 9 },
  { kind: 'realm',    label: '⭐ FIRST MAJOR BREAKTHROUGH (Qi Transform)',     match: m => m.kind === 'realm' && m.idx === 10 },
  { kind: 'mechanic', label: '⭐ FIRST MECHANIC (Crystal Reservoir, cryst T2)', match: m => m.kind === 'mechanic' && m.name === 'Crystal Reservoir' },
  { kind: 'mechanic', label: 'Second mechanic (Consecutive Focus, cryst T3)',   match: m => m.kind === 'mechanic' && m.name === 'Consecutive Focus' },
  { kind: 'mechanic', label: 'Third mechanic (Divine Qi, cryst T4)',            match: m => m.kind === 'mechanic' && m.name === 'Divine Qi' },
  { kind: 'mechanic', label: 'Fourth mechanic (Tracing Meridians, cryst T5)',   match: m => m.kind === 'mechanic' && m.name === 'Tracing Meridians' },
  { kind: 'realm',    label: 'QT Peak (full first major realm)',                match: m => m.kind === 'realm' && m.idx === 13 },
  { kind: 'realm',    label: 'True Element Peak',                               match: m => m.kind === 'realm' && m.idx === 17 },
  { kind: 'realm',    label: 'Separation & Reunion 3rd',                        match: m => m.kind === 'realm' && m.idx === 20 },
  { kind: 'realm',    label: 'Saint Early',                                     match: m => m.kind === 'realm' && m.idx === 24 },
  { kind: 'realm',    label: 'Origin Returning 1st',                            match: m => m.kind === 'realm' && m.idx === 30 },
  { kind: 'realm',    label: 'Open Heaven L1',                                  match: m => m.kind === 'realm' && m.idx === 45 },
  { kind: 'realm',    label: 'Open Heaven L6 (final)',                          match: m => m.kind === 'realm' && m.idx === 50 },
];

for (const profile of PROFILES) {
  console.log(`\n╔═══════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║ ${profile.name.padEnd(73)} ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════════════════╝`);
  const { s, milestones, daily } = simulate(profile);

  console.log('\nMilestones reached:');
  console.log('────────────────────────────────────────────────────────────  ────────');
  for (const target of KEY_MILESTONES) {
    const m = milestones.find(target.match);
    if (m) {
      console.log(`  ${target.label.padEnd(58)}  ${fmtTime(m.t)}`);
    } else {
      console.log(`  ${target.label.padEnd(58)}  (not reached)`);
    }
  }
  console.log(`\nFinal: realm ${s.realmIndex}/50 (${REALM_NAMES[s.realmIndex]}) | qi/s=${fmtQi(onlineRate(s, 0.20))} | total qi earned=${fmtQi(s.qiEarnedTotal)} | crystal lvl ${s.crystalLevel}`);

  // Daily snapshot
  console.log('\nPer-day progress snapshot:');
  console.log('Day  Online-end realm                qi/s          crystal-lvl    mechanics');
  console.log('───  ────────────────────────────  ───────────  ─────────────  ──────────────────────');
  for (const d of daily.slice(0, 14)) {
    const m = d.mechanics.length > 0 ? d.mechanics.map(x => x[0]).join('') : '—';
    console.log(`  ${String(d.day).padStart(2)}  ${d.realmName.padEnd(26)}  ${fmtQi(d.qiPerSec).padStart(10)}  ${String(d.crystalLevel).padStart(12)}  ${m}`);
  }
}

// ── Cross-profile summary table ─────────────────────────────────────────────
console.log(`\n\n╔═══════════════════════════════════════════════════════════════════════════╗`);
console.log(`║ Cross-profile: time to key milestones                                     ║`);
console.log(`╚═══════════════════════════════════════════════════════════════════════════╝`);

const profileResults = PROFILES.map(p => ({ p, r: simulate(p) }));

console.log(`\n  Milestone                                              Hyper      Casual    Hardcore`);
console.log(  `  ─────────────────────────────────────────────────────  ────────   ────────  ────────`);
for (const target of KEY_MILESTONES) {
  const cells = profileResults.map(({ r }) => {
    const m = r.milestones.find(target.match);
    return m ? fmtTime(m.t) : '—';
  });
  console.log(`  ${target.label.padEnd(53)}  ${cells[0].padStart(8)}   ${cells[1].padStart(8)}  ${cells[2].padStart(8)}`);
}
