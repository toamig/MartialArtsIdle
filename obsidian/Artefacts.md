# Artefacts

Mechanical design for all equippable artefacts. For lore names and slot descriptions see [[Items]]. For modifier stacking rules see [[Stats]]. For the new upgrade flow see [[Artefact Upgrades]] and the new set system see [[Artefact Sets]].

> **Overhaul note (2026-04-24):** the prior crafting-driven artefact loop (refining / honing / replacing / adding / rarity-upgrading) was **removed** during the Damage & Element System Overhaul. Artefacts now drop fully-rolled from combat, are improved by spending minerals + bloodcores in the Collection tab, and are tagged with an [[Elements|element]] and a [[Artefact Sets|set]]. All ~110 prior artefact uniques live in [[Deprecated_Unique_Modifiers]].

---

## Slots

Eight equipment slots total: one **Weapon**, six **Armour** pieces, and one **Ring** slot.

| Slot | Role |
|---|---|
| **Weapon** | Damage |
| **Head** | Defensive (HP / Def / Elem Def) |
| **Body** | Defensive |
| **Hands** | Offensive utility (exploit) + activity QoL |
| **Waist** | Defensive |
| **Feet** | Defensive + activity speed (qi, harvest, mining) + exploit |
| **Neck** | Mixed offensive/defensive |
| **Ring** | Pure utility — qi/s, focus mult, harvest/mining speed/luck, heavenly_qi_mult |

---

## Element & Set

Every artefact carries:

- An `element` (one of `fire / water / earth / wood / metal`) — see [[Elements]].
- A `setId` constrained to that element (1 of 3 sets for the element) — see [[Artefact Sets]].
- **Transcendent only:** 3% chance to also carry a second `setId` from a *different* element. The artefact then counts toward both sets and carries both elements.

Both fields are rolled at drop time and are **frozen** thereafter — no reroll.

---

## Modifier Slots by Rarity

Modifier count is now fixed by rarity. Every slot is filled at drop — no empty slots, no reroll, no add, no replace.

| Rarity | Modifier slots filled at spawn |
|---|---|
| Iron | 1 |
| Bronze | 2 |
| Silver | 3 |
| Gold | 4 |
| Transcendent | 5 |

Authoritative constant: `MODS_PER_RARITY` in `src/data/affixPools.js` (Stage 7 of the overhaul).

### Item-wide uniqueness

No affix id may repeat anywhere on the same item. Iron Sharpness on the only slot of an Iron artefact prevents that id from being rolled if the artefact were a higher rarity.

### Unique modifiers

The previous artefact-unique pool (the magenta-highlighted ★ rolls) is **archived** in [[Deprecated_Unique_Modifiers]]. Stage 7 of the overhaul removed the auto-roll path; whether to reintroduce a unique slot is a designer call after pools are refilled.

---

## Item Generation

When an artefact drops:

1. **Slot** is determined by the source (drop table, boss, etc.).
2. **Quality** is rolled (weighted by world tier — see Quality Drop Bias below).
3. **Element** is rolled.
4. **Set** is rolled uniformly from the three sets matching the element. Transcendent: 3% chance to also roll a second setId from a different element.
5. **Base stat** is applied (fixed per slot, scales with realm tier of the zone it drops in).
6. **All modifier slots** for the rarity are filled immediately (no empty slots; no rerolling later).
7. Initial `upgradeLevel` is `0`.

Players **start with no artefacts** — inventory and equipped loadout are both empty. Gear is acquired exclusively through combat drops.

---

## Upgrades (replaces refining)

See [[Artefact Upgrades]] for the full ladder. Summary:

- 0 → +N where N caps at the rarity (Iron +4 / Bronze +8 / Silver +12 / Gold +16 / Transcendent +20).
- Each level multiplies modifier values by `1 + 0.05 × level` (so +20 = ×2.0).
- Every 4 levels, one existing modifier picks up an extra freshly-rolled bonus value.
- Cost ladder pairs upgrade levels to mineral + bloodcore tiers (Iron pair → Iron mineral, …, Transcendent pair → Transcendent mineral).
- UI lives in the **Collection** tab — click an artefact to open the upgrade panel.

---

## Base Stats

Every artefact has one fixed base stat regardless of affixes. It scales with the realm tier of the zone it drops in.

| Slot | Base Stat |
|---|---|
| Weapon | Flat Physical Damage *or* Flat Elemental Damage (matches weapon damage type) |
| Head | Flat HP |
| Body | DEF flat |
| Hands | Flat Physical Damage *or* Flat Elemental Damage |
| Waist | DEF flat |
| Feet | Elemental Defense flat |
| Neck | DEF flat |
| Ring | Mining or Harvest speed flat |

Pre-overhaul base-stat mapping referenced primary stats (`Soul flat`, `Body flat`, `Essence flat`); those are gone.

---

## Affix Pools — Programmatic Generation

`src/data/affixPools.js` emits one affix entry per `(slot, stat, mod_type)` tuple at module load. Every covered stat appears in all four mod types (`flat`, `base_flat`, `% increased`, `% more`). Item-wide dedupe is by full id.

### Per-slot stat allowlist

| Slot | Stats |
|---|---|
| **Weapon** | `damage_all`, `physical_damage`, `elemental_damage`, `default_attack_damage`, `secret_technique_damage` |
| **Head** | `elemental_defense`, `defense`, `health` |
| **Body** | `elemental_defense`, `defense`, `health` |
| **Hands** | `qi_speed`, `harvest_luck`, `mining_luck`, `elemental_defense`, `defense`, `health`, `exploit_chance`, `exploit_attack_mult` |
| **Waist** | `elemental_defense`, `defense`, `health` |
| **Feet** | `elemental_defense`, `defense`, `health`, `exploit_chance`, `exploit_attack_mult`, `mining_speed`, `harvest_speed`, `qi_speed` |
| **Neck** | `damage_all`, `defense`, `elemental_defense`, `health` |
| **Ring** | `qi_speed`, `harvest_speed`, `harvest_luck`, `mining_speed`, `mining_luck`, `qi_focus_mult`, `heavenly_qi_mult` |

Removed compared to the pre-overhaul allowlist: `psychic_damage`, `soul_toughness`, `essence`, `soul`, `body`, `all_primary_stats`, all `dmg_<pool>` stats, `buff_effect` (kept on the player, just not on artefacts pending review).

### Value ranges (per rarity tier)

Each `(stat, mod_type)` chooses a value family — unchanged from pre-overhaul:

| Family | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|
| `INCR_BASIC` | 6–12 | 10–18 | 16–28 | 24–40 | 35–60 |
| `INCR_LARGE` | 8–15 | 14–24 | 22–36 | 32–50 | 45–75 |
| `MORE_TIER` | 1.03–1.07 | 1.05–1.11 | 1.09–1.18 | 1.14–1.26 | 1.20–1.40 |
| `FLAT_DMG` | 6–14 | 14–32 | 32–70 | 70–150 | 150–300 |
| `FLAT_HP` | 20–50 | 50–120 | 120–280 | 280–600 | 600–1200 |
| `FLAT_PCT_POINT` | 1–3 | 2–5 | 4–8 | 6–12 | 10–20 |
| `FLAT_QI` | 0.05–0.15 | 0.15–0.30 | 0.30–0.55 | 0.55–0.90 | 0.90–1.50 |

`FLAT_PRIMARY` is removed (no primary stats).

**Aggregate scaling.** `damage_all` uses the same family as a single-stat roll but the value is multiplied by `AGGREGATE_SCALE = 0.5` at roll time.

---

## Quality Drop Bias

Higher zones make Iron drops increasingly rare and Transcendent increasingly possible.

| Zone Tier | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|
| World 1 | 60% | 30% | 9% | 1% | 0% |
| World 2 | 35% | 38% | 20% | 6% | 1% |
| World 3 | 15% | 32% | 32% | 18% | 3% |
| World 4 | 5% | 18% | 35% | 32% | 10% |
| World 5 | 1% | 8% | 26% | 40% | 25% |
| World 6 | 0% | 2% | 13% | 38% | 47% |

---

## Drops

Artefacts now drop **directly from combat** (~10% chance per enemy) — see [[Crafting]] (Combat drops) and Stage 9 of the overhaul. There is no refining or crafting path that creates artefacts.

---

## Related

- [[Items]]
- [[Stats]]
- [[Elements]]
- [[Artefact Sets]]
- [[Artefact Upgrades]]
- [[Damage Types]]
- [[Materials]]
- [[Realm Progression]]
- [[Deprecated_Unique_Modifiers]]
