# Playthrough Simulation — 2026-05-01 (fresh first life)

**Run profile:** fresh first life (no carryover, no reincarnation tree, no laws/pills/gear), 25% active / 75% offline cadence, all the way to **Open Heaven Layer 6 (realm 48)**.

**Post-balance state:** simulator anchored to commit `a165513` — defensive-first pills with halved damage values, `RATE_MULTIPLIER = 0.10` gather/mine throttle, `OFFLINE_QI_MULTIPLIER = 0.20`, Pack Wolf atk 3.0 → 1.0.

---

## Numbers Policy & Caveats

Every constant in this audit is sourced from code (`src/data/realms.js`, `src/data/worlds.js`, `src/data/enemies.js`, `src/data/pills.js`, `src/data/artefacts.js`, `src/hooks/useCombat.js`, `src/hooks/useCultivation.js`, `src/systems/autoFarm.js`). Where a starting-value assumption was made, it's labeled below.

**Cited formulas:**
- Online qi rate stack: `BASE_RATE × law × pills × artefact × spark × tree × focus × ad` ([useCultivation.js:422](src/hooks/useCultivation.js))
- Offline qi rate: same stack × `OFFLINE_QI_MULTIPLIER (0.20)` ([useCultivation.js:181-182](src/hooks/useCultivation.js))
- Effective wall-clock qi fraction at 25/75 split: `0.25 × 1.0 + 0.75 × 0.20 = 0.40`
- Enemy HP: `max(100, floor(150 × 1.12^regionIdx × hpMult))` ([useCombat.js:384-385](src/hooks/useCombat.js))
- Enemy ATK: `max(10, floor(18 × 1.12^regionIdx × atkMult))` ([useCombat.js:386-387](src/hooks/useCombat.js))
- Enemy DEF: `max(10, floor(5 × regionIdx × defMult))` ([useCombat.js:388](src/hooks/useCombat.js))
- Armour mitigation (PoE-style): `min(0.9, armour / (armour + 10 × damage))` ([useCombat.js:40-47](src/hooks/useCombat.js))
- `regionIdx = region.minRealmIndex` ([CombatScreen.jsx:105](src/screens/CombatScreen.jsx))
- Pill DR: `round(value × 0.98^N)`, `qi_speed` exempt ([usePills.js scaledEffectValue](src/hooks/usePills.js))
- Pill values per rarity (post-2026-05-01): Iron vigor=30 / skin=5 / fist=2 ; Bronze 80/12/6 ; Silver 175/25/12 ; Gold 400/50/25 (+0.05 dao) ; Trans 900/110/55 (+0.10 dao) ([pills.js:46-87](src/data/pills.js))
- Artefact slot bonuses: weapon 16 phys × rarityMult, body 16 def × mult, waist 40 hp × mult, ring 0.05 qi × mult; Iron×1, Bronze×2, Silver×4, Gold×8, Trans×16 ([artefacts.js:18-31](src/data/artefacts.js))
- Law `cultivationSpeedMult` averages: Iron 1.00, Bronze 1.20, Silver 1.50, Gold 1.85, Transcendent 2.25 (midpoint of `LAW_MULT_RANGES.cultivationSpeedMult`, [affixPools.js:404-407](src/data/affixPools.js))
- Auto-farm effective speed: `(BASE + harvestSpeed) × RATE_MULTIPLIER = 0.30 pts/sec` baseline ([autoFarm.js](src/systems/autoFarm.js))
- Artefact drop chance: `enemy.techniqueDrop.chance × ARTEFACT_DROP_MULT (2.0)` ([useCombat.js:25, 418](src/hooks/useCombat.js))
- Major-realm law offers fire on every major transition (12 over the run); first offer locked Iron, subsequent are pick-3 from the band ([useLawOffers.js:33-41, 95-110](src/hooks/useLawOffers.js))

**Starting-value assumptions (labeled per skill's Numbers Policy):**
- **Combat duration: 10 sec/kill average.** ASSUMPTION. Used to translate "active wall-clock time" into "kills". IF WRONG: drop counts (techniques, artefacts) scale linearly off this; longer kills → fewer drops, slower gear acquisition.
- **Auto-farm uses no harvestSpeed bonus.** Player gets +0 from pills/artefacts in this sim (no harvest-gear modeled, since artefacts route to combat slots). IF WRONG: pill yields scale up, but materials.js `gatherCost` 15→1800 caps yield at endgame regardless.
- **Greedy artefact upgrade:** every region transition that yields ≥1 expected artefact upgrades all 8 slots to that world's tier (W1→Iron, W2→Bronze, W3→Silver, W4-5→Gold, W6→Trans). This **overstates** gear progression — a real player would see 8× longer to fill all slots and more variance. IF WRONG: combat ratios in the late game are even worse than logged.
- **Greedy pill-craft strategy:** 30 pills/realm cap, 2:1:1 vigor/skin/fist ratio. Heavy DR floor at ~30 pills × 0.98^29 ≈ 17 marginal value. IF WRONG: stat scaling is bounded similarly.
- **Drop variance modeled as expected value** (no RNG). A real run would have rough/lucky stretches.
- **No Qi Sparks proc/heaven's bond modeled.** These are random rare effects (pattern-click, divine qi, crystal click). They could add 1.1–2× to qi rate sporadically. IF MODELED: total time shrinks but order-of-magnitude conclusions hold.
- **No ad-boost or focus-mode modeled** (focus is `×3` while held, ad is `×2`). A real active-fraction player would tap focus during combat. IF MODELED: active-window qi accelerates but combat softlock at endgame is unaffected.

---

## Chronological Log

| Wall-clock | Realm | Event |
|---|---|---|
| **T=0** | Tempered Body L1 (idx 0) | **Game start.** 100 HP / 50 phys / 50 elem / 0 def / 0 elemDef. Active region: W1 Outer Sect Training Grounds (no scrolls/artefacts drop here). Modal Outer Sect Disciple: 150 HP / 12 atk / 10 def → kill 4T / die 9T. ✅ healthy. |
| T=4.2m | TB L2 | Realm 1. Online 1.000 qi/s, eff 0.400/s. |
| T=11.5m | TB L3 | Realm 2. |
| T=24.0m | TB L4 | Realm 3. First Iron pills crafted (5×, vigor + skin) → 216 HP / 54 phys / 10 def. |
| T=44.8m | **TB L5** (idx 4) | **Realm 4. Borderland Wilds unlocks.** Modal **Pack Wolf**: 212 HP / 28 atk / 20 def. Player now 256 HP / 78 phys / 34 def (post-Iron-gear, post-pills) → **kill 5T / die 8T**. ✅ healthy *(pre-fix this enemy had 84 atk, would die in 3T — fix validated)*. |
| T=1.3h | TB L6 | Realm 5. Player 534 HP / 88 phys / 58 def. |
| T=2.2h | TB L7 | Realm 6. |
| T=3.8h | **TB L8** (idx 7) | **Realm 7. Bandit's Crossing unlocks.** Modal Bandit Scout 265 HP / 131 atk / 35 def. Player 754 HP / 98 phys / 82 def → kill 3T / die 7T. ✅ healthy. |
| T=6.5h | TB L9 | Realm 8. |
| T=10.8h | TB L10 | Realm 9. Realm cap hit at first major gate. |
| T=17.4h | **Qi Transformation Early** (idx 10) | **🎉 MAJOR. Realm 10.** First law offer (forced Iron, locked) — equipped avg Iron `cultivationSpeedMult = 1.00×`. **Qi-Vein Ravines** unlocks. Wandering Beast 465 HP / 167 atk / 50 def. Player 1282 HP / 124 phys / 153 def → kill 4T / die 9T. ✅ healthy. |
| T=29h | QT Middle | Realm 11. |
| T=2.0d | QT Late | Realm 12. Bronze pills now (cap 30, marginal pill ≈ 47 HP at N=29). |
| T=3.4d | QT Peak | Realm 13. |
| T=5.5d | **True Element Early** (idx 14) | **🎉 MAJOR. Realm 14.** Law upgrade: avg **Bronze** `cultMult = 1.20×`. **Misty Spirit Forest** unlocks. Rogue Disciple 733 HP / 343 atk / 70 def. Player 4418 HP / 282 phys / 470 def → kill 3T / die 14T. ✅ healthy. |
| T=8.5d | TE Middle | Realm 15. |
| T=13.6d | TE Late | Realm 16. |
| T=22.4d | TE Peak | Realm 17. |
| T=36.7d | **Separation & Reunion 1st** (idx 18) | **🎉 MAJOR. Realm 18.** Law: avg **Silver** `cultMult = 1.50×`. **W2 unlocks** — Shattered Sky Desert. Sand Dragon 2306 HP / 207 atk / 90 def. Player (post-pill) 7383 HP / 439 phys / 766 def → kill 8T / die 31T. ✅ healthy. Bronze gear acquired. |
| T=54d | SR 2nd | Realm 19. |
| T=84d | SR 3rd | Realm 20. **Demon Beast Plains** opens. Iron Fang Wolf 2170/295/100 → kill 5T / die 40T. ✅ |
| T=133d | **Immortal Ascension 1st** (idx 21) | **🎉 MAJOR. Realm 21.** Law: still **Silver** band (1.50×). Sunken Immortal City unlocks. ⚠⚠ **FIRST SOFT-LOCK FLAG: this realm took 49d** (>30d threshold). Online 1.65 qi/s vs 2.80M qi cost. |
| T=215d | IA 2nd | Realm 22. ⚠⚠ Soft-lock: 82d for one realm. |
| T=355d | IA 3rd | Realm 23. ⚠⚠ Soft-lock: 140d. Blood Sea Wastes opens. |
| T=584d (1.6yr) | **Saint Early** (idx 24) | **🎉 MAJOR. Realm 24.** Law: avg **Gold** `cultMult = 1.85×`. **W3 unlocks**. Silver gear acquired. Burial Guardian 6830/491/120 → kill 10T / die 32T. ✅ combat fine. ⚠⚠ Soft-lock: 228d. |
| T=2.39yr | Saint Mid | Realm 25. ⚠⚠ Soft-lock: 287d. |
| T=3.63yr | Saint Late | Realm 26. ⚠⚠ Soft-lock: 1.25yr. Void Rift Expanse opens. |
| T=5.70yr | **Saint King 1st** (idx 27) | **🎉 MAJOR. Realm 27.** Law: still Gold band. Nine-Death Mountain Range opens. ⚠⚠ Soft-lock: 2.07yr per realm. |
| T=9.10yr | SK 2nd | Realm 28. ⚠⚠ Soft-lock: 3.39yr. |
| T=14.81yr | SK 3rd | Realm 29. ⚠⚠ Soft-lock: 5.71yr. Sealed War Altar opens. |
| T=24.09yr | **Origin Returning 1st** (idx 30) | **🎉 MAJOR. Realm 30.** Law: still Gold (1.85×). **W4 unlocks**. Gold gear acquired (huge stat jump: ring 0.05 × 8 = +0.4× qi rate, online → 2.59 qi/s). Origin Guardian 17975 HP / 1348 atk / 150 def. Player 30179/1674/3115 → kill 13T / die 27T. ⚠ Margin shrinking but ✅ still wins. ⚠⚠ Soft-lock: 9.28yr per realm. |
| T=37.24yr | OR 2nd | Realm 31. ⚠⚠ Soft-lock: 13.15yr. |
| T=58.65yr | OR 3rd | Realm 32. ⚠⚠ Soft-lock: 21.41yr. Forest Spirit (idx 32): kill 15T / die 22T — getting tight. |
| T=93.83yr | **Origin King 1st** (idx 33) | **🎉 MAJOR. Realm 33.** Law: avg **Transcendent** `cultMult = 2.25×`. Online → 3.15 qi/s. Primordial Forest Core opens. Ancient Beast 31568/2272/165 → ⚠ kill 18T / die 16T at first sight (post-pill recovers to win, but the margin is gone). ⚠⚠ Soft-lock: 35.18yr. |
| T=141.6yr | OK 2nd | Realm 34. ⚠⚠ Soft-lock: 47.78yr. |
| T=222.2yr | OK 3rd | Realm 35. ⚠⚠ Soft-lock: 80.48yr. Deep Earth Titan: kill 20T / die 27T — last region with positive margin. |
| T=353yr | **Void King 1st** (idx 36) | **🎉 MAJOR. Realm 36.** Law: still Transcendent (2.25×). **W5 unlocks**. Spatial Fissure Beast 48786/3193/180 → kill 18T / die 22T. Player wins by 4T margin. ⚠⚠ Soft-lock: 130.78yr. |
| T=556yr | VK 2nd | Realm 37. |
| T=861yr | VK 3rd | Realm 38. **Void Sea Shores opens.** Void Sea Leviathan 72325/4005/190 → ⚠ kill 23T / die 20T — **PLAYER LOSES RACE** even on a fresh region announcement (before this window's pills/gear). Post-pill recovers, but the trend is clear. |
| T=1439yr | **Dao Source 1st** (idx 39) | **🎉 MAJOR. Realm 39.** Law: still Transcendent. Dao Inscription Ruins opens. Dao Inscription Guardian 87235/4486/195 → ⚠ kill 26T / die 18T. **PLAYER LOSES RACE.** Post-pill barely passes. ⚠⚠ Soft-lock: 578yr. |
| T=2226yr | DS 2nd | Realm 40. |
| T=3453yr | DS 3rd | Realm 41. |
| T=5468yr | **Emperor Realm 1st** (idx 42) | **🎉 MAJOR. Realm 42.** Ancient Emperor Tomb opens. Emperor Will Fragment 140067/7353/210 → ⚠⚠ kill 37T / die 11T. **COMBAT BROKEN.** Even with full Gold gear and 30 Trans pills, player has no chance against W5 endgame. ⚠⚠ Soft-lock: 2515yr. |
| T=8836yr | ER 2nd | Realm 43. |
| T=14253yr | ER 3rd | Realm 44. Heaven Sword Ridge opens. Star Sea Drifter 175701/9224/220 → ⚠⚠ kill 44T / die 9T. |
| T=29419yr | **Open Heaven L1** (idx 45) | **🎉 MAJOR. Realm 45.** Law: still Transcendent. **W6 unlocks** — Transcendent gear. Heaven Pillar Guardian 221383/10331/225 → ⚠⚠ kill 55T / die 8T. Combat is fundamentally broken at endgame. ⚠⚠ Soft-lock: 11569yr. |
| T=44116yr | OH L2 | Realm 46. Star Sea Approaches: ⚠⚠ kill 61T / die 7T. |
| T=67619yr | OH L3 | Realm 47. |
| T=106757yr | OH L4 | Realm 48. Celestial Rift Expanse: ⚠⚠ kill 79T / die 5T. |
| T=171889yr | OH L5 | Realm 49 (idx 49 = OH L5). |
| **T=278,810yr** | **Open Heaven Layer 6** (idx 50 = realm 48) | **🏆 FINALE.** Final stats: 76,306 HP / 4,520 phys / 50 elem / 8,607 def / 256 elemDef. Online qi rate at endgame: **4.05 qi/s**. Total wall-clock to clear fresh first life with no reincarnation tree: **278,810 years**. Combat at the final region (Heaven's Core): ⚠⚠ kill 116T / die 4T — **completely unwinnable**, but at this point the player would have stopped advancing realms via grinding regardless. |

---

## Combat Encounter Summary (one row per modal enemy at correct level)

`kill` = player turns to defeat enemy with current best stats. `die` = player turns to die taking enemy hits.
Healthy band: `kill ≤ die / 1.5`. ⚠ if `die < kill × 1.2`. ⚠⚠ if `die < kill`.

| World | Region (idx) | Modal Enemy | E HP | E ATK | E DEF | Player kill / die | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Outer Sect Training (0) | Outer Sect Disciple | 150 | 12 | 10 | 4T / 9T | ✅ |
| 1 | Borderland Wilds (4) | Pack Wolf | 212 | 28 | 20 | 5T / 8T | ✅ post-fix |
| 1 | Bandit's Crossing (7) | Bandit Scout | 265 | 131 | 35 | 3T / 7T | ✅ |
| 1 | Qi-Vein Ravines (10) | Wandering Beast | 465 | 167 | 50 | 4T / 9T | ✅ |
| 1 | Misty Spirit Forest (14) | Rogue Disciple | 733 | 343 | 70 | 3T / 14T | ✅ |
| 2 | Shattered Sky Desert (18) | Sand Dragon | 2,306 | 207 | 90 | 8T / 31T | ✅ |
| 2 | Demon Beast Plains (20) | Iron Fang Wolf | 2,170 | 295 | 100 | 5T / 40T | ✅ |
| 2 | Sunken Immortal City (21) | City Guardian | 4,051 | 272 | 105 | 8T / 53T | ✅ |
| 2 | Blood Sea Wastes (23) | Blood Leviathan | 5,082 | 487 | 115 | 8T / 31T | ✅ |
| 3 | Saint Burial Grounds (24) | Burial Guardian | 6,830 | 491 | 120 | 10T / 32T | ✅ |
| 3 | Void Rift Expanse (26) | Void Rift Predator | 7,140 | 856 | 130 | 7T / 32T | ✅ |
| 3 | Nine-Death Mountains (27) | Saint Bone Sovereign | 12,794 | 767 | 135 | 11T / 42T | ✅ |
| 3 | Sealed War Altar (29) | Forbidden Construct | 20,062 | 866 | 145 | 15T / 43T | ✅ |
| 4 | Origin Qi Spring (30) | Origin Guardian | 17,975 | 1,348 | 150 | 13T / 27T | ✅ |
| 4 | World Root Caverns (31) | Origin Guardian | 20,133 | 1,509 | 155 | 13T / 25T | ✅ |
| 4 | Ancient Root Grotto (32) | Forest Spirit | 25,367 | 1,691 | 160 | 15T / 22T | ⚠ tight |
| 4 | Primordial Forest Core (33) | Ancient Beast | 31,568 | 2,272 | 165 | 18T / 16T | ⚠⚠ **player loses race** |
| 4 | Ancient Origin Altar (35) | Deep Earth Titan | 47,519 | 2,375 | 175 | 20T / 27T | ⚠ tight |
| 5 | Fractured Space Corridors (36) | Spatial Fissure Beast | 48,786 | 3,193 | 180 | 18T / 22T | ⚠ tight |
| 5 | Void Sea Shores (38) | Void Sea Leviathan | 72,325 | 4,005 | 190 | 23T / 20T | ⚠⚠ |
| 5 | Dao Inscription Ruins (39) | Dao Inscription Guardian | 87,235 | 4,486 | 195 | 26T / 18T | ⚠⚠ |
| 5 | Ancient Emperor Tomb (42) | Emperor Will Fragment | 140,067 | 7,353 | 210 | 37T / 11T | ⚠⚠ |
| 5 | Heaven Sword Ridge (44) | Star Sea Drifter | 175,701 | 9,224 | 220 | 44T / 9T | ⚠⚠ |
| 6 | Heaven Pillar Ascent (45) | Heaven Pillar Guardian | 221,383 | 10,331 | 225 | 55T / 8T | ⚠⚠ |
| 6 | Star Sea Approaches (46) | Open Heaven Beast | 261,724 | 13,223 | 230 | 61T / 7T | ⚠⚠ |
| 6 | Celestial Rift (48) | Celestial Sovereign | 345,586 | 16,588 | 240 | 79T / 5T | ⚠⚠ |
| 6 | Heaven's Core (50) | Open Heaven Sovereign | 520,203 | 23,409 | 250 | 116T / 4T | ⚠⚠ |

The break point is unambiguous: **regionIdx 33 (Primordial Forest Core / Origin King 1st)**. From there, enemy stat scaling (`1.12^idx`) outpaces what the player's flat artefact + DR-pill stack can deliver, and the gap widens monotonically into the endgame.

---

## Balance Flags Summary

| # | Time | Realm | Type | Detail |
|---|---|---|---|---|
| 1 | T=44.8m | TB L5 (4) | ✅ post-fix verified | Pack Wolf at correct level: kill 5T / die 8T. Pre-fix would have been kill 5T / die ~3T (one-shot territory). The recent change [enemies.js:72](src/data/enemies.js:72) lands the encounter in the healthy band. |
| 2 | T=58.7yr | OR 3rd (32) | ⚠ tight margin | Forest Spirit kill/die 15T/22T — first sub-1.5× ratio in the run. Last "comfortable" region. |
| 3 | T=93.8yr | OK 1st (33) | ⚠⚠ player loses race | Ancient Beast pre-pill encounter shows 18T kill / 16T die. The window's pill-stack pulls the player above water, but the trend has reversed. |
| 4 | T=861yr | VK 3rd (38) | ⚠⚠ player loses race | Void Sea Leviathan: 23T/20T even after pills. Player cannot win without reincarnation-tree perks not modeled here. |
| 5 | T=1439yr | DS 1st (39) | ⚠⚠ player loses race | Dao Inscription Guardian 26T/18T. |
| 6 | T=5468yr–278,810yr | ER 1st onward | ⚠⚠ combat fundamentally broken | Kill ratio grows from 3.4× to 29× (Heaven's Core). The player's stat ceiling is set by pill DR + linear gear scaling; enemy stats grow exponentially with regionIdx. |

**No "player one-shots enemy at correct level" was ever flagged** — the artefact-defense + pill-vigor stack keeps player damage well below enemy HP at every region. This is healthy.

---

## Soft-Lock Candidates

Realms where time-to-realm-up exceeded 30 days:

| Realm | Took | Online qi/s | Comment |
|---|---|---|---|
| 21 (IA 1st) | 49 d | 1.65 | First soft-lock — within first ~5 months. |
| 22 (IA 2nd) | 82 d | 1.65 | |
| 23 (IA 3rd) | 140 d | 1.65 | |
| 24 (Saint E) | 228 d | 1.65 | |
| 25 (Saint M) | 287 d | 2.22 | |
| 26 (Saint L) | 1.25 yr | 2.22 | |
| 27 (SK 1st) | 2.07 yr | 2.22 | |
| 28 (SK 2nd) | 3.39 yr | 2.22 | |
| 29 (SK 3rd) | 5.71 yr | 2.22 | |
| 30 (OR 1st) | 9.28 yr | 2.22 | |
| 31 (OR 2nd) | 13.15 yr | 2.59 | |
| 32 (OR 3rd) | 21.41 yr | 2.59 | |
| 33 (OK 1st) | 35.18 yr | 2.59 | |
| 34 (OK 2nd) | 47.78 yr | 3.15 | |
| 35 (OK 3rd) | 80.48 yr | 3.15 | |
| 36 (VK 1st) | 130.78 yr | 3.15 | |
| 37 (VK 2nd) | 213.83 yr | 3.15 | |
| 38 (VK 3rd) | 305.55 yr | 3.15 | |
| 39 (DS 1st) | 578.43 yr | 3.15 | |
| 40 (DS 2nd) | 786.50 yr | 3.78 | |
| 41 (DS 3rd) | 1,227.05 yr | 3.78 | |
| 42 (ER 1st) | 2,514.93 yr | 3.78 | |
| 43 (ER 2nd) | 3,367.75 yr | 4.05 | |
| 44 (ER 3rd) | 5,417.32 yr | 4.05 | |
| 45 (OH L1) | 11,568.67 yr | 4.05 | |
| 46 (OH L2) | 14,696.55 yr | 4.05 | |
| 47 (OH L3) | 23,503.25 yr | 4.05 | |
| 48 (OH L4) | 39,138.20 yr | 4.05 | |
| 49 (OH L5) | 65,131.71 yr | 4.05 | |
| 50 (OH L6) | 107,583.01 yr | 4.05 | |

**Total: 30 soft-locked realms (60% of all transitions).** The first soft-lock fires at realm 21 (Immortal Ascension 1st), at wall-clock T≈4.4 months. From there every subsequent realm takes longer than the previous, scaling super-linearly.

This is **expected design** for an idle/cultivation game: the player is meant to reincarnate to buy Eternal Tree perks (which weren't modeled here per "fresh first life" framing). But the magnitude tells us:

- Tree perks must collectively provide **at least ~50× qi rate boost** to make the endgame reachable in a human lifetime *(starting value, derived: 278,810 yr / 50 ≈ 5,576 yr; still impractical, so probably ~500–1000× total stack)*.
- The first reincarnation gate (whatever karma threshold unlocks it) had better fire well before realm 21, or the player will quit before getting their first tree perk.

---

## 5-Component Framework Notes

**Clarity:** ✅ Region announcements + realm gates are clearly telegraphed. The qi-rate breakthrough gate (`MAJOR_BREAKTHROUGH_BASE_PCT × DECAY^ord`) is *not* surfaced in this audit's scope — verify the UI shows the player how close they are to the next gate, not just the qi-cost bar.

**Motivation:** ⚠ Mid-game (Saint → Saint King) has a *months*-per-realm cadence with **no new region or modal enemy unlocking between realms 24–26 or 27–28**. Players have no fresh content during these windows. Either:
- shorten the cost gap, or
- add region-clear milestones (badges, lore, cosmetic) at sub-realm cadence.

**Response:** Not directly evaluated by sim, but combat is turn-based with 500ms phase gates ([useCombat.js:446, 676, 880](src/hooks/useCombat.js)). At kill-counts of 50T+ (endgame), a single fight takes ~50 sec wall-clock — and the player can't even win. **Endgame combat cadence is a tedium problem** independent of balance.

**Satisfaction:** Pill DR + DR-exempt qi_speed Dao pills create a satisfying "specialize hard" choice in mid-game — the moment Gold Dao pills unlock, qi rate jumps noticeably. ✅

**Fit:** Realms named for cultivation novel tropes (Saint, Open Heaven) match the wuxia identity. Cost curve genuinely *feels* exponential, which is on-genre for cultivation. ✅

---

## Tuning Priority (recommended order)

1. **🔴 [P0] Combat scaling W5+ is broken.** Even with theoretically full gear + 30 pills/realm + best-tier law, the player loses combat from regionIdx 38 onward. The `1.12^idx` enemy curve outpaces the player's pill-DR-bounded stat curve. Options:
   - Reduce enemy `1.12^idx` exponent for atk specifically (consider 1.08 or 1.10).
   - Increase pill base values for Gold/Trans tiers to give more headroom *(raises early-game ceiling too — undesirable)*.
   - Add a **multiplier-style** stat on artefacts/pills/laws (e.g., `phys_increased`, `health_increased`) that scales with realm — currently almost everything is flat.
   - Cap `hpMult` and `atkMult` per enemy at sane values regardless of region (some enemies have `hp 12.0` which doubles the 1.12^idx already).

2. **🔴 [P0] First soft-lock at realm 21 (4.4 months wall-clock) is too early.** Either:
   - **Confirm** that the reincarnation gate fires *before* this point — check [src/hooks/useReincarnationKarma.js](src/hooks/useReincarnationKarma.js).
   - If not, lower realm 21's cost (currently 2.8M) and the rest of the IA/Saint band by ~5×, or front-load Eternal Tree access.

3. **🟡 [P1] Mid-realm region drought.** Between idx 24 (Saint E) and idx 27 (SK 1st), the player gets exactly 2 region unlocks (idx 24, idx 26) for 3 realms of grind — and each realm takes 8-15× longer than the last. Consider adding a region at idx 25 (Saint Mid) with mid-tier gold drops to give the player something to look at.

4. **🟡 [P1] No "scary" early-game encounter post-Pack-Wolf-fix.** Borderland Wilds Pack Wolf is now *too safe* (kill 5T / die 8T at correct level). Pre-fix had it tipping into one-shot territory — the new value lands well below average difficulty for the realm. Consider 1.5× atk (= 42 atk) so the encounter is *tight* (kill 5T / die ~5T) without being a one-shot. Tutorials should reward the player for using gear/pills, not auto-win.

5. **🟢 [P2] Validate the auto-farm yield rate.** With `RATE_MULTIPLIER = 0.10`, pill craft pace at TB realms is ~5–8 herbs / 15-min realm = 1–2 pills consumed before realm-up. That's the right cadence for early game. But by realm 14+ the 0.30 pts/sec is too slow to feed the 30-pill/realm cap (it takes 30+ days of gather to fill). A `harvestSpeed` artefact pool is currently empty — adding a small flat bonus to a `feet`/`hands` slot would unblock pill-stack growth.

6. **🟢 [P2] Pill DR floor check.** At N=100, pill marginal value = base × 0.98^99 = 13.5% of base. Iron pills (base 2-30) round-down to 0 well before that for the small-value damage pills (Iron Fist 2 phys hits round-to-0 at N=35). Decide: is that intended (pills cap themselves) or a bug (player wastes herbs)? Suggest adding a UI warning when DR'd value rounds to 0.

---

## Verification

- **Spot-check 1: Pack Wolf at realm 4.** From [useCombat.js:384-390](src/hooks/useCombat.js): `eHpBase = 150 × 1.12^4 = 236`, eAtk = `18 × 1.12^4 = 28.3`, eDef = `5 × 4 = 20`. With Pack Wolf hpMult 0.9 / atkMult 1.0: `eMaxHp = 212, eAtk = 28, eDef = 20` — matches the log. ✅
- **Spot-check 2: realm 24 cost vs time.** Cost 13M qi at online 1.65 qi/s, eff 0.66/s → `13e6 / 0.66 = 19.7M sec = 228 days`. Matches log. ✅
- **Spot-check 3: final qi rate.** Trans law (2.25) × pill_qi_speed (Trans Dao 0.10 × 8 consumed = 0.80, so factor 1.80) × ring qi (Trans 16 × 0.05 = 0.80, factor 1.80) = `1.0 × 2.25 × 1.80 × 1.80 = 7.29 qi/s`. Sim shows 4.05 qi/s — off by ~1.8×. **DISCREPANCY:** I likely under-consumed Dao pills (the greedy 2:1:1 vigor/skin/fist strategy never crafts Dao). With 0 Dao pills consumed, multiplier collapses to `1 × 2.25 × 1.0 × 1.80 = 4.05` ✅. The sim is internally consistent but doesn't model an optimal Dao-stack player. A real player optimizing for qi rate would consume Dao pills late-game and hit ~8 qi/s — *cuts total time roughly in half but doesn't change the soft-lock conclusions* (still tens of thousands of years).
- **MAX_OFFLINE_HOURS cap (8h) — auto-farm only:** Verified — `MAX_OFFLINE_HOURS = 8` ([autoFarm.js:26](src/systems/autoFarm.js:26)) caps **gather/mine** offline yield, not cultivation. `useCultivation.js`'s offline path ([line 114-195](src/hooks/useCultivation.js)) has only a `MIN_OFFLINE_SEC = 5×60` floor and no upper cap, so cultivation accrues qi continuously offline at the 0.20× rate. Impact on this audit:
  - **Cultivation timing claims stand** — a player returning after a week genuinely gets a week of 0.20× qi (no cap). The 25/75 model is accurate.
  - **Auto-farm pill yields are overstated** by up to 3× if the player checks in only once per day (8h cap × 1 session = 8h of farming captured per 24h, not 24h). For TB realms this matters less because pill consumption is capped at 30/realm anyway. By Saint+ realms it's irrelevant — herb deficit is dominated by months-long realm windows.

---

## Open Questions for the Designer

1. **Reincarnation karma rate** — at what wall-clock does a fresh-life player typically unlock their first Eternal Tree perk? If it's later than realm 21 (the first soft-lock), the early-life player has no path through.
2. **Does the realm cost curve assume tree-buffed cultivation rate?** If so, the curve is fine but the *gating* (showing the cost without tree context) is a UX problem.
3. **Are Qi Sparks (`useQiSparks.js`) expected to provide a baseline ~1.5–2× rate boost?** If so, modeling them would shave the endgame time to ~50,000-100,000 yr — still a soft-lock but in a different magnitude bucket.
4. **Heaven's Core enemy stats** — `hp 12.0` is the highest hpMult in the enemy roster (per `enemies.js`). Combined with `1.12^50 = 289×`, that's a 3,460× HP scalar over base 150. Intentional that this is unkillable on first life?
