# Secret Techniques

Advanced combat skills that fire automatically during fights. Available from the start — quality drives identity (Iron → Transcendent), and any technique can be equipped at any realm.

> **Overhaul note (2026-04-26):** procedural generation + the per-technique "passive" pool were both **removed**. The catalogue is now hand-authored: 60 unique techniques (12 per quality × 5 qualities). Each technique's effects are baked into the definition — no random rolls, no transmutation, no refining. The previous passive-pool archive is in [[Deprecated_Unique_Modifiers]].

> **Implementation:** Catalogue lives in `src/data/techniques.js → TECHNIQUES`. Each entry carries an explicit `icon` (emoji used by all UI surfaces). Drops resolve via `src/data/techniqueDrops.js → pickTechnique(worldId)`: roll quality from the world's quality table, then uniform-pick a matching-quality entry from the catalogue, clone it, and stamp a fresh drop id (`${baseId}__${suffix}`). Duplicate drops (same base id already owned) are auto-dismantled by `useTechniques.addOwnedTechnique` — see Discovery & Acquisition below.

> **Rank removed (2026-04-28):** the `rank` field + per-major-realm equip gate are gone. Quality is the only stratification axis; with K_TABLE retired, rank no longer drives anything. Saved tech instances may still carry a stale `rank`; it's ignored on load.

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

**Per-technique cooldown.** Each entry in the catalogue carries an explicit `cooldown` field — the prior per-type `BASE_COOLDOWN` table was dropped along with the procedural scaffold (2026-04-28 overhaul). Cooldowns sit in narrow per-type bands so a slot's archetype is still legible at a glance:

| Type | Cooldown band |
|---|---|
| Attack | 5.0–5.5s |
| Heal   | 6.0–6.5s |
| Expose | 6.0–6.5s |
| Defend | 6.5–7.0s |
| Dodge  | 6.5–7.0s |

Within a band, slots 1–2 sit at the low end and slot 3–4 (Attack) / slot 2 (others) at the high end so similar-archetype slots don't all tick on the same frame.

**Quality does not reduce cooldown.** The previous per-quality `cdMult` table (Iron ×1.0 → Transcendent ×0.55) was removed 2026-04-28. Quality drives identity and visual styling only; the in-combat cooldown comes straight from the per-tech `cooldown` field, modified at runtime by laws / sets / tree (`cd_mult` effects, `cooldownReductionPct`, etc.) the same way as before.

---

## Attack Formula

```
Damage = bonus
       + physMult × physical_damage
       + elemMult × elemental_damage
       + damageFromMaxHpPct       × pMaxHp           (opt-in per tech)
       + damageFromDefensePct     × defense          (opt-in per tech)
       + damageFromElemDefensePct × elementalDefense (opt-in per tech)
       + damage_all
       × (1 + secret_technique_damage)
```

| Variable | Meaning |
|---|---|
| `bonus` | Flat additive damage per technique (hand-authored per entry; no quality default) |
| `physMult` | Technique's coefficient on the `physical_damage` stat (any non-negative decimal) |
| `elemMult` | Technique's coefficient on the `elemental_damage` stat (any non-negative decimal) |
| `damageFromMaxHpPct` | Optional. Adds `pct × max HP` flat damage (e.g. Heart Furnace Strike). |
| `damageFromDefensePct` | Optional. Adds `pct × defense` flat damage (e.g. Spiked Shell, Iron-Bone Smite). |
| `damageFromElemDefensePct` | Optional. Adds `pct × elemental_defense` flat damage (e.g. Mirror Lance). |
| `damage_all` | Universal flat from artefacts + sets + laws |

> **K removed 2026-04-27**: the rank × quality K multiplier (`K_TABLE`) is gone. Damage scales purely through the player's gear-driven phys / elem stat growth. Rank still gates *equip* (Mortal techs equip from Tempered Body, Heaven techs require Open Heaven); quality still drives *cooldown* (Iron 1.0× → Transcendent 0.55×). But neither rank nor quality multiplies damage directly anymore — both their gameplay effects come from non-damage axes plus the player's own stats hitting harder over time.

> **Damage-type model overhauled 2026-04-27 (earlier same day)**: the categorical `damageType` field (`'physical'` / `'elemental'`) was replaced by two coefficients, `physMult` and `elemMult`. A technique can scale with both stats independently — designer authors how heavily it leans. A "balanced" technique with `physMult: 1.0, elemMult: 1.0` adds 100% of both stats. A pure-physical technique uses `physMult: 1.0, elemMult: 0`.

After the formula resolves, the player damage is mitigated by **enemy DEF / ELEM_DEF** via the PoE-style armour curve — see [[Combat]] for the mitigation pipeline. The mitigating armour is the **weighted average** of phys + elem armour, weighted by `physMult` and `elemMult`:

```
effectiveArmour = (physMult × eDef + elemMult × eElemDef) / (physMult + elemMult)
```

A pure-physical tech faces only `eDef`; a balanced tech (1.0/1.0) faces 50/50; a heavy elemental tech faces mostly `eElemDef`. After def_pen reduces effective armour, the standard PoE armour curve runs.

**Basic attack** (fires when no secret technique is ready) is hard-pinned to physical damage and adds 100% of `physical_damage` directly. See [[Damage Types]].

---

## Special-Logic Fields

A second pass on the catalogue (2026-04-28) gave most entries a unique mechanic on top of the baseline type behaviour. Every field is opt-in per entry — absent fields contribute nothing. See [[Secret Technique Catalogue]] for which entry uses each.

### Cross-type

| Field | Effect |
|---|---|
| `cdReductionOnCastPct` | On cast, reduce other slots' remaining cooldowns by `pct`. |
| `cdReductionOnCastFilter` | `'Attack'` (only Attack-type slots) or `'all'` (default). |

### Heal

| Field | Effect |
|---|---|
| `healDealEnemyDamagePctOfHeal` | After healing, deal `pct × healAmount` damage to the enemy. |
| `nextDodgeHealPct` | Arms a one-shot heal (`pct × maxHP`) on the next successful dodge. |
| `nextHealDoubled` | Arms a one-shot 2× multiplier on the next Heal cast. |

### Defend (snapshotted onto buff at cast — expire with buff)

| Field | Effect |
|---|---|
| `healOnCastPct` | Heal `pct × maxHP` immediately on cast. |
| `defendBuffIncomingDmgReduction` | Add `pct` to total incoming-dmg-reduction while buff active. |
| `defendBuffDodgeChance` | Add `pct × 100` passive dodge while buff active. |
| `defendBuffMitigatedHealPct` | Heal `pct × mitigated` per hit while buff active. |

### Dodge (snapshotted onto buff at cast — expire with buff)

| Field | Effect |
|---|---|
| `dodgeBuffDefMult` | Multiply player defenses by `mult` while buff active. |
| `dodgeBuffOnSuccessHealPct` | On each successful dodge, heal `pct × maxHP`. |
| `dodgeBuffOnSuccessDamageBuffPct` | On dodge, arm a one-shot dmg buff (`+pct`) for the next attack. |
| `dodgeBuffReflectDamage` | On dodge, reflect the would-have-been damage to the enemy (post incoming-dmg-reduction, pre-armour). |
| `dodgeBuffOnSuccessCdReductionPct` | On each successful dodge, reduce all CDs by `pct`. |

### Expose (snapshotted onto buff at cast — expire with buff)

| Field | Effect |
|---|---|
| `exposeBuffApplyToAttack` | Opts INTO Attack-secret-tech buff application. **By default the Expose buff applies to basic attacks only.** Set bonus `exposeBuffsApplyToAttack` opts in globally. |
| `exposeBuffMitigatedReflectPct` | Reflect `pct × mitigated` to the enemy per hit while buff active. |
| `exposeBuffUseMaxDefense` | While buff active, enemy hits use `max(defense, elementalDefense)` regardless of damage type. |

> **Default change (2026-04-28).** Previously the Expose buff applied to all player attacks (basic + secret tech). The new default is **basic attacks only** so designers control which Expose options synergise with Attack secret techs via the `exposeBuffApplyToAttack` flag (or the matching set bonus).

---

## Requirements to Equip

- None. Any owned technique can be equipped at any realm. Quality is the only stratification axis.

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

---

## Discovery & Acquisition

- **Dropped by mobs** — each enemy has a per-kill technique drop chance (see [[Enemies]] drop tables). Chance is rare; stronger zones have higher rates.
- **Quality is world-gated** — the dropped technique's quality tier is rolled using the same rarity weights as material drops: World 1 yields mostly Iron/Bronze, World 6 yields mostly Transcendent.
- **Once quality is rolled**, a uniform-random entry from the matching-quality subset of the 60-entry catalogue is picked.
- Dropped techniques are stored in the player's **owned collection** and appear in the equip screen.
- Rewards from zone clears or boss fights (TBD)

### Duplicates auto-dismantle

Each catalogue entry can be owned **at most once**. When a drop's base id matches an entry already in `ownedTechniques`, `useTechniques.addOwnedTechnique` returns `{ duplicate: true }` and the CombatScreen drop callback refunds the same dismantle mineral (1× iron-dust / bronze-dust / silver-dust / gold-dust / transcendent-dust depending on quality) that a manual dismantle would yield. The combat log surfaces the auto-dismantle as `Duplicate scroll dismantled — refunded 1× <Mineral>`. State for the existing copy is untouched (so equipped slots are safe).

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
