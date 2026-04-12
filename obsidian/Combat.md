# Combat

## Implementation Status: STUB

`src/screens/CombatScreen.jsx` — card grid with 3 placeholder buttons (Sparring, Tournament, Boss Fight). No logic implemented.

---

## Overview

Combat is **idle/automated** — the player assigns their character to a zone and leaves them to fight. The character earns drops.

---

## Map

- **Procedurally generated**
- Divided into **zones** (Risk-style territories)

### Zones

Each zone has:
- A **set of enemy types** that spawn
- A **power range** (enemies have a normally distributed power level)

### Player Interaction

- Assign character to a zone → they fight automatically
- Gain **drops** from killed enemies (gold, materials, XP potentially)
- **Risk of death**: if a stronger-than-expected enemy spawns (tails of the distribution), the player can die

---

## Enemy Power Distribution

Enemies in a zone have a **normally distributed** power level:
- Mean = zone difficulty
- Players need to be comfortably above the mean to farm safely
- Outliers can kill an undergeared character

---

## Income from Combat

| Zone | Reward |
|---|---|
| Body Prep zones | Gold + Materials (possibly XP) |
| Chi Foundation zones | More focused — law-relevant drops |
| Higher realms | TBD |

---

## Combat Mechanics

### Player Attack — Secret Technique
```
Damage = K × (Essence + Soul + Body + artefact_dmg_flat) × arte_mult × elem_bonus + bonus
```
See [[Secret Techniques]] for K table (rank × quality) and cooldowns.

### Player Attack — Basic
```
Damage = Essence + Body
```
Fires when no technique is ready. No cooldown — triggers immediately each player turn.

### Player HP
```
HP = (Essence + Body) × 12 + Soul × 4
```

### Enemy Stats
```
Enemy HP  = (Essence + Soul + Body) × 10 × enemy_hp_mult
Enemy ATK = (Essence + Soul + Body) × enemy_atk_mult
```
Both scale with the player's current stats so fights feel consistent regardless of realm.
`hp_mult` and `atk_mult` are per-enemy constants defined in `data/enemies.js`.

### Enemy Damage Formula (scale-independent)
```
DEF       = (Essence + Body) × def_buff_mult
EnemyDmg  = EnemyATK² / (EnemyATK + DEF)
```
This formula is fully scale-independent: **hits-to-die depends only on enemy_atk_mult, not on absolute qi**. At `EnemyATK = DEF`, the enemy deals 50% of its raw attack. The `def_buff_mult` is 1 normally, raised by Defend-type [[Secret Techniques]].

**Reference hits-to-die** (default law, no defence buffs):

| enemy_atk_mult | Hits to die | Example enemy |
|---|---|---|
| 0.3 | ~107 | Sparring Dummy |
| 0.7 | ~27 | Outer Sect Disciple |
| 1.0 | ~16 | Wandering Beast |
| 1.4 | ~10 | Thunder Hawk |
| 1.6 | ~9 | Storm Elemental |
| 2.0 | ~7 | Blood Leviathan |
| 2.5 | ~5 | Burial Guardian |
| 4.0 | ~3 | Origin Guardian |

### Combat Stats
- **DEF** = Essence + Body (combo)
- **Dodge** — increased by Dodge-type [[Secret Techniques]]

---

## TODO

- [ ] Define zone count and difficulty scaling
- [ ] Define enemy types per realm tier
- [ ] Define drop tables
- [ ] Define death penalty / respawn mechanic
- [ ] Define how laws affect combat beyond default attack

---

## Related

- [[Primary Stats]]
- [[Laws]]
- [[Secret Techniques]]
- [[Items]]
- [[Materials]]
- [[Realm Progression]]

---

## Claude Commands
