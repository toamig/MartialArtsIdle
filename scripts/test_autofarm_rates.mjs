/**
 * Standalone rate test — mirrors the independent-rate simulation model.
 * Run: node scripts/test_autofarm_rates.mjs
 */

const COSTS = {
  iron_herb_1:15,iron_herb_2:15,bronze_herb_1:60,bronze_herb_2:60,
  iron_mineral_1:15,iron_mineral_2:15,bronze_mineral_1:60,bronze_mineral_2:60,
  iron_cultivation_1:15,iron_cultivation_2:15,bronze_cultivation_1:60,bronze_cultivation_2:60,
};
const CULTIVATION_IDS = new Set([
  'iron_cultivation_1','iron_cultivation_2','bronze_cultivation_1','bronze_cultivation_2',
]);
function getCost(id) { return COSTS[id] ?? 30; }
const BASE_SPEED = 3;
const MAX_OFFLINE_HOURS = 8;

function rollQty([min, max]) { return min + Math.floor(Math.random() * (max - min + 1)); }

function simulate(seconds, drops, speed = BASE_SPEED) {
  const primaryDrops = drops.filter(d => !CULTIVATION_IDS.has(d.itemId));
  const bonusDrops   = drops.filter(d =>  CULTIVATION_IDS.has(d.itemId));
  const activePools  = primaryDrops.length ? primaryDrops : drops;

  const capped  = Math.min(seconds, MAX_OFFLINE_HOURS * 3600);
  const totalW  = activePools.reduce((s, d) => s + d.chance, 0);
  const result  = {};
  let cyclesPerSec = 0;

  for (const drop of activePools) {
    const rate       = (drop.chance / totalW) * (speed / getCost(drop.itemId));
    cyclesPerSec    += rate;
    const expected   = capped * rate;
    const fullCycles = Math.floor(expected);
    const frac       = expected - fullCycles;
    const cycles     = fullCycles + (Math.random() < frac ? 1 : 0);
    if (cycles === 0) continue;
    let total = 0;
    for (let i = 0; i < cycles; i++) total += rollQty(drop.qty ?? [1, 1]);
    result[drop.itemId] = (result[drop.itemId] ?? 0) + total;
  }

  for (const bd of bonusDrops) {
    const expected   = capped * cyclesPerSec * bd.chance;
    const fullCycles = Math.floor(expected);
    const frac       = expected - fullCycles;
    const count      = fullCycles + (Math.random() < frac ? 1 : 0);
    if (count === 0) continue;
    let total = 0;
    for (let i = 0; i < count; i++) total += rollQty(bd.qty ?? [1, 1]);
    result[bd.itemId] = (result[bd.itemId] ?? 0) + total;
  }

  return result;
}

function mergeGains(a, b) {
  const r = { ...a };
  for (const [id, qty] of Object.entries(b)) r[id] = (r[id] ?? 0) + qty;
  return r;
}
function totalItems(g) { return Object.values(g).reduce((s, n) => s + n, 0); }
function average(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

function bench(tickMs, realSec, drops, speed, trials = 4000) {
  const tickSec = tickMs / 1000;
  const ticks   = Math.floor(realSec / tickSec);
  const totals  = [];
  for (let i = 0; i < trials; i++) {
    let g = {};
    for (let t = 0; t < ticks; t++) g = mergeGains(g, simulate(tickSec, drops, speed));
    totals.push(totalItems(g));
  }
  const avg = average(totals);
  const std = Math.sqrt(average(totals.map(v => (v - avg) ** 2)));
  return { avg, std };
}

function compare(label, drops, speeds, realSec = 3600, trials = 4000) {
  console.log(`\nRegion: ${label}`);
  for (const speed of speeds) {
    const r5 = bench(5000, realSec, drops, speed, trials);
    const r1 = bench(1000, realSec, drops, speed, trials);
    const diff = ((r1.avg - r5.avg) / r5.avg * 100).toFixed(1);
    const flag = Math.abs(+diff) >= 2 ? '⚠' : '✓';
    console.log(
      `  speed=${speed.toString().padStart(2)}  5s: ${r5.avg.toFixed(0).padStart(5)} ±${r5.std.toFixed(0).padStart(4)}` +
      `  1s: ${r1.avg.toFixed(0).padStart(5)} ±${r1.std.toFixed(0).padStart(4)}` +
      `  diff: ${(+diff >= 0 ? '+' : '') + diff}%  ${flag}`
    );
  }
}

const W1_R1 = [
  { itemId: 'iron_herb_1',        chance: 0.60, qty: [1,3] },
  { itemId: 'iron_herb_2',        chance: 0.40, qty: [1,2] },
  { itemId: 'iron_cultivation_1', chance: 0.40, qty: [1,2] },
];
const W1_R3 = [
  { itemId: 'iron_herb_2',          chance: 0.50, qty: [1,3] },
  { itemId: 'bronze_herb_1',        chance: 0.30, qty: [1,2] },
  { itemId: 'iron_cultivation_1',   chance: 0.40, qty: [1,2] },
  { itemId: 'bronze_cultivation_1', chance: 0.20, qty: [1,1] },
];
const W1_R4 = [
  { itemId: 'bronze_herb_1',        chance: 0.55, qty: [1,3] },
  { itemId: 'bronze_herb_2',        chance: 0.45, qty: [1,2] },
  { itemId: 'bronze_cultivation_1', chance: 0.40, qty: [1,2] },
];

const SPEEDS = [3, 5, 8, 12];
console.log('=== AutoFarm Rate Test — independent rate model ===');
compare('W1-R1 Outer Sect (pure iron)',               W1_R1, SPEEDS);
compare('W1-R3 Bandits Crossing (mixed iron+bronze)', W1_R3, SPEEDS);
compare('W1-R4 Qi-Vein Ravines (pure bronze)',        W1_R4, SPEEDS);
