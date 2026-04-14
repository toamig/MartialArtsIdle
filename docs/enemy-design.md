# Enemy Design — Constraints & Rules

## Distribution Rules

- Each world has **8–10 distinct enemy types**.
- Each region (section / level) has **at most 2 enemy types** in its pool.
- The same enemy type may appear in more than one region of the same world to allow smooth
  difficulty ramping without requiring a new enemy per region.

---

## Thematic Consistency Rules

Every enemy in a world must fit that world's visual and narrative identity.

| World | Theme | Acceptable enemy archetypes |
|---|---|---|
| W1 — The Mortal Lands | Mortal sect → wilderness → qi forests → storm peaks | Humans (disciples, bandits), mundane beasts (wolves), qi-infused wildlife, nature spirits |
| W2 — The Ancient Frontier | Desert ruins, ancient cities, blood seas | Hardened predators, bone constructs, ancient city golems, undead immortal shades, corrupted cultivators, sea creatures |
| W3 — The Forbidden Lands | Burial grounds, void rifts, sealed war altars | Undead saints, war spirits, void-touched predators, ancient constructs, rift stalkers |
| W4 — The Origin Depths | Underground springs, primordial forests, world core | Primordial serpents, crystal/earth golems, ancient beasts, root sovereigns, deep-earth titans, cave demons |
| W5 — The Void Sea | Fractured space, void sea, Dao ruins, Emperor tombs | Void/spatial entities, Dao construct guardians, petrified cultivators, emperor will-fragments, star-sea drifters |
| W6 — The Open Heaven | Heaven pillars, star sea, celestial rifts, cosmic beasts | Heaven guardians, star leviathans, celestial sovereigns, storm titans, Open Heaven beasts, void apex predators |

---

## Visual Strength Progression Rules

Players must be able to *feel* that higher-level enemies are stronger just by looking at the
statMult numbers and reading the names. Three levers to achieve this:

1. **statMult values** increase monotonically across worlds (W1 < W2 < W3 … < W6).
2. **Names escalate in power language**: scout → beast → sovereign → titan → apex / primordial.
3. **Drop quality escalates**: Iron materials in W1, Silver in W2, Gold in W3–W4,
   Transcendent in W4–W6.

### statMult Target Ranges per World

| World | HP range    | ATK range    |
|-------|-------------|--------------|
| W1    | 0.7 – 1.2   | 0.4 – 1.5    |
| W2    | 1.5 – 2.5   | 1.3 – 2.5    |
| W3    | 2.0 – 4.0   | 2.3 – 4.0    |
| W4    | 4.5 – 7.0   | 4.0 – 6.5    |
| W5    | 7.0 – 11.0  | 6.5 – 11.0   |
| W6    | 14.0 – 28.0 | 16.0 – 32.0  |

---

## Naming Conventions

- Mortal-realm enemies (W1): plain descriptive names (Pack Wolf, Bandit Scout, Rogue Disciple)
- Ancient/Frontier enemies (W2): material prefix + creature type (Iron Fang Wolf, Bone Construct)
- Forbidden/Origin enemies (W3–W4): adjective escalation (Saint Corpse-Soldier, Void Rift Predator,
  Primordial Serpent, Deep Earth Titan)
- Void/Heaven enemies (W5–W6): cosmic scale (Dao Inscription Revenant, Emperor Will Fragment,
  Open Heaven Sovereign, Void Apex Predator)

---

## Region pool size rule

Pools can be **1–3 enemies per region** (not fixed at 2). Design intent:
- **1 enemy**: solo spotlight region. That enemy must drop 3 items to compensate for lack of variety.
- **2 enemies**: standard pairing. Natural thematic fit.
- **3 enemies**: used in later worlds (W5+) where fewer regions cover more enemies.

## Enemy Roster (48 total — 6/8/8/9/9/8 per world)

### World 1 — The Mortal Lands (6 enemies, 5 regions)
| ID | Name | Has Sprite |
|----|------|-----------|
| outer_sect_disciple | Outer Sect Disciple | ✓ |
| training_golem | Training Golem | ✓ |
| wolf | Pack Wolf | ✓ |
| bandit_scout | Bandit Scout | ✓ |
| wandering_beast | Wandering Beast | ✓ |
| rogue_disciple | Rogue Disciple | ✓ |

> 1 natural pair (Training Grounds) + 4 solo regions. Two new unique-sprite enemies needed to expand to 6 regions without repeats.

### World 2 — The Ancient Frontier (8 enemies)
| ID | Name | Has Sprite |
|----|------|-----------|
| iron_fang_wolf | Iron Fang Wolf | ✓ |
| iron_spine_boar | Iron Spine Boar | — |
| sand_dragon | Sand Dragon | — |
| bone_construct | Bone Construct | — |
| city_guardian | City Guardian Construct | — |
| immortal_shade | Trapped Immortal Shade | — |
| corrupted_cultivator | Corrupted Cultivator | — |
| blood_leviathan | Blood Sea Leviathan | — |

### World 3 — The Forbidden Lands (8 enemies)
| ID | Name | Has Sprite |
|----|------|-----------|
| burial_guardian | Burial Guardian | — |
| saint_corpse_soldier | Saint Corpse-Soldier | — |
| ancient_war_spirit | Ancient War Spirit | — |
| saint_bone_sovereign | Saint Bone Sovereign | — |
| void_shade | Void Shade | — |
| forbidden_construct | Forbidden Construct | — |
| void_rift_predator | Void Rift Predator | — |
| rift_stalker | Rift Stalker | — |

### World 4 — The Origin Depths (9 enemies)
| ID | Name | Has Sprite | Notes |
|----|------|-----------|-------|
| origin_crystal_golem | Origin Crystal Golem | — | |
| origin_guardian | Origin Guardian | — | |
| primordial_serpent | Primordial Serpent | — | |
| root_sovereign | Root Sovereign | — | |
| deep_earth_titan | Deep Earth Titan | — | solo at final altar |
| ancient_beast | Ancient Beast | — | |
| cavern_elder_demon | Cavern Elder Demon | — | |
| world_root_wraith | World Root Wraith | — | |
| forest_spirit | Forest Spirit | ✓ | moved from W1 — visual match for underground root cavern |

> forest_spirit moved from W1 — the underground root cavern background (gnarled roots through bedrock) is a far stronger visual match than the sect compound. Paired with root_sovereign in Ancient Root Grotto.

### World 5 — The Void Sea (9 enemies)
| ID | Name | Has Sprite | Notes |
|----|------|-----------|-------|
| spatial_fissure_beast | Spatial Fissure Beast | — | |
| void_elemental | Void Elemental | — | 3-pool with fissure beast + qi_beast |
| void_sea_leviathan | Void Sea Leviathan | — | solo at Void Sea Shores |
| dao_inscription_guardian | Dao Inscription Guardian | — | |
| dao_inscription_revenant | Dao Inscription Revenant | — | |
| petrified_dao_lord | Petrified Dao Lord | — | |
| emperor_will_fragment | Emperor Will Fragment | — | |
| star_sea_drifter | Star Sea Drifter | — | solo at Heaven Sword Ridge |
| qi_beast | Qi-Sensing Beast | ✓ | moved from W1 — violet veins match W5 magenta void palette |

> qi_beast moved here from W1 — its sprite (near-black coat, pulsing violet energy veins) is a direct visual match for the W5 magenta void sky and energy crack palette.

### World 6 — The Open Heaven (8 enemies)
| ID | Name | Has Sprite |
|----|------|-----------|
| boundary_wraith | Boundary Wraith | — |
| heaven_pillar_guardian | Heaven Pillar Guardian | — |
| open_heaven_beast | Open Heaven Beast | — |
| star_sea_leviathan | Star Sea Leviathan | — |
| eternal_storm_titan | Eternal Storm Titan | — |
| celestial_sovereign | Celestial Sovereign | — |
| void_apex_predator | Void Apex Predator | — |
| open_heaven_sovereign | Open Heaven Sovereign | — |

---

## Region Assignment (max 2 per region, zero repeats)

Every enemy appears in exactly one region. Variants (wolf_alpha, wandering_beast_elder, etc.) occupy the later regions of their world, replacing repeats with escalated drops.

### World 1
| Region | Pool size | Pool | Rationale |
|--------|-----------|------|-----------|
| Outer Sect Training Grounds | 2 | outer_sect_disciple, training_golem | Both inhabit the same training ground |
| Borderland Wilds | 1 | wolf | Pack wolves dominate the open borderlands |
| Bandit's Crossing | 1 | bandit_scout | Bandit ambush territory on the road |
| Qi-Vein Ravines | 1 | wandering_beast | Beast drawn to dense qi in the ravine rock |
| Misty Spirit Forest | 1 | rogue_disciple | Rogue hiding deep in the spirit mist |

> 2 new unique-sprite enemies needed to expand to 6 regions. Reserved slots: Thunderstorm Plateau + Heaven's Edge Peak.

### World 2
| Region | Pool | Rationale |
|--------|------|-----------|
| Shattered Sky Desert | sand_dragon, bone_construct | Desert predator + ancient bones animated in the ruins |
| Demon Beast Plains | iron_fang_wolf, iron_spine_boar | Plains-hardened pack hunters and mineral-fed boars |
| Sunken Immortal City | city_guardian, immortal_shade | City's own construct + the shade of its trapped immortal residents |
| Blood Sea Wastes | blood_leviathan, corrupted_cultivator | Sea apex predator + qi-mad cultivators drawn to the blood sea |

### World 3
| Region | Pool | Rationale |
|--------|------|-----------|
| Saint Burial Grounds | burial_guardian, saint_corpse_soldier | Bound guardian sentinel + oath-driven corpse soldiers |
| Void Rift Expanse | void_rift_predator, rift_stalker | Both rift-evolved hunters of the same spatial ecosystem |
| Nine-Death Mountain Range | saint_bone_sovereign, void_shade | Undead sovereign claiming the range + void shades haunting cursed passes |
| Sealed War Altar | forbidden_construct, ancient_war_spirit | Construct guarding the sealed altar + war spirits bound to the altar itself |

### World 4
| Region | Pool size | Pool | Rationale |
|--------|-----------|------|-----------|
| Origin Qi Spring Depths | 2 | origin_guardian, origin_crystal_golem | Spring-born elemental guardian + crystallised qi golem |
| World Root Caverns | 2 | primordial_serpent, cavern_elder_demon | Both deep cavern creatures fused with the underground environment |
| Ancient Root Grotto | 2 | forest_spirit, root_sovereign | Root spirits drifting through root hollows + the sovereign whose underground network they inhabit |
| Primordial Forest Core | 2 | ancient_beast, world_root_wraith | Primordial beasts claiming the forest core + their ethereal wraith guardians |
| Ancient Origin Altar | 1 | deep_earth_titan | Lone titan guardian — its pressure alone is enough, nothing else survives near it |

### World 5
| Region | Pool size | Pool | Rationale |
|--------|-----------|------|-----------|
| Fractured Space Corridors | 3 | spatial_fissure_beast, qi_beast, void_elemental | All three are void-adapted entities sharing the fractured space ecosystem |
| Void Sea Shores | 1 | void_sea_leviathan | Apex predator so massive it crowds out all other life from its shores |
| Dao Inscription Ruins | 2 | dao_inscription_guardian, dao_inscription_revenant | Construct guardian + cultivator who became one with the inscriptions |
| Ancient Emperor Tomb | 2 | emperor_will_fragment, petrified_dao_lord | Emperor consciousness fragments + Dao lords sealed inside as the final line |
| Heaven Sword Ridge | 1 | star_sea_drifter | Drawn down by Dao convergence — the rarest W5 encounter, hunts alone |

### World 6
| Region | Pool | Rationale |
|--------|------|-----------|
| Heaven Pillar Ascent | heaven_pillar_guardian, boundary_wraith | Pillar construct + wraith feeding on ascending cultivators at the boundary |
| Star Sea Approaches | open_heaven_beast, star_sea_leviathan | Open heaven native beasts + leviathans at the star sea entry |
| Celestial Rift Expanse | celestial_sovereign, eternal_storm_titan | Rift guardian sovereign + storm titan that inhabits the same space as a natural force |
| Heaven's Core | open_heaven_sovereign, void_apex_predator | Dissolved sovereign energy + apex void predator at the highest point |
