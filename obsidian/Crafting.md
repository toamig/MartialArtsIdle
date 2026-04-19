# Crafting

The system for transforming [[Artefacts]], [[Secret Techniques]], and [[Laws]] you already own. Inspired by Slormancer's affix-manipulation crafting: you never create items from scratch — you modify what you have.

Crafting is performed at the **Transmutation** station (Production tab), unlocked at **Qi Transformation** realm.

---

## Core Concept

Every item has two layers:

| Layer | What it is | Can it change? |
|---|---|---|
| **Frame** | Slot / Rank / Type — the item's identity | Never |
| **Properties** | Affixes, passives, multipliers, element | Yes — via crafting |

Crafting operations act on properties only. The frame is permanent.

---

## Operations

Seven operations, all using **minerals only**. Same operations apply to all three item types (Artefacts, Techniques, Laws).

| Operation | What it does |
|---|---|
| **Upgrade** | Increase quality one tier (Iron → Bronze → … → Transcendent). Unlocks one additional property slot. |
| **Refine** | Randomise all properties at once. Keeps frame (slot / rank / type / element). |
| **Hone** | Reroll the value of one chosen property, keeping its type. |
| **Imbue** | Add one random property to an empty slot. |
| **Extract** | Remove one chosen property, freeing its slot. |
| **Seal** | Lock one property so Refine, Hone, and Transmute cannot touch it. One Seal per item. |
| **Transmute** | Swap one chosen property type for another from the same pool (random, same weight tier). |

---

## Material Costs — Minerals Only

### Mineral Roles

Each mineral serves a specific crafting purpose. The tier of mineral required matches the quality of the operation.

| Mineral                 | Rarity    | Primary Use                            |
| ----------------------- | --------- | -------------------------------------- |
| Black Tortoise Iron     | Uncommon  | Low-tier operations; Refine base cost  |
| Crimson Flame Crystal   | Uncommon  | Mid-low operations; Upgrade to Bronze  |
| **Chaos Jade**          | Uncommon  | Hone — targeted single-property reroll |
| Void Stone              | Rare      | Transmute; Upgrade to Silver           |
| Mithril Essence         | Rare      | Imbue — inscribing new properties      |
| Deep Sea Cold Iron      | Rare      | Seal — freezing a property in place    |
| Star Metal Ore          | Epic      | High-tier operations; Upgrade to Gold  |
| Skyfire Meteorite       | Epic      | Refine at epic/legendary quality       |
| Heavenly Profound Metal | Legendary | Upgrade to Transcendent                |

---

### Upgrade Costs

Quality-tier upgrade requires two minerals that bracket the jump.

| Upgrading | Materials |
|---|---|
| Iron → Bronze | Black Tortoise Iron ×10 + Crimson Flame Crystal ×3 |
| Bronze → Silver | Crimson Flame Crystal ×8 + Void Stone ×3 |
| Silver → Gold | Void Stone ×5 + Star Metal Ore ×3 |
| Gold → Transcendent | Star Metal Ore ×8 + Heavenly Profound Metal ×2 |

Same cost for all item types (Artefacts, Techniques, Laws).

---

### Other Operation Costs

Costs scale with the item's **current quality tier** (×1 at Iron, ×2 at Bronze, ×4 at Silver, ×8 at Gold, ×16 at Transcendent).

| Operation | Materials |
|---|---|
| Refine | Black Tortoise Iron × (3×tier) + Crimson Flame Crystal × tier |
| Hone | **Chaos Jade** × (2×tier) |
| Imbue | Mithril Essence × (2×tier) |
| Extract | Black Tortoise Iron × 5 |
| Seal | Deep Sea Cold Iron × 3 |
| Transmute | Void Stone × (2×tier) |

At epic/legendary quality, Refine also requires Skyfire Meteorite × tier (in addition to the base cost).

---

## What Can Be Modified

### Artefacts

| Property | Refine | Hone | Imbue / Extract | Transmute |
|---|---|---|---|---|
| Affixes | ✓ | ✓ (value only) | ✓ | ✓ |
| Base stat | ✗ | ✗ | ✗ | ✗ |
| Slot | ✗ | ✗ | ✗ | ✗ |

### Secret Techniques

| Property | Refine | Hone | Imbue / Extract | Transmute |
|---|---|---|---|---|
| Passives | ✓ | ✓ (effect values) | ✓ | ✓ |
| Element | ✓ | ✗ | ✗ | ✓ |
| Type (Attack / Heal / Defend / Dodge) | ✗ | ✗ | ✗ | ✗ |
| Rank | ✗ | ✗ | ✗ | ✗ |

### Laws

| Property | Refine | Hone | Imbue / Extract | Transmute |
|---|---|---|---|---|
| Stat multipliers (Essence/Soul/Body/Speed) | ✓ | ✓ (one multiplier) | ✗ | ✗ |
| Passives | ✓ | ✓ (effect values) | ✓ | ✓ |
| Element | ✓ | ✗ | ✗ | ✓ |
| Realm requirement | ✗ | ✗ | ✗ | ✗ |

---

## Seal Rules

- One Seal per item at a time.
- Sealed property is immune to Refine, Hone, and Transmute.
- Seal can be removed (costs Deep Sea Cold Iron × 5), freeing the slot.
- Upgrading does not remove the Seal.

---

## Unlock Progression

| Operation | Unlocked At |
|---|---|
| Upgrade, Extract, Imbue | Qi Transformation |
| Refine, Hone | True Element |
| Seal | Immortal Ascension |
| Transmute | Saint |

---

## TODO

- [ ] Implement Refine, Hone, Imbue, Extract, Seal, Transmute in code (Upgrade is done)
- [ ] Add Chaos Jade to enemy drop tables (World 2+ enemies)
- [ ] Design Transmutation UI for multi-operation workflow
- [ ] Define "preview" mode for Hone — show value range before confirming
- [ ] Balance mineral costs once economy data is available

---

## Related

- [[Artefacts]]
- [[Secret Techniques]]
- [[Laws]]
- [[Materials]]
- [[Realm Progression]]
