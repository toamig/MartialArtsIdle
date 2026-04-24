# Primary Stats

> **Removed — pending redesign.** The previous three primary stats (Essence / Soul / Body) were stripped during the **Damage & Element System Overhaul** (2026-04-24). Combat formulas were reanchored to the player's realm index as a placeholder. A replacement stat axis will be designed in a future iteration.

## What was removed

- `essence`, `soul`, `body` stat outputs.
- `BASE_ESSENCE`, `BASE_BODY`, `SAINT_INDEX`-gated Soul unlock.
- All derived formulas that referenced primary stats:
  - Health (`(essence + body) × 12 + soul × 4`)
  - Defense (`body + modifiers`)
  - Elemental Defense (`essence + modifiers`)
  - Soul Toughness (`soul + modifiers`) — **also removed**, see [[Damage Types]]
  - Mining Speed (`floor(body × 0.1) + modifiers`)
  - Harvest Speed (`floor(soul × 0.1) + modifiers`)
- The Saint-realm Soul unlock gate.

## Pill conversion

Any pill whose effect previously granted essence / soul / body now grants `+1 max health` instead. Existing player inventory of those pills is preserved; effect resolves to the new bonus on use.

## Placeholder formulas

Until the replacement stat axis is designed, the engine uses **realm index** (`realmIndex`) as the single power-scaling input:

```
maxHp        = max(100, realmIndex × 200)
basicDamage  = max(5, K × realmIndex × arteMult)
defense      = realmIndex × 5 + modifiers      (placeholder)
elemDefense  = realmIndex × 5 + modifiers      (placeholder)
```

Modifiers can still target `health`, `defense`, `elemental_defense`, `physical_damage`, `elemental_damage` — those stats remain. Only the primary-stat layer underneath is gone.

## Related

- [[Stats]]
- [[Damage Types]]
- [[Deprecated_Unique_Modifiers]]
