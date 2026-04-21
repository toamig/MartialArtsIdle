# Realm Progression

Realm system based on **Martial Peak** (武炼巅峰). Each major realm has sub-stages that must be cleared sequentially.

---

## Realm Overview

| # | Major Realm | Sub-stages | Notes |
|---|---|---|---|
| 1 | Tempered Body | 10 Layers | Body-only stat |
| 2 | Qi Transformation | Early / Middle / Late / Peak | First qi cultivation |
| 3 | True Element | Early / Middle / Late / Peak | — |
| 4 | Separation & Reunion | 1st / 2nd / 3rd Stage | — |
| 5 | Immortal Ascension | 1st / 2nd / 3rd Stage | — |
| 6 | Saint | Early / Middle / Late | — |
| 7 | Saint King | 1st / 2nd / 3rd Stage | — |
| 8 | Origin Returning | 1st / 2nd / 3rd Stage | — |
| 9 | Origin King | 1st / 2nd / 3rd Stage | — |
| 10 | Void King | 1st / 2nd / 3rd Stage | — |
| 11 | Dao Source | 1st / 2nd / 3rd Stage | — |
| 12 | Emperor Realm | 1st / 2nd / 3rd Stage | — |
| 13 | Open Heaven | Layer 1–6 | Low (1-3) / Mid (4-5) / High (6) |

Total sub-stages: **46**

---

## Detailed Costs

> **Curve:** costs were halved vs. the original curve and additionally
> compressed at the upper end so late-game stages aren't a brick wall.
> Endgame (Open Heaven Layer 6) is ~11× cheaper than before.

### Tempered Body (10 Layers)

| Stage | Qi Cost |
|---|---|
| Layer 1 | 50 |
| Layer 2 | 100 |
| Layer 3 | 175 |
| Layer 4 | 300 |
| Layer 5 | 500 |
| Layer 6 | 850 |
| Layer 7 | 1,400 |
| Layer 8 | 2,400 |
| Layer 9 | 4,000 |
| Layer 10 | 6,500 |

### Qi Transformation (4 Stages)

| Stage | Qi Cost |
|---|---|
| Early Stage | 10,000 |
| Middle Stage | 17,500 |
| Late Stage | 30,000 |
| Peak Stage | 50,000 |

### True Element (4 Stages)

| Stage | Qi Cost |
|---|---|
| Early Stage | 75,000 |
| Middle Stage | 130,000 |
| Late Stage | 225,000 |
| Peak Stage | 380,000 |

### Separation & Reunion (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 625,000 |
| 2nd Stage | 1,000,000 |
| 3rd Stage | 1,700,000 |

### Immortal Ascension (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 2,800,000 |
| 2nd Stage | 4,700,000 |
| 3rd Stage | 8,000,000 |

### Saint (3 Stages)

| Stage | Qi Cost |
|---|---|
| Early Stage | 13,000,000 |
| Middle Stage | 22,000,000 |
| Late Stage | 35,000,000 |

### Saint King (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 58,000,000 |
| 2nd Stage | 95,000,000 |
| 3rd Stage | 160,000,000 |

### Origin Returning (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 260,000,000 |
| 2nd Stage | 430,000,000 |
| 3rd Stage | 700,000,000 |

### Origin King (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 1,150,000,000 |
| 2nd Stage | 1,900,000,000 |
| 3rd Stage | 3,200,000,000 |

### Void King (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 5,200,000,000 |
| 2nd Stage | 8,500,000,000 |
| 3rd Stage | 14,000,000,000 |

### Dao Source (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 23,000,000,000 |
| 2nd Stage | 38,000,000,000 |
| 3rd Stage | 62,000,000,000 |

### Emperor Realm (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 100,000,000,000 |
| 2nd Stage | 170,000,000,000 |
| 3rd Stage | 280,000,000,000 |

### Open Heaven (6 Layers)

| Stage | Qi Cost | Tier |
|---|---|---|
| Layer 1 | 460,000,000,000 | Low-Rank |
| Layer 2 | 750,000,000,000 | Low-Rank |
| Layer 3 | 1,200,000,000,000 | Low-Rank |
| Layer 4 | 2,000,000,000,000 | Mid-Rank |
| Layer 5 | 3,300,000,000,000 | Mid-Rank |
| Layer 6 | 5,500,000,000,000 | High-Rank |

---

## Major-Realm Breakthrough Gate (Qi/s Requirement)

Ascending **between major realms** (i.e. whenever `realm.name` changes — e.g. Tempered Body → Qi Transformation, Peak Qi Transformation → Early True Element) requires the player to sustain a minimum **qi/s** rate. Sub-stage transitions within the same major realm have no gate.

- **Rule:** required qi/s = `nextRealm.cost × base × decay^ord`
  - `base = 1%` (0.01)
  - `decay = 0.55` multiplicatively per successive major gate
  - `ord = 0, 1, 2, …` — the 0-based ordinal of the major transition
- **Intent:** early gates squeeze hardest (force investment in qi-rate sources before the first realm wall); later gates soften automatically because costs already dwarf what players can realistically accumulate per second.
- **Behaviour when gated:**
  - Qi accumulation is **clamped at 100%** of the current realm cost.
  - The Home-screen progress bar sits full, pulses red, and shows an inline `⛔ Qi/s <current> / <required>` chip embedded in the existing track — no new UI block.
  - As soon as the rolling qi/s meets the requirement, the breakthrough fires on the next tick.
- **Implementation:** `getMajorBreakthroughRate(fromIndex)` in `src/data/realms.js`; gate check in `useCultivation.js`'s tick loop; `gateRef` exposed to `RealmProgressBar.jsx` for the inline indicator.
- **Note:** the rate compared is the **live** qi/s including boost/pill/selection multipliers, so players can temporarily hold boost to push through a gate.

---

## Feature Unlocks by Major Realm

| Major Realm | Features Unlocked |
|---|---|
| Tempered Body | Combat (gold & materials), Shop, Secret Techniques (Mortal rank) |
| Qi Transformation | Laws, law-based default attack, Earth-rank techniques |
| True Element | Improved laws, law passives |
| Separation & Reunion | Sky-rank techniques |
| Immortal Ascension | — TBD |
| Saint | Saint-rank techniques |
| Saint King | — TBD |
| Origin Returning | Alchemy (pill crafting) |
| Origin King | — TBD |
| Void King | Multiplier upgrades, Emperor-rank techniques |
| Dao Source | — TBD |
| Emperor Realm | Artifact refining |
| Open Heaven | Heaven-rank techniques, Esoteric elements (Space, Time...) |

---

## Related

- [[Cultivation System]]
- [[Primary Stats]]
- [[Laws]]
- [[Secret Techniques]]
- [[Implementation Notes]]

---

## Claude Commands
