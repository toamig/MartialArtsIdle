# Mining

A resource activity where the character is sent into a region to extract **ores, crystals, and minerals**.

Mined minerals are the primary input for **Artefact Refining**, unlocked at [[Realm Progression#Emperor Realm|Emperor Realm]].

---

## Overview

- **Idle/automated**: assign character to an unlocked region → they mine ore veins continuously
- The region must first be **unlocked via** [[Worlds/World|the World map]]
- Access via the **Mine** sub-tab in the Worlds screen → click **Assign** on any unlocked region

---

## UI Flow

1. Player opens the Worlds screen → switches to the **Mine** tab
2. Each region shows the ores available there
3. Clicking **Assign** navigates to the **Mining screen** for that region
4. The Mining screen shows:
   - The current ore being mined (randomly chosen from the region's ore list)
   - A **progress bar** filling toward the ore's mine cost
   - A running list of ores collected this session
5. Clicking **← Back** returns to the Worlds screen

---

## Ore Availability by Realm

Each region tier yields minerals of a corresponding rarity range. Lower-rarity ores remain available in higher-tier regions at reduced weight.

| Major Realm | Primary Tier | Notable Ores |
|---|---|---|
| Tempered Body | Common | Black Tortoise Iron |
| Qi Transformation | Common – Uncommon | Black Tortoise Iron, Crimson Flame Crystal |
| True Element | Uncommon | Crimson Flame Crystal |
| Separation & Reunion | Uncommon – Rare | Void Stone, Mithril Essence |
| Immortal Ascension | Rare | Mithril Essence, Deep Sea Cold Iron |
| Saint | Rare – Epic | Deep Sea Cold Iron, Star Metal Ore |
| Saint King | Epic | Star Metal Ore, Skyfire Meteorite |
| Origin Returning | Epic – Legendary | Skyfire Meteorite, Heavenly Profound Metal |
| Origin King+ | Legendary | Heavenly Profound Metal |

---

## Mining Mechanics

- An ore is randomly chosen from the region's available list when mining starts or an ore is collected
- Mining progresses at **mine speed** (base: **3 points/sec**) toward the ore's **mine cost**
- When cost is reached → ore is collected and a new ore is chosen

### Mine Costs by Rarity

| Rarity | Mine Cost | Time at 3/s |
|---|---|---|
| Common | 15 | ~5 sec |
| Uncommon | 60 | ~20 sec |
| Rare | 180 | ~1 min |
| Epic | 600 | ~3.5 min |
| Legendary | 1800 | ~10 min |

### Mine Rate Formula

```
Mine Rate = Body × RealmMult × (1 + LawBonus)
```

| Variable | Notes |
|---|---|
| Base | 3 points/sec (before stat scaling) |
| `RealmMult` | ~1.5× per major realm |
| `LawBonus` | Earth/Metal-attribute Laws grant +10–25% mining speed |

---

## Ore Grades

Some ores have a **refined grade** variant — a purer form required by high-tier artefact recipes.

| Base Ore | Refined Grade | Use Case |
|---|---|---|
| Black Tortoise Iron | Refined Black Tortoise Iron | Mid-tier armour base |
| Star Metal Ore | Star Metal Ingot | High-tier weapon core |
| Heavenly Profound Metal | Profound Metal Essence | Emperor-grade artefact base |

Refinement mechanic TBD.

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

- [ ] Apply Body stat scaling to mine speed (currently fixed at 3/s)
- [ ] Define vein richness / depletion and regen (currently ignored)
- [ ] Design mining-specific upgrades (formations, drills)
- [ ] Map ores to artefact recipes in [[Items]]
- [ ] Define ore grade refinement mechanic
- [ ] Define Cultivation Material secondary drop rates
- [ ] Persist collected ores to inventory

---

## Related

- [[Materials]]
- [[Items]]
- [[Realm Progression]]
- [[Worlds/World]]
- [[Worlds/Gathering]]
- [[Laws]]

---

## Claude Commands
