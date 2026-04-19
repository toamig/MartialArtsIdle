# Archive — Design Evaluation (April 2026)

> *Snapshot from commit c545af1 — 2026-04-19*
> *This was the first full framework evaluation of the project. Some items have since changed: idle combat has been removed, reincarnation unlock was moved to Saint Early (realm 24), and karma scaling was rescaled.*
> *Compare with [[Design Evaluation]] for the current state.*

---

## System Map — What Was Built at Evaluation Time

| System | Status | Core Role |
|---|---|---|
| Cultivation loop | ✅ Live | Qi/sec → realm breakthrough, rAF-driven |
| Qi/s gate | ✅ Live | Hard floor on rate required for major realm transitions |
| Key Crystal | ✅ Live | Feed QI stones → flat qi/sec bonus (level × 2) |
| Selections | ✅ Live | Pick-1-of-3 on every level-up and breakthrough |
| Combat | ✅ Live | Turn-based, animation-gated, technique loadout |
| Gathering / Mining | ✅ Live | Progress-bar resource collection |
| Auto-Farm | ✅ Live | Background combat/gather/mine simulation |
| Laws | ⚠️ Partial | cultivationSpeedMult wired; acquisition loop not yet built |
| Pills | ✅ Live | 3-herb alchemy → 46 permanent stat bonuses |
| Techniques | ✅ Live | 4 types, cooldown-based, world-tiered quality |
| Artefacts | ✅ Live (data) | Gear slots with affix rolls |
| Worlds | ✅ Live | 6 worlds × 19 regions, realm-gated |
| Reincarnation | 🔴 Design revision | Existing doc assumed Open Heaven gate — **see below** |
| Achievements | ✅ Live | 6 categories, 22 milestones |

---

## Active Design Revision — Reincarnation Timing

> The existing [[Reincarnation]] document gated transmigration behind **Open Heaven + World 6 cleared**. This design was being revised at evaluation time.

### New Intent (as stated)

- Reincarnation unlocks **significantly earlier** than Open Heaven peak
- Reaching Open Heaven Layer 6 *requires* multiple reincarnations — structurally impossible in a single life without waiting months
- Each reincarnation should make the next run meaningfully faster and reach a new high point

### Why This Changes the Design Category

The existing design was **optional endgame prestige** (one full run required). The new intent is **required layered prestige** — the entire late-game is gated behind accumulated reincarnation power.

Closest references: *Antimatter Dimensions* (Infinity required at e308; can't reach Eternity in a single infinity), *Idle Slayer* (ascension required to progress). The pattern works, but it imposes strict constraints:

> The player must reincarnate before they hit a wall that feels like a bug.
> Every reincarnation must be faster than the last — visibly, within the first 10 minutes.
> The game must tell the player reincarnation exists **before** they need it.

### Open Design Questions (at evaluation time)

| Question | Impact if unresolved |
|---|---|
| **At what realm does reincarnation unlock?** | Too early: player hasn't seen enough content. Too late: player hits a wall and quits thinking the game is broken. |
| **Does the Eternal Tree change?** | If reincarnation is earlier, karma per life drops — total tree cost may need rebalancing. |
| **What persists?** (crystal, selections, laws?) | Crystal persisting makes it the primary long-term investment. |
| **What is the per-run Eternal Tree multiplier?** | Must be large enough that run 2 is visibly faster. |
| **How many reincarnations to reach Open Heaven?** | 3–5 runs = tight, satisfying. 10+ runs requires each run to introduce new mechanical content. |

### Suggested Unlock Gate (Starting Value at evaluation time)

**Starting value: Reincarnation unlocks at Immortal Ascension 1st Stage (realm index 21).**

Rationale: By realm 21 the player has seen cultivation, qi/s gates, crystal investment, combat, gathering, pills, techniques, artefacts, selections, and at least World 1–2. They have not yet seen World 3–6, Laws in action, high-tier techniques.

*Note: The actual implementation gated at Saint Early (realm index 24) — see [[Reincarnation]] for current state.*

---

## Cultivation Speed — Corrected Model

The evaluation corrected an initial underestimate that treated BASE_RATE=1 as the dominant term. The actual formula:

```
rate = (BASE_RATE + crystalQiBonus) × lawMult × qiUniqueMult
       × boostMult × adBoostMult × pillQiMult × selectionQiMult
```

### Speed at Realistic Milestones

| Milestone | Crystal level | selectionQiMult | Passive rate | Boosting (3×–4×) |
|---|---|---|---|---|
| End of Tempered Body | 5 | 1.0 | 11 qi/s | 33–44 qi/s |
| End of Qi Transformation | 15 | 1.8× | ~50 qi/s | 150–200 qi/s |
| End of True Element | 25 | 2.8× | ~140 qi/s | 420–560 qi/s |
| Mid-game (pre-reincarnate) | 40+ | 2.8× | ~225 qi/s | 675–900 qi/s |

### The Qi/s Gate — Critical System

| Major transition | Ord | Next cost | Required qi/s |
|---|---|---|---|
| Tempered Body → Qi Transformation | 0 | 20,000 | **200 qi/s** |
| Qi Transformation → True Element | 1 | 160,000 | **1,360 qi/s** |
| True Element → Separation & Reunion | 2 | 1,400,000 | **10,115 qi/s** |
| Separation & Reunion → Immortal Ascension | 3 | 7,000,000 | **42,988 qi/s** |

---

## 5-Component Evaluation

### Clarity — Yellow

**Gaps identified:**
1. Law activation threshold is hidden — equipping a law below its realm requirement shows no effect and no explanation
2. Pill value invisible at scale — +3 essence is ~15% early, near-zero mid-game; cumulative totals not shown
3. Recipe discovery fully opaque — 92 herb combos, no hint system
4. Reincarnation must be telegraphed before the player needs it

### Motivation — Yellow → Green (revised)

**Remaining gaps:**
1. Law acquisition loop missing — Three Harmony Manual at 1.0× was the only available law
2. Single-selection optimal path — cultivation-first always wins until gates reward combat power
3. Alchemy unlocked at Origin Returning (realm 30) — very late in progression arc

### Response — Green/Yellow

**Gaps identified:**
1. No flee from combat
2. `startFight` called during active fight overwrites state (no phase guard) — **fixed**
3. Boost feedback depends on HUD reading from rateRef not React state

### Satisfaction — Yellow

**Gaps identified:**
1. Realm breakthrough has no moment — major name change uses same code path as sub-stage tick
2. Gate cleared = no fanfare
3. Auto-farm had no activity indicator
4. Reincarnation screen needs weight — must not be a casual button click

### Fit — Green

Theme consistently applied across all systems. Minor misfit: hold-to-boost should be framed as "enter focused cultivation" not a generic speed button.

---

## State Machine Checklist

### Cultivation Loop

| Property | State |
|---|---|
| Entry | App load; runs forever unless maxed |
| Exit | `maxedRef = true` |
| Edge cases | **Crash risk:** `REALMS[realmIndex]` undefined on OOB save. Add bounds clamp on load. — **fixed** |

### Combat Loop

| Property | State |
|---|---|
| Entry | `startFight()` explicit call |
| Exit | `pHp <= 0` (lost) or `eHp <= 0` (won) |
| Interruptibility | None — no flee, no pause |
| Edge cases | **Bug:** `startFight` called during active fight overwrites `stateRef`. — **fixed** |

---

## Risks & Abuse Cases (at evaluation time)

| Risk | Severity | Status |
|---|---|---|
| Reincarnation timing undefined | Critical | Resolved — Saint Early (realm 24) |
| Law acquisition loop missing | High | Still open |
| `startFight` during active fight | High | Fixed |
| Realm index OOB on corrupted save | Medium | Fixed |
| Gate 2 (1,360 qi/s) too close to Gate 1 | Medium | Open |
| Selection cultivation-first always optimal | Medium | Open |
| Pill value invisible at scale | Medium | Open |
| Major realm-break no feedback | Medium | Open |
| Recipe discovery fully opaque | Low | Open |
| Auto-farm activity indicator missing | Low | Open |
| Idle combat simulation bugs | High | Resolved — idle combat removed |

---

## Priority List (at evaluation time)

| # | Item |
|---|---|
| 1 | Decide reincarnation unlock realm |
| 2 | Major realm-break feedback |
| 3 | Law acquisition loop |
| 4 | Gate 2 playtest |
| 5 | Reincarnation telegraphing |
| 6 | `startFight` phase guard — **done** |
| 7 | Realm index bounds clamp — **done** |
| 8 | Boost HUD verify reads from ref |
| 9 | Pill value cumulative display |
| 10 | Law threshold visibility in UI |

---

## Related

- [[Design Evaluation]] — current state
- [[Archive - Reincarnation Pre-Rescale (April 2026)]] — old karma table
- [[Reincarnation]] — current state
- [[Cultivation System]]
- [[Realm Progression]]
