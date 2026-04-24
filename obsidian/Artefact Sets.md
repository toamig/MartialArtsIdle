# Artefact Sets

Every artefact belongs to a **set**. Equipping multiple pieces of the same set unlocks bonuses. Sets are constrained to a single [[Elements|element]] — three sets per element, fifteen sets total.

## Catalogue

15 sets, IDs follow the pattern `set_<element>_<n>`:

| Element | Sets |
|---|---|
| fire | `set_fire_1`, `set_fire_2`, `set_fire_3` |
| water | `set_water_1`, `set_water_2`, `set_water_3` |
| earth | `set_earth_1`, `set_earth_2`, `set_earth_3` |
| wood | `set_wood_1`, `set_wood_2`, `set_wood_3` |
| metal | `set_metal_1`, `set_metal_2`, `set_metal_3` |

Authoritative constant: `ARTEFACT_SETS` in `src/data/artefactSets.js` (added during Stage 6 of the overhaul). Each entry: `{ id, name, element, twoPiece, fourPiece }`.

## Bonus structure

| Pieces equipped | Effect |
|---|---|
| 2 | **Minor** bonus (`twoPiece`) |
| 4 | Minor + **Major** bonus (`fourPiece`) |

Bonus content is **TODO** — every set ships with placeholder effects until the designer fills them in. Placeholder shape allows the engine to detect the bonus is active without crashing.

## Set assignment at drop

When an artefact drops:
1. Element is rolled.
2. Set is rolled uniformly from the three sets matching that element.
3. **Transcendent only**: 3% chance to roll a *second* setId from a *different* element. The artefact then carries both elements and counts toward both sets simultaneously.

## Equipping bonuses

Counting is per `setId`. With 8 equipment slots a player can plausibly run 4-piece + 2-piece + 2-piece concurrently. The artefact engine evaluates set counts at equip/unequip time.

## Out of scope

- Set-piece visuals — names only for now.
- Set bonuses that scale with element synergy — placeholder pass first, design later.
- Trading or salvaging by set.

## Related

- [[Artefacts]]
- [[Artefact Upgrades]]
- [[Elements]]
