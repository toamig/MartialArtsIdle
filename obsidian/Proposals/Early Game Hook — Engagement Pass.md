# Early Game Hook — Engagement Pass

**Status:** Proposal — ready to scope
**Date:** 2026-04-26
**Origin:** Design session (game-design-framework, prompted by tester feedback)

---

## Motivation

Multiple testers reported the **early game feels slow / requires low interaction**. Concrete picture of the first ~150 seconds in the current build:

- One input: hold cultivator → 3× qi rate
- One number: qi/s ticking
- One audio cue per ~60s breakthrough
- Zero decisions — first law/stance, combat, crystal, gathering all gated past Layer 3+

Combat unlock at L3 is the first reveal (~2.5 min). Until then it is *passive watching with an optional hold*.

---

## Diagnosis — 5-Component Filter

| Component        | Score    | Why                                                                              |
| ---------------- | -------- | -------------------------------------------------------------------------------- |
| Clarity          | OK       | qi/s and progress bar are legible; cause→effect of hold is visible               |
| **Motivation**   | **WEAK** | Player can't see what qi unlocks. No goal teaser, no preview of laws/combat/crystal |
| **Response**     | **WEAK** | One input. No decisions in first 2.5 min. Nothing to buffer or chain              |
| **Satisfaction** | **WEAK** | Breakthroughs are quiet (banner + sfx every ~60s). No juice between              |
| Fit              | OK       | Calm pace matches cultivation genre                                              |

Per the framework's debug protocol: "boring / low interaction" routes to **Motivation + Response** failures. Fix those *before* tuning numbers (qi rates, cost curves).

---

## Reference — How successful idle games hook players

> Sourcing caveat: drawn from memory of public game behavior. Verify specific numbers before quoting.

### Cookie Clicker (Orteil, 2013)
- Click cookie → +1 with flying number, sound, juice. **First reward <1 sec.**
- Cursor (auto-clicker) at 15 cookies → **first automation <30 sec.**
- Achievement spam: "1 baked", "10", "100" pings constantly early.
- Golden cookies spawn randomly → variable reward.
- New building unlocks roughly every 1–3 min in early game.

### Universal Paperclips (Frank Lantz, 2017)
Reveal pacing IS the game.
- One button. Auto-clipper at 5¢ → first idle moment <2 min.
- New mechanic introduced every 1–2 min early (marketing, trust, processors, projects).

### AdVenture Capitalist
Parallel tracks.
- Multiple businesses unlock within minutes; each has its own click→manager→upgrade arc.
- Constant "buy 10/100/MAX" decisions.

### Antimatter Dimensions / NGU / Trimps
Layered systems.
- Multiple resources split attention. Choice paralysis = engagement.
- Major mechanic reveal every ~30 min hooks players past boredom thresholds.

### Common rules across all of them

1. First visible reward <5 sec.
2. First "automation / graduation from clicking" <2 min.
3. Reveal cadence: new system or unlock every 1–2 min in early game.
4. Multiple parallel tracks within first 5 min.
5. Achievement spam early, thinning out later.
6. Variable rewards (golden cookies, crits).
7. Goal teaser — locked content visible from minute 1.
8. Active boost dominates early; passive crossover later → "my work paid off" moment.

---

## Proposals

All values are **starting points for testing**, not prescriptive. Each proposal includes a pass/fail signal.

### Tier 1 — Juice the loop (cheap, low-risk)

Localized to `HomeScreen.jsx` + small new achievement module. Estimated impact: fixes ~60% of perceived slowness.

| #   | Proposal                                                                                                                | Pass signal                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1.1 | **Floating qi numbers on every tick.** "+1" flies off cultivator, fades 800ms.                                          | Testers stop asking "is it working?"                                 |
| 1.2 | **Achievement spam early.** Fire on every layer break L1–L10, then every 5. Corner-pop, 1.5s, name + tagline.           | Testers reference ≥2 achievements unprompted                         |
| 1.3 | **"Coming next" goal-teaser strip below cultivator.** 5 grayed icons (Combat L3, Crystal L4, Gathering L8, …) with reqs. | New tester names 3 upcoming features without being told              |
| 1.4 | **Stronger hold state.** Aura pulse + soft screen-edge glow + faster qi particles while holding.                        | Hold feels "powerful" rather than "barely visible"                   |

### Tier 2 — Add decisions (Response)

| #   | Proposal                                                                                                                                                | Risk                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 2.1 | **Focus tokens before each hold session.** Tap one of 3 random buffs (+50% qi 30s / double next breakthrough / +1 flat qi/s). Refreshes per breakthrough. | Adds cognitive load early — pair with clear tooltips              |
| 2.2 | **Optional rhythm tap during hold.** 1s beat, 200ms hit window, +20% boost on hit, neutral on miss.                                                     | Breaks "calm cultivation" feel — must be dismissible / opt-in      |

### Tier 3 — Move content forward (Motivation)

| #   | Proposal                                                                                                                                                                              | Risk                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 3.1 | **Tappable Qi Crystal at L1, not L4.** +5 flat qi per tap, 10s cooldown. Flat reward, **not compounding** — won't break later pacing. First "automation moment" lands ~50s in.        | Trivializes L1–L4 if reward compounds. Keep flat                    |
| 3.2 | **First "stance" choice at L2.** Three weak options: +10% qi, +10% boost duration, +1 flat qi/s. Locked for run, swappable on reincarnation. AdVenture Capitalist parallel-track pattern. | Adds early choice paralysis if shipped with Tier 2                  |
| 3.3 | **Training-dummy combat preview at L1.** One trivial fight, 1 HP enemy, no drops. Reveals combat exists before it's earned.                                                          | Spoils designed reveal — mitigate with one in-character dialogue line |

### Tier 4 — Return-visit hook

| #   | Proposal                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | **In-session offline reward.** If tab backgrounded ≥10s, on return show "While you cultivated, +X qi" with chime. Trains the muscle from session 1. |

---

## Tuning priority

Per the debug protocol — fix Motivation + Response before tuning numbers:

1. **Ship Tier 1 (1.1 + 1.2 + 1.3) first.** ~1 day work. Re-test.
2. **Then 3.1 (Crystal at L1).** Single-lever fix for "no decisions early." Half-day.
3. **Then 2.1 (focus tokens).** Adds the recurring choice pattern.
4. **Re-test before adding more.** Risk of overwhelming new players grows fast.

---

## Risks to watch

- **Notification fatigue.** Floaters + achievements + popups stacked is worse than silence. Cap simultaneous popups to 2.
- **Trivializing L1–L10 pacing.** Anything moved earlier must be *flat*, not compounding (Crystal +5 per tap, not +5%/sec).
- **Decision paralysis** if Tier 1 + 2 + 3 ship simultaneously to a new player. Stage them.

---

## Playtest plan

Quick A/B with 3 testers per arm:

- **Control:** current build
- **Arm 1:** Tier 1 only (juice + achievements + goal teaser)
- **Arm 2:** Tier 1 + 3.1 (juice + Crystal at L1)

Metrics:

- "Would you keep playing?" 1–5 scale at minute 5
- "What's the next thing you want to do?" — open answer. If they can answer, motivation is working.
- Drop-off point — when does each arm close the tab?

---

## Files likely touched

- `src/screens/HomeScreen.jsx` — floating numbers, hold state polish, goal-teaser strip
- `src/hooks/useCultivation.js` — hook for emitting tick events to floater system
- `src/data/featureGates.js` — move Crystal from L4 → L1 (Tier 3.1), Combat preview at L1 (Tier 3.3)
- New: `src/systems/achievements.js` (Tier 1.2)
- New: `src/components/QiFloater.jsx` (Tier 1.1)
- New: `src/components/GoalTeaserStrip.jsx` (Tier 1.3)

---

## See also

- [[Design Evaluation]]
- [[Tab Progression]]
- [[Cultivation System]]
- [[Realm Progression]]
