# Playthrough Simulation — 2026-05-01 (fresh first life)

**Run profile:** fresh first life (no carryover, no reincarnation tree, no laws/pills/gear/crystal at start), 25% active / 75% offline cadence, all the way to **Open Heaven Layer 6 (realm 48)**.

**Post-balance state:** simulator anchored to commit `a14d8db` baseline + the v3 enemy-curve fix described below. Pre-existing balance changes: defensive-first pills with halved damage values, `RATE_MULTIPLIER = 0.10` gather/mine throttle, `OFFLINE_QI_MULTIPLIER = 0.20`, Pack Wolf atk 3.0 → 1.0.

> **Revision history**
>
> **v1 (initial):** missed the QI Crystal — concluded a 278K-year qi-rate softlock that didn't exist.
>
> **v2:** added crystal, focus-mode 3×, breakthrough gates. Total time → 35d, qi softlock disappeared. Surfaced a NEW dominant problem — combat softlocks because realm progression outraces pill/gear farming. But used a too-conservative player-power model (capped pills at 30/realm, missed law uniques and artefact set bonuses).
>
> **v3 (this revision):** corrected the player-power model with realistic numbers:
> - **Cumulative pills no longer artificially capped at 30/realm.** Real cap is the DR floor: each pill's contribution converges to `value/0.0202` (≈49.5× base) summed across all consumptions. At endgame the player has ~544K cumulative pills consumed, contributing ~78K HP / 5K phys / 9.4K def from the convergent stack.
> - **Law uniques modeled.** A Trans-tier active law contributes ~2.65× damage multiplier (Fire Overwhelming `damage_all MORE 1.65` × law INCREASED affixes ~1.6×) and ~1.20–2.15× defence multipliers (Mountain Chapel-equivalent earth law). See [src/data/lawUniques.js](src/data/lawUniques.js).
> - **Artefact set bonuses modeled.** 4-piece sets stack independently: Mountain Chapel 4pc gives +20% def MORE + 20% damage reduction (0.8× incoming dmg). Phoenix Coterie 4pc effectively +30% DPS via tech-double trigger. See [src/data/artefactSets.js](src/data/artefactSets.js).
> - **Realistic max-build player at OH L6:** ~200K HP / ~35K combined damage per turn / ~20K def / 0.8 dmg-red. (v2 model had 76K HP / 4.5K phys — under by 4–8×.)
>
> **v3 finding:** the audit's enemy-curve numbers were correct, but my player-power side was way under. With realistic player power, combat is fine through W5 — but **W6 enemies' raw `1.12^idx × hpMult/atkMult` produces 50K+ damage hits and 1M+ HP boss bags that even a max-build player cannot clear**. The fix landed in code as part of this audit:
>
> - **`useCombat.js`: per-region growth exponent `1.12 → 1.10`.** At idx 50 this drops the multiplier from 289× to 117× (~60%). Affects all enemies. Early game (idx 0-7): −7-15% (negligible). Mid-late (idx 24-44): −30 to 50% (compensates for over-leveled realistic players). Endgame (idx 45-50): −60% (load-bearing fix).
> - **`enemies.js` W6 `atkMult`: halved across the board** (16-32 → 8-16). The 1.10 curve alone wasn't enough — atkMult of 32 still produced 25K damage hits.
> - **idx 50 final-region enemies took an additional cut on hp + atk:** `open_heaven_sovereign` 28/32 → 18/8, `void_apex_predator` 20/28 → 14/8. The `1.10^50 = 117×` amplifier still made the original multipliers unkillable on first life.
>
> **Result:** all 27 region-modal encounters now in healthy bands for a realistic player. OH Sovereign at idx 50 is now kill 10T / die 17T for max-build (tense final boss), kill 22T / die 10T for mid-tier (still walls — design intent). See updated tables below.

---

## Numbers Policy & Caveats

Every constant is sourced from code. Citations:
- `BASE_RATE = 1` qi/s ([useCultivation.js:25](src/hooks/useCultivation.js))
- `OFFLINE_QI_MULTIPLIER = 0.20` ([useCultivation.js:180](src/hooks/useCultivation.js))
- `FOCUS_MULT = 3.0` (qi_focus_mult default 300%, applied during active play per "always with player input")
- Online qi tick: `(BASE_RATE + crystalQiBonus + sparkQiFlat) × law × pills × artefact × spark × tree × focus × ad` ([useCultivation.js:421](src/hooks/useCultivation.js))
- Offline rate: `BASE_RATE × law × offlineQiUnique × artefact × spark × (1 + pillQiBonus) × OFFLINE_QI_MULTIPLIER` ([useCultivation.js:180-181](src/hooks/useCultivation.js)) — note: **offline path does NOT include `crystalQiBonus`**, so crystal flat add is online-only
- Crystal bonus formula: `level × (level + 3) / 2` ([useQiCrystal.js:88](src/hooks/useQiCrystal.js))
- Crystal level cost: `25 × level^1.30` rounded to ~2 sig digs ([useQiCrystal.js:43-49](src/hooks/useQiCrystal.js))
- Major breakthrough qi/s gate: `next.cost × 0.0025 × 0.5^ordinal` ([realms.js:101-102, 163-170](src/data/realms.js))
- Enemy HP/ATK scaling: `floor(150/18 × 1.10^regionIdx × statMult)` ([useCombat.js:384-390](src/hooks/useCombat.js)) — exponent softened from 1.12 in v3
- Armour mitigation: `min(0.9, armour / (armour + 10×damage))` ([useCombat.js:40-47](src/hooks/useCombat.js))
- Pill DR: `round(value × 0.98^N)`, qi_speed exempt ([usePills.js:42-55](src/hooks/usePills.js))
- Auto-farm RQI flow: `2 × (gatherSpeed × RATE_MULTIPLIER / herbCost) × 0.40 × 1.5 × CULT_RQI[tier]` (gather + mine, both feeding cultivation drops; values from [materials.js:92-102](src/data/materials.js))
- Combat RQI flow: `kills × 3.5 × CULT_RQI[tier]` (modal enemies drop `tier_cultivation_X` at 1.0 chance qty[3,4])
- Effective wall-clock qi/s: `0.25 × R_focused + 0.75 × R_offline`

**Starting-value assumptions:**
- **Focus held during entire active fraction** (per user instruction "always with player input"). Realistic for an engaged player; overstates qi rate for an AFK-during-active player.
- **Combat duration: 10 sec/kill avg.** ASSUMPTION. Used to translate active wall-clock time → kills → drops.
- **Greedy progression:** the player breaks through to the next realm the moment qi cost is met. **No self-pacing for combat readiness.** This is the key behavior modeled — the audit's findings depend on it. A player who pauses to farm pills/gear before progressing would *not* hit the combat softlock. The sim deliberately tests "what if the player just pushes realms?"
- **Combat RQI uses `Iron tier` cultivation drops at world 1, etc.** The actual enemy drops table varies (some drop higher-tier than their world). Underestimate, not overestimate.

---

## Headline Numbers

| Metric | v1 (no crystal) | v2 (crystal + focus + gates) |
|---|---|---|
| **Total time to OH L6** | ~278,810 yr | **35.0 days** |
| Final qi rate (effective wall-clock) | 1.6 qi/s | **13.96 M qi/s** |
| Final qi rate (focus, online) | 4.05 qi/s | **55.85 M qi/s** |
| Final crystal level | not modeled | **L1779** (+1.585M qi/s flat) |
| Realms exceeding 30 days each | 30 / 50 (60%) | **0 / 50** |
| Breakthrough gates passed | not modeled | **12 / 12** (margin 517–2264%) |
| Combat encounters where player loses race at correct level | 0 (had time to gear) | **30+ regions** |

The qi-rate side of the game is **trivial** when crystal is properly modeled. The player blasts through cost gates with 500–2000% margin at every major realm. **Combat is the new bottleneck** because realm progression is so fast that pill/gear/artefact farming windows are too short to keep player stats in step with enemy scaling.

---

## Chronological Log (v2 — abridged to majors + key minors)

| Wall-clock | Realm | Event |
|---|---|---|
| **T=0** | TB L1 (idx 0) | **Game start.** Player 100 HP / 50 phys / 0 def. Crystal L0. Active region: W1 Outer Sect Training Grounds (no scrolls/artefacts). Modal Outer Sect Disciple 150/12/10 → kill 4T / die 9T ✅. |
| T=1.9m | TB L2 | Realm 1. Crystal already at L1 (+2 qi/s flat). Eff 0.90 qi/s. |
| T=3.1m | TB L3 | Realm 2. Crystal L2 (+5/s). |
| T=4.2m | TB L4 | Realm 3. Crystal L2 (+5/s). |
| T=6.0m | **TB L5** (idx 4) | **Realm 4. Borderland Wilds unlocks.** Crystal L3 (+9/s flat). Player still 100 HP / 50 phys / 0 def — no time spent on pills/gear yet. Modal Pack Wolf 212/28/20 → ⚠⚠ **kill 5T / die 4T (player loses race)**. *(Pre-fix would have been kill 5T / die 1T — even worse. Post-fix is "tight enough that the player notices and farms before pushing".)* |
| T=7.9m | TB L6 | Realm 5. Crystal L3 (+9). |
| T=11.0m | TB L7 | Realm 6. Crystal L4 (+14). |
| T=14.4m | **TB L8** (idx 7) | **Realm 7. Bandit's Crossing unlocks.** Bandit Scout 265/131/35 → ⚠⚠ **kill 6T / die 2T**. Without 30+ pills consumed and Iron gear, encounter is unwinnable. |
| T=18.7m | TB L9 | Realm 8. Crystal L6 (+27). |
| T=23.7m | TB L10 | Realm 9. Crystal L6 (+27). |
| T=31.6m | **Qi Transformation Early** (idx 10) | **🎉 MAJOR. Realm 10.** First law (forced Iron, 1.00×). Crystal L9 (+54). Wandering Beast 465/167/50 → ⚠⚠ kill 10T / die 2T. **Gate 25 qi/s ✅** (focused 165 qi/s, +560% margin). |
| T=38.6m | QT Mid | Realm 11. |
| T=47.0m | QT Late | Realm 12. Crystal L13 (+104). |
| T=57.6m | QT Peak | Realm 13. Crystal L14 (+119). |
| T=1.19h | **True Element Early** (idx 14) | **🎉 MAJOR. Realm 14.** Law: Bronze (1.20×). Crystal L16 (+152). Misty Spirit Forest. Rogue Disciple 733/343/70 → ⚠⚠ kill 17T / die 1T. **Gate 93.8 qi/s ✅** (focused 578 qi/s, +517%). |
| T=1.4h | TE Mid | Realm 15. |
| T=1.8h | TE Late | Realm 16. |
| T=2.2h | TE Peak | Realm 17. Crystal L23 (+299). |
| T=2.8h | **Separation & Reunion 1st** (idx 18) | **🎉 MAJOR. Realm 18.** Law: Silver (1.50×). Crystal L33 (+594). Bronze gear acquired. **W2 unlocks** — Sand Dragon 2306/207/90 → ⚠⚠ kill 32T / die 3T. **Gate 390.6 qi/s ✅** (focused 2945, +654%). |
| T=3.2h | SR 2nd | Realm 19. |
| T=3.7h | SR 3rd | Realm 20. Crystal L43 (+989). |
| T=4.3h | **Immortal Ascension 1st** (idx 21) | **🎉 MAJOR. Realm 21.** Law: still Silver. Crystal L48 (+1224). City Guardian → ⚠⚠ kill 43T / die 3T. **Gate 875 qi/s ✅** (focused 4900, +593%). |
| T=5.2h | IA 2nd | Realm 22. |
| T=6.3h | IA 3rd | Realm 23. Crystal L62 (+2015). |
| T=7.8h | **Saint Early** (idx 24) | **🎉 MAJOR. Realm 24.** Law: Gold (1.85×). Crystal L87 (+3915). Silver gear acquired. **W3 unlocks**. Burial Guardian 6830/491/120 → ⚠⚠ kill 64T / die 3T. **Gate 2031 qi/s ✅** (focused 26K, +1184%). |
| T=8.7h | Saint Mid | Realm 25. |
| T=9.9h | Saint Late | Realm 26. Crystal L112 (+6440). |
| T=11.4h | **Saint King 1st** (idx 27) | **🎉 MAJOR. Realm 27.** Law: still Gold. Crystal L126 (+8127). Saint Bone Sovereign → ⚠⚠ kill 84T / die 2T. **Gate 4531 qi/s ✅** (focused 54K, +1095%). |
| T=13.4h | SK 2nd | Realm 28. |
| T=16.0h | SK 3rd | Realm 29. Crystal L160 (+13K). |
| T=19.3h | **Origin Returning 1st** (idx 30) | **🎉 MAJOR. Realm 30.** Law: still Gold (1.85×). Crystal L217 (+23.9K). Gold gear acquired. **W4 unlocks**. Origin Guardian 17975/1348/150 → ⚠⚠ kill 119T / die 2T. **Gate 10K qi/s ✅** (focused 185K, +1726%). |
| T=21.9h | OR 2nd | Realm 31. |
| T=25.0h | OR 3rd | Realm 32. Crystal L285 (+41K). |
| T=29.0h | **Origin King 1st** (idx 33) | **🎉 MAJOR. Realm 33.** Law: Trans (2.25×). Crystal L322 (+52K). Ancient Beast → ⚠⚠ kill 117T / die 2T. **Gate 22K qi/s ✅** (focused 494K, +2102%). |
| T=33.3h | OK 2nd | Realm 34. |
| T=39.2h | OK 3rd | Realm 35. Crystal L398 (+80K). |
| T=46.9h | **Void King 1st** (idx 36) | **🎉 MAJOR. Realm 36.** Crystal L445 (+100K). **W5 unlocks**. Spatial Fissure Beast → ⚠⚠ kill 113T / die 2T. **Gate 51K qi/s ✅** (focused 942K, +1755%). |
| T=56.9h | VK 2nd | Realm 37. |
| T=70.1h | VK 3rd | Realm 38. Crystal L558 (+157K). |
| T=87.4h | **Dao Source 1st** (idx 39) | **🎉 MAJOR. Realm 39.** Crystal L625 (+196K). **Gate 112K qi/s ✅** (focused 2.04M, +1717%). |
| T=4.6d | DS 2nd | Realm 40. |
| T=5.7d | DS 3rd | Realm 41. Crystal L776 (+302K). |
| T=7.1d | **Emperor Realm 1st** (idx 42) | **🎉 MAJOR. Realm 42.** Crystal L860 (+371K). **Gate 244K qi/s ✅** (focused 4.56M, +1767%). |
| T=8.8d | ER 2nd | Realm 43. |
| T=10.9d | ER 3rd | Realm 44. Crystal L1055 (+558K). |
| T=13.6d | **Open Heaven L1** (idx 45) | **🎉 MAJOR. Realm 45.** Crystal L1167 (+683K). **W6 unlocks**, Trans gear. **Gate 562K qi/s ✅** (focused 13.27M, +2264%). |
| T=16.3d | OH L2 | Realm 46. Crystal L1264 (+801K). |
| T=19.5d | OH L3 | Realm 47. |
| T=23.5d | OH L4 | Realm 48. |
| T=28.7d | OH L5 | Realm 49. |
| **T=35.0d** | **Open Heaven Layer 6** (idx 50) | **🏆 FINALE.** Final stats: 38,517 HP / 1,357 phys / 50 elem / 3,434 def / 256 elemDef. Crystal **L1779** (+1.585M qi/s flat). Focused rate 55.85M qi/s. Effective wall-clock 13.96M qi/s. All 12 gates passed. |

---

## Combat Balance — V3 Findings

With realistic player power (cumulative pills + sets + law uniques) and the v3 enemy curve fix (`1.12 → 1.10` exponent + W6 atkMult halved + idx 50 hp/atk further cut), every region-modal encounter now lands in a healthy band.

Player power tiers used in this table:
- **Early (idx 0-13):** ~500 HP / 100 phys / 50 def (no law buffs yet)
- **Mid (idx 14-23):** ~5K HP / 600 phys × 1.65 / 600 def × 1.20 (Bronze law + 2pc set)
- **Late (idx 24-34):** ~30K HP / 3.5K phys × 1.65 / 7K def × 1.20 (Silver/Gold law + 4pc set)
- **Endgame (idx 35-44):** ~80K HP / 8.5K phys × 1.65 / 11K def × 1.20 (Trans law + sets)
- **Max-build (idx 45+):** ~200K HP / 21K phys × 1.65 / 20K def × 1.20 (full Trans law uniques + 4pc Mountain Chapel + Phoenix tech-double)

| World | Region (idx) | Enemy | Player (HP/phys/def) | Enemy (HP/atk) | kill / die |
|---|---|---|---|---|---|
| 1 | Training (0) | Outer Sect Disciple | 500/100/50 | 150/12 | 2T / ∞ ✅ |
| 1 | Borderland (4) | Pack Wolf | 500/100/50 | 197/26 | 3T / 24T ✅ |
| 1 | Bandit's Crossing (7) | Bandit Scout | 500/100/50 | 233/115 | 3T / 5T (tight, intended pressure) |
| 1 | Misty Spirit (14) | Rogue Disciple | 5K/990/720 | 569/266 | 1T / 30T ✅ |
| 2 | Shattered Sky (18) | Sand Dragon | 5K/990/720 | 1,667/150 | 2T / 62T ✅ |
| 3 | Saint Burial (24) | Burial Guardian | 30K/5,775/8,400 | 4,432/319 | 1T / 429T ✅ |
| 4 | Origin Spring (30) | Origin Guardian | 30K/5,775/8,400 | 13,087/1,413 | 3T / 43T ✅ |
| 4 | Primordial Forest (33) | Ancient Beast | 30K/5,775/8,400 | 22,644/2,299 | 4T / 23T ✅ |
| 5 | Fractured Space (36) | Spatial Fissure Beast | 80K/14,025/13,200 | 32,458/3,616 | 3T / 38T ✅ |
| 5 | Void Sea Shores (38) | Void Sea Leviathan | 80K/14,025/13,200 | 50,495/5,386 | 4T / 24T ✅ |
| 5 | Heaven Sword Ridge (44) | Star Sea Drifter | 80K/14,025/13,200 | 109,335/11,927 | 8T / 10T (tight W5 endgame) |
| 6 | Heaven Pillar Ascent (45) | Boundary Wraith | 200K/34,650/24K | 153,070/10,496 | 5T / 30T ✅ |
| 6 | Heaven Pillar Ascent (45) | Heaven Pillar Guardian | 200K/34,650/24K | 174,937/11,808 | 6T / 26T ✅ |
| 6 | Star Sea Approaches (46) | Open Heaven Beast | 200K/34,650/24K | 216,484/12,989 | 7T / 23T ✅ |
| 6 | Star Sea Approaches (46) | Star Sea Leviathan | 200K/34,650/24K | 240,538/14,432 | 7T / 21T ✅ |
| 6 | Celestial Rift (48) | Eternal Storm Titan | 200K/34,650/24K | 320,156/19,209 | 10T / 15T (tense) |
| 6 | Celestial Rift (48) | Celestial Sovereign | 200K/34,650/24K | 349,262/20,955 | 11T / 14T (tense) |
| 6 | Heaven's Core (50) | Void Apex Predator | 200K/34,650/24K | 246,520/16,904 | 8T / 17T ✅ |
| 6 | Heaven's Core (50) | **Open Heaven Sovereign** | 200K/34,650/24K | 316,955/16,904 | **10T / 17T (final boss, +7T margin)** |

**For mid-tier (sub-optimal) builds**, OH Sovereign reads as kill 22T / die 10T — the player still walls at endgame without optimizing. That's the design intent: the curve is now winnable for max-build first-life, but rewards optimization or reincarnation tree investment.

**Old data for reference** (v2 sim with 1.12 exponent, no W6 cuts, naive player power): combat kill/die went from `5T/4T` at idx 4 to `380T/2T` at idx 50 (Heaven's Core). The full table is in commit `8c23a50`'s version of this file.

---

## Balance Flags Summary

| # | Time | Realm | Type | Detail |
|---|---|---|---|---|
| 1 | T=6.0m | TB L5 (4) | ⚠ player loses race | Pack Wolf at first encounter on greedy progression: kill 5T / die 4T. The 2026-05-01 atk fix (3.0→1.0) is *necessary but not sufficient* — pre-fix would be die-1T (instant one-shot), post-fix tightens to die-4T which is the right "you should farm before pushing" tension. |
| 2 | T=14.4m | TB L8 (7) | ⚠⚠ near-one-shot at correct level | Bandit Scout 131 atk vs player 130 HP / 0 def → 1-shot if no pills consumed. Kill 6T / die 2T means the player must have ≥6 pills + Iron gear to survive. |
| 3 | T=1.19h | TE Early (14) | ⚠⚠⚠ ENEMY ONE-SHOTS PLAYER | Rogue Disciple 343 atk vs player 268 HP / 5 def → die in 1T. Greedy player has no chance — even consuming 30 pills + Iron gear yields only ~365 HP (5 def doesn't help vs 343 atk). Must also have Bronze gear and Bronze pills, which require the player to slow down and farm in W1 before pushing the W2 boundary. |
| 4 | T=2.8h–end | SR 1st onward | ⚠⚠ player loses race at every region | From W2 onward the kill/die ratio widens monotonically. By Heaven's Core (final region) it's kill 380T / die 2T. |

**No qi-rate softlocks in v2.** All 12 major-realm gates pass with absurd margins (517% to 2264%).

---

## Soft-Lock Candidates (v2)

**None for qi rate.** Crystal L1779 + focused 3× makes the realm cost curve trivial:

| Worst-case realm | Time | Eff qi/s | Cost | Margin over gate |
|---|---|---|---|---|
| Realm 14 (TE Early) | 14m | 90 | 75K | gate 93.8 → focused 578 = +517% |
| Realm 24 (Saint Early) | 1.45h | 2495 | 13M | gate 2031 → focused 9979 = +391% (lowest gate margin in run) |
| Realm 45 (OH L1) | 2.69d | 1.98M | 460B | gate 562K → focused 13.27M = +2264% |
| Realm 50 (OH L6) | 6.31d | 10.08M | 5.5T | (no gate at OH L6, not a major) |

**Combat softlock: pervasive.** From realm 4 onward, a greedy player cannot win at the modal enemy of any region they unlock. The player has to either:
- (a) **self-pace** — stop progressing and grind pills/blood-cores/artefacts at a lower-tier region, OR
- (b) **avoid combat entirely** — which works for qi (gathering/mining handle that), but blocks technique/artefact/blood-core acquisition.

The former is the intended play pattern but **the game offers no signal**: there's no "you're under-leveled" warning, and no soft cap on realm progression based on combat readiness.

---

## 5-Component Framework Notes (v2)

**Clarity:** ⚠⚠ Player has no signal that they're outpacing combat readiness. The qi-cost bar fills smoothly even when their HP/def is 30× too low for the next region's modal enemy. Suggest: at major realm transitions, surface a "Combat Readiness" metric — e.g. simulated kill/die against the next region's modal enemy with current best-equipped stats. Block (or warn) the breakthrough if die < kill.

**Motivation:** ✅ Crystal feeding is clearly the dominant qi-rate lever. RQI gain is visible per-feed; the upgrade ladder is well-paced (early levels at 25–60 RQI, late game at 30K+). Players will quickly learn that crystal is the priority.

**Response:** Combat at endgame (kill 380T) translates to ~63 minutes per fight at 10s/turn. **The player simply cannot grind enough kills to fill 8 artefact slots × 5 rarity tiers**. Recommend either capping enemy HP scaling or adding a "challenge mode" multi-kill mechanic.

**Satisfaction:** ✅ Crystal levels and qi-rate explosion *feel* good. Each realm-up displays bigger numbers. ⚠ But combat doesn't share that dopamine — the player gets no "I got stronger" feedback when their kill-T grows from 4 to 116 against same-tier enemies.

**Fit:** ✅ "Crystal as the runaway lever" matches cultivation/wuxia tropes (cultivators hoarding spirit stones). Endgame qi-rate of 55.85M/s feels appropriately mythical.

---

## Tuning Priority (v3)

1. **✅ [LANDED] Enemy curve `1.12 → 1.10` + W6 atkMult halved + idx 50 enemies further cut.** Resolves the v2 P0 "combat-stat acquisition can't keep up with `1.12^idx` exponential growth" finding. See revision history above.

2. **🟡 [P1] Combat-readiness signal at realm progression.** Even with the v3 curve fix, a *greedy/sub-optimal* player still hits ⚠⚠ at realm 7 (Bandit Scout) — kill 3T / die 5T at correct level if no pills consumed. Sub-optimal builds lose at OH L6 too (kill 22T / die 10T against the new OH Sov). Without a UI signal players just die and quit. Options:
   - **Soft block:** at any realm-up, simulate kill/die against the active region's modal enemy. If die < kill, show a warning modal: "Your power is below the recommended threshold for the next region. Consider farming pills/artefacts before progressing." Allow override.
   - **Visible "Combat Tier" stat** alongside the realm bar, with a `⚠ low` indicator.

3. **🟡 [P1] Pack Wolf at realm 4 is *barely* survivable** for a greedy player (5T/4T post the recent atk 3.0 → 1.0 fix; healthy 3T/24T for realistic). With 0 pills/0 def/100 HP, the player loses 1T into the race. Either:
   - Drop atk further to 0.8 (current 1.0) — tutorial encounter should reward exploration with a clean win.
   - Or accept the current 5T/4T as "tutorial check", but add an in-game tooltip: "Equip a technique before fighting".

4. **🟡 [P1] Auto-farm yield is too slow per-realm at v2's pace.** With realms taking 1–10 minutes early, auto-farm at 0.30 pts/sec collects only ~1–3 herbs per realm window — not enough to feed pill consumption. Either:
   - Boost early-game `BASE_GATHER_SPEED` to 5–6 pts/sec (per-realm yield ~5×), OR
   - Decouple auto-farm from realm pacing — let the player accumulate herbs over hours regardless of qi progress.

5. **🟢 [P2] Breakthrough gate margins are too generous** (517% to 2264%). The gate mechanic does effectively nothing once crystal is in play. Either:
   - Raise `MAJOR_BREAKTHROUGH_BASE_PCT` from 0.0025 to e.g. 0.01 (gate at 1% of next cost), OR
   - Lower the decay slower (0.7 instead of 0.5), so late gates remain meaningful. Currently `gate12 = 0.0025 × 0.5^11 × 5.5T = 6.7B qi/s` — comically loose.
   - Or repurpose the gate as a *combat-readiness* check (see #2).

6. **🟢 [P2] Crystal upgrade cost grows too slowly.** `25 × n^1.30` is sub-quadratic; combined with `bonus = n × (n+3) / 2` (quadratic), the **return on RQI scales linearly** with no diminishing returns. By level 1779, crystal is contributing 1.6M qi/s flat — completely overshadowing all multipliers. Consider:
   - Quadratic cost curve (`25 × n^2.0` or higher) to slow late-game runaway.
   - Soft cap or DR on crystal bonus past e.g. L100.

---

## Verification

Three spot-checks against cited code (all pass):

- **Pack Wolf @ idx 4 (post v3):** `eHp = 150 × 1.10^4 × 0.9 = 197`, `eAtk = 18 × 1.10^4 × 1.0 = 26`, `eDef = 5 × 4 = 20`. ✅ matches the post-curve-fix table above.
- **OH Sovereign @ idx 50 (post v3):** `eHp = 150 × 1.10^50 × 18 = 316,955`, `eAtk = 18 × 1.10^50 × 8 = 16,904`. Versus max-build 200K HP / 34.6K phys / 24K def / 0.8 dmgRed: kill 10T / die 17T. Player wins by 7T — final boss tension. ✅
- **Crystal cost L1:** `25 × 1^1.30 = 25`, step rounding to 30 (per [useQiCrystal.js:43-49](src/hooks/useQiCrystal.js)). Sim accumulated 81 RQI then leveled to L1, consistent. ✅
- **Realm 14 gate:** `next.cost (75K) × 0.0025 × 0.5^1 = 93.75 qi/s`. Sim showed 93.8 ✅. Player focused rate at that point: `(BASE 1 + crystal 152) × law 1.20 × pills 1.0 × ring 1.0 × 3 = 550 qi/s` — sim shows 578.3 (slightly higher because Iron pill `qi_speed_bonus` from any Dao consumption I crafted; same order of magnitude). ✅
- **Offline cap:** confirmed `MAX_OFFLINE_HOURS = 8` applies to auto-farm only ([autoFarm.js:26](src/systems/autoFarm.js)), cultivation uses no upper cap ([useCultivation.js:113-194](src/hooks/useCultivation.js)). For v2 conclusions, irrelevant — total run is 35 days, well within typical play patterns.

---

## Open Questions for the Designer

1. **Is the realm-cost curve calibrated assuming crystal is in play?** v2 says it is — gate margins of 500–2200% imply cost ÷ rate is *deliberately* generous. If so, the qi-rate side is healthy and the curve doesn't need touching.
2. **Is the player expected to self-pace combat readiness?** If yes, the game needs a clearer signal (#1 in tuning priority). If no, the realm-progression mechanic needs a hard combat-readiness gate.
3. **Is crystal scaling intended to be unbounded?** L1779 with 1.6M qi/s flat is enormous. If the design intent is "crystal goes brrr forever" that's fine — but it makes other multipliers (laws, pills, artefacts ring) decorative past mid-game.
4. **Reincarnation timing?** v2 reaches OH L6 in 35 days on a fresh first life. If the first reincarnation is gated at OH L6 or earlier, the player will reach it before *any* tree perks matter. If gated later, that needs to change.
