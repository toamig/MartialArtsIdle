# Alchemy

Pill crafting system accessed via the **Production > Alchemy** tab. Combine three herbs in the Refining Furnace to produce pills that grant **permanent, irreversible** stat bonuses.

---

## How It Works

1. Select **three herbs** (slots arranged in a triangle around the furnace)
2. The combination determines which pill is produced — every valid combination maps to exactly one pill
3. Pick a **craft quantity** (×1 / ×5 / ×10) and click **Craft** to consume that many sets of herbs at once. The button label clamps to what you can actually afford (e.g. `Craft ×3` when you picked ×10 but only have ingredients for 3)
4. A `+N PillName` message rises above the furnace to confirm each craft
5. Consume pills from the **Pill Drawer** on the Home screen — each consumption permanently adds its stat bonus to the character

### Recipe Discovery

The **Craftable Recipes** panel below the furnace only lists pills the player has already brewed at least once. Undiscovered pills are hidden entirely — the first craft of a given pill ID reveals its recipes in the list. Discovered state persists under the localStorage key `mai_discovered_pills`; legacy saves seed this set from existing owned-pill counts so no recipes are re-locked on upgrade.

Filling all three herb slots with a valid but **undiscovered** combination displays a generic `??? — craft to discover` placeholder instead of the pill's name, rarity and effects — the player has to actually brew the pill once to learn what it makes.

Pills have **no duration**. Every bonus applied by a pill is added once and persists indefinitely across sessions, stored in `permanentStats` (see [[Items#Implementation Notes]]).

---

## Recipe Rules

- A recipe is any **unordered combination of 3 herbs** (duplicates allowed — you can use the same herb three times)
- **Rarity constraint**: the maximum rarity distance between any two herbs in a recipe must be **≤ 2 tiers** (e.g. Iron + Silver is allowed, but Iron + Gold is not)
- There are **92 valid combinations** across the 10 available herbs
- Each combination produces **exactly one pill** — no ambiguity

### Rarity Tiers

| Tier | Rarity | Herbs |
|---|---|---|
| 1 | Iron | Sect Grounds Grass, Borderland Root |
| 2 | Bronze | Qi Vein Vine, Spirit Forest Bloom |
| 3 | Silver | Shattered Sky Lotus, Blood Sea Reed |
| 4 | Gold | Saint Burial Lotus, Void Thorn Vine |
| 5 | Transcendent | Origin Spring Petal, Open Heaven Vine |

### Pill Rarity from Ingredients

The pill's rarity is determined by the **total rarity tier sum** of the three herbs:

| Tier Sum | Pill Rarity | Pill Count |
|---|---|---|
| 3–5 | Iron | 5 |
| 6–7 | Bronze | 5 |
| 8–9 | Silver | 5 |
| 10–11 | Gold | 6 |
| 12–15 | Transcendent | 6 |

Within each band the 92 valid combinations are distributed round-robin across that band's pill slots, so each pill has a deterministic set of recipes that brew it. The first recipe (lowest tier-sum) in each band always resolves to that band's **Vigor (Health)** pill — defensive pills come first in the array, so the earliest recipes a player crafts are health/defense oriented rather than damage. This was tuned 2026-05-01 to soften the early-zone "you one-shot or get one-shot" feel.

---

## Diminishing Returns

Each pill stacks with diminishing returns. The (N+1)-th consumption of a given pill id contributes `round(baseValue * 0.96^N)` to its stat, where N is the number of pills of that id already consumed this incarnation. The first pill of an id is full-strength (`0.96^0 = 1.00`); the second is 0.96×, the third 0.9216×, the tenth ≈0.69×. Counting is **per pill id** (so all recipes that brew the same pill share the counter) and **per incarnation** (the counter wipes alongside `permanentStats` on reincarnation). Tuned 2026-05-03 from `0.98` → `0.96` to make stacking decay perceptible.

`qi_speed` (Gold + Transcendent Dao pills) is exempt from DR — its sub-1 base values would round to 0 immediately. Dao pills always grant their full 0.05 / 0.10 each consumption.

State key: `mai_pills_consumed` → `{ [pillId]: count }`. See `scaledEffectValue()` in `src/hooks/usePills.js` (exported for UI display).

### Where DR is shown to the player
Both pill-effect display surfaces show the **next-consumption** scaled value, not the raw base, so a player can see DR eroding their pills in real time:
- **Pill drawer cards** ([src/components/PillDrawer.jsx](../src/components/PillDrawer.jsx)) — each card's effect rows are pre-scaled by that pill's current consumed count.
- **Alchemy forge recipe preview** ([src/screens/ProductionScreen.jsx](../src/screens/ProductionScreen.jsx)) — the forge card shows what the next pill of that recipe will actually grant.

The brief floating "+N" animation that pops on consumption uses the same scaled value (it reads the deltas returned by `usePill()`).

---

## Pill Catalogue (27 pills)

Catalogue narrowed to 6 stats only (2026-04-27): physical_damage, elemental_damage, defense, elemental_defense, health, qi_speed. Order revised 2026-05-01 — defensive pills (Vigor → Skin → Ward) appear first in every band, then offensive (Fist → Ember), then Dao (Gold + Transcendent only). Damage pill values were halved in the same revision.

| Theme | Stat |
|---|---|
| Vigor | Health |
| Skin | Defense |
| Ward | Elemental Defense |
| Fist | Physical Damage |
| Ember | Elemental Damage |
| Dao | Qi Speed (Gold + Trans only) |

### Iron Pills

| Pill | Permanent Effect |
|---|---|
| Iron Vigor Pill | +30 Health |
| Iron Skin Pill | +5 Defense |
| Iron Ward Pill | +5 Elemental Defense |
| Iron Fist Pill | +2 Physical Damage |
| Iron Ember Pill | +2 Elemental Damage |

### Bronze Pills

| Pill | Permanent Effect |
|---|---|
| Bronze Vigor Pill | +80 Health |
| Bronze Skin Pill | +12 Defense |
| Bronze Ward Pill | +12 Elemental Defense |
| Bronze Fist Pill | +6 Physical Damage |
| Bronze Ember Pill | +6 Elemental Damage |

### Silver Pills

| Pill | Permanent Effect |
|---|---|
| Silver Vigor Pill | +175 Health |
| Silver Skin Pill | +25 Defense |
| Silver Ward Pill | +25 Elemental Defense |
| Silver Fist Pill | +12 Physical Damage |
| Silver Ember Pill | +12 Elemental Damage |

### Gold Pills

| Pill | Permanent Effect |
|---|---|
| Gold Vigor Pill | +400 Health |
| Gold Skin Pill | +50 Defense |
| Gold Ward Pill | +50 Elemental Defense |
| Gold Fist Pill | +25 Physical Damage |
| Gold Ember Pill | +25 Elemental Damage |
| Gold Dao Pill | +0.05 Qi Speed |

### Transcendent Pills

| Pill | Permanent Effect |
|---|---|
| Transcendent Vigor Pill | +900 Health |
| Transcendent Skin Pill | +110 Defense |
| Transcendent Ward Pill | +110 Elemental Defense |
| Transcendent Fist Pill | +55 Physical Damage |
| Transcendent Ember Pill | +55 Elemental Damage |
| Transcendent Dao Pill | +0.10 Qi Speed |

---

## Modifier Mapping

Pill effects plug into the stats stacking model (see [[Stats]]):

- **Harvest Speed** and **Mining Speed** are applied as `increased` modifiers (percentage).
- Every other stat is applied as a `flat` modifier.

See `INCREASED_STATS` in `src/hooks/usePills.js` — that set is the authoritative list of stats that use `increased`.

---

## Pill Usage

- Pills appear in the **Pill Drawer** floating above the Home-screen navigation
- Tabs: **Combat** / **Harvest** / **Mining** (a pill shows in every tab its effects touch — e.g. the World Harvest Pill appears in both Harvest and Mining)
- Click **Consume (Permanent)** on a pill card to apply its bonuses once and reduce the stock by 1
- A floating stat-gain animation confirms the bonus was applied
- Consuming is irreversible — bonuses persist across reincarnations

---

## Related

- [[Materials]] — herbs used in recipes
- [[Crafting]] — transmutation system (separate from alchemy)
- [[Primary Stats]]
- [[Stats]]
- [[Items]]
- [[Realm Progression]]
