# Laws

Elemental cultivation arts unlocked at [[Realm Progression#Qi Transformation|Qi Transformation]].

Laws define **how a cultivator's raw Qi is converted into usable power**. Every stat point in Essence, Soul, and Body is derived from Qi through the multipliers the active Law provides.

---

## Requirements

- **Minimum Major Realm** — the higher the realm requirement, the better the multipliers and passives the law can roll.

---

## Element

Laws are tied to one element. Each element flavours the default attack and passive pool available to that law.

| Element | Notes |
|---|---|
| Fire | — |
| Water | — |
| Stone | — |
| Air | — |
| Metal | — |
| Wood | — |
| Normal | No elemental bonus, but broader passive pool |
| Ice | — |

> Elemental combinations possible at advanced realms (TBD).

---

## Stat Conversion

A Law defines three multipliers that convert the cultivator's raw **Qi** into the three primary stats. These are the base values — other sources (pills, artefacts, reincarnation bonuses) can modify them further.

| Stat | Derived From | Used For |
|---|---|---|
| **Essence** | `Qi × essence_mult` | Elemental attacks |
| **Soul** | `Qi × soul_mult` | Mental / spiritual attacks |
| **Body** | `Qi × body_mult` | Physical attacks |

A law specialises in a role — a fire law might push `essence_mult` high at the expense of `body_mult`, while a stone law might favour `body_mult`.

---

## Cultivation Speed

Each law has a **base cultivation speed multiplier** applied on top of the global rate:

```
qi/sec = BASE_RATE × cultivation_speed_mult × other_bonuses
```

Higher-realm laws generally roll higher `cultivation_speed_mult` values.

---

## Passives

Laws roll a set of specific passive bonuses. The number of passives depends on the law's **rarity**:

| Rarity | Passive Slots |
|---|---|
| Iron | 1 |
| Bronze | 2 |
| Silver | 3 |
| Gold | 4 |
| Transcendent | 5 |

### Passive Pool (examples)

- Bonus elemental damage
- Bonus healing
- Bonus damage on artefact hit
- Increased defense
- *(more TBD)*

---

## Realm Requirement & Quality

The minimum major realm required to use a law gates its overall quality:

| Realm Requirement | Effect |
|---|---|
| Low (Tempered Body / Qi Transformation) | Low multipliers, few passives, low rarity cap |
| Mid (True Element → Immortal Ascension) | Moderate multipliers, medium rarity cap |
| High (Saint+) | High multipliers, full rarity range possible |

---

## Acquisition

Laws are **procedurally generated** — found via books in the world. Each discovered book grants a law with randomized element, multipliers, passives, and rarity within the bounds of the current realm.

Once acquired, any Law can be refined at the [[Crafting|Refining Furnace]].

---

## Example Law

### Three Harmony Manual *(Normal · Iron · Qi Transformation)*

> *"The ancient text speaks of no fire, no storm, no mountain — only the even breath between all things."*

A beginner's law found early in the world. Makes no elemental specialisation, instead distributing Qi evenly across all three stats. Ideal for new cultivators who haven't yet committed to a combat style.

| Property | Value |
|---|---|
| **Element** | Normal |
| **Rarity** | Iron |
| **Realm Requirement** | Qi Transformation (Early Stage) |
| **Cultivation Speed** | ×1.0 (baseline) |
| **essence_mult** | 0.35 |
| **soul_mult** | 0.30 |
| **body_mult** | 0.35 |

**Passive (1 slot — Iron):**
- *Steady Breath:* Cultivation is not interrupted when taking damage below 10% of max DEF.

**Character:** Low multipliers across the board, no elemental attack bonus, but a broadly useful passive and zero realm gating beyond the unlock threshold. A solid starting law that becomes obsolete once elemental or specialised laws are discovered.

---

## Crafting Summary

Full operation rules in [[Crafting]]. Quick reference for laws:

| Goal | Operation | Key Materials (minerals only) |
|---|---|---|
| Reroll all multipliers + passives + element | **Refine** | Black Tortoise Iron × (3×tier) + Crimson Flame Crystal × tier |
| Fix one multiplier or passive value | **Hone** | Chaos Jade × (2×tier) |
| Add a missing passive | **Imbue** | Mithril Essence × (2×tier) |
| Delete one passive | **Extract** | Black Tortoise Iron × 5 |
| Protect one passive or multiplier | **Seal** | Deep Sea Cold Iron × 3 |
| Change element or passive type | **Transmute** | Void Stone × (2×tier) |
| Gain an extra passive slot | **Upgrade** | Two bracket minerals (see [[Crafting#Upgrade Costs]]) |

Realm requirement is permanent and cannot be changed by any crafting operation.

---

## TODO

- [ ] Define multiplier ranges per realm tier and rarity
- [ ] Define full passive pool and weighting per element
- [ ] Define elemental combination unlock conditions
- [ ] Define law discovery rate / book drop sources
- [ ] Define whether multiple laws can be held (swap mechanic?)

---

## Related

- [[Crafting]]
- [[Secret Techniques]]
- [[Primary Stats]]
- [[Realm Progression]]
- [[Cultivation System]]
- [[Items]]
- [[Combat]]

---

## Claude Commands

> **[CONCLUDED]**
> *Original commands received and executed (2026-04-10):*
>
> - ~~Continue to have an element (create element tabs and add the existing ones, and nothing else)~~
> - ~~Laws now dictate how much of the three stats you get from your current cultivation~~
> - ~~The three main stats are Chi, soul and body. Feel free to suggest better names since having qi and chi is a bit confusing~~
> - ~~A law has a certain multiplier from qi to calculate the stat base value (which can then be modified by other sources eventually)~~
> - ~~Update primary stats tab for the three stats and explain that chi is mainly used for elemental attacks, body for physical ones and soul for mental ones~~
> - ~~Update primary stats tab UI sketch to have the multipliers instead of cultivation speed for main stats~~
> - ~~The law also has other specific passives which number depends on the rarity of the law~~
> - ~~The law has a base cultivation speed multiplier~~
> - ~~The law has a requirement for major realm level. the bigger the requirement, the better the passives and multipliers are~~
>
> *Changes made:* Laws redesigned with element tabs, stat conversion multipliers (Essence/Soul/Body from Qi), cultivation speed multiplier, rarity-gated passive slots, and realm-requirement quality scaling. "Chi" renamed to **Essence** to avoid confusion with "Qi" — see [[Primary Stats]] for rationale.
