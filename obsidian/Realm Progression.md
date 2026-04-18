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
| 13 | Half-Step Open Heaven | — | Single breakthrough |
| 14 | Open Heaven | Layer 1–6 | Low (1-3) / Mid (4-5) / High (6) |

Total sub-stages: **47**

---

## Detailed Costs

### Tempered Body (10 Layers)

| Stage | Qi Cost |
|---|---|
| Layer 1 | 100 |
| Layer 2 | 200 |
| Layer 3 | 350 |
| Layer 4 | 600 |
| Layer 5 | 1,000 |
| Layer 6 | 1,700 |
| Layer 7 | 2,800 |
| Layer 8 | 4,700 |
| Layer 9 | 8,000 |
| Layer 10 | 13,000 |

### Qi Transformation (4 Stages)

| Stage | Qi Cost |
|---|---|
| Early Stage | 20,000 |
| Middle Stage | 35,000 |
| Late Stage | 60,000 |
| Peak Stage | 100,000 |

### True Element (4 Stages)

| Stage | Qi Cost |
|---|---|
| Early Stage | 160,000 |
| Middle Stage | 280,000 |
| Late Stage | 480,000 |
| Peak Stage | 820,000 |

### Separation & Reunion (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 1,400,000 |
| 2nd Stage | 2,400,000 |
| 3rd Stage | 4,000,000 |

### Immortal Ascension (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 7,000,000 |
| 2nd Stage | 12,000,000 |
| 3rd Stage | 20,000,000 |

### Saint (3 Stages)

| Stage | Qi Cost |
|---|---|
| Early Stage | 35,000,000 |
| Middle Stage | 60,000,000 |
| Late Stage | 100,000,000 |

### Saint King (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 170,000,000 |
| 2nd Stage | 290,000,000 |
| 3rd Stage | 500,000,000 |

### Origin Returning (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 850,000,000 |
| 2nd Stage | 1,450,000,000 |
| 3rd Stage | 2,500,000,000 |

### Origin King (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 4,200,000,000 |
| 2nd Stage | 7,000,000,000 |
| 3rd Stage | 12,000,000,000 |

### Void King (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 20,000,000,000 |
| 2nd Stage | 35,000,000,000 |
| 3rd Stage | 60,000,000,000 |

### Dao Source (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 100,000,000,000 |
| 2nd Stage | 170,000,000,000 |
| 3rd Stage | 290,000,000,000 |

### Emperor Realm (3 Stages)

| Stage | Qi Cost |
|---|---|
| 1st Stage | 500,000,000,000 |
| 2nd Stage | 850,000,000,000 |
| 3rd Stage | 1,500,000,000,000 |

### Half-Step Open Heaven

| Stage | Qi Cost |
|---|---|
| Breakthrough | 2,500,000,000,000 |

### Open Heaven (6 Layers)

| Stage | Qi Cost | Tier |
|---|---|---|
| Layer 1 | 4,000,000,000,000 | Low-Rank |
| Layer 2 | 7,000,000,000,000 | Low-Rank |
| Layer 3 | 12,000,000,000,000 | Low-Rank |
| Layer 4 | 20,000,000,000,000 | Mid-Rank |
| Layer 5 | 35,000,000,000,000 | Mid-Rank |
| Layer 6 | 60,000,000,000,000 | High-Rank |

---

## Major-Realm Breakthrough Gate (Qi/s Requirement)

Ascending **between major realms** (i.e. whenever `realm.name` changes — e.g. Tempered Body → Qi Transformation, Peak Qi Transformation → Early True Element) requires the player to sustain a minimum **qi/s** rate. Sub-stage transitions within the same major realm have no gate.

- **Rule:** required qi/s = `nextRealm.cost × base × decay^ord`
  - `base = 1%` (0.01)
  - `decay = 0.85` multiplicatively per successive major gate
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
| Half-Step Open Heaven | Heaven-rank techniques |
| Open Heaven | Esoteric elements (Space, Time...) |

---

## Related

- [[Cultivation System]]
- [[Primary Stats]]
- [[Laws]]
- [[Secret Techniques]]
- [[Implementation Notes]]

---

## Claude Commands
