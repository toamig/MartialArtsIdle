# Laws

Elemental cultivation arts unlocked at [[Realm Progression#Qi Transformation|Qi Transformation]].

Laws define the cultivator's elemental specialisation and provide a package of passives and cultivation-speed bonuses. Primary stats (Essence, Soul, Body) are no longer derived from Qi through a Law — see [[Primary Stats]].

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

## Types & Unique Pools

Each law also has a `types: [...]` array which controls **which unique-modifier pools** the law can roll from. Unique pools are balanced 3/3/3 around the three primary stats:

| Anchor stat | Pools |
|---|---|
| Body (martial) | physical, sword, fist |
| Essence (elemental) | fire, water, earth |
| Soul (mystical) | spirit, void, dao |

Every law additionally draws from the implicit **`general`** pool regardless of its types. Uniques with no strong thematic fit live in `general`.

- Authoritative pool list: `LAW_UNIQUE_POOLS` in `src/data/lawUniques.js`.
- Pool assignments per unique: `POOL_ASSIGNMENTS` map in the same file (~40 uniques are typed today; the other ~90 default to `general` — edit the map to curate further).
- Generated-law element-to-types mapping: `ELEMENT_TO_TYPES` in `src/data/affixPools.js` (Fire → fire, Water/Frost/Ice → water, Earth/Stone → earth, Void → void; others → `['general']`).
- The starter law **Three Harmony Manual** has `types: ['physical']` — thematic neutrality plus the martial pool.

The designer panel now exposes a read-only **Law Uniques** viewer (Progression section) that lists every unique grouped by its pool so designers can audit coverage.

### Types Are Damage Types

The same 9 types also classify **damage**: each type folds into exactly one of the three base damage buckets, mirroring its primary-stat anchor.

| Anchor | Types | Damage bucket |
|---|---|---|
| Body | physical, sword, fist | `physical_damage` |
| Essence | fire, water, earth | `elemental_damage` |
| Soul | spirit, void, dao | `psychic_damage` |

When an attack resolves, its damage category is derived from the active law's `types` array via `TYPE_TO_DAMAGE_CATEGORY` (in `src/data/lawUniques.js`):

- **Single category law** (e.g. `['fire']` or `['fire', 'water', 'earth']`) — the full flat bonus from the bucket's `*_damage` stat is applied.
- **Multi-category law** (e.g. `['fire', 'sword']`) — the attack is considered to be split evenly across the UNIQUE categories, and each category contributes its flat bonus proportionally. A `[fire, sword]` attack adds `0.5 × elemental_damage + 0.5 × physical_damage`.

This is applied inside `calcDamage()` in `src/data/techniques.js`. Previously the three `*_damage` stats were only displayed; they now actually modify attack output.

---

## Default Attack Multipliers (`typeMults`)

The **basic attack** (fires when no secret technique is ready) is scaled by a new `typeMults: { essence, body, soul }` field on every law. Each slot is **0 by default** — only categories the law actually covers via its `types` get a non-zero value.

Mapping (same as damage categories, just expressed as primary stats):

| Anchor | Types | Primary stat slot |
|---|---|---|
| Body | physical, sword, fist | `typeMults.body` |
| Essence | fire, water, earth | `typeMults.essence` |
| Soul | spirit, void, dao | `typeMults.soul` |

Formula (in `src/hooks/useCombat.js` and `src/systems/autoFarm.js`):
```
basicDmg = max(5, floor(E * typeMults.essence + B * typeMults.body + S * typeMults.soul))
```

### Roll ranges per rarity

The total multiplier rolls **once per covered category**. Adding a second type in the same category (e.g. `['fire', 'water']` → both Essence) does NOT stack — it just means more pool options for the shared slot.

| Rarity | Roll range (per covered category) |
|---|---|
| Iron | 1.10 … 1.30 |
| Bronze | 1.20 … 1.60 |
| Silver | 1.40 … 2.00 |
| Gold | 1.70 … 2.60 |
| Transcendent | 2.20 … 3.50 |

Authoritative: `LAW_TYPE_MULT_RANGES` + `rollLawTypeMults()` in `src/data/affixPools.js`.

### Soul-type generation gate

Soul-anchored types (`spirit`, `void`, `dao`) cannot appear on a law generated before the player has reached Saint realm (`realmIndex >= SAINT_INDEX = 24`). `generateLaw` strips them from the rolled `types` array and falls back to `['general']` if nothing remains. Secret techniques and the starter law are unaffected.

### Starter law

**Unyielding Fist Manual** (id `three_harmony_manual`, kept for save-compat):
- `types: ['fist']`
- `typeMults: { essence: 0, body: 1.20, soul: 0 }`

Its basic attack is `floor(Body × 1.20)` — Essence and Soul contribute nothing. Any future law the player earns via refining will follow the rolled ranges above.

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

A beginner's law found early in the world. Makes no elemental specialisation. Ideal for new cultivators who haven't yet committed to a combat style.

| Property | Value |
|---|---|
| **Element** | Normal |
| **Rarity** | Iron |
| **Realm Requirement** | Qi Transformation (Early Stage) |
| **Cultivation Speed** | ×1.0 (baseline) |

**Passive (1 slot — Iron):**
- *Steady Breath:* Cultivation is not interrupted when taking damage below 10% of max DEF.

**Character:** No elemental attack bonus and only a single passive, but a broadly useful passive and zero realm gating beyond the unlock threshold. A solid starting law that becomes obsolete once elemental or specialised laws are discovered.

---

## Crafting Summary

Full operation rules in [[Crafting]]. Quick reference for laws:

| Goal | Operation | Key Materials (minerals only) |
|---|---|---|
| Reroll all passives + element + cultivation speed | **Refine** | Black Tortoise Iron × (3×tier) + Crimson Flame Crystal × tier |
| Fix one passive value or cultivation speed | **Hone** | Chaos Jade × (2×tier) |
| Add a missing passive | **Imbue** | Mithril Essence × (2×tier) |
| Delete one passive | **Extract** | Black Tortoise Iron × 5 |
| Protect one passive | **Seal** | Deep Sea Cold Iron × 3 |
| Change element or passive type | **Transmute** | Void Stone × (2×tier) |
| Gain an extra passive slot | **Upgrade** | Two bracket minerals (see [[Crafting#Upgrade Costs]]) |

Realm requirement is permanent and cannot be changed by any crafting operation.

---

## TODO

- [ ] Define cultivation-speed multiplier ranges per realm tier and rarity
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
