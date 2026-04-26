# Secret Technique Catalogue — Author Sheet

This file is the **content source** for the 60 unique secret techniques. Fill in name, flavour, and optionally any stat overrides per slot. Hand the file back when done; I'll port the values into [src/data/techniques.js](../src/data/techniques.js).

> **Design DD lives in [[Secret Techniques]].** This file is just for filling in content — no design discussion here.

---

## How to fill

Each technique has a **slot id** (already fixed — do not change) and a small block to fill. Required fields are `name` and `flavour`. Stat overrides are optional — leave blank to use the per-quality default scaffold (see "Defaults reference" at the bottom).

Block format:

```
#### iron_attack_1
name: 
flavour: 
overrides:
  # bonus: 10         (optional — flat damage)
  # physMult: 1.0     (optional — coefficient on physical_damage)
  # elemMult: 0.5     (optional — coefficient on elemental_damage)
```

Uncomment any line under `overrides:` to replace the default.

**Damage-type model**: every technique scales with both physical and elemental damage stats via two independent coefficients (`physMult`, `elemMult`). Set either to 0 for a pure-element tech; set both high for a hybrid. Heal techniques use the same fields — the bonus is added to the heal amount on top of `healPercent × maxHP`.

Per-rarity, the slots are:
- 4 Attack: `${quality}_attack_1` … `${quality}_attack_4`
- 2 Heal: `${quality}_heal_1`, `${quality}_heal_2`
- 2 Defend: `${quality}_defend_1`, `${quality}_defend_2`
- 2 Dodge: `${quality}_dodge_1`, `${quality}_dodge_2`
- 2 Expose: `${quality}_expose_1`, `${quality}_expose_2`

Total: 12 per quality × 5 qualities = **60 techniques**.

---

## Iron — qIdx 0

> Defaults: Attack `bonus 0 / physMult+elemMult per slot lean (see master table)`. Heal `healPercent 15% + scaling per slot lean`. Defend `defMult ×1.30 / 2 hits`. Dodge `dodgeChance 30% / 2 hits`. Expose 1 `exploitChance +15 / defPen 5% / 3 player hits`. Expose 2 `dmgReduction 10% / exploitMult 175 / 3 enemy + 3 player hits`.

### Attack

#### iron_attack_1
name: TBD
flavour: TBD
overrides:
  # bonus: 
  # physMult: 
  # elemMult: 

#### iron_attack_2
name: 
flavour: 
overrides:
  # bonus: 
  # physMult: 
  # elemMult: 

#### iron_attack_3
name: 
flavour: 
overrides:
  # bonus: 
  # physMult: 
  # elemMult: 

#### iron_attack_4
name: 
flavour: 
overrides:
  # bonus: 
  # physMult: 
  # elemMult: 

### Heal

#### iron_heal_1
name: 
flavour: 
overrides:
  # healPercent: 
  # physMult: 
  # elemMult: 

#### iron_heal_2
name: 
flavour: 
overrides:
  # healPercent: 
  # physMult: 
  # elemMult: 

### Defend

#### iron_defend_1
name: 
flavour: 
overrides:
  # defMult: 
  # buffAttacks: 

#### iron_defend_2
name: 
flavour: 
overrides:
  # defMult: 
  # buffAttacks: 

### Dodge

#### iron_dodge_1
name: 
flavour: 
overrides:
  # dodgeChance: 
  # buffAttacks: 

#### iron_dodge_2
name: 
flavour: 
overrides:
  # dodgeChance: 
  # buffAttacks: 

### Expose

#### iron_expose_1
name: 
flavour: 
overrides:
  # exploitChance: 
  # defPen: 
  # buffPlayerAttacks: 

#### iron_expose_2
name: 
flavour: 
overrides:
  # dmgReduction: 
  # exploitMult: 
  # buffEnemyAttacks: 
  # buffPlayerAttacks: 

---

## Bronze — qIdx 1

> Defaults: Attack `bonus 5 / physMult+elemMult per slot lean (see master table)`. Heal `healPercent 20% + scaling per slot lean`. Defend `defMult ×1.45 / 3 hits`. Dodge `dodgeChance 37.5% / 3 hits`. Expose 1 `exploitChance +20 / defPen 10% / 4 player hits`. Expose 2 `dmgReduction 14% / exploitMult 185 / 4 enemy + 4 player hits`.

### Attack

#### bronze_attack_1
name: 
flavour: 
overrides:

#### bronze_attack_2
name: 
flavour: 
overrides:

#### bronze_attack_3
name: 
flavour: 
overrides:

#### bronze_attack_4
name: 
flavour: 
overrides:

### Heal

#### bronze_heal_1
name: 
flavour: 
overrides:

#### bronze_heal_2
name: 
flavour: 
overrides:

### Defend

#### bronze_defend_1
name: 
flavour: 
overrides:

#### bronze_defend_2
name: 
flavour: 
overrides:

### Dodge

#### bronze_dodge_1
name: 
flavour: 
overrides:

#### bronze_dodge_2
name: 
flavour: 
overrides:

### Expose

#### bronze_expose_1
name: 
flavour: 
overrides:

#### bronze_expose_2
name: 
flavour: 
overrides:

---

## Silver — qIdx 2

> Defaults: Attack `bonus 10 / physMult+elemMult per slot lean (see master table)`. Heal `healPercent 25% + scaling per slot lean`. Defend `defMult ×1.60 / 4 hits`. Dodge `dodgeChance 45% / 4 hits`. Expose 1 `exploitChance +25 / defPen 15% / 5 player hits`. Expose 2 `dmgReduction 18% / exploitMult 195 / 5 enemy + 5 player hits`.

### Attack

#### silver_attack_1
name: 
flavour: 
overrides:

#### silver_attack_2
name: 
flavour: 
overrides:

#### silver_attack_3
name: 
flavour: 
overrides:

#### silver_attack_4
name: 
flavour: 
overrides:

### Heal

#### silver_heal_1
name: 
flavour: 
overrides:

#### silver_heal_2
name: 
flavour: 
overrides:

### Defend

#### silver_defend_1
name: 
flavour: 
overrides:

#### silver_defend_2
name: 
flavour: 
overrides:

### Dodge

#### silver_dodge_1
name: 
flavour: 
overrides:

#### silver_dodge_2
name: 
flavour: 
overrides:

### Expose

#### silver_expose_1
name: 
flavour: 
overrides:

#### silver_expose_2
name: 
flavour: 
overrides:

---

## Gold — qIdx 3

> Defaults: Attack `bonus 15 / physMult+elemMult per slot lean (see master table)`. Heal `healPercent 30% + scaling per slot lean`. Defend `defMult ×1.75 / 5 hits`. Dodge `dodgeChance 52.5% / 5 hits`. Expose 1 `exploitChance +30 / defPen 20% / 6 player hits`. Expose 2 `dmgReduction 22% / exploitMult 205 / 6 enemy + 6 player hits`.

### Attack

#### gold_attack_1
name: 
flavour: 
overrides:

#### gold_attack_2
name: 
flavour: 
overrides:

#### gold_attack_3
name: 
flavour: 
overrides:

#### gold_attack_4
name: 
flavour: 
overrides:

### Heal

#### gold_heal_1
name: 
flavour: 
overrides:

#### gold_heal_2
name: 
flavour: 
overrides:

### Defend

#### gold_defend_1
name: 
flavour: 
overrides:

#### gold_defend_2
name: 
flavour: 
overrides:

### Dodge

#### gold_dodge_1
name: 
flavour: 
overrides:

#### gold_dodge_2
name: 
flavour: 
overrides:

### Expose

#### gold_expose_1
name: 
flavour: 
overrides:

#### gold_expose_2
name: 
flavour: 
overrides:

---

## Transcendent — qIdx 4

> Defaults: Attack `bonus 20 / physMult+elemMult per slot lean (see master table)`. Heal `healPercent 35% + scaling per slot lean`. Defend `defMult ×1.90 / 6 hits`. Dodge `dodgeChance 60% / 6 hits`. Expose 1 `exploitChance +35 / defPen 25% / 7 player hits`. Expose 2 `dmgReduction 26% / exploitMult 215 / 7 enemy + 7 player hits`.

### Attack

#### transcendent_attack_1
name: 
flavour: 
overrides:

#### transcendent_attack_2
name: 
flavour: 
overrides:

#### transcendent_attack_3
name: 
flavour: 
overrides:

#### transcendent_attack_4
name: 
flavour: 
overrides:

### Heal

#### transcendent_heal_1
name: 
flavour: 
overrides:

#### transcendent_heal_2
name: 
flavour: 
overrides:

### Defend

#### transcendent_defend_1
name: 
flavour: 
overrides:

#### transcendent_defend_2
name: 
flavour: 
overrides:

### Dodge

#### transcendent_dodge_1
name: 
flavour: 
overrides:

#### transcendent_dodge_2
name: 
flavour: 
overrides:

### Expose

#### transcendent_expose_1
name: 
flavour: 
overrides:

#### transcendent_expose_2
name: 
flavour: 
overrides:

---

## Defaults reference (per qIdx 0 → 4)

If you leave any override blank, the technique uses these per-quality defaults from the catalogue scaffold in `src/data/techniques.js`:

| Type | Field | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|
| Attack | `bonus` | 0 | 5 | 10 | 15 | 20 |
| Attack | `physMult` / `elemMult` (per slot, all qualities) | slot 1: 1.0/0.4 (phys-leaning) — slot 2: 0.4/1.0 (elem-leaning) — slot 3: 0.7/0.7 (balanced) — slot 4: 1.0/0.5 (phys + secondary elem) |
| Heal | `healPercent` | 0.15 | 0.20 | 0.25 | 0.30 | 0.35 |
| Heal | `physMult` / `elemMult` (per slot, all qualities) | slot 1: 0.4/0.2 (phys-leaning) — slot 2: 0.2/0.4 (elem-leaning) |
| Defend | `defMult` | 1.30 | 1.45 | 1.60 | 1.75 | 1.90 |
| Defend | `buffAttacks` | 2 | 3 | 4 | 5 | 6 |
| Dodge | `dodgeChance` | 0.30 | 0.375 | 0.45 | 0.525 | 0.60 |
| Dodge | `buffAttacks` | 2 | 3 | 4 | 5 | 6 |
| Expose 1 | `exploitChance` | 15 | 20 | 25 | 30 | 35 |
| Expose 1 | `defPen` | 0.05 | 0.10 | 0.15 | 0.20 | 0.25 |
| Expose 1 | `buffPlayerAttacks` | 3 | 4 | 5 | 6 | 7 |
| Expose 2 | `dmgReduction` | 0.10 | 0.14 | 0.18 | 0.22 | 0.26 |
| Expose 2 | `exploitMult` | 175 | 185 | 195 | 205 | 215 |
| Expose 2 | `buffEnemyAttacks` | 3 | 4 | 5 | 6 | 7 |
| Expose 2 | `buffPlayerAttacks` | 3 | 4 | 5 | 6 | 7 |

### Field reference

| Field | Range / format | Notes |
|---|---|---|
| `bonus` | integer | Flat damage added (per technique, scales 0/5/10/15/20 by quality default) |
| `physMult` | decimal ≥0, e.g. `1.0` | Coefficient on `physical_damage` stat. 1.0 adds 100%, 0 disables this scaling |
| `elemMult` | decimal ≥0, e.g. `1.0` | Coefficient on `elemental_damage` stat. Same semantics as physMult |
| `healPercent` | decimal 0-1, e.g. `0.40` | Fraction of max HP healed (Heal techs also use physMult / elemMult for bonus heal on top) |
| `defMult` | decimal ≥1, e.g. `1.5` | Multiplier on player defense during the buff |
| `dodgeChance` | decimal 0-1, e.g. `0.50` | Per-attack chance to fully dodge |
| `buffAttacks` | integer | Number of enemy hits the buff covers |
| `exploitChance` | integer (raw %), e.g. `25` | Bonus exploit chance during the buff |
| `exploitMult` | integer (raw %), e.g. `200` | Override default 150% exploit damage during the buff |
| `defPen` | decimal 0-1, e.g. `0.20` | Fraction of enemy DEF ignored during the buff |
| `dmgReduction` | decimal 0-1, e.g. `0.30` | Fraction of incoming enemy damage reduced during the buff |
| `buffPlayerAttacks` | integer | Player-clock buff duration (for player-side Expose effects) |
| `buffEnemyAttacks` | integer | Enemy-clock buff duration (for `dmgReduction`) |

> **Expose rule reminder**: each Expose entry should populate **1–2** of the four effects (`exploitChance`, `exploitMult`, `defPen`, `dmgReduction`). The two slots per quality already split this 2/2 in the defaults, but you can re-balance.
