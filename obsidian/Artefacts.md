# Artefacts

Mechanical design for all equippable artefacts. For lore names and slot descriptions see [[Items]]. For modifier stacking rules see [[Stats]]. For crafting and refining operations see [[Crafting]].

---

## Slots

Eight equipment slots total: one **Weapon** and seven **Armour** slots.

| Slot | Role |
|---|---|
| **Weapon** | Damage — flat damage bonus and technique support |
| **Head** | Soul / mental defence |
| **Body** | Primary defensive piece — DEF and Health |
| **Hands** | Offensive utility — enhances strikes |
| **Waist** | Mixed utility — qi, activity speeds |
| **Feet** | Mobility — dodge, activity speeds |
| **Neck** | Resistances — elemental and soul protection |
| **Finger** | Broad stat amplification (×2 rings can be worn) |

---

## Quality & Affix Count

Every artefact has the same fixed slot layout: **2 Iron slots + 1 per higher quality** (so a Transcendent artefact has 6 total slots). Quality gates which slots are unlocked — an Iron item only has its 2 Iron slots, a Silver item has 2 Iron + 1 Bronze + 1 Silver, etc.

| Quality | Total slots | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|
| Iron | 2 | 2 | — | — | — | — |
| Bronze | 3 | 2 | 1 | — | — | — |
| Silver | 4 | 2 | 1 | 1 | — | — |
| Gold | 5 | 2 | 1 | 1 | 1 | — |
| Transcendent | 6 | 2 | 1 | 1 | 1 | 1 |

Authoritative constant: `ARTEFACT_TIER_SLOTS` in `src/data/affixPools.js`.

### Item-wide uniqueness

No affix id may repeat anywhere on the same item. This is stricter than the previous "per-tier" rule — rolling Iron Sharpness on one slot means no other slot on that item (any tier) can roll Sharpness.

### Unique modifiers

- **On creation:** 2% chance (global constant `UNIQUE_ON_CREATION_CHANCE`) that one of the two Iron slots rolls an **artefact-unique** instead of a normal affix. Uniques are drawn from `ARTEFACT_UNIQUES` (see `src/data/uniqueModifiers.js`) filtered by the item's slot type.
- **Transcendent slot:** the candidate pool is the normal Transcendent affixes merged with slot-matching uniques at uniform weighting — Add transmutations on a Transcendent slot can therefore roll a unique.
- **Locked:** unique affixes cannot be honed or replaced. Replace (reroll) can never produce a unique either.
- **UI:** uniques render with the magenta accent `#ff7ae6` and a ★ tag so they're distinguishable from any rarity colour.

---

## Item Generation

When an artefact is generated (dropped, found, or crafted):

1. **Slot** is determined by the source (drop table, boss, etc.)
2. **Quality** is rolled (weighted by zone tier — higher zones bias toward better quality)
3. **Base stat** is applied (fixed per slot, scales with realm tier of the zone it drops in)
4. **All visible tier slots** are filled immediately (no empty slots on new items):
   - For each tier slot up to the item's quality: pick a modifier the item doesn't already carry and roll a value within the modifier's range for that tier
   - With `UNIQUE_ON_CREATION_CHANCE` (2%) probability, one of the two Iron slots is replaced with a slot-matching unique
   - Transcendent slot's candidate pool includes uniques (uniform weighting)

Players **start with no artefacts** — inventory and equipped loadout are both empty. Gear is acquired through refining or drops.

---

## Base Stats

Every artefact has one fixed base stat regardless of affixes. It scales with the **realm tier** of the zone it drops in (exact multipliers TBD — flagged for balancing).

| Slot | Base Stat |
|---|---|
| Weapon | Flat Physical Damage *or* Flat Elemental Damage (matches weapon element/type) |
| Head | Soul flat |
| Body | DEF flat |
| Hands | Essence flat *or* Body flat (split by weapon affinity — TBD) |
| Waist | Body flat |
| Feet | Body flat |
| Neck | Elemental Defense flat |
| Finger | Any one primary stat flat (Essence / Soul / Body — rolled at generation) |

---

## Affix Pools

Each entry shows: **Modifier** · **Type** (from [[Stats#Stacking Types]]) · **Weight**

Weight scale: `100` = very common · `60` = moderate · `30` = uncommon · `10` = rare · `3` = very rare

A total weight is the sum of all weights in the pool. On each affix roll, one entry is selected proportionally (no duplicates per item).

Value ranges are given as **[Iron | Bronze | Silver | Gold | Transcendent]**. All values are rough baselines — exact numbers require gameplay balancing.

---

### Weapon

Focus: damage output, technique empowerment, exploit.

| Modifier | Type | Weight | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|---|
| Physical Damage | `% increased` | 80 | 5–10% | 10–18% | 18–28% | 28–40% | 40–60% |
| Elemental Damage | `% increased` | 80 | 5–10% | 10–18% | 18–28% | 28–40% | 40–60% |
| Psychic Damage | `% increased` | 50 | 5–8% | 8–15% | 15–22% | 22–32% | 32–50% |
| Flat Physical Damage | `+N` | 60 | 5–15 | 15–35 | 35–70 | 70–130 | 130–220 |
| Flat Elemental Damage | `+N` | 60 | 5–15 | 15–35 | 35–70 | 70–130 | 130–220 |
| Exploit Chance | `% increased` | 40 | 2–4% | 4–7% | 7–11% | 11–16% | 16–24% |
| Exploit Attack Multiplier | `% increased` | 30 | 5–8% | 8–14% | 14–22% | 22–32% | 32–50% |
| Essence flat | `+N` | 30 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Body flat | `+N` | 30 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| All Damage | `% more` | 10 | 3–5% | 5–8% | 8–12% | 12–18% | 18–25% |
| Technique Cooldown Reduction | `% increased` | 20 | 2–4% | 4–7% | 7–11% | 11–16% | 16–22% |
| Health | `+N` | 15 | 10–25 | 25–60 | 60–120 | 120–220 | 220–380 |

---

### Head

Focus: Soul, mental attacks, soul and elemental defence.

| Modifier | Type | Weight | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|---|
| Soul flat | `+N` | 100 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Essence flat | `+N` | 70 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Soul Toughness | `% increased` | 80 | 4–8% | 8–14% | 14–22% | 22–32% | 32–50% |
| Elemental Defense | `% increased` | 60 | 4–8% | 8–14% | 14–22% | 22–32% | 32–50% |
| Health | `+N` | 80 | 10–25 | 25–60 | 60–120 | 120–220 | 220–380 |
| DEF flat | `+N` | 60 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Qi Generation Speed | `% increased` | 40 | 2–4% | 4–8% | 8–13% | 13–20% | 20–30% |
| Psychic Damage | `% increased` | 50 | 4–8% | 8–14% | 14–22% | 22–32% | 32–50% |
| Elemental Damage | `% increased` | 30 | 4–7% | 7–12% | 12–18% | 18–26% | 26–40% |
| Soul Toughness | `% more` | 10 | 3–5% | 5–8% | 8–12% | 12–18% | 18–25% |

---

### Body

Focus: DEF, Health — the primary defensive slot.

| Modifier | Type | Weight | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|---|
| DEF flat | `+N` | 100 | 5–12 | 12–28 | 28–55 | 55–100 | 100–170 |
| Health | `+N` | 100 | 15–35 | 35–80 | 80–160 | 160–300 | 300–500 |
| DEF | `% increased` | 80 | 4–8% | 8–15% | 15–24% | 24–35% | 35–55% |
| Elemental Defense | `% increased` | 80 | 4–8% | 8–15% | 15–24% | 24–35% | 35–55% |
| Soul Toughness | `% increased` | 80 | 4–8% | 8–15% | 15–24% | 24–35% | 35–55% |
| Body flat | `+N` | 60 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Essence flat | `+N` | 40 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Health | `% increased` | 50 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| DEF | `% more` | 10 | 3–5% | 5–8% | 8–12% | 12–18% | 18–25% |
| Qi Generation Speed | `% increased` | 20 | 1–3% | 3–6% | 6–10% | 10–15% | 15–22% |

---

### Hands

Focus: offensive output, exploit, strike enhancement.

| Modifier | Type | Weight | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|---|
| Physical Damage | `% increased` | 90 | 5–10% | 10–18% | 18–28% | 28–40% | 40–60% |
| Elemental Damage | `% increased` | 80 | 5–10% | 10–18% | 18–28% | 28–40% | 40–60% |
| Body flat | `+N` | 70 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Essence flat | `+N` | 60 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Exploit Chance | `% increased` | 60 | 2–5% | 5–9% | 9–14% | 14–20% | 20–30% |
| Flat Physical Damage | `+N` | 50 | 4–10 | 10–24 | 24–48 | 48–90 | 90–150 |
| DEF flat | `+N` | 40 | 2–6 | 6–14 | 14–28 | 28–50 | 50–85 |
| Health | `+N` | 40 | 8–20 | 20–48 | 48–95 | 95–175 | 175–300 |
| Psychic Damage | `% increased` | 30 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Exploit Attack Multiplier | `% increased` | 20 | 4–7% | 7–12% | 12–18% | 18–26% | 26–40% |

---

### Waist

Focus: mixed utility — Health, qi, activity speeds.

| Modifier | Type | Weight | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|---|
| Health | `+N` | 90 | 12–28 | 28–65 | 65–130 | 130–240 | 240–410 |
| DEF flat | `+N` | 80 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Body flat | `+N` | 70 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Qi Generation Speed | `% increased` | 70 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Harvest Gathering Speed | `% increased` | 60 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Mining Speed | `% increased` | 60 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Essence flat | `+N` | 40 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Soul flat | `+N` | 40 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Elemental Defense | `% increased` | 40 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Physical Damage | `% increased` | 25 | 3–6% | 6–10% | 10–15% | 15–22% | 22–33% |

---

### Feet

Focus: dodge, activity speeds, mobility.

| Modifier | Type | Weight | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|---|
| Harvest Gathering Speed | `% increased` | 90 | 4–8% | 8–15% | 15–24% | 24–35% | 35–55% |
| Mining Speed | `% increased` | 90 | 4–8% | 8–15% | 15–24% | 24–35% | 35–55% |
| Dodge | `% increased` | 80 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Body flat | `+N` | 60 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| DEF flat | `+N` | 50 | 2–6 | 6–14 | 14–28 | 28–50 | 50–85 |
| Health | `+N` | 50 | 8–20 | 20–48 | 48–95 | 95–175 | 175–300 |
| Qi Generation Speed | `% increased` | 40 | 2–4% | 4–8% | 8–13% | 13–20% | 20–30% |
| Harvest Gathering Luck | `% increased` | 30 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Mining Luck | `% increased` | 30 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Elemental Defense | `% increased` | 25 | 3–5% | 5–9% | 9–14% | 14–20% | 20–30% |

---

### Neck

Focus: resistances — Elemental Defense and Soul Toughness.

| Modifier | Type | Weight | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|---|
| Elemental Defense | `% increased` | 100 | 5–10% | 10–18% | 18–28% | 28–40% | 40–60% |
| Soul Toughness | `% increased` | 100 | 5–10% | 10–18% | 18–28% | 28–40% | 40–60% |
| Soul flat | `+N` | 70 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Essence flat | `+N` | 60 | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| Health | `+N` | 60 | 10–25 | 25–60 | 60–120 | 120–220 | 220–380 |
| Qi Generation Speed | `% increased` | 50 | 2–5% | 5–9% | 9–14% | 14–20% | 20–30% |
| Psychic Damage | `% increased` | 50 | 4–8% | 8–14% | 14–22% | 22–32% | 32–50% |
| DEF flat | `+N` | 40 | 2–6 | 6–14 | 14–28 | 28–50 | 50–85 |
| Elemental Defense | `% more` | 10 | 3–5% | 5–8% | 8–12% | 12–18% | 18–25% |
| Soul Toughness | `% more` | 10 | 3–5% | 5–8% | 8–12% | 12–18% | 18–25% |

---

### Finger (Ring)

The broadest affix pool in the game. Values are lower than other slots, but [[Stats#Unique Modifiers|Unique Modifier U7]] amplifies all ring stats by 10%. Two rings can be worn simultaneously.

| Modifier | Type | Weight | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|---|
| Essence flat | `+N` | 70 | 2–6 | 6–14 | 14–27 | 27–48 | 48–80 |
| Soul flat | `+N` | 70 | 2–6 | 6–14 | 14–27 | 27–48 | 48–80 |
| Body flat | `+N` | 70 | 2–6 | 6–14 | 14–27 | 27–48 | 48–80 |
| Physical Damage | `% increased` | 60 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Elemental Damage | `% increased` | 60 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Psychic Damage | `% increased` | 60 | 3–6% | 6–11% | 11–17% | 17–25% | 25–38% |
| Exploit Chance | `% increased` | 50 | 1–3% | 3–5% | 5–8% | 8–12% | 12–18% |
| Exploit Attack Multiplier | `% increased` | 40 | 3–5% | 5–9% | 9–14% | 14–20% | 20–30% |
| Health | `+N` | 50 | 6–15 | 15–36 | 36–72 | 72–130 | 130–225 |
| DEF flat | `+N` | 50 | 2–5 | 5–12 | 12–23 | 23–42 | 42–70 |
| Qi Generation Speed | `% increased` | 50 | 2–4% | 4–7% | 7–11% | 11–16% | 16–24% |
| Elemental Defense | `% increased` | 40 | 3–5% | 5–9% | 9–14% | 14–20% | 20–30% |
| Soul Toughness | `% increased` | 40 | 3–5% | 5–9% | 9–14% | 14–20% | 20–30% |
| Harvest Gathering Speed | `% increased` | 40 | 2–4% | 4–7% | 7–11% | 11–16% | 16–24% |
| Mining Speed | `% increased` | 40 | 2–4% | 4–7% | 7–11% | 11–16% | 16–24% |
| Dodge | `% increased` | 35 | 2–4% | 4–7% | 7–11% | 11–16% | 16–24% |
| All Damage | `% more` | 8 | 2–3% | 3–5% | 5–7% | 7–10% | 10–15% |

---

## Quality Drop Bias

The zone tier biases which quality can drop. Higher zones make Iron drops increasingly rare and Transcendent increasingly possible.

| Zone Tier | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|
| World 1 | 60% | 30% | 9% | 1% | 0% |
| World 2 | 35% | 38% | 20% | 6% | 1% |
| World 3 | 15% | 32% | 32% | 18% | 3% |
| World 4 | 5% | 18% | 35% | 32% | 10% |
| World 5 | 1% | 8% | 26% | 40% | 25% |
| World 6 | 0% | 2% | 13% | 38% | 47% |

---

## Crafting Summary

Full operation rules in [[Crafting]]. Quick reference for artefacts:

| Goal | Operation | Key Materials (minerals only) |
|---|---|---|
| Start over completely | **Refine** | Black Tortoise Iron × (3×tier) + Crimson Flame Crystal × tier |
| Fix one bad affix value | **Hone** | Chaos Jade × (2×tier) |
| Add a missing affix | **Imbue** | Mithril Essence × (2×tier) |
| Delete one affix | **Extract** | Black Tortoise Iron × 5 |
| Protect one affix | **Seal** | Deep Sea Cold Iron × 3 |
| Change affix type | **Transmute** | Void Stone × (2×tier) |
| Gain an extra affix slot | **Upgrade** | Two bracket minerals (see [[Crafting#Upgrade Costs]]) |

---

## TODO

- [ ] Define base stat scaling by realm tier (what Essence/Body flat values at each world tier)
- [ ] Define Health base values per realm tier
- [ ] Balance flat vs % modifier value ranges once Qi scaling is known
- [ ] Define Dodge base value and cap
- [ ] Decide if `% more` affixes should be rarer via drop rate or quality gate
- [ ] Define how weapon element is assigned (always matches equipped Law? or fixed on drop?)

---

## Related

- [[Items]]
- [[Stats]]
- [[Laws]]
- [[Secret Techniques]]
- [[Materials]]
- [[Realm Progression]]
- [[Reincarnation]]
- [[Worlds/World]]

---

## Claude Commands
