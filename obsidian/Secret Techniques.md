# Secret Techniques

Advanced combat skills that fire automatically during fights. Available from the start — higher ranks unlock as the cultivator progresses through realms.

> **Overhaul note (2026-04-26):** procedural generation + the per-technique "passive" pool were both **removed**. The catalogue is now hand-authored: 60 unique techniques (12 per quality × 5 qualities). Each technique's effects are baked into the definition — no random rolls, no transmutation, no refining. The previous passive-pool archive is in [[Deprecated_Unique_Modifiers]].

> **Implementation:** Catalogue lives in `src/data/techniques.js → TECHNIQUES`. Drops resolve via `src/data/techniqueDrops.js → pickTechnique(worldId)`: roll quality from the world's quality table, then uniform-pick a matching-quality entry from the catalogue, clone it, assign `rank` from the world tier (W1=Mortal … W6=Heaven), and stamp a fresh drop id (`${baseId}__${suffix}`) so duplicates stack distinctly.

---

## Combat Loop

1. Mob spawns
2. Player's techniques fire automatically as their cooldowns expire
3. Mob dies → next mob spawns
4. If no technique is ready, the [[Laws|Law]]'s **default attack** fires instead

---

## Technique Slots

- Player starts with **3 slots**
- Additional slots are rare upgrades (realm milestones, special rewards)
- Each slot holds one equipped technique with its own independent cooldown
- Slots fire in order (1 → 2 → 3) when multiple are ready at the same tick

---

## Types & Trigger Conditions

| Type | Triggers | Effect |
|---|---|---|
| **Attack** | Cooldown expires | Deal damage using the attack formula |
| **Heal** | Cooldown expires **and** HP ≤ 50% | Restore `(healPercent × maxHP) + (physMult × physical_damage) + (elemMult × elemental_damage)`, scaled by `healing_received` |
| **Defend** | Cooldown expires | Apply a DEF buff for N enemy hits |
| **Dodge** | Cooldown expires | Apply a dodge chance buff for N enemy hits |
| **Expose** | Cooldown expires | Apply an offensive / mitigation buff with per-effect clocks (see below) |

Heal will **not** fire if HP is above the threshold even if the cooldown is ready — it waits until the condition is met.

---

## Expose

Added 2026-04-26 to give the player an offensive-utility slot. Mirrors Defend / Dodge: cooldown-fired, applies a buff that lasts for a fixed number of attacks. Each Expose technique populates **1–2** of these effect fields (varies by entry):

| Field | Effect | Clock |
|---|---|---|
| `exploitChance` | Adds to player exploit chance during the buff | Player attacks |
| `exploitMult`   | Overrides default exploit damage multiplier (% over 100) | Player attacks |
| `defPen`        | Reduces enemy effective DEF / ELEM_DEF before mitigation | Player attacks |
| `dmgReduction`  | Reduces incoming enemy damage before armour mitigation | Enemy attacks |

Buff sizing fields:

- `buffPlayerAttacks` — N player attacks the player-clock effects cover. Required for any of {`exploitChance`, `exploitMult`, `defPen`}.
- `buffEnemyAttacks`  — N enemy attacks the enemy-clock effects cover. Required for `dmgReduction`.

A mixed Expose tracks both clocks **independently**: the player-clock effects expire when their charges run out even if the enemy-clock charges are still ticking. Re-casting overwrites — no stacking, identical to Defend / Dodge.

---

## Cooldowns

Base cooldown by type, reduced by quality:

| Type | Base Cooldown |
|---|---|
| Attack | 6s |
| Heal | 12s |
| Defend | 10s |
| Dodge | 10s |
| Expose | 12s |

**Quality modifier** (multiplied against base):

| Quality | Cooldown Multiplier |
|---|---|
| Iron | ×1.0 |
| Bronze | ×0.90 |
| Silver | ×0.80 |
| Gold | ×0.70 |
| Transcendent | ×0.55 |

---

## Attack Formula

```
Damage = bonus
       + K × (physMult × physical_damage + elemMult × elemental_damage)
       + damage_all
       × (1 + secret_technique_damage)
```

| Variable | Meaning |
|---|---|
| `bonus` | Flat additive damage per technique (small, scales 0/5/10/15/20 by quality default) |
| `K` | Rank × quality multiplier on the phys+elem contribution (see table below) |
| `physMult` | Technique's coefficient on the `physical_damage` stat (any non-negative decimal) |
| `elemMult` | Technique's coefficient on the `elemental_damage` stat (any non-negative decimal) |
| `damage_all` | Universal flat from artefacts + sets + laws |

> **Cleanup pass 2026-04-27**: the dead `K × (essence + soul + body + artefactFlat) × arteMult` term was removed (every multiplicand was 0 since the primary-stat layer was retired stage 15). All damage now flows from physical_damage + elemental_damage via the per-technique `physMult` / `elemMult` coefficients. `K` survives as a multiplier on that contribution so rank × quality still drives a meaningful curve (Mortal-Iron K=0.5 → Heaven-Trans K=13.0).

> **Damage-type model overhauled 2026-04-27 (earlier same day)**: the categorical `damageType` field (`'physical'` / `'elemental'`) was replaced by two coefficients, `physMult` and `elemMult`. A technique can scale with both stats independently — designer authors how heavily it leans. A "balanced" technique with `physMult: 1.0, elemMult: 1.0` adds 100% of both stats. A pure-physical technique uses `physMult: 1.0, elemMult: 0`.

After the formula resolves, the player damage is mitigated by **enemy DEF / ELEM_DEF** via the PoE-style armour curve — see [[Combat]] for the mitigation pipeline. The mitigating armour is the **weighted average** of phys + elem armour, weighted by `physMult` and `elemMult`:

```
effectiveArmour = (physMult × eDef + elemMult × eElemDef) / (physMult + elemMult)
```

A pure-physical tech faces only `eDef`; a balanced tech (1.0/1.0) faces 50/50; a heavy elemental tech faces mostly `eElemDef`. After def_pen reduces effective armour, the standard PoE armour curve runs.

**Basic attack** (fires when no secret technique is ready) is hard-pinned to physical damage and adds 100% of `physical_damage` directly. See [[Damage Types]].

### K Scaling (Rank × Quality)

| Rank | Requires | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|
| Mortal | Tempered Body | 0.5 | 0.7 | 1.0 | 1.3 | 1.8 |
| Earth | Qi Transformation | 1.0 | 1.4 | 2.0 | 2.7 | 3.5 |
| Sky | Separation & Reunion | 1.5 | 2.0 | 2.8 | 3.8 | 5.0 |
| Saint | Saint | 2.0 | 2.8 | 3.8 | 5.2 | 6.8 |
| Emperor | Void King | 2.5 | 3.5 | 4.8 | 6.5 | 8.5 |
| Heaven | Open Heaven | 4.0 | 5.5 | 7.5 | 10.0 | 13.0 |

---

## Requirements to Equip

- Minimum **major realm** matching the technique's rank
- Matching **artefact type** (sword, polearm, etc.)
- Minimum **Essence / Soul / Body** threshold (varies per technique)

---

## Catalogue & Quality Tiers

Iron → Bronze → Silver → Gold → **Transcendent**

The catalogue holds **12 techniques per quality**, distributed:

- 4 Attack
- 2 Heal
- 2 Defend
- 2 Dodge
- 2 Expose

Total: 60 unique entries. The user / designer fills in names, flavour, and per-effect stat values; the scaffolding starts every entry with placeholder names and a sensible per-quality stat ladder.

> **Quality is identity.** "Iron Sword Slash" and "Bronze Sword Slash" are different catalogue entries with different ids. There is **no upgrade path** between them — players acquire higher-rarity techniques only via drops.

> **Rank is per-drop, not identity.** Rank is set when the technique drops, from the world tier (W1=Mortal … W6=Heaven). A single Iron-quality entry can manifest at any of the 6 ranks; the K_TABLE indexes by `(rank, quality)`.

---

## Discovery & Acquisition

- **Dropped by mobs** — each enemy has a per-kill technique drop chance (see [[Enemies]] drop tables). Chance is rare; stronger zones have higher rates.
- **Quality is world-gated** — the dropped technique's quality tier is rolled using the same rarity weights as material drops: World 1 yields mostly Iron/Bronze, World 6 yields mostly Transcendent.
- **Rank is world-gated** — World 1 drops Mortal-rank, … World 6 drops Heaven-rank.
- **Once quality is rolled**, a uniform-random entry from the matching-quality subset of the 60-entry catalogue is picked.
- Dropped techniques are stored in the player's **owned collection** and appear in the equip screen.
- Rewards from zone clears or boss fights (TBD)

### World 1 Technique Drop Rates

| Enemy | Drop Chance |
|---|---|
| Outer Sect Disciple | 2% |
| Pack Wolf | 1% |
| Bandit Scout | 3% |
| Wandering Beast | 1% |
| Qi-Sensing Beast | 3% |
| Rogue Disciple | 5% |
| Forest Spirit | 4% |
| Awakened Tree Demon | 6% |
| Sky Beast | 4% |
| Thunder Hawk | 5% |
| Lightning Wyrm | 7% |
| Storm Elemental | 7% |

Sparring Dummy (Construct archetype) does not drop techniques.

---

## Crafting

**None.** Techniques are not modifiable. Drops are the only acquisition path. Refining and transmutation operations for techniques were removed in the 2026-04-26 secret-tech overhaul along with the modifier system.

---

## Save Migration

The 2026-04-26 overhaul changed the technique save shape (random ids → catalogue-derived ids). On first load after the change, `useTechniques` checks a `mai_techniques_pool_v2` flag in localStorage; if absent, it wipes `mai_owned_techniques` and clears all equipped slots, then sets the flag. The wipe is one-shot — subsequent loads pass through normally.

---

## Related

- [[Combat]]
- [[Laws]]
- [[Primary Stats]]
- [[Realm Progression]]
- [[Items]]
- [[Damage Types]]
