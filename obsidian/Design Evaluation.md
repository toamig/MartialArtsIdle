# Design Evaluation — Full Project Review

> *Framework: Game Design Framework 5-Component Filter + State Machine Checklist + Numbers Policy*
> *Last updated: 2026-04-19*

---

## System Map — What Is Built

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
| Reincarnation | 🔴 Design revision | Existing doc assumes Open Heaven gate — **see below** |
| Achievements | ✅ Live | 6 categories, 22 milestones |

---

## Active Design Revision — Reincarnation Timing

> The existing [[Reincarnation]] document gates transmigration behind **Open Heaven + World 6 cleared**. This design is being revised.

### New Intent (as stated)

- Reincarnation unlocks **significantly earlier** than Open Heaven peak
- Reaching Open Heaven Layer 6 *requires* multiple reincarnations — it is structurally impossible in a single life without waiting months
- Each reincarnation should make the next run meaningfully faster and reach a new high point

### Why This Changes the Design Category

The existing design is **optional endgame prestige** (one full run required). The new intent is **required layered prestige** — the entire late-game is gated behind accumulated reincarnation power.

This is a different loop pattern. Closest references: *Antimatter Dimensions* (Infinity required at e308; can't reach Eternity in a single infinity), *Idle Slayer* (ascension required to progress). The pattern works, but it imposes strict constraints:

> The player must reincarnate before they hit a wall that feels like a bug.
> Every reincarnation must be faster than the last — visibly, within the first 10 minutes.
> The game must tell the player reincarnation exists **before** they need it.

### Open Design Questions — Must Decide Before Building

| Question | Impact if unresolved |
|---|---|
| **At what realm does reincarnation unlock?** | Too early: player hasn't seen enough content. Too late: player hits a wall and quits thinking the game is broken. |
| **Does the Eternal Tree change?** | Current tree assumes one full-life completion for first karma. If reincarnation is earlier, karma per life drops — total tree cost may need rebalancing. |
| **What persists?** (crystal, selections, laws?) | Crystal persisting makes it the primary long-term investment. If it resets, the reincarnation bonus must compensate immediately. |
| **What is the per-run Eternal Tree multiplier?** | Must be large enough that run 2 is visibly faster at a rate that feels earned, not trivial. |
| **How many reincarnations to reach Open Heaven?** | 3–5 runs = tight, satisfying. 10+ runs requires each run to introduce new mechanical content. |

### Suggested Unlock Gate (Starting Value)

ASSUMPTION: Reincarnation unlocks mid-game, not at endgame.
IMPACT: Changes which systems carry long-term investment meaning.
IF WRONG: Either players reincarnate before they understand the game, or they hit the wall without finding the mechanic.
VALIDATE: First-session playtests — does the player find the transmigrate button before they stall?

**Starting value: Reincarnation unlocks at Immortal Ascension 1st Stage (realm index 21).**

Rationale:
- By realm 21 the player has seen: cultivation, qi/s gates, crystal investment, combat, gathering, pills, techniques, artefacts, selections, and at least World 1–2
- They have not yet seen: World 3–6, Laws in action, high-tier techniques
- Those become the reward for reaching further each run

Test: After reincarnating from realm 21, can the player reach realm 21 again in less than 30% of the original time? Pass if yes. If >50% of original time, the Eternal Tree bonus for that depth is undersized.

---

## Cultivation Speed — Corrected Model

My first evaluation understated the cultivation speed by treating BASE_RATE=1 as the dominant term. The actual formula is:

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

*selectionQiMult: void_comprehension ×4 (+80%) + dao_insight ×2 (+100%) = +180% INCREASED = 2.8× multiplier.*

### The Qi/s Gate — Critical System I Missed

Major realm transitions require a minimum **qi/s** rate:

```
required = nextRealm.cost × 0.01 × 0.85^ord
```

| Major transition | Ord | Next cost | Required qi/s |
|---|---|---|---|
| Tempered Body → Qi Transformation | 0 | 20,000 | **200 qi/s** |
| Qi Transformation → True Element | 1 | 160,000 | **1,360 qi/s** |
| True Element → Separation & Reunion | 2 | 1,400,000 | **10,115 qi/s** |
| Separation & Reunion → Immortal Ascension | 3 | 7,000,000 | **42,988 qi/s** |

Gate behaviour: qi clamps at 100% cost, progress bar pulses red with `⛔ Qi/s <current> / <required>`. Boost can push through temporarily.

**Design implication:** The first gate (200 qi/s) cannot be cleared passively without significant crystal and selection investment. This is a **forced engagement point** — the player must actively invest before their first major realm change. This is excellent design: it converts the progression wall into a motivation to understand the upgrade systems.

**Risk:** The 2nd gate (1,360 qi/s) requires roughly crystal level 30+ and max cultivation selections while boosting. This is significantly harder than gate 1 and may feel like a second wall that comes too soon after the first. Verify in playtest that gate 2 is reachable within the same session as gate 1 clears, given the player now knows how the crystal system works.

---

## 5-Component Evaluation

### Clarity — Yellow

**Strong:**
- 52-step realm ladder is legible: name, stage, cost all visible
- Qi/s gate failure state is explicit (red pulse, chip with current/required values)
- Crystal level → qi/s bonus is a direct, readable formula (level × 2)
- Selection pick-1-of-3 shows effects before commit

**Gaps:**

1. **Law activation threshold is hidden.** A law's speed bonus doesn't activate until `realmIndex >= law.realmRequirement`. Player equips a law, sees no effect, thinks laws are broken. The UI must show "activates at [realm name]" prominently when the threshold isn't met.

2. **Pill value invisible at scale.** Iron Essence Pill gives +3 essence. Early game this is ~15% more damage. Mid-game with stats in the hundreds, it registers as nothing. The pill UI should show cumulative totals ("Total essence from pills: 47") alongside the per-pill delta.

3. **Recipe discovery is opaque.** 92 herb combos map to 46 pills. Without a hint system, players will brute-force or abandon alchemy. The `RECIPES_BY_PILL` reverse map already exists in data — surface a partial hint ("requires Iron-to-Bronze tier herbs") to reduce friction.

4. **Reincarnation must be telegraphed before the player needs it.** If the unlock is at Immortal Ascension, the player should see a foreshadow mechanic — Karma accumulating visibly and a "transmigration becoming possible" message — at least 2–3 realms before the gate opens.

---

### Motivation — Yellow → Green (revised)

The first evaluation marked this Red due to the law acquisition gap. With crystal + selections properly accounted for, the mid-game has an acceleration engine. Revised status is Yellow, not Red.

**Strong:**
- Realm names carry real genre fantasy (Martial Peak source)
- Qi/s gate creates visible investment targets — player understands *why* they're upgrading crystal
- Selection diversity (28 options across 6 categories) creates genuine build choices
- Karma accumulating across a life builds anticipation for the Eternal Tree
- Technique drops give combat runs a loot-excitement layer
- Permanent pill bonuses create long-term character investment

**Remaining gaps:**

1. **Law acquisition loop is still missing.** `Three Harmony Manual` at `cultivationSpeedMult: 1.0` is the only available law. The law system (rarity upgrades, element variants, unique modifiers) is fully architectured but dormant. This is the largest single missing system in terms of player-facing complexity.

2. **Single-selection optimal path.** Picking cultivation options (void_comprehension, dao_insight) at every level produces a player who blows through gates trivially; picking combat options produces a player who stalls at gates. Until there is a gate that combat power unlocks rather than qi/s, the optimal choice is always cultivation-first. This may be intentional, but it reduces meaningful selection decisions.

3. **Alchemy unlocks at Origin Returning (realm 30)** per the feature unlock table. That is very late in the progression arc. By the time the player has reincarnated 2–3 times, the pill system becomes a discovery motivation. In the first life, it barely exists. Consider whether a simplified alchemy preview is available earlier.

---

### Response — Green/Yellow

**Strong:**
- Hold-to-boost (focusMult, default 3×) is the core active input — direct cause-effect
- Boost can unlock a gated realm temporarily — this is a great moment of agency
- Combat is animation-gated, turns don't blur together
- Auto-farm toggles are explicit per-activity with visible region assignment
- Ad boost (2× for 30 min) is a clear time-bounded choice with obvious cost

**Gaps:**

1. **No flee from combat.** `startFight` has no cancel path — fight must resolve to `won` or `lost`. For late-world fights where the player is underlevelled, this feels punishing. A flee option (cooldown-gated to prevent trivial abuse) would close this gap.

2. **`startFight` called during active fight overwrites state.** No guard exists. Auto-farm triggering during manual combat would corrupt the `stateRef`. Add a phase check at the top of `startFight`.

3. **Boost feedback depends on HUD update rate.** The qi rate readout must read from `rateRef` directly (not from React state) for the player to see the 3× acceleration in real time. If it reads from state, it updates only on realm change — the boost feels invisible.

---

### Satisfaction — Yellow

**Strong:**
- Damage numbers spawn on hit (`spawnDamageNumberRef`)
- EXPLOIT crits labeled in log
- Drops summarised on victory
- Loot banner for auto-farm gains
- Toast stack for notifications
- Progress bar patches DOM directly (no render lag)
- Qi/s gate failure state (red pulse) clearly communicates the problem

**Gaps:**

1. **Realm breakthrough has no moment.** Crossing from Tempered Body L10 → Qi Transformation Early uses the same code path as L3 → L4: `setRealmIndex(nextIndex)`. A `realm.name` change is a narrative event — it needs a different VFX tier, audio cue, and/or UI flourish. This is the most impactful satisfaction gap in the game.

2. **Gate cleared = no fanfare.** When the player's qi/s finally crosses the major-realm threshold and the breakthrough fires, that moment should be the biggest feedback event in the game. Currently it resolves the same as any sub-stage tick.

3. **Auto-farm has no activity indicator.** While running, there is no visual signal that it's working. A subtle per-activity "accumulating..." pulse would close this.

4. **Reincarnation screen needs weight.** The existing [[Reincarnation]] doc describes a 5-step transmigration screen (dissolve → life summary → soul revelation → eternal tree → rebirth). This UX intent is correct. The implementation must match — a casual button click that instantly resets would destroy the moment.

---

### Fit — Green

The theme is consistently applied across every system:
- Realm names match Martial Peak canon
- Cultivation, law names, pill crafting, technique scrolls, world biomes — all xianxia-authentic
- Turn-based combat pace matches contemplative cultivation aesthetics
- Transmigration framing (soul persisting, body dissolving) is the core trope of the source genre
- The Taiji Manual (Eternal Tree sealed branch) is the most genre-authentic reward in the game

Minor misfit: The "hold to boost" interaction should be framed as "enter focused cultivation" rather than a generic speed button. Naming and VFX presentation, not a mechanical change.

---

## State Machine Checklist

### Cultivation Loop

| Property | State |
|---|---|
| Entry | App load; runs forever unless maxed |
| Exit | `maxedRef = true` |
| Interruptibility | Not interruptible |
| Chained | Level-up → `setRealmIndex` → cost/maxed ref sync |
| Resource cost | Qi consumed on threshold cross |
| Edge cases | **Crash risk:** `REALMS[realmIndex]` undefined on out-of-range save. Add bounds clamp on load. |

### Combat Loop

| Property | State |
|---|---|
| Entry | `startFight()` explicit call |
| Exit | `pHp <= 0` (lost) or `eHp <= 0` (won) |
| Interruptibility | None — no flee, no pause |
| Chained | Won → drops rolled → callbacks; Lost → phase = lost |
| Resource cost | None on entry or sustain |
| Edge cases | **Bug:** `startFight` called during active fight overwrites `stateRef`. No phase guard. Fix: early return if `stateRef.current.phase === 'fighting'`. |

---

## Risks & Abuse Cases

| Risk | Severity | Notes |
|---|---|---|
| Reincarnation timing undefined | Critical | Core progression loop has no gate without this decision |
| Law acquisition loop missing | High | Largest dormant system; law diversity and speed multipliers unavailable |
| `startFight` during active fight | High | Overwrites stateRef, corrupts combat |
| Realm index OOB on corrupted save | Medium | Crash on load; add clamp |
| Gate 2 (1,360 qi/s) too close to Gate 1 | Medium | May feel like a second wall before the player understands the system |
| Selection cultivation-first always optimal | Medium | Reduces meaningful choice until gates reward combat power |
| Pill value invisible at scale | Medium | Players don't feel permanent stat accumulation |
| Major realm-break no feedback | Medium | Biggest emotional moment goes unfelt |
| Recipe discovery fully opaque | Low | Players miss alchemy entirely |
| No auto-farm activity indicator | Low | Players unsure if background sim is running |

---

## Priority List

| # | Item | Rationale |
|---|---|---|
| 1 | **Decide reincarnation unlock realm** | Everything else flows from this — karma balance, Eternal Tree scaling, run targets |
| 2 | **Major realm-break feedback** | Qi Transformation breakthrough is the first big moment; it must feel different from a sub-stage tick |
| 3 | **Law acquisition loop** | Largest dormant system; enables cultivation speed diversity and player identity |
| 4 | **Gate 2 playtest** | Verify 1,360 qi/s is reachable within the same play session as gate 1 |
| 5 | **Reincarnation telegraphing** | Karma must be visible and foreshadowed before the player needs the mechanic |
| 6 | **`startFight` phase guard** | Correctness bug with data corruption on overlapping calls |
| 7 | **Realm index bounds clamp on load** | Crash safety |
| 8 | **Boost HUD — verify reads from ref** | Boost feedback invisible if qi rate reads from React state |
| 9 | **Pill value — cumulative display** | Players need to see total pill contributions to feel the investment |
| 10 | **Law threshold visibility in UI** | "Activates at [realm]" must show when threshold not yet met |

---

## Playtest Scripts

### Session 1 — Gate Discovery (0–30 min)
1. Start fresh save, observe first 5 minutes
2. Does the player find the hold-to-boost interaction without being told?
3. Does the progress bar stall at Qi Transformation gate?
4. Does the player understand the ⛔ chip and act on it (upgrade crystal)?
5. Does the first gate clear feel satisfying?

**Pass:** Player acts on gate feedback and clears it within 15 minutes of hitting it.
**Fail:** Player thinks the game is broken and closes it.

### Session 2 — Mid-Game Retention (2–6 hrs)
1. How many selection picks has the player made? What proportion are cultivation vs combat?
2. Has the player invested meaningfully in the crystal, or is it at level 0?
3. At Qi Transformation peak gate, does the player have the tools to clear it?
4. Does the player find alchemy before realm 30?

### Session 3 — Reincarnation Discovery (first life)
1. Does the player see Karma accumulating before the transmigration gate?
2. At the transmigration gate, does the player understand what will be lost and what persists?
3. After reincarnating, does the second run feel noticeably faster within 10 minutes?

**Pass:** Player says "oh that's way faster" within the first session of run 2.
**Fail:** Player says "I feel like I wasted my time."

---

## Related

- [[Reincarnation]]
- [[Cultivation System]]
- [[Realm Progression]]
- [[Laws]]
- [[QI Crystal]]
- [[Game Vision]]
- [[Roadmap]]
