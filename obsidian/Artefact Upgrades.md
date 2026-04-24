# Artefact Upgrades

Replaces the deprecated refining (transmutation) loop for artefacts. Refining is gone. Artefacts now drop fully-rolled and are improved by spending **minerals + bloodcores** in the Collection tab.

## Cap by rarity

| Rarity | Max +N | Modifier slots (filled at spawn) |
|---|---|---|
| Iron | +4 | 1 |
| Bronze | +8 | 2 |
| Silver | +12 | 3 |
| Gold | +16 | 4 |
| Transcendent | +20 | 5 |

At +20 a Transcendent artefact reaches the global cap. There is no rarity-upgrade path — an Iron artefact stays Iron.

## Stat scaling

Each upgrade level multiplies the artefact's modifier values by `1 + 0.05 × level`. So:

```
+0  → ×1.00
+10 → ×1.50
+20 → ×2.00
```

At +20 every modifier on the item is doubled.

## Bonus rolls every 4 levels

At +4, +8, +12, +16, +20 the upgrade picks one of the artefact's existing modifiers and **adds** a freshly rolled value (within the original modifier's range) on top of it. These bonus values are stored alongside the artefact and contribute additively before the level multiplier is applied.

So a Transcendent artefact (5 base modifiers) reaches +20 with up to 5 bonus rolls layered on top, then the whole stack multiplied by 2.0.

## Cost ladder

Costs scale linearly with the world tier. Each pair of upgrade levels consumes the matching tier's mineral + bloodcore — both `_1` and `_2` variants of that tier.

| Levels | Mineral tier | Bloodcore tier |
|---|---|---|
| 1–2 | Iron (`iron_mineral_1` + `iron_blood_core_1`) | Iron |
| 3–4 | Iron (`iron_mineral_2` + `iron_blood_core_2`) | Iron |
| 5–6 | Bronze (`bronze_mineral_1` + `bronze_blood_core_1`) | Bronze |
| 7–8 | Bronze (`bronze_mineral_2` + `bronze_blood_core_2`) | Bronze |
| 9–10 | Silver (`silver_mineral_1` + `silver_blood_core_1`) | Silver |
| 11–12 | Silver (`silver_mineral_2` + `silver_blood_core_2`) | Silver |
| 13–14 | Gold (`gold_mineral_1` + `gold_blood_core_1`) | Gold |
| 15–16 | Gold (`gold_mineral_2` + `gold_blood_core_2`) | Gold |
| 17–18 | Transcendent (`transcendent_mineral_1` + `transcendent_blood_core_1`) | Transcendent |
| 19–20 | Transcendent (`transcendent_mineral_2` + `transcendent_blood_core_2`) | Transcendent |

Quantities per upgrade are TBD — first-pass values land in `src/data/artefactUpgrades.js` during Stage 8 of the overhaul.

## What's gone

- No reroll, no hone, no replace, no add — modifiers are locked at spawn time.
- No artefact rarity upgrade path.
- No artefact transmutation tab — the Production screen no longer surfaces artefact crafting. UI moves to the Collection tab (click-into-detail flow).

## Related

- [[Artefacts]]
- [[Artefact Sets]]
- [[Crafting]]
- [[Materials]]
