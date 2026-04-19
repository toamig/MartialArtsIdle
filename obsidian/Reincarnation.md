# Reincarnation — Rebirth System

> *"The body is ash. The soul remembers. The next life begins wiser."*

---

## Overview

Reincarnation is the prestige mechanic. The player resets all progress in
exchange for **Reincarnation Karma**, a permanent currency spent in the
**Eternal Tree** to unlock powerful lifelong buffs.

- **Tab name:** Rebirth (new entry in the main NavBar).
- **Unlock:** visible from the first time the player reaches **Saint Early Stage**
  (realm index 24). Once unlocked it stays visible forever, even after reincarnating.
- **First reincarnation:** allowed any time after unlock — the player chooses when.
- **Karma is awarded per realm, first-time only.** Re-reaching a realm in a later
  life grants zero additional karma for that realm.

---

## Karma per realm

Awarded for the breakthrough *into* the realm. Starting realm (index 0) grants
nothing — you only earn karma by progressing.

| Major realm (index range)        | Karma / stage | Major total |
|----------------------------------|--------------:|------------:|
| Tempered Body Layer 2–10 (1–9)   | 1             | 9           |
| Qi Transformation (10–13)        | 1             | 4           |
| True Element (14–17)             | 1             | 4           |
| Separation & Reunion (18–20)     | 2             | 6           |
| Immortal Ascension (21–23)       | 2             | 6           |
| Saint (24–26) — **unlock here**  | 2             | 6           |
| Saint King (27–29)               | 3             | 9           |
| Origin Returning (30–32)         | 3             | 9           |
| Origin King (33–35)              | 4             | 12          |
| Void King (36–38)                | 4             | 12          |
| Dao Source (39–41)               | 5             | 15          |
| Emperor Realm (42–44)            | 5             | 15          |
| Open Heaven Layer 1–6 (45–50)    | 6             | 36          |
| **Peak total**                   |               | **143**     |

Reaching peak in a single life awards all 143 karma.

Karma state lives in `localStorage` key `mai_reincarnation` and tracks:
- `karma` — current spendable balance
- `highestReached` — highest realm index ever touched across all lives
- `maxAwarded` — highest realm index that has already granted its karma
- `lives` — number of completed reincarnations

Pending karma (what would be awarded if the player reincarnated right now)
= `Σ karmaForReachingIndex(i)` for `i` from `maxAwarded+1` to `highestReached`.

---

## The Eternal Tree

A 3×3 grid. Top row holds the most powerful, most expensive nodes; bottom row
is cheap and unconditional. Middle nodes gate the top; bottom gates the middle.
Each link is **OR**, so the player can pivot between paths to reach any top
node via multiple middle options.

```
[Triple All Damage 30]  [+1000 Soul/Body/Essence 26]  [Double QI/s 28]
        |   \                 /   |   \                    /   |
        |    \               /    |    \                  /    |
[Triple Focused QI 19]  [Double Heavenly QI 13]  [Triple QI-Stones 13]
        |   \                 /   |   \                    /   |
        |    \               /    |    \                  /    |
[Double Pill Effects 6]  [Double Mining 4]   [Double Gathering 4]
```

**Total cost = 143 karma — exactly what one peak life awards.**

Purchases persist in `localStorage` key `mai_reincarnation_tree` and are NOT
wiped on reincarnation. Each node is a one-time purchase.

### Node effects

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

## The reincarnate flow

1. Player clicks **Reincarnate** in the Rebirth tab.
2. Confirmation modal explains what is wiped vs what survives.
3. On confirm:
   - `karma.reincarnate()` awards pending karma and bumps the life counter.
   - `wipeReincarnation()` clears the standard save-key set (same list as
     `wipeSave()`; `mai_jade`, `mai_lang`, `mai_reincarnation`, and
     `mai_reincarnation_tree` are untouched).
   - `window.location.reload()` boots a fresh run — karma and tree load back
     from their preserved keys.

---

## Code map

| Responsibility                               | File                                   |
|----------------------------------------------|----------------------------------------|
| Karma scaling + tree node definitions        | `src/data/reincarnationTree.js`        |
| Karma state + per-realm tracking             | `src/hooks/useReincarnationKarma.js`   |
| Tree purchases + derived modifiers           | `src/hooks/useReincarnationTree.js`    |
| Tab UI                                       | `src/screens/ReincarnationScreen.jsx`  |
| Save-key preservation                        | `src/systems/save.js` (`wipeReincarnation`) |
| Nav tab entry                                | `src/components/NavBar.jsx`            |
| Wiring into cultivation / combat / stats     | `src/App.jsx` + `useCultivation.js` + `useCombat.js` |
