# Unique Modifiers

Build-enabling rare modifiers for Laws, Artefacts, and Techniques. Designed in the spirit of Path of Exile uniques, Slormancer legendaries, and Diablo set bonuses — combinations of unique modifiers should enable distinct playstyles.

> **Status:** Design pool only. Defined in `src/data/uniqueModifiers.js`. **Not yet hooked into game logic** — game will need stat formula extensions and trigger systems to make these functional.

---

## Pool Power Levels

| Pool | Strength | Trade-offs | Purpose |
|---|---|---|---|
| **Laws** | Strongest | Often have downsides | Ascendancy-style: defines a build |
| **Artefacts** | ~70% of law strength | No major downsides | Variety, slot-themed buffs |
| **Techniques** | Specific to that technique | Modifies the technique's behavior | Skill specialization |

---

## Design Philosophy

1. **Builds emerge from combinations** — no single modifier should be strong enough alone. The interaction of 2-5 unique modifiers across laws + artefacts + techniques is what defines a build.
2. **Trade-offs create identity** — laws especially should make you choose. "+100% damage but cannot heal" forces a sustain-via-kill playstyle.
3. **Conditions enable skill expression** — "+100% damage when below 25% HP" rewards risky play.
4. **Stat conversions create new playstyles** — "30% of body counts as soul" lets soul builds use body items.
5. **Anti-synergies prevent stacking everything** — "+100% damage. -50% defense" keeps players from being the best at everything.

---

## Archetype Tags

Modifiers are tagged by archetype so you can filter the pool when designing builds:

| Tag | Meaning | Example builds |
|---|---|---|
| `qi-glutton` | Extreme cultivation, weak combat | Deep Cultivator |
| `body` | Body stat scaling | Body Cultivator, Tank |
| `soul` | Soul stat scaling | Soul Walker, Mind Mage |
| `elemental` | Element damage focus | Fire Path, Frost Knight |
| `speed` | Cooldown reduction, mobility | Speed Demon |
| `tank` | Defense / HP focus | Iron Wall |
| `glass-cannon` | High damage, low survival | Berserker, Assassin |
| `sustain` | Healing, regen, lifesteal | Vampire, Phoenix |
| `crit` | Critical strike scaling | Lucky Striker |
| `conversion` | Stat conversions | Hybrid builds |
| `realm-scale` | Scales with realm progression | Late-game scaling |
| `condition` | Triggered/conditional bonuses | Berserker, Combo |
| `anti-synergy` | Has trade-offs / costs | Risk-reward builds |
| `crafting` | Crafting cost reduction | Master Crafter |
| `utility` | Misc QoL | Various |
| `harvest` | Gathering speed/luck | Harvester |
| `mining` | Mining speed/luck | Miner |
| `offensive` | Pure damage | Various damage builds |
| `defensive` | Pure mitigation | Various tank builds |
| `hybrid` | Multiple stats | Balanced builds |

---

## Example Build Concepts

### **The Berserker**
- Law: *Berserker's Resolve* (+150% damage at <50% HP) + *Blood for Power* (+50% per 10% missing HP)
- Artefacts: *Blood Boots*, *Cursed Belt*, *Wounded Beast* synergy
- Techniques: *Desperation* on attack, *Emergency* on heal
- **Identity:** Stay low HP for massive damage. Heal only when forced.

### **The Vampire**
- Law: *Vampiric Path* (5-20% lifesteal)
- Artefacts: *Blood Drinker* weapon, *Blood Ring*, *Thirsty Belt*
- Techniques: *Blood Drinker* on attack, *Blood Pact* on heal
- **Identity:** Damage is healing. Sustain through aggression.

### **The Mountain**
- Law: *Diamond Body* (+140% Body, soul halved) + *Mountain Stance* (no dodge, +120% HP/Def)
- Artefacts: All HP/defense items, *Phoenix Robe*, *Iron Greaves*
- Techniques: *Aegis* defend, *Thorns*, *Phalanx*
- **Identity:** Immovable wall. Can't dodge but doesn't need to.

### **The Speed Demon**
- Law: *Quickened Steps* (-60% cooldowns) + *Lightning Reflexes* (+50% dodge)
- Artefacts: *Phantom Edge*, *Speed Belt*, *Voidstep*
- Techniques: *Swift* on attack, *Voidstep* on dodge with *Reset*
- **Identity:** Spam techniques. Never stop moving.

### **The Soul Walker**
- Law: *Spirit Sea* (+140% Soul, body halved) + *Mental Blade* (+200% psychic dmg)
- Artefacts: Soul-stat items, *Iron Will* head, *Soul Ring*
- Techniques: *Soul Blade* on attack, *Oversoul* on heal
- **Identity:** Glass cannon mage. Mind over matter.

### **The Late Bloomer**
- Law: *Late Bloomer* (+30% per realm above Saint) + *Path of Kings* (+300% at max realm)
- Artefacts: *Emperor Belt*, *Emperor Ring*, *Dragon Belt*
- **Identity:** Weak early game, godlike at endgame.

### **The Crafter**
- Law: *Master Smith* (-50% craft cost) + *Alchemist Path* (+80% pill effects)
- Artefacts: *Smith\'s Hands*, *Alchemy Ring*, *Sage\'s Belt*
- **Identity:** Doesn't fight much. Their gear and pills do the work.

### **The Phoenix**
- Law: *Phoenix Path* (revive once at 80% HP)
- Artefacts: *Phoenix Robe*, *Phoenix Charm*, *Phoenix Ring*
- Techniques: *Phoenix* on heal
- **Identity:** Can survive lethal blows. Combat through near-death moments.

### **The Glass Cannon**
- Law: *Razor's Edge* (+150% dmg, -50% def) + *Glass Cannon* on every technique
- Artefacts: *Cursed Belt*, *Blood Boots*
- **Identity:** Kill before being killed. No defense, all offense.

### **The Element Master**
- Law: *Elemental Symphony* (+40% per unique element) + *Dual Element*
- Artefacts: *Crystal Pendant*, *Mage Ring*, element-specific gloves
- Techniques: One of each element type, all *Elemental Match* tagged
- **Identity:** Match your law element to your techniques for bonuses.

---

## Pool Counts (Initial Design)

- **Laws:** ~150 modifiers across 15 archetypes
- **Artefacts:** ~160 modifiers across 8 slot types (~20 per slot)
- **Techniques:** ~110 modifiers (40 Attack, 30 Heal, 20 Defend, 20 Dodge)
- **Total:** ~420 modifiers

This is the starting set. The pool can grow to 1000+ as we add more archetypes and synergies.

---

## Implementation Notes (Future)

To make these functional, the game needs:

1. **Modifier roll system** — when a unique law/artefact/technique drops, roll one or more uniques from the appropriate pool, with their values rolled within the range
2. **Stat formula hooks** — many uniques modify stats (handled via existing `MOD.INCREASED`/`MOD.MORE`)
3. **Trigger system** — for conditional uniques (`on_dodge`, `on_kill`, `below_50_hp`, `every_5s_in_combat`)
4. **Conversion system** — for "X% of body counts as soul" type effects
5. **UI display** — show unique modifiers with a distinct color/badge in tooltips
6. **Drop frequency tuning** — uniques should be rare enough to feel exciting

---

## Related

- [[Crafting]]
- [[Items]]
- [[Laws]]
- [[Secret Techniques]]
- [[Stats]]
