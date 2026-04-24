# Laws

Elemental cultivation arts unlocked at [[Realm Progression#Qi Transformation|Qi Transformation]].

Laws define the cultivator's elemental specialisation and provide a package of passives and cultivation-speed bonuses. **Primary stats are gone** — see [[Primary Stats]] for the deprecation note.

> **Overhaul note (2026-04-24):** the prior law catalogue and unique-modifier pools were wiped during the Damage & Element System Overhaul. Element list collapsed from 8 (Fire / Water / Stone / Air / Metal / Wood / Normal / Ice) to **5** (`fire / water / earth / wood / metal`). Type system collapsed from 9 pools to the same **5 + `general`**. `typeMults` removed entirely (no primary stats to multiply). All ~119 prior law uniques live in [[Deprecated_Unique_Modifiers]].

---

## Requirements

- **Minimum Major Realm** — the higher the realm requirement, the better the passives the law can roll.

---

## Element

Laws are tied to exactly one of the five elements. The element flavours the default attack and the passive pool the law draws from.

| Element |
|---|
| `fire` |
| `water` |
| `earth` |
| `wood` |
| `metal` |

Authoritative constant: `ELEMENTS` in `src/data/elements.js` (added in Stage 5 of the overhaul). See [[Elements]] for the global element model.

---

## Types & Unique Pools

Each law has a `types: [...]` array — one or more of the five elements plus optional `general`. The array selects which unique-modifier pools the law can roll from. Every law implicitly draws from `general` regardless of its `types`.

```
LAW_UNIQUE_POOLS = ['fire', 'water', 'earth', 'wood', 'metal', 'general']
```

All six pools start **empty** after the overhaul. The designer fills them by porting / rewriting entries from [[Deprecated_Unique_Modifiers]] (effects must be rewritten — no `essence`/`soul`/`body`, no `psychic_damage`, no `soul_toughness`).

- Authoritative pool list: `LAW_UNIQUE_POOLS` in `src/data/lawUniques.js`.
- Generated-law element-to-types mapping: see `src/data/affixPools.js` (typically `<element> → [<element>]`).

The designer panel still exposes a read-only **Law Uniques** viewer (Progression section) that lists every unique grouped by its pool — currently empty until the pools are refilled.

### Types and Damage

`law.types` no longer maps to a damage bucket. **Damage routing is per-technique now** (see [[Damage Types]] and [[Secret Techniques]]). Basic attacks are always physical. Secret techniques carry their own `damageType`.

`law.types` controls only the unique-modifier pool draw — it does not split or scale damage.

---

## Default Attack

The previous `typeMults: { essence, body, soul }` field is **removed** along with the primary stats it multiplied. Basic-attack damage is now scaled by realm index alone (placeholder formula until a new stat axis is designed):

```
basicDmg = max(5, K_basic × realmIndex × arteMult)
```

See [[Primary Stats#Placeholder formulas]].

### Starter law

Players no longer start with an equipped law. A fresh save's library is empty; the first **major-realm breakthrough** fires a "First Law" selection that offers three Iron rolls (no skip). The picked law lands in the library — the player equips it manually from the Character tab.

### Starter law

Players no longer start with an equipped law. A fresh save's library is empty; the first **major-realm breakthrough** fires a "First Law" selection that offers three Iron rolls (no skip). The picked law lands in the library — the player equips it manually from the Character tab.

### How laws are acquired

- **No more refining.** The Production → Refining tab no longer offers a law card; `REFINE_COSTS.law` is gone.
- **Breakthrough selections.** Every major-realm transition queues a second pending selection alongside the normal augment reward: three law rolls sampled from the realm's rarity band.
- **Rarity band per major realm** (authoritative: `lawOfferRaritiesForRealm` in `src/data/realms.js`):

  | Major realm | Offer pool |
  |---|---|
  | Tempered Body | Iron |
  | Qi Transformation, True Element | Iron + Bronze |
  | Separation & Reunion, Immortal Ascension | Bronze + Silver |
  | Saint, Saint King, Origin Returning | Silver + Gold |
  | Origin King, Void King, Dao Source, Emperor Realm, Open Heaven | Gold + Transcendent |

- **Reroll cost.** First reroll per offer is free; subsequent rerolls cost `JADE_COSTS.reroll_law_extra = 30` (1.5× the augment `reroll_extra`).
- **Skip** is allowed on all non-first offers.

### Unequipped is a legal state

`activeLaw` can be `null`. The cultivation tick, offline earnings, basic-attack formula, and stat engine all handle nullity — unequipped cultivators accrue qi at base rate with no `typeMults` applied. The BuildTab law picker exposes an "Unequip current law" action.

### Reincarnation

Wipes everything **except** the entire owned-law library. `activeLawId` is cleared, forcing the reborn character to pick a new equipped law from their library — the identity reset is explicit. Karma, the Eternal Tree, and the library persist across every life.

### Upgrade costs (law-specific)

Laws now have their own `LAW_UPGRADE_COSTS` table (in `src/data/crafting.js`) — ~1.5× heavier than the shared artefact/technique table since laws enter for free (no refining cost) and the upgrade path is the only mineral sink for them.

| Current → Next | Cost |
|---|---|
| Iron → Bronze | 15 iron_mineral_1 + 4 bronze_mineral_1 |
| Bronze → Silver | 12 bronze_mineral_1 + 4 silver_mineral_1 |
| Silver → Gold | 8 silver_mineral_1 + 4 gold_mineral_1 |
| Gold → Transcendent | 12 gold_mineral_1 + 3 transcendent_mineral_1 |

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

Laws are **procedurally generated** and offered exclusively through the
**breakthrough-offered library** described in `How laws are acquired`
above. There is no world-drop, refining, or crafting path that creates
new laws — every law in the player's library originated from a major-realm
breakthrough offer (or the first-law selection on the very first major
breakthrough).

Unwanted laws can be **dismantled** back to a single mineral of matching
rarity (see [[Crafting#Operations]]).

---

## Example Law

### Unyielding Fist Manual *(metal · Iron · Qi Transformation)*

> *"A drill-book of Tempered Body strikes — the disciple's first hundred blows, repeated until the bones remember them."*

The starter law assigned to every fresh save. Single-element (metal), Iron rarity, one passive slot.

| Property | Value |
|---|---|
| **Element** | `metal` |
| **Types** | `['metal']` |
| **Rarity** | Iron |
| **Realm Requirement** | Qi Transformation (Early Stage) |
| **Cultivation Speed** | ×1.0 (baseline) |

**Passive (1 slot — Iron):** rolled from the `metal` and `general` pools. Both pools are empty until the designer refills them post-overhaul.

---

## Crafting Summary

Laws no longer participate in the seven-operation crafting flow. The
only operations available on a law are:

| Goal | Operation | Cost |
|---|---|---|
| Bump quality tier (Iron → Bronze → … → Transcendent) | **Upgrade** | `LAW_UPGRADE_COSTS` table above |
| Recover a mineral from an unwanted law | **Dismantle** | — (yields 1 mineral of the law's rarity) |

Element, passives, type multipliers, cultivation-speed multiplier, and
realm requirement are **all frozen at acquisition time** — there is no
way to reroll any of them. The library exists to give the player a
*choice* between distinct law identities, not a way to mutate one law
into another.

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
