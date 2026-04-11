# Stats

Complete reference for every stat in the game — what it does, how it is calculated, and what sources can modify it. The [[#Modifiers|Modifiers]] section at the bottom catalogues every modifier type that exists in the game.

---

## Resources

### Qi

The raw cultivation energy that powers everything. It accumulates passively over time and is spent on realm breakthroughs. Qi is **not** a combat stat — it is the fuel that produces Essence, Soul, and Body.

**Base formula:**
```
qi/sec = BASE_RATE × cultivation_speed_mult × talent_mult × pill_bonus × law_speed_mult
```

| Variable | Default | Source |
|---|---|---|
| `BASE_RATE` | 5 qi/sec | Hardcoded baseline |
| `cultivation_speed_mult` | ×1.0 | Active [[Laws\|Law]] |
| `talent_mult` | ×1.0+ | [[Reincarnation]] talent carry-over |
| `pill_bonus` | ×1.0+ | Cultivation [[Items\|Pills]] |
| `law_speed_mult` | ×1.0+ | Law passive — cultivation speed roll |

**What can change it:**
- Equipping a Law with a higher `cultivation_speed_mult`
- Reincarnation talent (permanent multiplier that grows each life)
- Cultivation pills (temporary or permanent boosts)
- Law passives that roll a cultivation speed bonus
- Boosted cultivation (hold button) → ×3 while held

---

## Primary Stats

All three primary stats follow the same derivation pattern. The Law defines base multipliers; other sources layer on top.

```
Stat = Qi × law_mult × affinity_mult + artefact_flat + pill_flat
```

The `law_mult` is the main lever early game. Artefacts and pills add flat value on top; reincarnation affinity adds a percentage boost.

---

### Essence

Elemental power — the energy of the cultivator's chosen element made manifest.

**Derived from:** `Qi × essence_mult` (from active Law)

**Used for:**
- Primary driver of **elemental attacks**
- Contributes to **DEF** (Essence + Body)
- Required threshold for equipping some [[Secret Techniques]]

**What can change it:**
| Source | Effect |
|---|---|
| Active Law (`essence_mult`) | Base multiplier — primary lever |
| Artefacts (rings, gauntlets, body) | Flat Essence bonus |
| Pills | Flat or % Essence bonus |
| Reincarnation mental affinity | % bonus to Essence |
| Law passive: Essence boost | % or flat roll on the law |

---

### Soul

Spiritual power — consciousness and will made tangible.

**Derived from:** `Qi × soul_mult` (from active Law)

> Soul is unlocked at [[Realm Progression#Saint|Saint]] realm. Before that, `soul_mult` is effectively 0 and Soul-dependent systems are inactive.

**Used for:**
- Primary driver of **spiritual / mental attacks**
- Contributes to **Intuition** (secondary stat)
- Required threshold for equipping some [[Secret Techniques]]
- Drives [[Realms/Gathering]] rate

**What can change it:**
| Source | Effect |
|---|---|
| Active Law (`soul_mult`) | Base multiplier |
| Artefacts (neck, head, rings) | Flat Soul bonus |
| Pills | Flat or % Soul bonus |
| Reincarnation mental affinity | % bonus to Soul |
| Law passive: Soul boost | % or flat roll on the law |

---

### Body

Physical power — the cultivated flesh, bones, and meridians.

**Derived from:** `Qi × body_mult` (from active Law)

**Used for:**
- Primary driver of **physical attacks**
- Contributes to **DEF** (Essence + Body)
- Required threshold for equipping some [[Secret Techniques]]
- Drives [[Realms/Exploration]] and [[Realms/Mining]] rate

**What can change it:**
| Source | Effect |
|---|---|
| Active Law (`body_mult`) | Base multiplier |
| Artefacts (waist, feet, hands, body) | Flat Body bonus |
| Pills | Flat or % Body bonus |
| Reincarnation physical affinity | % bonus to Body |
| Law passive: Body boost | % or flat roll on the law |

---

## Secondary Stats

Derived from combinations of primary stats and other sources. Not directly set by the player.

---

### DEF

Passive damage mitigation in combat.

```
DEF = Essence + Body + artefact_def_flat + defend_buff
```

**What can change it:**
| Source | Effect |
|---|---|
| Essence and Body (both) | Base value |
| Armour artefacts (all slots) | Flat DEF bonus |
| Defend-type [[Secret Techniques]] | Temporary DEF buff during combat |
| Law passive: DEF boost | Flat or % bonus |

---

### Intuition

Secondary stat derived from Soul. Governs speed-of-perception effects (dodge priority, reaction window — exact mechanic TBD).

```
Intuition = Soul × intuition_mult
```

**What can change it:**
| Source | Effect |
|---|---|
| Soul | Base value |
| Artefacts (head, neck) | Flat Intuition bonus |
| Law passive: Intuition boost | % or flat roll |

---

### Dodge

Chance to fully evade an incoming hit.

```
Dodge = base_dodge + technique_dodge_buff
```

Base dodge is 0 without techniques. Dodge-type [[Secret Techniques]] provide a timed dodge buff when their cooldown fires.

**What can change it:**
| Source | Effect |
|---|---|
| Dodge-type Secret Techniques | Temporary % dodge chance buff |
| Artefacts (feet slot) | Flat dodge chance bonus |
| Law passive: Dodge | % dodge bonus |

---

### Damage (Attack)

The damage value of a single attack hit. Computed per-hit using the active technique (or default attack if no technique is ready).

```
Damage = K × (Essence + Soul + Body + artefact_dmg_flat) × arte_mult × elem_bonus + bonus_flat
```

| Variable | Meaning | Source |
|---|---|---|
| `K` | Technique multiplier | [[Secret Techniques]] rank × quality table |
| `artefact_dmg_flat` | Weapon flat damage bonus | Equipped weapon |
| `arte_mult` | Artefact-specific multiplier | Weapon quality tier |
| `elem_bonus` | Elemental resonance bonus | Law element matches technique element |
| `bonus_flat` | Flat additive damage | Technique passive rolls |

Default attack (no technique ready) uses the Law's built-in attack with `K = 1.0` and no technique passives.

**What can change it:**
| Source | Effect |
|---|---|
| Essence + Soul + Body | Base damage pool |
| Equipped weapon | `artefact_dmg_flat` and `arte_mult` |
| Law element matching technique | `elem_bonus` multiplier |
| Secret Technique rank/quality | `K` scaling |
| Secret Technique passive: flat damage | `bonus_flat` additive |
| Pills (combat) | Temporary damage buff (TBD) |

---

### Cultivation Speed

How fast Qi accumulates per second. See [[#Qi]] above for the full formula — listed here for completeness as a player-facing "stat."

---

## Activity Stats

Stats that govern idle activity output outside of combat. See the Realms docs for full formulas.

| Stat | Primary Driver | Bonus Sources |
|---|---|---|
| **Exploration Rate** | Body | Wind/Space-attribute Laws (+10–25%), artefacts (TBD) |
| **Gather Rate** | Soul | Wood/Nature-attribute Laws (+10–25%), artefacts (TBD) |
| **Mine Rate** | Body | Earth/Metal-attribute Laws (+10–25%), artefacts (TBD) |

---

## Modifiers

A modifier is any value that alters a stat. Every modifier has a **type** (how it stacks) and a **source** (what grants it).

### Stacking Types

| Type | Symbol | How It Applies |
|---|---|---|
| **Additive flat** | `+N` | Adds a fixed amount to the final stat value |
| **Additive %** | `+N%` | All additive % bonuses from the same category sum together, then apply once |
| **Multiplicative** | `×N` | Applied as a separate multiply on top of the additive total |

> **Convention:** Law multipliers (`essence_mult`, etc.) are treated as **base multipliers** — they run before additive bonuses. Artefact flats and pill flats are **additive flat** on top. Reincarnation affinities are **multiplicative** on the final value.

---

### Qi Generation Modifiers

| Modifier | Type | Effect | Sources |
|---|---|---|---|
| **Base Qi Rate** | Additive flat | Sets qi/sec before any multiplier | Hardcoded (5 qi/sec); upgrades TBD |
| **Cultivation Speed** | Multiplicative | Multiplies total qi/sec | Law `cultivation_speed_mult`, law passives |
| **Boost Multiplier** | Multiplicative | ×3 while boost is held | Player input |
| **Talent Multiplier** | Multiplicative | Permanent cross-life qi bonus | Reincarnation talent |
| **Pill: Cultivation Boost** | Multiplicative | Temporary qi/sec boost | Cultivation pills (e.g. Qi Condensation Pill) |

---

### Stat Conversion Modifiers

These govern how Qi converts into Essence, Soul, and Body.

| Modifier | Type | Effect | Sources |
|---|---|---|---|
| **Essence Conversion** (`essence_mult`) | Base multiplier | Qi → Essence ratio | Active Law |
| **Soul Conversion** (`soul_mult`) | Base multiplier | Qi → Soul ratio | Active Law |
| **Body Conversion** (`body_mult`) | Base multiplier | Qi → Body ratio | Active Law |
| **Essence Flat Bonus** | Additive flat | +N to Essence | Artefacts, pills |
| **Soul Flat Bonus** | Additive flat | +N to Soul | Artefacts, pills |
| **Body Flat Bonus** | Additive flat | +N to Body | Artefacts, pills |
| **Essence % Bonus** | Additive % | +N% to Essence | Law passives, reincarnation mental affinity |
| **Soul % Bonus** | Additive % | +N% to Soul | Law passives, reincarnation mental affinity |
| **Body % Bonus** | Additive % | +N% to Body | Law passives, reincarnation physical affinity |

---

### Combat Modifiers

| Modifier | Type | Effect | Sources |
|---|---|---|---|
| **Technique Multiplier** (`K`) | Multiplicative | Scales total damage | Secret Technique rank × quality |
| **Weapon Flat Damage** | Additive flat | +N to damage before K | Equipped weapon |
| **Weapon Multiplier** (`arte_mult`) | Multiplicative | Multiplies damage | Weapon quality tier |
| **Elemental Bonus** (`elem_bonus`) | Multiplicative | Bonus when Law element matches technique | Law element + Technique element match |
| **Flat Damage Bonus** | Additive flat | +N additive after all multiplies | Secret Technique passive rolls |
| **Increased Damage %** | Additive % | +N% total damage | Law passives, pills (combat), artefact passives |
| **DEF Flat Bonus** | Additive flat | +N to DEF | Armour artefacts |
| **DEF % Bonus** | Additive % | +N% to DEF | Law passives, artefact passives |
| **Defend Buff** | Additive flat (timed) | +N to DEF for buff duration | Defend-type Secret Techniques |
| **Dodge Chance** | Additive % | +N% chance to fully dodge a hit | Dodge-type Secret Techniques, feet artefacts |
| **Technique Cooldown Reduction** | Multiplicative | Reduces technique cooldown by N% | Secret Technique quality tier |
| **Elemental Resistance** | Additive % | Reduces damage from a specific element | Artefacts (neck, head), law passives |
| **HP Restoration** | Additive flat (timed) | Heals N HP when Heal technique fires | Heal-type Secret Techniques |

---

### Activity Modifiers

| Modifier | Type | Effect | Sources |
|---|---|---|---|
| **Exploration Rate Bonus** | Additive % | +N% to exploration progress/sec | Wind/Space-attribute Laws, artefacts (TBD) |
| **Gather Rate Bonus** | Additive % | +N% to herb yield/sec | Wood/Nature-attribute Laws, artefacts (TBD) |
| **Mine Rate Bonus** | Additive % | +N% to ore yield/sec | Earth/Metal-attribute Laws, artefacts (TBD) |
| **Herb Density Regen** | Additive flat | +N/sec to region herb density | Upgrades (TBD) |
| **Vein Richness Regen** | Additive flat | +N/sec to region vein richness | Upgrades (TBD) |
| **Loot Rarity Shift** | Additive % | Shifts drop weight toward higher tiers | Realm advancement (automatic), artefacts (TBD) |

---

### Reincarnation Modifiers

Permanent modifiers that carry over across lives and compound with each reincarnation.

| Modifier | Type | Effect | Sources |
|---|---|---|---|
| **Talent Multiplier** | Multiplicative | Permanent qi/sec multiplier | Reincarnation — grows each life |
| **Mental Affinity** | Multiplicative | % bonus to Essence and Soul | Reincarnation carry-over; multiple affinities can combine |
| **Physical Affinity** | Multiplicative | % bonus to Body | Reincarnation carry-over |
| **Starting Cultivation Boost** | Additive flat | Begin each new life with N qi pre-filled | Unlocked at higher realms |
| **Soul-Bound Artefact Stats** | Additive flat | Retain equipped artefact bonuses | Soul-bound artefacts that survive reset |

---

## TODO

- [ ] Define `intuition_mult` and Intuition's concrete gameplay effect
- [ ] Define HP as an explicit stat (current docs assume it implicitly)
- [ ] Define pill modifier values (flat vs % and duration)
- [ ] Define artefact stat bonus ranges per slot and rarity
- [ ] Define elemental resistance values per artefact
- [ ] Define Law passive modifier ranges (% and flat) per rarity tier
- [ ] Specify whether additive % caps exist (e.g. max dodge %, max elemental resistance)
- [ ] Decide if Boosted cultivation (×3) should be a modifier vs hardcoded

---

## Related

- [[Primary Stats]]
- [[Laws]]
- [[Secret Techniques]]
- [[Items]]
- [[Cultivation System]]
- [[Realm Progression]]
- [[Reincarnation]]
- [[Realms/Exploration]]
- [[Realms/Gathering]]
- [[Realms/Mining]]

---

## Claude Commands
