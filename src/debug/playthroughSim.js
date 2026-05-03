/**
 * playthroughSim.js — closed-form playthrough simulator.
 *
 * Built to evaluate the value of the reincarnation system. Three scenarios:
 *
 *   A: No rebirth, no tree perks. Single life, fresh start, idx 0 → 50.
 *   B: All 23 reincarnation tree nodes active from t=0 (assumes a player
 *      who already completed at least one peak to earn the 143 karma).
 *      Single life, idx 0 → 50.
 *   C: Rebirth ONCE at idx 24 (first realm where rebirth unlocks).
 *      First life: idx 0 → 24 with no tree.
 *      Earn 31 karma at idx 24 (sum of karma 1..23).
 *      Spend on the optimal qi-rate path: al_1 + hw_1+hw_2+hw_3+hw_4 +
 *      al_2+al_3 = 30 karma → +25% qi from al_1, +25% pill stat from hw_4,
 *      recipe carryover from al_2, 16h offline cap from al_3.
 *      Second life: idx 0 → 50 with those perks active.
 *
 * Methodology
 * ──────────────────────────────────────────────────────────────────────────
 * The hand-authored audit at obsidian/Audits/Playthrough Sim 2026-05-01.md
 * already computed per-realm wall-clock times for Scenario A (verified
 * against game code paths — see the audit's "Verification" section). This
 * sim takes that audit as the validated baseline and applies tree perk
 * multipliers to derive Scenarios B and C.
 *
 * Multipliers applied to qi rate:
 *   al_1 "Inherited Meridians" — +25% qi rate (×1.25 on rate)
 *   hw_4 "Soul Crucible"       — +25% pill stat bonuses. Pills contribute
 *                                ~5-10% to qi rate at endgame (Dao pills
 *                                qi_speed); approximated as ×1.05 on rate.
 *   yy_k "Primordial Balance"  — +10% artefact affix values. Artefact
 *                                qi_speed contributes a few % to rate;
 *                                approximated as ×1.03 on rate.
 *   yy_2 "Yin Reservoir"       — every realm starts with 20% of cost free.
 *                                Equivalent to 0.80× time per realm.
 *   al_k "Living Memory"       — 1-hour ×2 buff after rebirth. Modest
 *                                boost only on first hour of next life.
 *
 * Doesn't model: combat-specific perks (hw_1/2/3/k, md_*, yy_1/3/4) since
 * combat doesn't directly accelerate qi rate in the audit's model — it
 * affects loot acquisition, which the audit treats as adequate by
 * assumption. Combat tree perks DO matter for "can the player survive the
 * region's modal enemy", which is a separate axis (see audit's combat
 * softlock findings).
 *
 * Limitations the user should know
 * ──────────────────────────────────────────────────────────────────────────
 * - Combat readiness is not modeled. The audit shows combat softlocks at
 *   most regions for greedy first-life players. Tree perks like hw_k and
 *   yy_1 alleviate this; not capturing it understates rebirth value.
 * - Crystal level path is implicit (folded into the audit's baseline
 *   times), so faster early-life qi accrual via tree may compound more
 *   than the simple multiplier suggests.
 * - Scenario C assumes optimal karma spend on qi-rate perks. A combat-
 *   focused spend would tell a different story.
 *
 * For the framework's Numbers Policy: every multiplier above is a STARTING
 * VALUE traceable to the tree node's design intent. Tune by running the
 * sim with adjusted constants.
 */

import { karmaForReachingIndex } from '../data/reincarnationTree';

// ─── Validated Scenario A baseline (from audit, in seconds) ─────────────────
// Cumulative time to reach realm idx N. T[0] = 0 (start at idx 0).
const SCENARIO_A_T_SEC = [
  0,
  114, 186, 252, 360, 474, 660, 864, 1122, 1422, 1896,                    // idx 1-10
  2316, 2820, 3456, 4284, 5040, 6480, 7920,                               // idx 11-17
  10080, 11520, 13320, 15480, 18720, 22680,                               // idx 18-23
  28080, 31320, 35640,                                                    // idx 24-26
  41040, 48240, 57600,                                                    // idx 27-29
  69480, 78840, 90000,                                                    // idx 30-32
  104400, 119880, 141120,                                                 // idx 33-35
  168840, 204840, 252360,                                                 // idx 36-38
  314640, 397440, 492480,                                                 // idx 39-41
  613440, 760320, 941760,                                                 // idx 42-44
  1175040, 1408320, 1684800, 2030400, 2479680,                            // idx 45-49
  3024000,                                                                // idx 50
];

// Sanity: the audit's exact published times in human units.
// idx 24 = 7.8h × 3600 = 28080 ✓
// idx 50 = 35.0d × 86400 = 3024000 ✓

const REALM_NAMES = [
  'TB L1', 'TB L2', 'TB L3', 'TB L4', 'TB L5', 'TB L6', 'TB L7', 'TB L8', 'TB L9', 'TB L10',
  'QT Early', 'QT Mid', 'QT Late', 'QT Peak',
  'TE Early', 'TE Mid', 'TE Late', 'TE Peak',
  'SR 1st', 'SR 2nd', 'SR 3rd',
  'IA 1st', 'IA 2nd', 'IA 3rd',
  'Saint Early', 'Saint Mid', 'Saint Late',
  'SK 1st', 'SK 2nd', 'SK 3rd',
  'OR 1st', 'OR 2nd', 'OR 3rd',
  'OK 1st', 'OK 2nd', 'OK 3rd',
  'VK 1st', 'VK 2nd', 'VK 3rd',
  'DS 1st', 'DS 2nd', 'DS 3rd',
  'ER 1st', 'ER 2nd', 'ER 3rd',
  'OH L1', 'OH L2', 'OH L3', 'OH L4', 'OH L5', 'OH L6',
];

// ─── Tree perk → qi-rate multiplier map ──────────────────────────────────────
// Each value is the multiplicative factor on qi rate when the node is owned.
// Notes in the file header explain the derivation.
const QI_RATE_MULT_BY_NODE = {
  al_1: 1.25,  // +25% qi rate, direct
  hw_4: 1.05,  // +25% pill stat -> pill qi_speed boost ~5% on overall rate
  yy_k: 1.03,  // +10% artefact affix values -> artefact qi_speed boost ~3%
};
// yy_2 doesn't multiply rate; it skips 20% of each realm's qi cost. Same
// effect on time as a 1.25× rate boost, applied AFTER other multipliers.
const YY_2_TIME_FACTOR = 0.80;

// All 23 nodes in the tree (used for Scenario B "all unlocked").
const ALL_NODES = [
  'al_1', 'al_2', 'al_3', 'al_4', 'al_k',
  'md_1', 'md_2', 'md_3', 'md_4', 'md_k',
  'fp_1', 'fp_2', 'fp_3', 'fp_4', 'fp_k',
  'hw_1', 'hw_2', 'hw_3', 'hw_4', 'hw_k',
  'yy_1', 'yy_2', 'yy_3', 'yy_4', 'yy_k',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function deltasFromCumulative(t) {
  const out = [];
  for (let i = 1; i < t.length; i++) out.push(t[i] - t[i - 1]);
  return out;
}

function cumulativeFromDeltas(d) {
  const t = [0];
  for (const x of d) t.push(t[t.length - 1] + x);
  return t;
}

function totalKarmaAt(idx) {
  let total = 0;
  for (let i = 1; i <= idx; i++) total += karmaForReachingIndex(i);
  return total;
}

/**
 * Apply tree-node multipliers to the per-realm delta times. Returns new
 * per-realm deltas.
 *
 * Approach: every owned qi-rate node multiplies the overall rate, so time
 * shrinks by the inverse product. yy_2 is a separate flat 0.80 time factor.
 */
function applyTreeMultipliers(deltas, ownedNodes) {
  let rateMult = 1;
  for (const n of ownedNodes) {
    if (QI_RATE_MULT_BY_NODE[n]) rateMult *= QI_RATE_MULT_BY_NODE[n];
  }
  let timeFactor = 1 / rateMult;
  if (ownedNodes.includes('yy_2')) timeFactor *= YY_2_TIME_FACTOR;

  return deltas.map(d => d * timeFactor);
}

/** Apply al_k "1h ×2 buff after rebirth" — shave the first 3600s of the run by half. */
function applyRebirthBuff(deltas, ownedNodes, hasRebirthed) {
  if (!hasRebirthed || !ownedNodes.includes('al_k')) return deltas;
  const out = [...deltas];
  let buffRemaining = 3600; // 1 hour
  for (let i = 0; i < out.length && buffRemaining > 0; i++) {
    if (out[i] <= buffRemaining * 2) {
      // Whole realm fits within buff window — halve it
      buffRemaining -= out[i] / 2;
      out[i] = out[i] / 2;
    } else {
      // Partial: first 2*buffRemaining of the realm runs at 2x rate
      const buffedQiPortion = buffRemaining * 2;
      out[i] = buffRemaining + (out[i] - buffedQiPortion);
      buffRemaining = 0;
    }
  }
  return out;
}

// ─── Scenarios ──────────────────────────────────────────────────────────────

function scenarioA() {
  const deltas = deltasFromCumulative(SCENARIO_A_T_SEC);
  return { label: 'A. No rebirth, no tree', perRealmSec: deltas, lives: 1 };
}

function scenarioB() {
  // All 23 nodes unlocked from t=0 (assumes player has completed >=1 peak before).
  const deltas = deltasFromCumulative(SCENARIO_A_T_SEC);
  const adjusted = applyTreeMultipliers(deltas, ALL_NODES);
  return {
    label: 'B. No rebirth, ALL tree unlocked',
    perRealmSec: adjusted,
    lives: 1,
    activeNodes: ALL_NODES,
    rateMult: ALL_NODES.reduce((m, n) => m * (QI_RATE_MULT_BY_NODE[n] ?? 1), 1) / YY_2_TIME_FACTOR,
  };
}

function scenarioC() {
  const baseDeltas = deltasFromCumulative(SCENARIO_A_T_SEC);
  // ── First life: idx 0 → 24, no tree ──
  const life1Deltas = baseDeltas.slice(0, 24); // deltas idx 1..24
  const life1Total  = life1Deltas.reduce((s, d) => s + d, 0);

  // Karma earned reaching idx 24
  const karmaAtRebirth = totalKarmaAt(24); // 31

  // Optimal karma spend for SECOND life (qi-rate priority):
  //   al_1 (3) + al_2 (4) + al_3 (5) + hw_1 (3) + hw_2 (4) + hw_3 (5) + hw_4 (6) = 30
  // Result: al_1 (rate ×1.25) + hw_4 (rate ×1.05). Other nodes purchased
  // along the chain don't directly affect qi rate.
  const purchased = ['al_1', 'al_2', 'al_3', 'hw_1', 'hw_2', 'hw_3', 'hw_4'];
  const karmaSpent = 3 + 4 + 5 + 3 + 4 + 5 + 6;

  // ── Second life: idx 0 → 50 with purchased nodes active ──
  const life2Deltas = applyTreeMultipliers(baseDeltas, purchased);
  const life2Cumulative = cumulativeFromDeltas(life2Deltas);

  // ── "First reach realm N" wall-clock time across the player's history ──
  // For N <= 24, life 1 reaches it. For N > 24, the player must rebirth and
  // grind back up in life 2 — total = life1Total + life2Cumulative[N].
  const firstReachSec = [0];
  for (let n = 1; n <= 50; n++) {
    if (n <= 24) {
      firstReachSec.push(life1Deltas.slice(0, n).reduce((s, d) => s + d, 0));
    } else {
      firstReachSec.push(life1Total + life2Cumulative[n]);
    }
  }

  return {
    label: 'C. Rebirth ONCE at idx 24',
    perRealmSec: [...life1Deltas, ...life2Deltas], // raw history
    cumulativeSec: firstReachSec,                  // "first reach" — what runPlaythroughSim reports
    lives: 2,
    rebirthAt: 24,
    karmaAtRebirth,
    karmaSpent,
    purchased,
    life1TotalSec: life1Total,
    life2TotalSec: life2Cumulative[50],
  };
}

// ─── Format ─────────────────────────────────────────────────────────────────

function fmtTime(sec) {
  if (sec < 60)        return `${sec.toFixed(1)}s`;
  if (sec < 3600)      return `${(sec / 60).toFixed(1)}m`;
  if (sec < 86400)     return `${(sec / 3600).toFixed(1)}h`;
  return                      `${(sec / 86400).toFixed(2)}d`;
}

/**
 * Run all three scenarios and produce a comparison report.
 * Logs per-realm timings (cumulative + delta) for each scenario, plus a
 * summary that calls out the rebirth value.
 *
 * Returns the structured result; also stored at window.__lastPlaythroughSim.
 */
export function runPlaythroughSim() {
  const scenarios = [scenarioA(), scenarioB(), scenarioC()];
  // Compute cumulative times per scenario (Scenario C precomputes its own
  // "first reach" cumulative — don't overwrite).
  for (const s of scenarios) {
    if (!s.cumulativeSec) s.cumulativeSec = cumulativeFromDeltas(s.perRealmSec);
    s.totalSec = s.cumulativeSec[s.cumulativeSec.length - 1];
  }

  // ── Per-realm comparison table ────────────────────────────────────────
  const rows = [];
  // For C, the per-realm deltas array spans 50 entries (life 1: 24, life 2: 50)
  // We treat the second-life entries as "additional" — for fair comparison
  // we report cumulative wall-clock to reach realm idx N in EACH scenario.
  // Scenario A and B reach idx N in N steps; Scenario C reaches idx N after
  // the first life has completed (24 realms) plus the second life's first N realms.
  for (let i = 1; i <= 50; i++) {
    const aSec = scenarios[0].cumulativeSec[i];
    const bSec = scenarios[1].cumulativeSec[i];
    // Scenario C precomputes "first reach" cumulative properly (life1 + life2).
    const cSec = scenarios[2].cumulativeSec[i];
    rows.push({
      idx: i,
      realm: REALM_NAMES[i],
      A: fmtTime(aSec),
      B: fmtTime(bSec),
      C_firstReach: fmtTime(cSec),
      'B vs A': `${((1 - bSec / aSec) * 100).toFixed(0)}% faster`,
      'C vs A': i <= 24 ? '—' : `${((1 - cSec / aSec) * 100).toFixed(0)}% faster`,
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.group('%c[playthroughSim] Per-realm comparison', 'color: #c084fc; font-weight: bold');
  console.table(rows);
  console.log('%cScenario A: No rebirth, no tree perks',  'color:#94a3b8');
  console.log(`  Total time to peak (idx 50): ${fmtTime(scenarios[0].totalSec)}`);
  console.log('%cScenario B: All tree perks unlocked, no rebirth in this run', 'color:#4ade80');
  console.log(`  Total time to peak: ${fmtTime(scenarios[1].totalSec)} (${((1 - scenarios[1].totalSec / scenarios[0].totalSec) * 100).toFixed(0)}% faster than A)`);
  console.log('%cScenario C: Rebirth once at idx 24, then play to peak', 'color:#fbbf24');
  console.log(`  First life:        ${fmtTime(scenarios[2].cumulativeSec[24])} (idx 0 → 24)`);
  console.log(`  Karma earned:      ${scenarios[2].karmaAtRebirth} (spent ${scenarios[2].karmaSpent} on ${scenarios[2].purchased.join(', ')})`);
  console.log(`  Second life:       ${fmtTime(scenarios[2].totalSec - scenarios[2].cumulativeSec[24])} (idx 0 → 50)`);
  console.log(`  Total time to peak: ${fmtTime(scenarios[2].totalSec)} (${((1 - scenarios[2].totalSec / scenarios[0].totalSec) * 100).toFixed(0)}% faster than A — first peak achievement)`);
  console.groupEnd();

  if (typeof window !== 'undefined') {
    window.__lastPlaythroughSim = { scenarios, rows };
  }

  return { scenarios, rows };
}
