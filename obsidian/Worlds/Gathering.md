# Gathering

A resource activity where the character is sent into a region to collect **herbs and botanical materials**.

Gathered herbs feed into the [[Items|Alchemy]] system for pill crafting.

---

## Overview

- **Idle/automated**: assign character to an unlocked region → they gather herbs continuously
- The region must first be **unlocked via** [[Worlds/World|the World map]]
- Access via the **Gather** sub-tab in the Worlds screen → click **Assign** on any unlocked region

---

## UI Flow

1. Player opens the Worlds screen → switches to the **Gather** tab
2. Each region shows the herbs available there
3. Clicking **Assign** navigates to the **Gathering screen** for that region
4. The Gathering screen shows:
   - The current herb being gathered (randomly chosen from the region's herb list)
   - A **progress bar** filling toward the herb's gather cost
   - A running list of herbs collected this session
5. Clicking **← Back** returns to the Worlds screen

---

## Herb Availability by Realm

Each region tier yields herbs of a corresponding rarity range. Lower-rarity herbs remain available in higher-tier regions at reduced weight.

| Major Realm | Primary Tier | Notable Herbs |
|---|---|---|
| Tempered Body | Common | Soul Calming Grass |
| Qi Transformation | Common – Uncommon | Soul Calming Grass, Jade Heart Flower, Netherworld Flame Mushroom |
| True Element | Uncommon | Jade Heart Flower, Netherworld Flame Mushroom |
| Separation & Reunion | Uncommon – Rare | Thousand-Year Ginseng, Blood Lotus |
| Immortal Ascension | Rare | Blood Lotus, Dragon Saliva Grass |
| Saint | Rare – Epic | Dragon Saliva Grass, Purple Cloud Vine |
| Saint King | Epic | Purple Cloud Vine |
| Origin Returning | Epic – Legendary | Purple Cloud Vine, Immortal Revival Leaf |
| Origin King+ | Legendary | Immortal Revival Leaf |

---

## Gathering Mechanics

- A herb is randomly chosen from the region's available list when gathering starts or a herb is collected
- Gathering progresses at **gather speed** (base **3 points/sec**, then × **0.10** global throttle = **0.3 effective pts/sec** before stat bonuses) toward the herb's **gather cost**
- When cost is reached → herb is collected and a new herb is chosen

### Gather Costs by Rarity

| Rarity | Gather Cost | Time at 0.3/s |
|---|---|---|
| Common | 15 | ~50 sec |
| Uncommon | 60 | ~3.5 min |
| Rare | 180 | ~10 min |
| Epic | 600 | ~33 min |
| Legendary | 1800 | ~1.7 hr |

### Gather Rate Formula

```
Effective Speed = (BASE_GATHER_SPEED + harvestSpeed) × RATE_MULTIPLIER
Gather Rate     = Effective Speed / GatherCost(item)
```

| Variable | Notes |
|---|---|
| Base | 3 points/sec (BASE_GATHER_SPEED in `src/systems/autoFarm.js`) |
| `RATE_MULTIPLIER` | 0.10 — global throttle on whole pipeline (base + stats), tuned 2026-05-01 |
| `harvestSpeed` | Additive stat from pills / artefacts / laws (Wood/Nature attribute) |

---

## Drop Weights

| Rarity | Base Weight |
|---|---|
| Common | 60% |
| Uncommon | 25% |
| Rare | 10% |
| Epic | 4% |
| Legendary | 1% |

Weights shift toward higher tiers as realm tier advances.

---

## TODO

- [ ] Apply Soul stat scaling to gather speed (currently fixed at 3/s)
- [ ] Define herb density / depletion and regen (currently ignored)
- [ ] Define gathering-specific upgrades (formation arrays, spiritual tools)
- [ ] Map herbs to pill recipes in [[Items]]
- [ ] Define Cultivation Material secondary drop rates
- [ ] Persist collected herbs to inventory

---

## Related

- [[Materials]]
- [[Items]]
- [[Realm Progression]]
- [[Worlds/World]]
- [[Worlds/Mining]]
- [[Laws]]

---

## Claude Commands
