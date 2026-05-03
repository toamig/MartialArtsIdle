# Rebirth Value Simulation — 2026-05-03

**Question:** Is reincarnation worth doing? When?

**Method:** Three closed-form scenarios run via `gd.simPlay()` (see `src/debug/playthroughSim.js`). Baseline qi-rate per realm comes from the validated 2026-05-01 audit ([Playthrough Sim 2026-05-01.md](Playthrough%20Sim%202026-05-01.md)). Tree perks applied as multiplicative factors on rate or time per their declared effects.

| Scenario | Description |
|---|---|
| **A** | No rebirth, no tree. Single life, idx 0 → 50. |
| **B** | All 23 tree nodes active from t=0 (assumes ≥1 prior peak to earn 143 karma). Single life. |
| **C** | Rebirth ONCE at idx 24. First life: idx 0 → 24 (no tree). Earn 31 karma. Second life: idx 0 → 50 with optimal qi-rate karma spend (al_1, al_2, al_3, hw_1, hw_2, hw_3, hw_4 = 30 karma → +25% qi from al_1, +25% pill stat from hw_4). |

## Headline numbers — wall-clock time to first reach each milestone

| Realm | Idx | A (no rebirth) | B (full tree) | C (rebirth once) | C vs A |
|---|---|---|---|---|---|
| QT Early | 10 | 31.6m | 18.7m | 31.6m | (life 1) |
| TE Early | 14 | 1.2h  | 42m   | 1.2h  | (life 1) |
| SR 1st   | 18 | 2.8h  | 1.7h  | 2.8h  | (life 1) |
| Saint Early | **24** | **7.8h** | 4.6h | 7.8h | (rebirth point) |
| SK 1st  | 27 | 11.4h | 6.7h  | **16.5h** | **−45% (slower!)** |
| OR 1st  | 30 | 19.3h | 11.4h | 22.5h | −17% (slower!) |
| OK 1st  | 33 | 1.2d  | 17.2h | 1.3d  | ≈ break-even |
| VK 1st  | 36 | 1.95d | 1.16d | 1.81d | +7% |
| DS 1st  | 39 | 3.64d | 2.16d | 3.10d | +15% |
| ER 1st  | 42 | 7.10d | 4.20d | 5.73d | +19% |
| OH L1   | 45 | 13.6d | 8.05d | 10.7d | +21% |
| **OH L6** | **50** | **35.00d** | **20.71d** | **26.99d** | **+23%** |

## Findings

### 1. **A single rebirth at idx 24 is a NET LOSS until idx 33.**

Rebirthing at the earliest unlock (idx 24) and grinding back up costs more wall-clock than just continuing in life 1 — for everything up to idx 32. The 25% qi boost from `al_1` doesn't pay back the ~7.8h of restart cost until you've passed roughly idx 33 (Origin King 1st).

**Implication:** any player who rebirths at 24 and quits before reaching idx 33 in life 2 made a strictly worse choice than not rebirthing.

### 2. **Full tree (Scenario B) is consistently 41% faster.**

The four qi-rate-affecting perks compound:
- `al_1` ×1.25 rate
- `hw_4` ~×1.05 rate (boosts pill qi_speed contribution)
- `yy_k` ~×1.03 rate (boosts artefact qi_speed affixes)
- `yy_2` ×0.80 time (skips 20% of every realm's qi cost)

Combined: **time × 0.59** = 41% faster across the entire run. But this requires having already finished one peak run to earn the 143 karma in the first place.

### 3. **Marginal value of the FIRST rebirth peak: 8 days saved (35d → 27d).**

So a player who rebirths once at idx 24 and pushes to peak in life 2 saves about 8 days vs never rebirthing. That's a meaningful payoff but only if they actually push to peak — quitting mid-life 2 erases the gain.

## Caveats — what this sim does NOT model

- **Combat readiness.** The audit shows combat softlocks at most regions for greedy first-life players (kill 380T / die 2T at OH L6). Tree perks like `hw_2` (+50% HP), `hw_k` (+25% MORE damage/HP), `yy_1` (+5% damage/HP per completed life), and `cb_pt` (Phase Technique law) directly enable combat that life 1 cannot. **The sim understates rebirth value because it doesn't capture "rebirth lets you actually beat the enemies you couldn't before."**
- **Crystal level path.** Folded into the audit's baseline; tree-accelerated qi may compound crystal upgrades faster than the simple multiplier suggests.
- **Karma spend strategy.** Scenario C assumes optimal qi-rate purchases. A combat-focused spend (md_k, hw_k) would tell a different story for combat-stuck players.
- **Recipe/law carryover.** `al_2` (recipes) and the always-preserved law library save real time on alchemy re-discovery and law re-rolling — not modeled in the per-realm time, but real.

## Framework verdict (5-Component Filter)

- **Clarity** ⚠️ — A player can't predict that rebirthing at 24 will *cost* them time until idx 33. The UI shows "rebirth available" but no cost/benefit projection. **Suggest:** show estimated wall-clock comparison ("staying = 27d to peak; rebirth now = 27d to next peak with tree" or similar) before commit.
- **Motivation** ⚠️ — The 8-day saving from a single rebirth is real but small relative to a 35-day baseline. Without the combat unlock angle, a rational player would wait until idx 50 (full peak) to rebirth and unlock the full karma payout. The system probably needs to lean harder on "your power can't beat W6 without tree perks" to motivate intermediate rebirths.
- **Response** ✅ — Buying tree nodes is responsive; al_1's +25% is felt immediately on the next realm.
- **Satisfaction** ⚠️ — The 41% speed boost from full tree is a satisfying milestone, but the journey to 143 karma (1+ peak runs) is long. First rebirth feels weak if measured in qi-time alone.
- **Fit** ✅ — "Reincarnate to grow stronger across lives" is a core wuxia trope; Eternal Tree theming nails it.

## Tuning suggestions

1. **🟡 [P1] Make the first rebirth feel meaningful.** Either:
   - Boost early-rebirth karma payout (e.g. +3 bonus karma the first time you reach Saint Early), OR
   - Make `yy_2` (20% qi-cost skip) available without the 2-keystone gate so the first rebirth has access to its strongest single-life perk.
2. **🟡 [P1] Surface the rebirth cost-benefit projection.** A modal saying "rebirthing now will save ~X days to your next peak (at cost of Y hours re-grind)" lets the player make an informed call.
3. **🟢 [P2] Consider linking combat softlock relief to the tree.** If `hw_k` and `cb_pt` are the difference between "OH L6 unbeatable" and "beatable", make that explicit — UI flag on the major realm modal: "Your build can't pass [region]; consider tree investment."

## Reproducing this audit

```js
gd.simPlay()
// Per-realm comparison table logged. Result also at window.__lastPlaythroughSim.
```

Tune the multipliers in `src/debug/playthroughSim.js` (`QI_RATE_MULT_BY_NODE`, `YY_2_TIME_FACTOR`) and re-run if you want to test different tree-perk weightings.
