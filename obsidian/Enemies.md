# Enemies

Full catalogue of enemy types, stat profiles, technique pools, and region assignments. Every enemy in [[Worlds/World|the World map]] is derived from one of the 12 types below.

> **Overhaul note (2026-04-24):** the **Element Variants** prefix table (Fire / Frost / Lightning / Stone / Wind / Shadow / Blood / Void / Ancient / Corrupted / Primal) was **removed** as part of the Damage & Element System Overhaul. Variants and their stat-multiplier bundles are no longer part of the design. Enemies now optionally carry a single `element` field drawn from the new five (`fire / water / earth / wood / metal`) — defaulting to `'none'`. See [[Elements]] and [[Damage Types]].
>
> The per-archetype stat tables below still list **Psychic Attack** and **Soul Toughness** rows — these are **deprecated**. The damage system now has only physical and elemental buckets; the psychic bucket and the soul_toughness defense are gone. Treat any psychic/soul row as zero pending a content rewrite. Technique entries that target the psychic bucket (`Soul Spike`, `Mind Crush`, `Soul Drain`) are likewise deprecated.

> **Implementation note (2026-04):** the code path in `data/enemies.js` +
> `useCombat.startFight` uses a simpler model than the power-roll /
> rank design below. Today each enemy entry has a
> fixed `statMult: { hp, atk }` and HP is anchored to the region index
> via `150 × 1.12^regionIndex × hp_mult` (see [[Combat#Enemy Stats]]).
> The richer system in this doc is the **target design** — the rank
> and power-roll tables are not yet wired in.

---

## Power Roll System

Every enemy instance rolls a **power multiplier** drawn from a normal distribution:

```
power_roll ~ N(μ=1.0, σ=0.25)   clamped to [0.5, 1.5]
```

This means:
- **Worst possible roll:** 50% of baseline (−2σ)
- **Most common range:** 75%–125% (within ±1σ, ~68% of spawns)
- **Best possible roll:** 150% of baseline (+2σ)

All stats for that instance are then:

```
stat = region_baseline × profile_mult × power_roll
```

The `region_baseline` is the expected power for that region (defined during balancing). The `profile_mult` is per-stat and per-type (see each type below).

---

## Enemy Ranks

Each spawn is assigned a rank. Rank affects HP and technique count.

| Rank | Spawn Rate | HP Multiplier | Techniques | Power Roll Bias |
|---|---|---|---|---|
| **Common** | ~82% | ×1.0 | 0–1 | Standard N(1.0, 0.25) |
| **Elite** | ~15% | ×1.75 | 1–2 | Standard N(1.0, 0.25) |
| **Boss** | ~3% | ×5.0 | 2–3 | Biased N(1.2, 0.15) clamped [0.9, 1.5] |

Bosses are always drawn from the **hardest** enemy type in the region's pool.

---

## Element Tag (replaces Element Variants)

The pre-overhaul Element Variants prefix system (Fire / Frost / Lightning / Stone / Wind / Shadow / Blood / Void / Ancient / Corrupted / Primal) is **removed**. Enemies now optionally carry a single `element` field from the new five — `fire / water / earth / wood / metal` — defaulting to `'none'`. The element is a **content tag** (drives future affinity / drop weighting). It does not modify the enemy's stat profile.

See [[Elements]] for the global element model and [[Damage Types]] for damage routing.

---

## Technique Catalogue

Shared pool all enemy types draw from. **K scales with world tier** — values given as [World 1 → World 6] ranges.

### Attack Techniques

| Technique | Dmg Type | K Range W1 | K Range W6 | Cooldown | Notes |
|---|---|---|---|---|---|
| **Rend** | Physical | 0.8–1.2 | 6.5–9.5 | 4–6s | Basic physical; fast |
| **Heavy Slam** | Physical | 1.5–2.2 | 12–17 | 9–13s | Slow, hard hit |
| **Frenzy Strike** | Physical | 0.5–0.7 | 4.0–6.0 | 2–3s | Very fast, low K; spam type |
| **Bone Crush** | Physical | 2.5–3.5 | 19–26 | 16–22s | Rare very heavy hit |
| **Elemental Bolt** | Elemental | 0.9–1.3 | 7.0–10.0 | 4–7s | Basic elemental |
| **Elemental Breath** | Elemental | 1.1–1.6 | 9.0–13.0 | 7–10s | Sustained, consistent |
| **Elemental Explosion** | Elemental | 1.8–2.5 | 14–20 | 11–15s | Burst; telegraphed |
| **Elemental Core Detonation** | Elemental | 3.2–4.5 | 25–35 | 22–30s | Nuclear; very rare |
| **Soul Spike** | Psychic | 1.0–1.4 | 8.0–11.5 | 5–8s | Standard psychic |
| **Mind Crush** | Psychic | 2.2–3.0 | 17–24 | 13–18s | Heavy psychic |
| **Soul Drain** | Psychic | 0.4–0.6 | 3.5–5.0 | 3–4s | Fast; heals enemy for 30% of damage dealt |

### Utility Techniques

| Technique | Effect | Duration | Cooldown | Notes |
|---|---|---|---|---|
| **Fortify** | DEF ×1.5–2.0 | 5–8s | 18–25s | Construct/Corpse types |
| **Phase Shift** | Dodge +50–70% | 3–5s | 14–20s | Void/Shade types |
| **Regeneration** | Heal 8–15% max HP | — | 25–35s | Triggers only when HP < 40% |
| **Berserk** | All dmg ×1.3–1.6 | 5–8s | 30–40s | Triggers at HP < 30%; some types trigger automatically |
| **Elemental Shield** | Elem Def ×1.6–2.0 | 5–7s | 20–28s | Spirit/Wyrm types |

---

## Enemy Types

Stat profiles are expressed as multipliers against the region baseline. `1.0` = average; `1.4` = strong; `0.3` = negligible.

---

### 1 — Cultivator

Human fighters. Balanced across all stats — no extreme highs or lows. Their versatility makes them unpredictable.

**Named variants:** Outer Disciple · Rogue Disciple · Bandit Scout · Corrupted Cultivator · Peak-Saint Elder · Bound Ancient Cultivator · Dao Ascetic · Fallen Emperor Cultivator

**Element variants supported:** Fire, Lightning, Shadow, Void (advanced variants only, World 3+)

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×1.1 |
| Elemental Attack | ×1.0 |
| Psychic Attack | ×0.8 |
| DEF | ×1.0 |
| Elemental Defense | ×0.9 |
| Soul Toughness | ×0.8 |
| HP | ×1.0 |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Rend | 80 | Common+ |
| Heavy Slam | 60 | Common+ |
| Elemental Bolt | 50 | Common+ |
| Soul Spike | 40 | Elite+ |
| Mind Crush | 25 | Elite+ |
| Regeneration | 30 | Elite+ |
| Elemental Explosion | 30 | Elite+ |
| Berserk | 20 | Boss only |

---

### 2 — Pack Beast

Animal predators. Pure physical damage — no soul attacks whatsoever. Fragile but fast and aggressive.

**Named variants:** Wolf · Tiger · Hawk · Boar · Herd Beast

**Element variants supported:** Wild (none) · Fire · Frost · Lightning · Shadow · Blood · Primal

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×1.4 |
| Elemental Attack | ×0.2 |
| Psychic Attack | ×0.0 |
| DEF | ×0.9 |
| Elemental Defense | ×0.4 |
| Soul Toughness | ×0.1 |
| HP | ×0.9 |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Frenzy Strike | 100 | Common+ |
| Rend | 80 | Common+ |
| Heavy Slam | 40 | Elite+ |
| Berserk | 50 | Elite+ |
| Bone Crush | 20 | Boss only |

---

### 3 — Construct

Animated automata. Physical and moderate elemental attacks; zero psychic. Extremely high DEF — they shrug off physical hits. Soul attacks are their only weakness.

**Named variants:** Sparring Dummy · Bone Construct · City Guardian Construct · Crystallised Qi Construct · War Commander Construct · Awakened Origin Construct · Tempest-Born Construct

**Element variants supported:** Stone · Fire · Lightning · Ancient

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×1.2 |
| Elemental Attack | ×0.9 |
| Psychic Attack | ×0.0 |
| DEF | ×1.6 |
| Elemental Defense | ×0.8 |
| Soul Toughness | ×0.1 |
| HP | ×1.3 |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Heavy Slam | 90 | Common+ |
| Fortify | 70 | Common+ |
| Elemental Bolt | 50 | Common+ |
| Bone Crush | 40 | Elite+ |
| Elemental Explosion | 30 | Elite+ |
| Elemental Shield | 25 | Elite+ |

---

### 4 — Elemental Spirit

Pure energy entities. Elemental attacks only; negligible physical. High Elemental Defense but low DEF and HP.

**Named variants:** Forest Spirit · Awakened Tree Demon · Storm Elemental · Qi-Storm Elemental · Ancient Wood Sovereign · Forest Origin Spirit · Elemental Sovereign · Void Elemental

**Element variants supported:** Fire · Frost · Lightning · Wind · Stone · Void — *the element is always explicit; "Spirit" without a prefix defaults to Wood/Normal*

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×0.3 |
| Elemental Attack | ×1.6 |
| Psychic Attack | ×0.4 |
| DEF | ×0.5 |
| Elemental Defense | ×1.5 |
| Soul Toughness | ×0.6 |
| HP | ×0.85 |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Elemental Bolt | 100 | Common+ |
| Elemental Breath | 70 | Common+ |
| Elemental Explosion | 60 | Elite+ |
| Elemental Shield | 50 | Elite+ |
| Elemental Core Detonation | 25 | Boss only |
| Soul Spike | 20 | Elite+ |

---

### 5 — Wyrm

Serpentine dragon-type creatures. Mixed elemental and physical — they can hit from both angles. Durable with high HP.

**Named variants:** Lightning Wyrm · Sand Dragon · Blood Sea Leviathan · Void Sea Leviathan · Cosmic Drake

**Element variants supported:** Lightning · Fire · Frost · Void · Blood

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×1.1 |
| Elemental Attack | ×1.4 |
| Psychic Attack | ×0.3 |
| DEF | ×1.1 |
| Elemental Defense | ×1.2 |
| Soul Toughness | ×0.4 |
| HP | ×1.4 |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Elemental Breath | 90 | Common+ |
| Heavy Slam | 60 | Common+ |
| Elemental Explosion | 60 | Elite+ |
| Rend | 50 | Common+ |
| Elemental Core Detonation | 40 | Elite+ |
| Bone Crush | 30 | Boss only |
| Berserk | 20 | Boss only |

---

### 6 — Shade / Wraith

Spiritual undead. Pure psychic damage dealers. Extremely fragile physically — a single heavy blow can destroy them — but their soul attacks ignore DEF entirely and they are hard to hit due to innate phase-like dodge.

**Named variants:** Immortal Shade · Desert Wraith · Trapped Immortal Shade · Drifting War Spirit · Bound War Spirit · Boundary Wraith · Soul Remnant

**Element variants supported:** Shadow · Void · Frost · Ancient

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×0.2 |
| Elemental Attack | ×0.5 |
| Psychic Attack | ×1.7 |
| DEF | ×0.3 |
| Elemental Defense | ×0.5 |
| Soul Toughness | ×1.5 |
| HP | ×0.75 |
| Dodge (innate) | +15% base |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Soul Spike | 100 | Common+ |
| Phase Shift | 80 | Common+ |
| Soul Drain | 70 | Common+ |
| Mind Crush | 60 | Elite+ |
| Regeneration | 30 | Elite+ |
| Elemental Bolt | 20 | Elite+ |

---

### 7 — Corpse Soldier

Reanimated cultivator bodies. Physical-dominant with traces of their former soul power. Slow but hits very hard physically; moderate psychic presence makes them resistant to soul attacks compared to pure beasts.

**Named variants:** Burial Guardian · Remnant Saint Corpse-Soldier · Corpse General · Petrified Dao Cultivator · Armored Revenant

**Element variants supported:** Ancient · Blood · Shadow · Corrupted

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×1.3 |
| Elemental Attack | ×0.4 |
| Psychic Attack | ×0.7 |
| DEF | ×1.2 |
| Elemental Defense | ×0.5 |
| Soul Toughness | ×1.0 |
| HP | ×1.2 |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Heavy Slam | 90 | Common+ |
| Rend | 70 | Common+ |
| Soul Spike | 50 | Common+ |
| Fortify | 50 | Elite+ |
| Bone Crush | 40 | Elite+ |
| Mind Crush | 25 | Boss only |
| Berserk | 20 | Boss only |

---

### 8 — Demon

Demonic beasts and corrupted entities. Balanced physical and elemental attacks — no single predictable angle. Volatile and aggressive; many variants trigger Berserk at low HP.

**Named variants:** Mountain Demon Lord · Qi-Devoured Beast · Qi-Blood Mutant · Cavern Elder Demon · Elemental Boar

**Element variants supported:** Flame · Frost · Blood · Abyssal (psychic variant) · Primal

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×1.2 |
| Elemental Attack | ×1.2 |
| Psychic Attack | ×0.5 |
| DEF | ×1.0 |
| Elemental Defense | ×0.7 |
| Soul Toughness | ×0.5 |
| HP | ×1.3 |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Elemental Explosion | 80 | Common+ |
| Heavy Slam | 70 | Common+ |
| Berserk | 70 | Common+ |
| Elemental Bolt | 50 | Common+ |
| Bone Crush | 35 | Elite+ |
| Rend | 30 | Common+ |
| Elemental Breath | 25 | Elite+ |

---

### 9 — Ancient Beast

Primordial creatures that predate the current era. Pure physical dominance, massive HP, and natural regeneration. The slow, unstoppable archetype.

**Named variants:** Ancient Beast King · Root-Merged Beast · Heaven Beast · Origin King-Grade Beast · Herd-Hunting Beast

**Element variants supported:** Primal · Ancient · Blood · Stone · Wind

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×1.5 |
| Elemental Attack | ×0.7 |
| Psychic Attack | ×0.2 |
| DEF | ×1.3 |
| Elemental Defense | ×0.8 |
| Soul Toughness | ×0.4 |
| HP | ×1.7 |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Bone Crush | 80 | Common+ |
| Heavy Slam | 70 | Common+ |
| Berserk | 60 | Common+ |
| Regeneration | 50 | Elite+ |
| Rend | 40 | Common+ |
| Frenzy Strike | 30 | Boss only |

---

### 10 — Void Entity

Spatial and dimensional creatures. No single dominant damage type — they split across elemental and psychic. Their defining trait is extremely high innate dodge, making them hard to hit. DEF is low, but they rarely get hit.

**Named variants:** Spatial Rift Predator · Space-Fracture Predator · Void-Touched Cultivator · Rift Predator · Spatial Sovereign Beast

**Element variants supported:** Void · Shadow · Lightning · Ancient

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×0.8 |
| Elemental Attack | ×1.1 |
| Psychic Attack | ×1.2 |
| DEF | ×0.6 |
| Elemental Defense | ×1.0 |
| Soul Toughness | ×1.1 |
| HP | ×0.9 |
| Dodge (innate) | +25% base |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Phase Shift | 100 | Common+ |
| Soul Spike | 80 | Common+ |
| Elemental Bolt | 70 | Common+ |
| Mind Crush | 50 | Elite+ |
| Soul Drain | 40 | Common+ |
| Elemental Explosion | 30 | Elite+ |
| Elemental Core Detonation | 15 | Boss only |

---

### 11 — Dao Entity

Source-level spiritual beings and guardians. Powerful dual elemental+psychic attackers. Balanced defenses across the board. The most "technical" enemy — they have rich technique pools and use utility techniques actively.

**Named variants:** Dao-Inscription Guardian · Sword Dao Spirit · Origin-Spring Guardian · Petrified Dao Cultivator (also Corpse Soldier) · Peak Dao Source Ascetic · Ascending Trial Guardian · Tomb Guardian · Emperor Realm Remnant Will

**Element variants supported:** Fire · Lightning · Wind · Void · Ancient

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×0.6 |
| Elemental Attack | ×1.4 |
| Psychic Attack | ×1.4 |
| DEF | ×1.0 |
| Elemental Defense | ×1.2 |
| Soul Toughness | ×1.2 |
| HP | ×1.1 |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Elemental Explosion | 90 | Common+ |
| Mind Crush | 80 | Common+ |
| Soul Spike | 70 | Common+ |
| Elemental Breath | 60 | Common+ |
| Elemental Core Detonation | 50 | Elite+ |
| Soul Drain | 40 | Common+ |
| Fortify | 30 | Elite+ |
| Regeneration | 30 | Boss only |
| Berserk | 20 | Boss only |

---

### 12 — Open Heaven Entity

Endgame beings. All stats are elevated. No weaknesses. Rich technique pools with 3 techniques even at Common rank. The only enemy type where Common enemies actively use multiple techniques.

**Named variants:** Low-Rank Open Heaven Wanderer · Mid-Rank Open Heaven Beast · Ancient Open Heaven Cultivator · Storm Sovereign · Cosmic Apex Beast

**Element variants supported:** All — at this tier, any element prefix is possible

**Stat Profile:**

| Stat | Multiplier |
|---|---|
| Physical Attack | ×1.3 |
| Elemental Attack | ×1.3 |
| Psychic Attack | ×1.3 |
| DEF | ×1.3 |
| Elemental Defense | ×1.3 |
| Soul Toughness | ×1.3 |
| HP | ×2.0 |

**Technique Pool:**

| Technique | Weight | Rank Gate |
|---|---|---|
| Heavy Slam | 80 | Common+ |
| Elemental Explosion | 80 | Common+ |
| Mind Crush | 80 | Common+ |
| Bone Crush | 60 | Common+ |
| Elemental Core Detonation | 60 | Common+ |
| Phase Shift | 50 | Common+ |
| Berserk | 50 | Common+ |
| Regeneration | 50 | Common+ |
| Fortify | 40 | Common+ |
| Elemental Shield | 40 | Common+ |

**Rank override:** Open Heaven Common enemies roll 2–3 techniques regardless of the standard rank table.

---

## Region Enemy Pools

Which types and variants appear in each region. Format: `Type — Variant [Element prefix]`. Boss type is marked ★.

---

### World 1 — The Mortal Lands

| Region | Enemy Pool |
|---|---|
| Outer Sect Training Grounds | Cultivator — Outer Disciple, Cultivator — Bandit Scout, Construct — Sparring Dummy ★ |
| Borderland Wilds | Pack Beast — Wild Wolf, Pack Beast — Feral Boar, Cultivator — Bandit Scout ★ |
| Qi-Vein Ravines | Pack Beast — [Qi-sensing] Wild Wolf, Pack Beast — [Lightning] Wild Tiger, Cultivator — Rogue Disciple ★ |
| Misty Spirit Forest | Elemental Spirit — Forest Spirit, Elemental Spirit — Awakened Tree Demon, Pack Beast — Shadow Wolf ★ |
| Heaven's Edge Peak | Pack Beast — Thunder Hawk, Pack Beast — Lightning Tiger, Cultivator — Rogue Cultivator ★ |
| Thunderstorm Plateau | Wyrm — Lightning Wyrm, Elemental Spirit — Storm Elemental, Wyrm — [Lightning] Sand Dragon ★ |

---

### World 2 — The Ancient Frontier

| Region | Enemy Pool |
|---|---|
| Shattered Sky Desert | Wyrm — Sand Dragon, Construct — Bone Construct, Shade — Desert Wraith, Wyrm — [Fire] Sand Dragon ★ |
| Demon Beast Plains | Ancient Beast — Herd-Hunting Beast, Demon — Elemental Boar [Fire], Demon — Elemental Boar [Frost], Ancient Beast — Primal Herd Beast ★ |
| Sunken Immortal City | Construct — City Guardian Construct, Shade — Trapped Immortal Shade, Construct — [Ancient] City Guardian ★ |
| Primal Qi Wastes | Demon — Qi-Devoured Beast, Cultivator — Corrupted Cultivator, Demon — [Corrupted] Qi-Blood Mutant ★ |
| Blood Sea Periphery | Wyrm — Blood Sea Leviathan, Demon — [Blood] Qi-Blood Mutant, Wyrm — [Ancient] Blood Leviathan ★ |

---

### World 3 — The Forbidden Lands

| Region | Enemy Pool |
|---|---|
| Saint Burial Grounds | Corpse Soldier — Burial Guardian, Corpse Soldier — Remnant Saint Corpse-Soldier, Corpse Soldier — [Ancient] Corpse General ★ |
| Primal Qi Wastes (Deep) | Elemental Spirit — Qi-Storm Elemental [Lightning], Ancient Beast — Ancient Beast King, Ancient Beast — [Primal] Ancient Beast King ★ |
| Void Rift Expanse | Void Entity — Void-Touched Cultivator, Void Entity — Spatial Rift Predator, Void Entity — [Void] Spatial Rift Predator ★ |
| Nine-Death Mountain Range | Cultivator — Peak-Saint Elder, Demon — Mountain Demon Lord [Flame], Demon — [Abyssal] Mountain Demon Lord ★ |
| Sealed War Altar | Construct — [Ancient] War Commander Construct, Shade — Bound War Spirit, Construct — [Ancient] War Commander Construct ★ |

---

### World 4 — The Origin Depths

| Region | Enemy Pool |
|---|---|
| Origin Qi Spring Depths | Dao Entity — Origin-Spring Guardian, Construct — Crystallised Qi Construct, Construct — [Ancient] Crystallised Qi Construct ★ |
| World Root Caverns | Ancient Beast — Root-Merged Beast, Demon — Cavern Elder Demon [Abyssal], Demon — [Primal] Cavern Elder Demon ★ |
| Primordial Forest Core | Elemental Spirit — Ancient Wood Sovereign, Dao Entity — Forest Origin Spirit, Elemental Spirit — [Ancient] Wood Sovereign ★ |
| Heaven Beast Sanctuary | Ancient Beast — Heaven Beast [Primal], Ancient Beast — Origin King-Grade Beast, Ancient Beast — [Ancient] Origin King Beast ★ |
| Ancient Origin Altar | Construct — Awakened Origin Construct [Ancient], Cultivator — Bound Ancient Cultivator, Dao Entity — [Ancient] Origin-Spring Guardian ★ |

---

### World 5 — The Void Sea

| Region | Enemy Pool |
|---|---|
| Fractured Space Corridors | Void Entity — Space-Fracture Predator, Elemental Spirit — Void Elemental, Void Entity — [Void] Space-Fracture Predator ★ |
| Void Sea Shores | Wyrm — Void Sea Leviathan, Shade — Drifting War Spirit, Wyrm — [Void] Void Sea Leviathan ★ |
| Dao Inscription Ruins | Dao Entity — Dao-Inscription Guardian, Corpse Soldier — Petrified Dao Cultivator, Dao Entity — [Lightning] Dao-Inscription Guardian ★ |
| Source Peak Summits | Cultivator — Peak Dao Source Ascetic, Dao Entity — [Wind] Dao-Inscription Guardian, Elemental Spirit — Elemental Sovereign ★ |
| Ancient Emperor Tomb | Dao Entity — Tomb Guardian, Shade — Emperor Realm Remnant Will, Dao Entity — [Ancient] Tomb Guardian ★ |
| Heaven Sword Ridge | Dao Entity — Sword Dao Spirit [Lightning], Cultivator — Fallen Emperor Cultivator, Dao Entity — [Ancient] Sword Dao Spirit ★ |

---

### World 6 — The Open Heaven

| Region | Enemy Pool |
|---|---|
| Heaven Pillar Ascent | Dao Entity — Ascending Trial Guardian, Shade — Boundary Wraith, Dao Entity — [Ancient] Ascending Trial Guardian ★ |
| Star Sea Approaches | Open Heaven — Low-Rank Open Heaven Wanderer, Pack Beast — [Lightning] Star Sea Beast, Open Heaven — [Lightning] Open Heaven Wanderer ★ |
| Celestial Rift Expanse | Void Entity — Rift Predator [Void], Open Heaven — [Void] Mid-Rank Open Heaven Beast, Open Heaven — Spatial Sovereign Beast ★ |
| Eternal Storm Arena | Elemental Spirit — Storm Sovereign [Lightning], Open Heaven — [Lightning] Mid-Rank Open Heaven Beast, Open Heaven — [Ancient] Storm Sovereign ★ |
| Cosmic Beast Grounds | Open Heaven — Mid-Rank Open Heaven Beast, Ancient Beast — [Ancient] Cosmic Apex Beast, Open Heaven — [Primal] Open Heaven Beast ★ |
| Heaven's Core | Open Heaven — Ancient Open Heaven Cultivator, Open Heaven — Cosmic Apex Beast, Open Heaven — [Ancient] Cosmic Apex Beast ★ |

---

## Loot System

---

### How Drops Work

Each enemy kill runs each loot category as an **independent roll**. A single kill can produce drops from multiple categories simultaneously. Gold always drops; everything else is probabilistic.

---

### Base Drop Chances

Applies to all Common and Elite enemies. Elite enemies get a flat +15pp bonus on every non-gold category.

| Category | Common | Elite |
|---|---|---|
| Gold | 100% | 100% |
| Cultivation Material | 65% | 80% |
| Artefact | 15% | 30% |
| Herb | 8% | 23% |
| Mineral | 8% | 23% |
| Technique Scroll | per-enemy (see below) | per-enemy ×2 |

---

### Technique Scroll Drops

Each enemy that can drop a technique scroll has a **flat per-kill chance** defined in its profile. The chance is rolled **independently** of all other drop categories.

When a scroll drops, the technique is **procedurally generated** using the world-tier quality weights below. The quality tier maps technique quality to the material rarity system:

| Material Rarity | Technique Quality |
|---|---|
| Common | Iron |
| Uncommon | Bronze |
| Rare | Silver |
| Epic | Gold |
| Legendary | Transcendent |

**Quality weights per world** (same table as material drops):

| World | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|
| 1 | 60% | 30% | 9% | 1% | 0% |
| 2 | 20% | 40% | 30% | 9% | 1% |
| 3 | 5% | 20% | 40% | 30% | 5% |
| 4 | 0% | 8% | 28% | 47% | 17% |
| 5 | 0% | 2% | 10% | 43% | 45% |
| 6 | 0% | 0% | 3% | 20% | 77% |

**Element pool per world** — techniques draw from world-appropriate elements. Normal is weighted heavily in World 1 (most early players lack elemental Laws).

**Constructs** (Sparring Dummy, Bone Construct, etc.) do **not** drop technique scrolls.

**Per-enemy chances** are defined in `data/enemies.js` under `techniqueDrop.chance`. See [[Secret Techniques#World 1 Technique Drop Rates]] for the full World 1 table.

---

### Boss Drop Table

Bosses always drop a **Law**. Everything else is enhanced on top of the base table.

| Category | Boss |
|---|---|
| Gold | 100% (×5 amount) |
| Cultivation Material | 100% |
| Artefact | 85% |
| Herb | 40% |
| Mineral | 40% |
| **Law** | **100%** |
| Secret Technique Scroll | 25% |

**Law drop rules:**
- Realm requirement: matches the current world's realm range
- Element: weighted toward the dominant element of enemies in this region (e.g. Lightning Wyrm boss → Lightning-weighted Law)
- Quality: uses the same world-tier quality bias as [[Artefacts#Quality Drop Bias|Artefacts]]

---

### Rarity Weights by World Tier

Once a category is confirmed to drop, the specific item's rarity is rolled using this table. Applies to Cultivation Materials, Artefacts, Herbs, and Minerals equally.

| World | Common | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| 1 | 60% | 30% | 9% | 1% | 0% |
| 2 | 30% | 40% | 25% | 4% | 1% |
| 3 | 10% | 25% | 40% | 22% | 3% |
| 4 | 2% | 10% | 25% | 45% | 18% |
| 5 | 0% | 3% | 12% | 40% | 45% |
| 6 | 0% | 0% | 3% | 20% | 77% |

Once the rarity tier is determined, the specific item is drawn uniformly from all items of that rarity in that category (herbs list, minerals list, etc.).

**Artefact slot:** when an Artefact drops, the slot is chosen uniformly at random from all 8 slots (Weapon, Head, Body, Hands, Waist, Feet, Neck, Finger).

---

### Cultivation Material Bias

Within the Cultivation Material category, different enemy types have a biased draw toward specific items that fit their nature. This is expressed as an extra weight added on top of the uniform draw.

| Enemy Type | Biased Item | Extra Weight |
|---|---|---|
| Pack Beast / Ancient Beast | Beast Core | +40 |
| Elemental Spirit / Wyrm | Elemental Essence Bead | +40 |
| Dao Entity | Elemental Essence Bead, Heaven Spirit Dew | +30 each |
| Cultivator / Corpse Soldier | Spirit Stone | +30 |
| Shade / Wraith | Origin Crystal | +25 |
| Construct | Spirit Stone | +20 |
| Void Entity | Origin Crystal | +30 |
| Demon | Beast Core | +20 |
| Open Heaven Entity | Heaven Spirit Dew, Elemental Essence Bead | +50 each |

Items not in the bias list draw from the standard uniform pool. All items must still pass the rarity gate — if a biased item is a higher rarity than the rolled tier, it is excluded and the draw falls back to the uniform pool for that tier.

---

### Per-Type Drop Chance Adjustments

Small shifts to the base drop chances above. These stack on top of the Common/Elite base (and before the Elite +15pp bonus).

| Enemy Type | Category | Adjustment |
|---|---|---|
| Pack Beast | Herb | +5% |
| Pack Beast | Cultivation Material | +5% |
| Construct | Mineral | +8% |
| Construct | Herb | −5% |
| Elemental Spirit | Cultivation Material | +8% |
| Elemental Spirit | Mineral | −5% |
| Wyrm | Herb | +4% |
| Wyrm | Mineral | +4% |
| Shade / Wraith | Artefact | +6% |
| Shade / Wraith | Mineral | −5% |
| Corpse Soldier | Artefact | +8% |
| Corpse Soldier | Herb | −4% |
| Demon | Cultivation Material | +5% |
| Demon | Mineral | +4% |
| Ancient Beast | Herb | +7% |
| Ancient Beast | Cultivation Material | +5% |
| Void Entity | Artefact | +6% |
| Void Entity | Herb | −5% |
| Dao Entity | Cultivation Material | +10% |
| Dao Entity | Herb | +5% |
| Open Heaven Entity | Cultivation Material | +15% |
| Open Heaven Entity | Artefact | +10% |
| Open Heaven Entity | Herb | +8% |
| Open Heaven Entity | Mineral | +8% |

No type has an adjustment greater than ±15% on any single category — the differences are flavour, not a complete reorientation of drop identity.

---

## TODO

- [ ] Define exact region baseline power values (P per region) during balancing
- [ ] Define enemy HP base values per realm tier
- [ ] Verify K ranges per world tier match player damage output
- [ ] Decide if enemy Soul Drain heal is visible to the player (UI feedback)
- [ ] Add Gathering/Mining enemy pools (subset of World pools, lower end of power distribution)
- [ ] Define gold amount scaling per world tier
- [ ] Define Law quality and element weighting per boss (refine per region)

---

## Related

- [[Worlds/World]]
- [[Combat]]
- [[Secret Techniques]]
- [[Stats]]
- [[Materials]]
- [[Items]]

---

## Claude Commands
