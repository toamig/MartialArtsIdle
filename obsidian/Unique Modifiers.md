# Unique Modifiers

Build-enabling rare modifiers for Laws, Artefacts, and Techniques. Designed in the spirit of Path of Exile uniques, Slormancer legendaries, and Diablo set bonuses — combinations of unique modifiers should enable distinct playstyles.

> **Overhaul note (2026-04-24):** all ~350 prior uniques (laws, artefacts, techniques) were **wiped** during the Damage & Element System Overhaul. Pools are now empty; the archive lives at [[Deprecated_Unique_Modifiers]]. The effect-schema documented below is preserved for reference — the next iteration will refill pools targeting the new 5-element / 2-damage-bucket model. **Effects must not reference `essence` / `soul` / `body`, `psychic_damage`, or `soul_toughness`** — those stats are gone.
>
> New unique pools: `LAW_UNIQUE_POOLS = ['fire', 'water', 'earth', 'wood', 'metal', 'general']`. Artefact uniques are not auto-rolled for now (artefacts spawn with their full modifier complement and no unique slot — see [[Artefacts]]).

---

## Pool Power Levels

| Pool           | Strength                   | Trade-offs                        | Purpose                           |
| -------------- | -------------------------- | --------------------------------- | --------------------------------- |
| **Laws**       | Strongest                  | Often have downsides              | Ascendancy-style: defines a build |
| **Artefacts**  | ~70% of law strength       | No major downsides                | Variety, slot-themed buffs        |
| **Techniques** | Specific to that technique | Modifies the technique's behavior | Skill specialization              |

---

## Design Philosophy

1. **Builds emerge from combinations** — no single modifier should be strong enough alone. The interaction of 2-5 unique modifiers across laws + artefacts + techniques is what defines a build.
2. **Trade-offs create identity** — laws especially should make you choose. "100% increased Damage. Cannot heal." forces a sustain-via-kill playstyle.
3. **Conditions enable skill expression** — "100% increased Damage while below 25% Health" rewards risky play.
4. **Stat conversions create new playstyles** — "30% of Body counted as Soul" lets soul builds use body items.
5. **Anti-synergies prevent stacking everything** — "100% increased Damage. 50% less Defense." keeps players from being the best at everything.

## Text Style

Modifier descriptions use the same vocabulary as normal stat modifiers:

- **`increased` / `reduced`** — additive % (e.g. "15% increased Damage")
- **`more` / `less`** — multiplicative % (e.g. "25% more Damage")
- **Flat numbers** — "+8 Phys. Dmg"
- **Conditions** — use `while`, `after`, `on`, `per` (e.g. "while below 50% Health", "on Kill", "per equipped Artefact")

---

## Modifier Tags (legacy — being retired)

Tags were originally introduced for filtering/searching when designing
builds. The "archetype" concept has since been **removed from law data**
— laws are a single flat pool with no structural archetype, and the tag
column on artefact / technique uniques was stripped from `uniqueModifiers.js`.
The table below is kept for design-language reference only.

| Tag            | Meaning                          |
| -------------- | -------------------------------- |
| `qi-glutton`   | Cultivation-focused              |
| `body`         | Body stat scaling                |
| `soul`         | Soul stat scaling                |
| `elemental`    | Element damage focus             |
| `speed`        | Cooldown reduction, mobility     |
| `tank`         | Defense / HP focus               |
| `glass-cannon` | High damage, low survival        |
| `sustain`      | Healing, regen, lifesteal        |
| `crit`         | Critical strike scaling          |
| `conversion`   | Stat conversions                 |
| `realm-scale`  | Scales with realm progression    |
| `condition`    | Triggered/conditional bonuses    |
| `anti-synergy` | Has trade-offs / costs           |
| `crafting`     | Crafting cost reduction          |
| `utility`      | Misc QoL                         |
| `harvest`      | Gathering speed/luck             |
| `mining`       | Mining speed/luck                |
| `offensive`    | Pure damage                      |
| `defensive`    | Pure mitigation                  |
| `hybrid`       | Multiple stats                   |

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

## Pool Counts (Curated)

- **Laws:** 128 modifiers (single flat pool — archetypes are descriptive, not structural)
- **Artefacts:** 150 modifiers across 7 slot types (Weapon 23 / Head 25 / Body 25 / Hands 19 / Waist 20 / Feet 14 / Neck 24)
- **Techniques:** 100 modifiers (Attack 39 / Heal 29 / Defend 17 / Dodge 15)
- **Total:** 378 modifiers

See `Unique Modifiers - Review.md` for the full curated list. Entries are ported to `src/data/uniqueModifiers.js` after final review.

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
