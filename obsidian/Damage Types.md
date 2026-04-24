# Damage Types

Two damage buckets — **physical** and **elemental**. The pre-overhaul `psychic` bucket and the `soul_toughness` defense it paired with are removed.

| Bucket | Default source | Resisted by |
|---|---|---|
| Physical | Basic attack (always); secret techniques tagged `damageType: 'physical'` | `defense` (a.k.a. physical defense) |
| Elemental | Secret techniques tagged `damageType: 'elemental'` | `elemental_defense` |

Stat keys remaining on the player: `physical_damage`, `elemental_damage`, `defense`, `elemental_defense`. All `psychic_damage` and `soul_toughness` references are deprecated and removed in Stage 3 of the overhaul.

## Damage routing

- **Basic attack** is hard-pinned to **physical** (see [[Secret Techniques]]).
- **Secret techniques** carry a `damageType` field on their definition; designer chooses physical or elemental per technique.
- A technique's [[Elements|element]] (fire / water / earth / wood / metal) is independent of its damage bucket — element is for tagging / set bonuses / law affinity, not damage routing.

## Mitigation formula

Unchanged shape — `dmg = atk² / (atk + defense)` where `defense` is the matching bucket's defense stat. Defense buffs from techniques apply on top.

## Out of scope

- Element-specific resistances (fire-resist, etc.) — not on the roadmap.
- Damage conversions between buckets — deprecated with the old unique-modifier pool (see [[Deprecated_Unique_Modifiers]]).

## Related

- [[Elements]]
- [[Stats]]
- [[Secret Techniques]]
- [[Combat]]
