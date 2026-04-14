# Crafting & Production Design

## Architecture

All crafting costs live in **`src/data/crafting.js`** — the single source of truth for balancing.
No numeric crafting constants appear in component code.

```
src/data/
  crafting.js        ← SLOT_BRACKETS, TRANSMUTE_QTY, UPGRADE_COSTS, REFINE_COSTS
  enemies.js         ← enemy stats + drop tables
  worlds.js          ← region pools + spawn weights
  items.js           ← item catalogue
  materials.js       ← gather / mine costs per material
  pills.js           ← alchemy recipe auto-generation
  affixPools.js      ← transmutation affix definitions
  artefacts.js       ← artefact catalogue + slot bonuses
  techniqueDrops.js  ← technique generation from worldId
```

To change any crafting cost: edit `crafting.js`. To change any drop rate: edit `enemies.js`. To change spawn weights: edit `worlds.js`. No UI file needs touching.

---

## Material system — two-axis split

Each tier (Iron/Bronze/Silver/Gold/Transcendent) has four material slots:

| Slot | ID suffix | Description | Crafting role |
|------|-----------|-------------|---------------|
| herb_1 | `_herb_1` | First herb of the tier | Alchemy (pills) |
| herb_2 | `_herb_2` | Second herb of the tier | Alchemy (pills) |
| mineral_1 | `_mineral_1` | Primary ore — dense/structural | Transmutation hone & add; Law/Artefact/Technique refine; upgrades |
| mineral_2 | `_mineral_2` | Secondary ore — specialised | Transmutation replace; Artefact refine (secondary) |
| cultivation_1 | `_cultivation_1` | Qi condensate from beasts/relics | **Law refine** |
| cultivation_2 | `_cultivation_2` | Volatile essence from souls/void | **Technique refine** |

### cultivation_1 → Laws
Beast qi cores and saint relics represent stable, structured cultivation energy — the right substrate for compiling Cultivation Laws.

| Tier | cultivation_1 | Primary sources |
|------|---------------|-----------------|
| Iron | Mortal Qi Residue | All W1 mortal enemies |
| Bronze | Beast Qi Core | Wolf, wandering beast (W1); iron wolves/boar (W2) |
| Silver | Ancient Qi Marrow | All W2 frontier enemies |
| Gold | Saint Qi Relic | W3 burial/altar enemies (burial guardian, saint corpse-soldier, etc.) |
| Transcendent | Primal Qi Core | W4 primordial entities (golems, serpent, root sovereign, titan) |

### cultivation_2 → Techniques
Corrupted shards, soul remnants, void pearls — volatile, unstable essences from enemies whose qi went wrong. Pressing these into scrolls creates powerful but dangerous technique templates.

| Tier | cultivation_2 | Primary sources |
|------|---------------|-----------------|
| Iron | Condensed Qi Stone | Training golem, outer sect disciple, bandit scout, rogue disciple |
| Bronze | Corrupted Qi Shard | Corrupted cultivator (W2) |
| Silver | Immortal Soul Remnant | Immortal shade, city guardian (W2) |
| Gold | Void Qi Pearl | Void shade, forbidden construct, void rift predator, rift stalker (W3) |
| Transcendent | Heaven Qi Crystal | W5 Dao-realm entities; all W6 Open Heaven enemies |

---

## Alchemy (pills)

Pills are auto-generated from 3-herb combos. The recipe system in `pills.js` is fully automatic — the herb tier-sum determines which pill band is produced:

| Band | Tier sum | Pill rarity | Example combo |
|------|----------|-------------|---------------|
| Iron | 3–5 | Iron | 3× iron herbs |
| Bronze | 6–7 | Bronze | 2× bronze + 1× iron herb |
| Silver | 8–9 | Silver | 3× silver or 2× silver + 1× bronze |
| Gold | 10–11 | Gold | 2× gold + 1× silver herb |
| Transcendent | 12–15 | Transcendent | 3× gold herbs OR any triple with transcendent herbs |

Constraint: max tier − min tier ≤ 2 within a single recipe. No mixing iron and gold herbs.

To add a new pill: add it to `PILL_DEFS` in `pills.js` with the correct rarity. The recipe engine automatically maps herb combos to it.

---

## Transmutation (hone / replace / add)

Costs are configured in `crafting.js` under `SLOT_BRACKETS` and `TRANSMUTE_QTY`:

```js
TRANSMUTE_QTY = { hone: 3, replace: 5, add: 8 }
```

Each quality tier of an item unlocks a new bracket of affix slots. Each bracket uses its own tier's minerals:

| Operation | Material used | Current qty |
|-----------|--------------|-------------|
| Hone (reroll value) | mineralStat × 3 | 3 |
| Replace (swap modifier type) | mineralMod × 5 | 5 |
| Add (fill empty slot) | mineralStat × 8 | 8 |

To rebalance transmutation economy: change the numbers in `TRANSMUTE_QTY`.

---

## Upgrades (Iron → Bronze → … → Transcendent)

All item types (artefact, technique, law) share the same `UPGRADE_COSTS` table. The pattern is:
- Bulk of current-tier mineral_1 (you've earned it)
- Small dose of next-tier mineral_1 (gateway taste)

| Upgrade | Cost |
|---------|------|
| Iron → Bronze | iron_mineral_1 ×10 + bronze_mineral_1 ×3 |
| Bronze → Silver | bronze_mineral_1 ×8 + silver_mineral_1 ×3 |
| Silver → Gold | silver_mineral_1 ×5 + gold_mineral_1 ×3 |
| Gold → Transcendent | gold_mineral_1 ×8 + transcendent_mineral_1 ×2 |

---

## Refine costs

| Item type | Material logic |
|-----------|----------------|
| Artefact | mineral_1 + mineral_2 (pure forging; no cultivation required) |
| Technique | mineral_1 + cultivation_2 (volatile combat essence pressed into scroll) |
| Law | mineral_1 + cultivation_1 (stable qi condensate compiled into law structure) |

Full cost table in `src/data/crafting.js`.

---

## How to modify the game — quick reference

### Rebalance a drop rate
Edit the `drops` array on the enemy in `src/data/enemies.js`. Fields: `itemId`, `chance` (0–1), `qty` ([min, max]).

### Change which enemies spawn in a region
Edit `enemyPool` in the region object in `src/data/worlds.js`. Each entry: `{ enemyId, weight }`.

### Change crafting costs
Edit `REFINE_COSTS`, `UPGRADE_COSTS`, or `TRANSMUTE_QTY` in `src/data/crafting.js`.

### Add a new enemy
1. Add the enemy object to `src/data/enemies.js` following the existing structure.
2. Add it to one region's `enemyPool` in `src/data/worlds.js`.
3. Add it to the Enemy Roster table in `docs/enemy-design.md`.

### Add a new item drop
1. Add the item to the correct category in `src/data/items.js`.
2. Add mining/gathering cost to `src/data/materials.js` if applicable.
3. Reference the itemId in enemy drop arrays.

---

## Dev panel — future architecture

All game data is already structured as plain JavaScript objects in module-level exports. A dev panel would:

1. **Import** the raw config objects from all data files.
2. **Render** them as editable forms (numeric inputs, dropdowns for itemId references).
3. **Write changes** back to React state, live-previewing in-game.
4. **Export** the modified config as JSON for copy-pasting into the data files.

Files that would be exposed to the panel:

| Panel section | Source file |
|---------------|-------------|
| Enemy stats & drops | `enemies.js` |
| Region pools & weights | `worlds.js` |
| Crafting costs | `crafting.js` |
| Mining/gather costs | `materials.js` |
| Transmutation affixes | `affixPools.js` |
| Item catalogue | `items.js` |
| Pill band config | `pills.js` → `BAND_CONFIG` |

No structural changes needed to enable the panel — the data is already modular.
Future work: `src/screens/DevPanelScreen.jsx` + route behind a `?dev=1` query flag or hidden tap gesture in Settings.
