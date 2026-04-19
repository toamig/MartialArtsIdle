# Archive — Reincarnation Pre-Rescale (April 2026)

> *Snapshot from commit 95a3034^ — the version immediately before karma scaling was halved.*
> *This preserves the original karma table (335 peak total) and Eternal Tree costs for comparison.*
> *See [[Reincarnation]] for the current rescaled design (143 peak total).*

---

# Reincarnation — Rebirth System

> *"The body is ash. The soul remembers. The next life begins wiser."*

---

## Overview

Reincarnation is the prestige mechanic. The player resets all progress in
exchange for **Reincarnation Karma**, a permanent currency spent in the
**Eternal Tree** to unlock powerful lifelong buffs.

- **Tab name:** Rebirth (main NavBar entry).
- **Unlock:** visible from the first time the player reaches **Saint Early Stage**
  (realm index 24). Once unlocked it stays visible forever, even after reincarnating.
- **First reincarnation:** allowed any time after unlock — the player chooses when.
- **Karma is awarded per realm, first-time only.** Re-reaching a realm in a later
  life grants zero additional karma for that realm.

---

## Karma per Realm (Original — 335 Peak Total)

Awarded for the breakthrough *into* the realm. Starting realm (index 0) grants nothing.

| Major realm (index range)        | Karma / stage | Major total |
|----------------------------------|--------------:|------------:|
| Tempered Body Layer 2–10 (1–9)   | 1             | 9           |
| Qi Transformation (10–13)        | 2             | 8           |
| True Element (14–17)             | 3             | 12          |
| Separation & Reunion (18–20)     | 4             | 12          |
| Immortal Ascension (21–23)       | 5             | 15          |
| Saint (24–26) — **unlock here**  | 6             | 18          |
| Saint King (27–29)               | 7             | 21          |
| Origin Returning (30–32)         | 8             | 24          |
| Origin King (33–35)              | 9             | 27          |
| Void King (36–38)                | 10            | 30          |
| Dao Source (39–41)               | 11            | 33          |
| Emperor Realm (42–44)            | 12            | 36          |
| Open Heaven Layer 1–6 (45–50)    | 15            | 90          |
| **Peak total**                   |               | **335**     |

Reaching peak in a single life awards all 335 karma.

---

## The Eternal Tree (Original Costs — Total = 335)

A 3×3 grid. Top row holds the most powerful, most expensive nodes; bottom row
is cheap and unconditional. Middle nodes gate the top; bottom gates the middle.
Each link is **OR**.

```
[Triple All Damage 70]  [+1000 Soul/Body/Essence 60]  [Double QI/s 65]
        |   \                 /   |   \                    /   |
[Triple Focused QI 45]  [Double Heavenly QI 30]  [Triple QI-Stones 30]
        |   \                 /   |   \                    /   |
[Double Pill Effects 15]  [Double Mining 10]   [Double Gathering 10]
```

**Total cost = 335 karma — exactly what one peak life awards.**

### Node Effects

| Node                | Effect                                                           |
|---------------------|------------------------------------------------------------------|
| Double Pill Effects | All permanent pill stat bonuses × 2.                             |
| Double Mining       | Mining speed × 2 (`more` mod on `mining_speed`).                 |
| Double Gathering    | Harvest speed × 2 (`more` mod on `harvest_speed`).               |
| Triple Focused QI   | Hold-to-boost multiplier × 3 (`more` mod on `qi_focus_mult`).    |
| Double Heavenly QI  | While the ad boost is active, its multiplier doubles (×2 → ×4).  |
| Triple QI-Stones    | Crystal flat qi/s bonus × 3.                                     |
| Triple All Damage   | Final combat damage (basic + technique + exploit) × 3.           |
| +1000 Stats         | Flat +1000 to Essence, Body and Soul each.                       |
| Double QI/s         | Base cultivation rate × 2 (applies after every other multiplier). |

---

## Design Notes — Why This Was Rescaled

The original table front-loaded karma heavily into Open Heaven (90 out of 335, ~27%)
while the bulk of early realms produced small increments. The concern was that a player
reincarnating at Saint (the unlock gate) would have earned roughly 74 karma — enough for
the bottom row plus one middle node, but nowhere near the top row.

The rescale (commit 95a3034) compressed all tiers to roughly half, targeting ~143 peak
total so tree node costs could be proportionally reduced and the distance between unlock
and meaningful tree progression felt shorter.

**Key tradeoff:**
- Original (335): one peak life buys the entire tree — a fantasy of "I have mastered
  everything." Strong long-term pull, but the tree feels out of reach for early reincarnators.
- Rescaled (143): tree is affordable across multiple reincarnations. More frequent
  purchase moments, less "save up for the top row" tension.

---

## The Reincarnate Flow

1. Player clicks **Reincarnate** in the Rebirth tab.
2. Confirmation modal explains what is wiped vs what survives.
3. On confirm:
   - `karma.reincarnate()` awards pending karma and bumps the life counter.
   - `wipeReincarnation()` clears the standard save-key set; `mai_jade`, `mai_lang`,
     `mai_reincarnation`, and `mai_reincarnation_tree` are untouched.
   - `window.location.reload()` boots a fresh run.

---

## Code Map

| Responsibility                               | File                                   |
|----------------------------------------------|----------------------------------------|
| Karma scaling + tree node definitions        | `src/data/reincarnationTree.js`        |
| Karma state + per-realm tracking             | `src/hooks/useReincarnationKarma.js`   |
| Tree purchases + derived modifiers           | `src/hooks/useReincarnationTree.js`    |
| Tab UI                                       | `src/screens/ReincarnationScreen.jsx`  |
| Save-key preservation                        | `src/systems/save.js` (`wipeReincarnation`) |

---

## Related

- [[Reincarnation]] — current rescaled design
- [[Archive - Design Evaluation (April 2026)]] — full framework evaluation from this period
