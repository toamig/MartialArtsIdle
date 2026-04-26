# Artefact Sets

Each [[Artefacts|artefact]] drops with one (rarely two) `setId` constrained to its rolled element. Equipping multiple pieces of the same set unlocks a 2-piece bonus (and at 4+ pieces, a 4-piece bonus on top).

> **Implementation:** `src/data/artefactSets.js`. The `getSetBonusModifiers(equipped, owned, ctx, lawSetCountBonus)` helper aggregates active stat-mods + flags + triggers + per-tech-type CD multipliers and feeds them into the App.jsx combat-stats bundle alongside law-side payloads.

## Catalogue

15 sets total — 3 per element. IDs follow the pattern `set_<element>_<n>`. Set names are placeholders the designer can rename in `SET_NAMES`.

### Fire — damage / aggression

| Set | 2-piece | 4-piece |
|---|---|---|
| **Ember Legacy** (`set_fire_1`) | 20% more damage | 10% more damage for each artefact that matches the law |
| **Phoenix Coterie** (`set_fire_2`) | 100% increased elemental damage | Secret techniques trigger twice |
| **Sunforge Compact** (`set_fire_3`) | 2% of damage is healed as life | 8% of damage is healed as life. Cannot heal from other sources |

### Water — healing / sustain

| Set | 2-piece | 4-piece |
|---|---|---|
| **Tidebound Rite** (`set_water_1`) | 20% increased healing effectiveness | Heal techniques only trigger when below 70% health. 60% increased healing effectiveness if below 50% health |
| **Frost Mirror** (`set_water_2`) | 4% HP/s recovery | 6% HP/s recovery. HP/s recovery is 50% more effective if a Heal-type secret technique is on cooldown |
| **Abyssal Pact** (`set_water_3`) | Damage enemies by 20% of healing received | Damage enemies by 50% of healing received. Cannot use attack secret techniques |

### Earth — defence / mitigation

| Set | 2-piece | 4-piece |
|---|---|---|
| **Stoneblood Oath** (`set_earth_1`) | 20% more elemental defense | 50% of elemental defense is converted to defense |
| **Mountain Chapel** (`set_earth_2`) | 20% more defense | 20% additional damage reduction |
| **Dune Wanderers** (`set_earth_3`) | 20% more health | Heal 30% of mitigated damage on every enemy hit (mitigated = raw enemy damage − damage actually taken after armour curve) |

### Metal — exploit / debuff

| Set | 2-piece | 4-piece |
|---|---|---|
| **Iron Bastion** (`set_metal_1`) | 10% exploit chance | 100% increased exploit damage |
| **Razor Hierarchy** (`set_metal_2`) | Expose techniques have 20% increased effect | Expose techniques apply buffs to attack secret techniques as well |
| **Sovereign Plate** (`set_metal_3`) | Exploit hits ignore 10% of enemy defenses | Attacks have 30% chance to bypass all defenses |

### Wood — dodge / evasion

| Set | 2-piece | 4-piece |
|---|---|---|
| **Verdant Accord** (`set_wood_1`) | 5% dodge chance | Heal 10% HP on successful dodge |
| **Root Conclave** (`set_wood_2`) | 5% dodge chance | Dodging makes the next attack or secret technique an exploit hit |
| **Bloomward** (`set_wood_3`) | Defense and elemental defense are increased by dodge chance | Double dodge chance. Take 40% of hit damage on successful dodge |

---

## Schema

```js
ARTEFACT_SETS[setId] = {
  id, element, name,
  twoPiece:  { description, effects: [{ kind, ... }] },
  fourPiece: { description, effects: [{ kind, ... }] },
}
```

Effect kinds (match the law-uniques shape):

- `stat`        — `{ stat, mod, value }` → folded into `computeAllStats`
- `flag`        — `{ flag, value }` → exposed as `setFlags` on the combat stats bundle
- `trigger`     — `{ event, action }` → walked by `dispatchTrigger` in `useCombat`
- `cd_mult`     — `{ techType, mult }` → multiplied into per-tech-type CD scaler
- `conversion`  — `{ from, to, pct }` → applied at stat-merge time

---

## Dual-Set Transcendents

Transcendent artefacts have a **3% chance** to roll a second `setId` from a different element (`TRANSCENDENT_DUAL_SET_CHANCE`). The piece counts toward both sets simultaneously — `countEquippedSets` walks `inst.setIds` (an array) for every equipped artefact.

## Law-Driven Set-Counter Inflation

Each element has 3 law uniques (one per of its 3 sets) that "count as having one more artefact of that set" — encoded as `kind: 'set_count_bonus'` on the law unique. When `evaluateLawUniques` runs, it accumulates `lawBundle.setCountBonus[setId]`. App.jsx pipes this into `getSetBonusModifiers(..., lawBundle.setCountBonus)`, which `countEquippedSets` adds on top of the raw piece tally.

So a 1-piece player with the matching law triggers the 2-piece bonus; a 3-piece player triggers the 4-piece.

---

## Related

- [[Artefacts]]
- [[Laws]]
- [[Combat]]
