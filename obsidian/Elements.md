# Elements

Five elements form the backbone of the new content system — they tag laws, artefacts, secret techniques, artefact sets, and (optionally) enemies. They replace the prior 9-pool type system (`physical / sword / fist / fire / water / earth / spirit / void / dao`) and the prior law-element list (`Fire / Water / Stone / Air / Metal / Wood / Normal / Ice`).

## The five

| Element | Notes |
|---|---|
| **fire** | — |
| **water** | — |
| **earth** | (replaces former Stone) |
| **wood** | — |
| **metal** | — |

Authoritative constant: `ELEMENTS` in `src/data/elements.js` (created during Stage 5 of the overhaul).

## Where elements appear

- **Laws** — every law has exactly one `element` from the five. The law's `types` field (one or more of the five plus optional `general`) selects the unique-modifier pools it draws from.
- **Artefacts** — every artefact carries an `element` assigned at drop time. Artefacts also carry a `setId` constrained to that element (see [[Artefact Sets]]).
- **Secret techniques** — every technique has an `element` (one of the five) plus an independent `damageType` (physical or elemental — see [[Damage Types]]).
- **Enemies** — optional. Defaults to `'none'`; designers may tag specific enemies with an element to drive future affinity logic.

## Element ≠ Damage Type

Element is a **tag** for content matching (set bonuses, law affinity, technique drop pools). It does not by itself route damage. Damage routing is decided by the technique's `damageType` field. A `wood` technique can deal physical damage; a `metal` technique can deal elemental damage.

## Unique pools

Six pools total — the five elements plus a catch-all `general`. Every law draws from `general` plus the pools listed in its `types` array.

```
LAW_UNIQUE_POOLS = ['fire', 'water', 'earth', 'wood', 'metal', 'general']
```

All pools start empty after the overhaul (see [[Deprecated_Unique_Modifiers]] for the prior content).

## Related

- [[Damage Types]]
- [[Laws]]
- [[Artefacts]]
- [[Artefact Sets]]
- [[Secret Techniques]]
