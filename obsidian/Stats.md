# Stats

Reference for every stat in the game after the **Damage & Element System Overhaul** (2026-04-24). The pre-overhaul primary-stat layer (Essence / Soul / Body) is gone — see [[Primary Stats]] for the deprecation note.

---

## Stacking Types

Every modifier on every stat belongs to one of these stacking types. The order of operations is unchanged.

| Type | Notation | How It Applies |
|---|---|---|
| **Increased Base** | `#% increased base` | Multiplies the base value of the stat (before anything else) |
| **Base Flat** | `adds # to base` | Adds a flat amount to the base value of the stat |
| **Flat** | `+#` | Adds a flat amount after all base calculations are done |
| **Increased Value** | `#% increased` | Additive % bonus, all sources of this type sum then apply once |
| **Multiplier** | `#% more` | Multiplicative — each `more` source multiplies independently |

### Order of Operations

```
Final = ((Base × (1 + Σ increased_base%) + Σ base_flat) + Σ flat) × (1 + Σ increased%) × Π more_mult
```

---

## Special Resource: Qi

Qi is the raw cultivation energy. It cannot be increased directly — only its **generation speed** can be modified. Spent on realm breakthroughs.

```
qi/sec = BASE_RATE × (1 + Σ increased_qi_speed%) × Π more_qi_speed × focus_mult (when focusing)
```

- `BASE_RATE` = 1 qi/sec
- `focus_mult` = the Qi Focus Multiplier stat (base 300%; modifiable)

---

## Combat Stats

### Health

`health = max(100, realmIndex × 200)` — placeholder formula since primary stats were removed. Modifiers stack on top.

### Physical / Elemental Damage

The two **damage categories** (psychic was removed — see [[Damage Types]]):

- `physical_damage` — flat bonus added to physical-bucket attacks (basic attack always; secret techniques tagged `damageType: 'physical'`).
- `elemental_damage` — flat bonus added to elemental-bucket attacks (secret techniques tagged `damageType: 'elemental'`).

### `damage_all`

Whole-attack flat bonus; no damage-bucket gate. Stacks on basic attacks and all secret techniques.

### `default_attack_damage`

Multiplier applied **only to basic attacks**. Stacks multiplicatively with exploit and the reincarnation-tree damage multiplier.

### `secret_technique_damage`

Multiplier applied **only to secret-technique damage** in `calcDamage`.

### Defense

`defense` — physical defense. Reduces enemy physical attack damage via `dmg = atk² / (atk + defense)`. A live `defBuff` multiplies it for the next N enemy attacks.

### Elemental Defense

`elemental_defense` — reduces enemy elemental attack damage via the same defense-curve formula.

### Exploit Chance / Multiplier

Per-attack roll % to flag an attack as an exploit hit. `exploit_chance` base 0; `exploit_attack_mult` base 150%.

---

## Activity Stats

### Qi Generation Speed
See [[#Special Resource: Qi]] above.

### Qi Focus Multiplier
Base 300%; multiplier applied to qi/s while focusing.

### Harvest Speed / Luck

Used by gathering. `harvest_speed` is a flat additive on top of `BASE_GATHER_SPEED`. `harvest_luck` is per-cycle % chance for +1 quantity on a primary drop. The pre-overhaul Soul-derived base value is gone — `harvest_speed` starts from a flat baseline (no soul gate).

### Mining Speed / Luck

Mirror of harvest stats for mining.

### Heavenly QI Multiplier

`heavenly_qi_mult` — applies only while a rewarded-ad qi boost is live.

### Buff Effect / Duration

`buff_effect` scales Defend `defMult` and Dodge `dodgeChance` at cast time. `buff_duration` scales the buff's `buffAttacks` charge count.

---

## Removed stats

| Stat | Reason |
|---|---|
| `essence`, `soul`, `body` | Primary-stat layer removed (see [[Primary Stats]]) |
| `psychic_damage` | Damage buckets collapsed to physical + elemental (see [[Damage Types]]) |
| `soul_toughness` | Paired with the removed psychic damage bucket |
| `dmg_<pool>` (`dmg_physical` etc.) | Per-pool damage stats died with the 9-pool type system; new pool keys are the 5 elements but no per-element damage stat exists yet |
| `all_primary_stats` | No primary stats to aggregate |

---

## Modifiers

Every stat above accepts all five stacking types. Affixes are emitted programmatically as `(slot, stat, mod_type)` tuples — see the per-slot allowlist in [[Artefacts]]. Unique modifiers were wiped during the overhaul; their archive lives at [[Deprecated_Unique_Modifiers]].

---

## Related

- [[Primary Stats]] — deprecation note
- [[Damage Types]]
- [[Elements]]
- [[Laws]]
- [[Secret Techniques]]
- [[Artefacts]]
- [[Items]]
- [[Cultivation System]]
- [[Realm Progression]]
