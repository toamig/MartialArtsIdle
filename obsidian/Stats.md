# Stats

Complete reference for every stat in the game — what it does and what sources can change it. The [[#Modifiers|Modifiers]] section catalogues every modifier type that can exist on any stat.

---

## Stacking Types

Every modifier on every stat belongs to one of these five types. Understanding the order of operations is critical for the damage and stat formulae.

| Type | Notation | How It Applies |
|---|---|---|
| **Increased Base** | `#% increased base` | Multiplies the base value of the stat (before anything else) |
| **Base Flat** | `adds # to base` | Adds a flat amount to the base value of the stat |
| **Flat** | `+#` | Adds a flat amount after all base calculations are done |
| **Increased Value** | `#% increased` | Additive % bonus applied to the value after flat additions — all sources of this type sum together then apply once |
| **Multiplier** | `#% more` | Multiplicative — each source of this type multiplies independently; stacks multiplicatively with other `more` sources |
| **Unique** | — | Special-case modifiers with their own rules (see [[#Unique Modifiers]]) |

### Order of Operations

```
Final Value = ((Base × (1 + Σ increased_base%) + Σ base_flat) + Σ flat) × (1 + Σ increased%) × Π more_mult
```

---

## Special Resource: Qi

Qi is the raw cultivation energy. It cannot be increased directly — only its **generation speed** can be modified. It accumulates passively over time and is the source of all three primary stats.

**Generation formula:**
```
qi/sec = BASE_RATE × (1 + Σ increased_qi_speed%) × Π more_qi_speed × focus_mult (when focusing)
```

- `BASE_RATE` = 5 qi/sec (hardcoded baseline)
- `focus_mult` = the Qi Focus Multiplier stat (base 300%; can be modified)
- Qi generation speed is modified via [[Laws|Law]] cultivation speed, reincarnation talent, and pills
- Qi is **spent** on realm breakthroughs; it does not convert to stats directly but sets the ceiling for primary stat calculation

---

## Primary Stats

The three primary stats are derived from Qi via the active [[Laws|Law]]'s conversion multipliers. All other modifier types layer on top of this base.

```
Base = Qi × law_mult
Final = ((Base × (1 + Σ increased_base%) + Σ base_flat) + Σ flat) × (1 + Σ increased%) × Π more
```

---

### Essence

Elemental power — the cultivator's chosen element made manifest.

- **Derived from:** `Qi × essence_mult` (Law)
- **Feeds into:** Elemental Damage, DEF, Secret Technique equip thresholds
- **Unlocked:** Qi Transformation (when a Law is equipped)

---

### Soul

Spiritual power — consciousness and will made tangible.

- **Derived from:** `Qi × soul_mult` (Law)
- **Feeds into:** Psychic Damage, Soul Toughness threshold, Secret Technique equip thresholds, Harvest Gathering Speed
- **Unlocked:** [[Realm Progression#Saint|Saint]] realm (soul_mult = 0 before this)

---

### Body

Physical power — the cultivated flesh, bones, and meridians.

- **Derived from:** `Qi × body_mult` (Law)
- **Feeds into:** Physical Damage, Defense, Secret Technique equip thresholds, Mining Speed
- **Unlocked:** Tempered Body (always active)

---

## Combat Stats

---

### Health

The amount of damage the character can take before dying.

- **Base value:** TBD (fixed value per realm tier)
- All five modifier types apply

---

### Physical Damage

Bonus damage applied to physical secret techniques and physical default attacks.

- **Base value:** 0 (Body is the primary driver; this stat adds on top)
- All five modifier types apply
- Physical secret techniques apply this in full
- Elemental and Psychic techniques do not use this stat

---

### Elemental Damage

Bonus damage applied to elemental secret techniques and elemental default attacks.

- **Base value:** 0 (Essence is the primary driver; this stat adds on top)
- All five modifier types apply
- The percentage of a secret technique that is elemental determines how much of this stat applies (e.g. a technique that is 70% elemental uses 70% of Elemental Damage)
- Physical and Psychic techniques do not use this stat

---

### Psychic Damage

Bonus damage applied to soul-based secret techniques and soul default attacks.

- **Base value:** 0 (Soul is the primary driver; this stat adds on top)
- All five modifier types apply
- Soul-based techniques apply this in full
- Physical and Elemental techniques do not use this stat

---

### Defense

Damage reduction against **physical attacks**.

- **Base value:** derived from Body (formula TBD)
- All five modifier types apply
- A defend-type [[Secret Techniques|Secret Technique]] applies a timed Defense buff

---

### Elemental Defense

Damage reduction against **elemental attacks**.

- **Base value:** derived from Essence (formula TBD)
- All five modifier types apply

---

### Soul Toughness

Damage reduction against **soul / psychic attacks**.

- **Base value:** derived from Soul (formula TBD)
- All five modifier types apply

---

### Exploit Chance

Chance for an attack to become an **exploit attack**, triggering the Exploit Attack Multiplier.

- **Base value:** 0%
- All five modifier types apply
- On an exploit hit, total damage is multiplied by the Exploit Attack Multiplier

---

### Exploit Attack Multiplier

The damage multiplier applied when an attack is an exploit attack.

- **Base value:** 150%
- All five modifier types apply

---

## Activity Stats

---

### Qi Generation Speed

How fast Qi accumulates per second. See [[#Special Resource Qi|Qi]] above.

- All five modifier types apply
- Focus multiplier is a separate stat (see below)

---

### Qi Focus Multiplier

The multiplier applied to Qi generation while the player is actively focusing (holding the boost button).

- **Base value:** 300%
- All five modifier types apply

---

### Harvest Gathering Speed

How fast the character collects herbs in [[Worlds/Gathering|Gathering]] zones.

- **Base value:** derived from Soul (formula TBD)
- All five modifier types apply

---

### Harvest Gathering Luck

Shifts herb drop weights toward higher rarities.

- **Base value:** 0
- All five modifier types apply
- Higher luck pushes Epic/Legendary weights up and Common/Uncommon weights down

---

### Mining Speed

How fast the character extracts ores in [[Worlds/Mining|Mining]] zones.

- **Base value:** derived from Body (formula TBD)
- All five modifier types apply

---

### Mining Luck

Shifts ore drop weights toward higher rarities.

- **Base value:** 0
- All five modifier types apply

---

## Modifiers

Every stat listed above can receive modifiers of the five stacking types. This section does not list per-stat modifier tables — any stat can have any of the five types applied to it. The tables below cover only the **Unique Modifiers**, which have special rules.

---

### Unique Modifiers

Unique modifiers do not fit the standard stacking model. Each has its own rule. Multiple unique modifiers of the same entry do not stack (only one copy is active unless noted).

| # | Modifier | Rule |
|---|---|---|
| U1 | **Qi bleeds into Gathering** | 5% of Qi Generation Speed is added to Harvest Gathering Speed (flat addition) |
| U2 | **Qi bleeds into Mining** | 5% of Qi Generation Speed is added to Mining Speed (flat addition) |
| U3 | **Cross-defense** | `-Type- attacks use 30% of -defense type- to defend from -Type- attacks` (e.g. physical attacks partially mitigated by Elemental Defense) |
| U4 | **Zero-stat cross-defense** | If the matching primary stat for a defense type is 0, that defense type uses 50% of another defense type instead |
| U5 | **Guaranteed exploit** | Exploit Chance is fixed at 100%; Exploit Attack Multiplier is fixed at 130% (overrides both stats) |
| U6 | **Healer's resilience** | Health is increased by 30% if a Heal-type [[Secret Techniques\|Secret Technique]] is equipped |
| U7 | **Ring amplification** | Stats granted by ring artefacts are increased by 10% |
| U8 | **Focus boost** | Qi Focus Multiplier is set to 600% (overrides base) |
| U9 | **Balanced destruction** | All damage type stats are increased by 130%; all damage type stats use the lowest damage type value among them as their effective value |
| U10 | **Dual elemental bonus** | Dual-element [[Secret Techniques\|Secret Techniques]] deal 20% more damage |

---

## TODO

- [ ] Define Health base value per realm tier
- [ ] Define Defense / Elemental Defense / Soul Toughness base formulas (how much of Body/Essence/Soul converts)
- [ ] Define Harvest Gathering Speed and Mining Speed base formulas (how much of Soul/Body converts)
- [ ] Define modifier value ranges per source (Law passives, artefact slots, pills)
- [ ] Clarify whether `#% increased base` and `base flat` apply before or after the Law conversion (they apply after — base = Qi × law_mult)
- [ ] Define elemental % split on dual-element secret techniques (for Elemental Damage weighting)
- [ ] Decide if Exploit Chance caps below 100% (without U5)

---

## Related

- [[Primary Stats]]
- [[Laws]]
- [[Secret Techniques]]
- [[Items]]
- [[Cultivation System]]
- [[Realm Progression]]
- [[Reincarnation]]
- [[Worlds/World]]
- [[Worlds/Gathering]]
- [[Worlds/Mining]]

---

## Claude Commands

> **[CONCLUDED]**
> *Commands executed (2026-04-11):*
>
> - ~~Update stacking types: Increased Base, Base Flat, Flat, Increased Value, Multiplier, Unique~~
> - ~~Clear previously generated modifier tables — modifier system is now generic (any stat can take any type)~~
> - ~~Qi reframed as generation-speed-only; cannot be increased directly~~
> - ~~Added stats: Essence, Soul, Body (primary); Elemental/Physical/Psychic Damage; Health; Defense; Elemental Defense; Soul Toughness; Exploit Chance; Exploit Attack Multiplier; Qi Generation Speed; Qi Focus Multiplier; Harvest Gathering Speed; Harvest Gathering Luck; Mining Speed; Mining Luck~~
> - ~~Unique modifier catalogue added (U1–U10)~~
>
> *Changes made:* Full rewrite of Stats.md. Old per-source modifier tables removed. New stat list with stacking type formula and order-of-operations. Generic modifier model (no per-stat source tables). Unique Modifiers table with all 10 entries.
