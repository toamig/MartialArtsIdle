# Modifier Implementation Audit

> Snapshot: 2026-04-22. Cross-check of every modifier/effect across
> **artefact uniques**, **law modifiers**, and **secret technique
> modifiers**. For each entry: what the data declares vs. what the
> runtime actually consumes. Use this page as the single source of truth
> when deciding which stubs to wire up or prune.

---

## 1 · Artefact Unique Modifiers

Defined in `src/data/uniqueModifiers.js`. Rolled onto
Transcendent-tier artefact slots via `pickArtefactAffix`
(`src/data/affixPools.js`). Stored on owned instances and displayed in
the UI.

> **Status: 0 / 103 implemented.** Every artefact unique is skipped at
> stat aggregation time by the explicit filter in
> [useArtefacts.js:335](../src/hooks/useArtefacts.js) —
> `if (affix.unique || !affix.stat) continue;`. They are
> presentation-only text.

### Weapon uniques (`src/data/uniqueModifiers.js:25–45`)

| id                | name            | description                                            |
| ----------------- | --------------- | ------------------------------------------------------ |
| a_keen_edge       | Keen Edge       | +{value}% crit chance on weapon attacks.               |
| a_blood_drinker   | Blood Drinker   | Heal {value}% of damage dealt.                         |
| a_executioner     | Executioner     | +{value}% damage to enemies below 25% HP.              |
| a_void_cleaver    | Void Cleaver    | Ignore {value}% of enemy defense.                      |
| a_perfect_balance | Perfect Balance | +{value}% damage per equipped artefact.                |
| a_phantom_edge    | Phantom Edge    | Attack cooldowns -{value}%.                            |
| a_void_pierce     | Void Pierce     | +{value}% chance to ignore all defense.                |
| a_savage_grip     | Savage Grip     | +{value}% damage from Body stat.                       |
| a_ethereal_blade  | Ethereal Blade  | +{value}% damage from Soul stat.                       |
| a_sky_breaker     | Sky Breaker     | +{value}% damage per major realm.                      |
| a_combo_blade     | Combo Blade     | Each consecutive hit deals +{value}% bonus.            |

### Head uniques (`src/data/uniqueModifiers.js:47–66`)

| id                  | name              | description                                              |
| ------------------- | ----------------- | -------------------------------------------------------- |
| a_clear_mind        | Clear Mind        | All technique cooldowns -{value}%.                       |
| a_focused_will      | Focused Will      | +{value}% crit chance.                                   |
| a_serene_face       | Serene Face       | +{value}% healing received.                              |
| a_warmind           | Warmind           | +{value}% damage if Soul > Body.                         |
| a_seeker_eye        | Seeker's Eye      | +{value}% crit damage.                                   |
| a_oracles_insight   | Oracle's Insight  | +{value}% chance to dodge fatal blows.                   |
| a_clarity_storm     | Clarity Storm     | After dodging, cooldowns -{value}% for 3s.               |
| a_crown_focus       | Crown of Focus    | +{value}% chance to crit twice.                          |
| a_inner_eye         | Inner Eye         | +{value}% chance for techniques to not consume cooldown. |
| a_visionary_mind    | Visionary Mind    | +{value}% offline qi gain.                               |
| a_warmask           | Warmask           | +{value}% damage if 3+ techniques equipped.              |
| a_silent_crown      | Silent Crown      | First attack each combat is a guaranteed crit.           |
| a_dao_helm          | Dao Helm          | +{value}% cultivation speed.                             |

### Body uniques (`src/data/uniqueModifiers.js:69–88`)

| id                  | name             | description                                                           |
| ------------------- | ---------------- | --------------------------------------------------------------------- |
| a_titan_chest       | Titan's Chest    | +{value}% max HP.                                                     |
| a_living_armor      | Living Armor     | +{value}% max HP/sec in combat.                                       |
| a_reflective_skin   | Reflective Skin  | Reflect {value}% of damage taken.                                     |
| a_phoenix_robe      | Phoenix Robe     | Once per fight, revive with {value}% HP.                              |
| a_void_cloak        | Void Cloak       | +{value}% dodge chance.                                               |
| a_blessed_robe      | Blessed Robe     | +{value}% healing received.                                           |
| a_chain_armor       | Chain Armor      | +{value}% defense per missing 10% HP.                                 |
| a_warlords_mantle   | Warlord's Mantle | +{value}% damage. +{value/2}% defense.                                |
| a_silken_robe       | Silken Robe      | +{value}% Soul. -5% Body.                                             |
| a_iron_carapace_pro | Heavy Carapace   | +{value}% defense. -10% damage                                        |
| a_ancestral_robe    | Ancestral Robe   | +{value}% all primary stats per major realm.                          |
| a_battle_mail       | Battle Mail      | +{value}% damage in first 10s of combat.                              |
| a_serpent_skin      | Serpent Skin     | +{value}% dodge. Heal {value}% on dodge.                              |
| a_unyielding_garb   | Unyielding Garb  | Cannot be reduced below {value}% HP for 3s after taking fatal damage. |
| a_blossoming_robe   | Blossoming Robe  | +{value}% HP/s per missing 10% HP.                                    |

### Hands uniques (`src/data/uniqueModifiers.js:91–110`)

| id                 | name              | description                                        |
| ------------------ | ----------------- | -------------------------------------------------- |
| a_dragon_claws     | Dragon Claws      | +{value}% crit damage.                             |
| a_qi_channeler     | Qi Channeler      | +{value}% damage from essence.                     |
| a_void_grip        | Void Grip         | Attacks ignore {value}% defense.                   |
| a_blood_palms      | Blood Palms       | Heal {value}% per hit.                             |
| a_smith_hands      | Smith's Hands     | Crafting cost reduced by {value}%.                 |
| a_alchemist_hands  | Alchemist's Hands | Pill effects +{value}%.                            |
| a_combo_grip       | Combo Grip        | +{value}% per consecutive hit.                     |
| a_warriors_grip    | Warrior's Grip    | +{value}% damage and defense.                      |
| a_qi_palms         | Qi Palms          | +{value}% qi gain.                                 |
| a_destruction_grip | Destruction Grip  | +{value}% damage to objects and constructs.        |
| a_phoenix_palms    | Phoenix Palms     | Fire damage heals {value}% of dealt damage.        |

### Waist uniques (`src/data/uniqueModifiers.js:113–132`)

| id                 | name             | description                                     |
| ------------------ | ---------------- | ----------------------------------------------- |
| a_qi_storage       | Qi Storage       | +{value}% qi gain.                              |
| a_sage_belt        | Sage's Belt      | +{value}% pill effects.                         |
| a_essence_belt     | Essence Belt     | Convert {value}% body to essence.               |
| a_battle_sash      | Battle Sash      | +{value}% damage per kill in last 30s.          |
| a_eternal_sash     | Eternal Sash     | +{value}% HP/s.                                 |
| a_iron_belt        | Iron Belt        | +{value}% defense and damage.                   |
| a_lifebinder       | Lifebinder       | +{value}% healing received.                     |
| a_cursed_belt      | Cursed Belt      | +{value}% damage. -25% defense.                 |
| a_blessed_belt     | Blessed Belt     | +{value}% all primary stats.                    |
| a_emperor_belt     | Emperor's Belt   | +{value}% to all primary stats per major realm. |
| a_thirsty_belt     | Thirsty Belt     | Heal {value}% of damage dealt.                  |
| a_assassin_belt    | Assassin Belt    | +{value}% exploit chance.                       |

### Feet uniques (`src/data/uniqueModifiers.js:135–154`)

| id                | name            | description                                |
| ----------------- | --------------- | ------------------------------------------ |
| a_swift_boots     | Swift Boots     | +{value}% dodge chance.                    |
| a_iron_greaves    | Iron Greaves    | +{value}% defense.                         |
| a_phoenix_boots   | Phoenix Boots   | +{value}% HP/sec.                          |
| a_dancers_boots   | Dancer's Boots  | +{value}% damage after dodging.            |
| a_voidstep        | Voidstep        | Each dodge resets one cooldown.            |
| a_dragon_treaders | Dragon Treaders | +{value}% damage from Body.                |
| a_silent_steps    | Silent Steps    | First attack is a guaranteed crit.         |
| a_iron_treads     | Iron Treads     | +{value}% defense and HP.                  |
| a_warriors_boots  | Warrior's Boots | +{value}% physical damage.                 |
| a_eternal_treads  | Eternal Treads  | +{value}% HP/s out of combat.              |

### Neck uniques (`src/data/uniqueModifiers.js:157–176`)

| id                 | name              | description                             |
| ------------------ | ----------------- | --------------------------------------- |
| a_jade_pendant     | Jade Pendant      | +{value}% to all primary stats.         |
| a_dragon_amulet    | Dragon Amulet     | +{value}% damage.                       |
| a_seer_locket      | Seer Locket       | +{value}% all loot.                     |
| a_void_pendant     | Void Pendant      | Ignore {value}% enemy defense.          |
| a_blood_amulet     | Blood Amulet      | +{value}% lifesteal.                    |
| a_qi_amulet        | Qi Amulet         | +{value}% qi gain.                      |
| a_warlords_amulet  | Warlord's Amulet  | +{value}% damage and defense.           |
| a_oracle_amulet    | Oracle Amulet     | +{value}% chance to dodge fatal blows.  |
| a_assassin_pendant | Assassin Pendant  | +{value}% exploit damage.               |
| a_emperor_amulet   | Emperor's Amulet  | +{value}% damage per realm.             |
| a_eternal_amulet   | Eternal Amulet    | +{value}% healing.                      |
| a_speed_amulet     | Amulet of Speed   | -{value}% all cooldowns.                |
| a_combat_amulet    | Combat Amulet     | +{value}% damage in first 5s of combat. |

### Ring uniques (`src/data/uniqueModifiers.js:179–198`)

| id             | name         | description                       |
| -------------- | ------------ | --------------------------------- |
| a_essence_ring | Essence Ring | +{value}% Essence.                |
| a_soul_ring    | Soul Ring    | +{value}% Soul.                   |
| a_body_ring    | Body Ring    | +{value}% Body.                   |
| a_crit_ring    | Crit Ring    | +{value}% exploit chance.         |
| a_speed_ring   | Speed Ring   | -{value}% cooldowns.              |
| a_blood_ring   | Blood Ring   | +{value}% lifesteal.              |
| a_void_ring    | Void Ring    | Ignore {value}% defense.          |
| a_dragon_ring  | Dragon Ring  | +{value}% damage.                 |
| a_iron_ring    | Iron Ring    | +{value}% defense.                |
| a_emperor_ring | Emperor Ring | +{value}% damage per realm.       |
| a_combo_ring   | Combo Ring   | +{value}% per consecutive hit.    |
| a_lucky_ring   | Lucky Ring   | +{value}% loot luck.              |
| a_warrior_ring | Warrior Ring | +{value}% physical damage.        |
| a_mage_ring    | Mage Ring    | +{value}% elemental damage.       |
| a_eternal_ring | Eternal Ring | +{value}% healing.                |
| a_harvest_ring | Harvest Ring | +{value}% harvest speed.          |
| a_mining_ring  | Mining Ring  | +{value}% mining speed.           |
| a_alchemy_ring | Alchemy Ring | Pill effects +{value}%.           |

---

## 2 · Law Modifiers

### 2a · `typeMults` per law — **IMPLEMENTED**

Each law declares `typeMults: { essence, body, soul }`. These weights
drive default-attack damage in
[useCombat.js:269](../src/hooks/useCombat.js):

```js
dmg = s.stats.essence * (tm.essence ?? 0)
    + s.stats.body    * (tm.body    ?? 0)
    + s.stats.soul    * (tm.soul    ?? 0);
```

Rolled per rarity via `rollLawTypeMults`
([affixPools.js:493](../src/data/affixPools.js)).

### 2b · Law Uniques — **IMPLEMENTED (ENGINE)**

64 entries defined in [lawUniques.js:202–606](../src/data/lawUniques.js).
Evaluated by [lawEngine.js:27–50](../src/systems/lawEngine.js) which
produces: `statMods`, `flags`, `conversions`, `regen`, `triggers`,
`stacks`. All wire-up is generic — adding a new entry with a known
`effect.type` works without engine changes.

Representative subset (full list in `lawUniques.js`):

| id | name | pool | roll | effect summary |
|---|---|---|---|---|
| l_limitless_vessel | Limitless Vessel | general | 80–150 | +qi_speed INCR; +damage_all MORE 0.5 |
| l_diamond_body | Diamond Body | physical | 30–60 | +body INCR; −soul MORE 0.5 |
| l_spirit_sea | Spirit Sea | spirit | 60–140 | +soul INCR; −body MORE 0.5 |
| l_element_tyranny | Element Tyranny | general | 100–250 | +elemental_damage MORE; flag `cannot_techniques` |
| l_blink_path | Blink Path | water | 5–15 | `on_dodge` → heal_pct |
| l_blade_dance | Blade Dance | sword | 5–15 | stack(damage_all, MORE, on_hit_dealt) |
| l_immortal_will | Immortal Will | spirit | — | once(lethal_damage) → survive_1hp |
| l_balanced_dao | Balanced Dao | dao | 10–20 | +all_stats INCR |

> **Caveats:** some flag effects are set on `stats.flags` but never read
> in combat — see §4 for the list.

---

## 3 · Secret Technique Modifiers

### 3a · Type-level stats — **IMPLEMENTED**

Generated at drop time
([techniqueDrops.js:176–192](../src/data/techniqueDrops.js)); frozen on
the instance.

| stat | where generated | where consumed | status |
|---|---|---|---|
| `arteMult`    | Attack | `calcDamage` ([techniques.js:112](../src/data/techniques.js)) | YES |
| `elemBonus`   | Attack (elemental) | `calcDamage` ([techniques.js:110](../src/data/techniques.js)) | YES |
| `bonus`       | Attack | `calcDamage` ([techniques.js:114](../src/data/techniques.js)) | YES |
| `healPercent` | Heal | `useCombat.js:343` | YES |
| `defMult`     | Defend | `useCombat.js:349` | YES |
| `dodgeChance` | Dodge | `useCombat.js:355` | YES |
| `buffAttacks` | Defend, Dodge | `resolveBuffAttacks` in [useCombat.js:22](../src/hooks/useCombat.js) | YES |

### 3b · `TECHNIQUE_UNIQUES` pool — **STUB**

Defined in [uniqueModifiers.js:204–335](../src/data/uniqueModifiers.js);
100+ entries for Attack, Heal, Defend, Dodge types.

- `generateTechnique` has **no reference** to `TECHNIQUE_UNIQUES`.
- `techniqueUniquesByType()` at line 399 is **never called**.
- No combat code reads these entries.

### 3c · `PASSIVE_POOLS` — **PRESENTATION ONLY**

Defined in `useTechniques.js:7–36` and mirrored in
`techniqueDrops.js:70–99`. They are rolled onto technique instances and
can be swapped via transmutation, but **no combat logic reads the
passive name, description, or effect**. Examples declared but not
wired up:

- `Penetrating` — "Ignores 15% of enemy DEF."
- `Sharpened` — "Deals 10% bonus damage."
- `Swift Strike` — "Cooldown reduced by 0.5s on hit."
- `Vicious` — "20% chance to deal double damage."
- `Focus` — "+10% critical hit chance."
- (full list: Attack / Heal / Defend / Dodge, five per type)

---

## 4 · Stat-Key Inventory

All `stat` keys that appear in modifier `{ stat, type, value }` triples.

### Fully implemented (22)

essence · body · soul · all_primary_stats · health · defense ·
elemental_defense · soul_toughness · physical_damage · elemental_damage ·
psychic_damage · damage_all · default_attack_damage ·
secret_technique_damage · qi_speed · qi_focus_mult · heavenly_qi_mult ·
harvest_speed · harvest_luck · mining_speed · mining_luck ·
exploit_chance · exploit_attack_mult · buff_duration · offline_qi

### Partial — declared and read in a narrow path only

- `dmg_physical` / `dmg_sword` / `dmg_fist` / `dmg_fire` / `dmg_water` /
  `dmg_earth` / `dmg_spirit` / `dmg_void` / `dmg_dao` — consumed by
  `calcDamage` per-pool split but no gear source sets them.
- `cooldown_duration` — only read via law-unique internal evaluation;
  gear affixes with this key have no effect.
- `buff_effect` — aggregated into `buffEffectMult` but never
  multiplied against any value in combat.

### Declared but unread anywhere — **STUB**

crit_chance · crit_damage · dodge_chance · miss_chance · lifesteal ·
healing_received · ignore_enemy_defense_pct ·
ignore_enemy_soul_toughness · psychic_triple_chance · reflect_pct ·
reflect_phys_pct · crafting_cost · transmutation_cost · pill_effect ·
pill_duration · cooldown_duration_attack · phys_dmg_taken ·
elem_dmg_taken · dmg_taken_all

### Law-unique flags set but not consumed

`cannot_heal` · `cannot_dodge` · `cannot_pills` · `cannot_techniques` ·
`overkill_carry` · `frost_stun` · `damage_is_wild` · `phase_through` ·
`hp_cap_pct`

---

## 5 · Summary

| system | entries | implemented | stub |
|---|---|---|---|
| Artefact uniques | 103 | 0 | 103 |
| Law `typeMults` | all laws | ✔ | — |
| Law uniques (engine) | 64 | ~55 fully, ~9 flag-only | see §4 |
| Technique type stats | 7 | 7 | 0 |
| Technique uniques | 100+ | 0 | all |
| Technique passives | 20 | 0 | all |

### Priority gaps

1. **Artefact uniques** — wire a generic engine mirroring
   `lawEngine.js` so the 103 declared effects can be parsed and
   applied. Start with the damage-flat and stat-percent families
   (covers ≈60% of entries).
2. **Technique passives** — five per type, each with a simple hook
   point (on_hit_dealt, on_cast, on_cooldown_tick). Cheap win;
   completes the secret-technique loop.
3. **Crit / dodge / lifesteal stat family** — multiple systems declare
   these stats and expect them to exist. Either add the mechanic or
   remove the affix entries so gear rolls stop feeling hollow.
4. **Flag consumers** — `cannot_*` flags enforce nothing in combat.
   Either enforce (disable tech use / block heals / etc.) or delete.
