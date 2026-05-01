# Cultivation System

## Overview

The player cultivates (gains Qi/energy) over time, progressing through **realms** and **sub-realms** via **breakthroughs**.

## Cultivation Identity = Laws

The "cultivation type" concept has been folded into [[Laws]]. Each law
defines: element, rarity tier, cultivation-speed multiplier, primary-stat
typeMults (Essence/Body/Soul slots), unique passives, and pool-based
damage type bonuses. See [[Laws]] for the full schema.

## Gaining Qi

- Qi accumulates passively over time (idle)
- Cultivation speed affected by current cultivation type and stats
- Meditation room UI shows current law + cultivation type

### Implemented: Qi Rates

| Mode | Rate |
|---|---|
| Passive (idle) | `BASE_RATE = 1` qi/sec |
| Focused (hold-to-boost) | `BASE_RATE × focusMult` (focus mult = `qi_focus_mult` stat, base **300%** = 3×; modifiable by artefacts, pills, law uniques, selections) |
| Offline | `BASE_RATE × law × artefact × spark × (1 + pill_qi_speed) × OFFLINE_QI_MULTIPLIER` — `OFFLINE_QI_MULTIPLIER = 0.20` (tuned 2026-05-01); offline qi is 20% of the equivalent online rate so being at the screen always pays the most |

The game loop runs via `requestAnimationFrame` with delta-time so rates are frame-rate independent.

```js
// src/hooks/useCultivation.js (effective formula)
qi += BASE_RATE
    × lawCultMult                          // active law cultivation_speed_mult
    × (1 + Σ qi_speed_increased) × Π qi_speed_more
    × (focusing ? focusMult : 1)
    × pillQiMult × treeQiMult × selectionQiMult
    × (adBoost ? 2 × (1 + heavenlyQiMult) × treeHeavenlyMult : 1)
    × dt
  + crystalQiBonus × dt                    // QI Crystal flat add (level × 2)
```

## Breakthroughs

- Breakthrough is **automatic** — when `qi >= cost`, realm increments and cost is deducted
- Each major realm has **sub-realms** (stages) — design TBD, currently realms are flat
- See [[Realm Progression]] for current realm list and costs

## Reincarnation Gains

On reincarnation, the player carries over:
- **Element affinity** (mental and physical)
- **Talent**
- At higher realms: **starting cultivation boost**

## Related

- [[Primary Stats]]
- [[Realm Progression]]
- [[Reincarnation]]
- [[Laws]]
- [[Secret Techniques]]

---

## Claude Commands
